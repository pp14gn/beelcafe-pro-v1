import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CartItem {
  recipe_id: string;
  size_id?: string | null;
  quantity: number;
  notes?: string;
}

interface IntakePayload {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  fulfillment_type: "pickup" | "delivery";
  pickup_time?: string;
  delivery_address?: string;
  delivery_notes?: string;
  payment_method: "counter" | "online_card";
  items: CartItem[];
  source?: string;
  return_origin?: string; // where MP should redirect the customer back
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad("Method not allowed", 405);

  try {
    const body = (await req.json()) as IntakePayload;

    // Basic validation
    if (!body.customer_name || body.customer_name.length > 120) return bad("Invalid name");
    if (!body.customer_phone || body.customer_phone.length > 40) return bad("Invalid phone");
    if (!["pickup", "delivery"].includes(body.fulfillment_type)) return bad("Invalid fulfillment_type");
    if (!["counter", "online_card"].includes(body.payment_method)) return bad("Invalid payment_method");
    if (!Array.isArray(body.items) || body.items.length === 0) return bad("Cart is empty");
    if (body.items.length > 100) return bad("Too many items");
    if (body.fulfillment_type === "delivery" && !body.delivery_address) return bad("Delivery address required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch recipes & sizes server-side to re-price
    const recipeIds = [...new Set(body.items.map((i) => i.recipe_id))];
    const sizeIds = [...new Set(body.items.map((i) => i.size_id).filter(Boolean))] as string[];

    const [{ data: recipes, error: rErr }, { data: sizes, error: sErr }] = await Promise.all([
      supabase.from("recipes").select("id, name, base_price, is_active").in("id", recipeIds),
      sizeIds.length
        ? supabase.from("recipe_sizes").select("id, recipe_id, name, price_adjustment").in("id", sizeIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if (rErr) return bad(rErr.message, 500);
    if (sErr) return bad(sErr.message, 500);

    const recipeMap = new Map((recipes ?? []).map((r: any) => [r.id, r]));
    const sizeMap = new Map((sizes ?? []).map((s: any) => [s.id, s]));

    const pricedItems: any[] = [];
    let subtotal = 0;

    for (const it of body.items) {
      const r: any = recipeMap.get(it.recipe_id);
      if (!r || !r.is_active) return bad(`Item unavailable: ${it.recipe_id}`);
      const qty = Number(it.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) return bad("Invalid quantity");

      let sizeInfo: any = null;
      let unitPrice = Number(r.base_price);
      if (it.size_id) {
        const s: any = sizeMap.get(it.size_id);
        if (!s || s.recipe_id !== r.id) return bad("Invalid size for item");
        unitPrice += Number(s.price_adjustment || 0);
        sizeInfo = { id: s.id, name: s.name, price_adjustment: Number(s.price_adjustment || 0) };
      }
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      pricedItems.push({
        id: r.id,
        recipe_id: r.id,
        name: r.name,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal,
        selectedSize: sizeInfo,
        notes: it.notes ?? null,
      });
    }

    const total = subtotal;

    const { data: order, error: insErr } = await supabase
      .from("online_orders")
      .insert({
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email ?? null,
        fulfillment_type: body.fulfillment_type,
        pickup_time: body.pickup_time ?? null,
        delivery_address: body.delivery_address ?? null,
        delivery_notes: body.delivery_notes ?? null,
        items: pricedItems,
        subtotal,
        total,
        payment_method: body.payment_method,
        payment_status: body.payment_method === "counter" ? "pending" : "pending",
        status: "new",
        source: body.source ?? "web",
      })
      .select("id")
      .single();

    if (insErr || !order) return bad(insErr?.message || "Failed to create order", 500);

    // Online card: create MercadoPago Checkout Pro preference
    if (body.payment_method === "online_card") {
      const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!mpToken) return bad("Online payments not configured", 500);

      const origin = body.return_origin || req.headers.get("origin") || "";
      const backBase = origin ? `${origin}/order.html` : undefined;

      const prefPayload: any = {
        items: pricedItems.map((i) => ({
          title: i.selectedSize ? `${i.name} (${i.selectedSize.name})` : i.name,
          quantity: i.quantity,
          unit_price: Number(i.unit_price.toFixed(2)),
          currency_id: "MXN",
        })),
        payer: { name: body.customer_name, email: body.customer_email || undefined },
        external_reference: order.id,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
        metadata: { online_order_id: order.id },
      };
      if (backBase) {
        prefPayload.back_urls = {
          success: `${backBase}?order=${order.id}&status=success`,
          failure: `${backBase}?order=${order.id}&status=failure`,
          pending: `${backBase}?order=${order.id}&status=pending`,
        };
        prefPayload.auto_return = "approved";
      }

      const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prefPayload),
      });
      const mpJson = await mpRes.json();
      if (!mpRes.ok) {
        console.error("MP preference error", mpRes.status, mpJson);
        // Keep the order but mark failed so staff can decide
        await supabase.from("online_orders").update({ payment_status: "failed" }).eq("id", order.id);
        return new Response(
          JSON.stringify({ error: "Payment provider error", details: mpJson, order_id: order.id }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase
        .from("online_orders")
        .update({ payment_reference: mpJson.id })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({
          order_id: order.id,
          checkout_url: mpJson.init_point || mpJson.sandbox_init_point,
          preference_id: mpJson.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ order_id: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("public-order-intake error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});