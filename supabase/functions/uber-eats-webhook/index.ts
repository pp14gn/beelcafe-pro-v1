import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, getConfig, json, log, uberFetch, verifyUberSignature } from "../_shared/uberEats.ts";

function mapItems(cart: any): any[] {
  const items = cart?.items ?? [];
  return items.map((i: any) => {
    const qty = Number(i.quantity ?? 1);
    const unit = Number(i.price?.unit_price?.amount ?? i.price?.base_unit_price?.amount ?? 0) / 100;
    const mods = (i.selected_modifier_groups ?? []).flatMap((g: any) =>
      (g.selected_items ?? []).map((m: any) => ({
        id: m.external_data ?? m.id,
        name: m.title,
        price: Number(m.price?.unit_price?.amount ?? 0) / 100,
      })),
    );
    const modTotal = mods.reduce((s: number, m: any) => s + m.price, 0);
    return {
      recipe_id: i.external_data ?? i.id,
      name: i.title,
      quantity: qty,
      unit_price: unit + modTotal,
      line_total: (unit + modTotal) * qty,
      modifiers: mods,
      notes: i.special_instructions ?? null,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = await req.text();
  const signature = req.headers.get("x-uber-signature");
  const valid = await verifyUberSignature(raw, signature);
  if (!valid) {
    await log("webhook", false, "Invalid or missing Uber signature");
    return json({ error: "Invalid signature" }, 401);
  }

  try {
    const event = JSON.parse(raw);
    const type: string = event.event_type ?? event.kind ?? "";
    const supabase = admin();

    // Cancellation / state updates
    if (type.includes("cancel")) {
      const orderId = event.meta?.resource_id ?? event.order_id;
      await supabase
        .from("online_orders")
        .update({ status: "cancelled", external_state: "CANCELLED" })
        .eq("external_provider", "uber_eats")
        .eq("external_order_id", orderId);
      await log("webhook", true, `Order ${orderId} cancelled by Uber Eats`);
      return json({ received: true });
    }

    if (!type.includes("notification") && !type.includes("order")) {
      return json({ received: true, ignored: type });
    }

    const resourceHref: string | undefined = event.resource_href;
    const orderId: string = event.meta?.resource_id ?? event.order_id;
    if (!orderId) return json({ received: true, ignored: "no order id" });

    // Fetch full order details from Uber
    const path = resourceHref ? new URL(resourceHref).pathname : `/v1/eats/order/${orderId}`;
    const detail = await uberFetch(path);
    if (!detail.ok) {
      await log("webhook", false, `Could not fetch Uber order ${orderId} (${detail.status})`, detail.body);
      return json({ error: "Could not fetch order" }, 502);
    }

    const o = detail.body;
    const items = mapItems(o.cart);
    const total = Number(o.payment?.charges?.total?.amount ?? 0) / 100 ||
      items.reduce((s: number, i: any) => s + i.line_total, 0);
    const subtotal = Number(o.payment?.charges?.sub_total?.amount ?? 0) / 100 || total;
    const isDelivery = (o.type ?? "").toUpperCase() !== "PICK_UP";

    const { data: existing } = await supabase
      .from("online_orders")
      .select("id")
      .eq("external_provider", "uber_eats")
      .eq("external_order_id", orderId)
      .maybeSingle();

    const row = {
      customer_name: o.eater?.first_name
        ? `${o.eater.first_name} ${o.eater.last_name ?? ""}`.trim()
        : "Uber Eats customer",
      customer_phone: o.eater?.phone ?? o.eater?.phone_code ?? "n/a",
      customer_email: null,
      fulfillment_type: isDelivery ? "delivery" : "pickup",
      delivery_address: isDelivery ? (o.eater?.delivery_address?.formatted_address ?? null) : null,
      delivery_notes: o.eater?.delivery_address?.instructions ?? o.special_instructions ?? null,
      pickup_time: o.estimated_ready_for_pickup_at ?? null,
      items,
      subtotal,
      total,
      payment_method: "uber_eats",
      payment_status: "paid",
      status: "new",
      source: "uber_eats",
      external_provider: "uber_eats",
      external_order_id: orderId,
      external_display_id: o.display_id ?? null,
      external_state: o.current_state ?? null,
      external_payload: o,
    };

    if (existing) {
      await supabase
        .from("online_orders")
        .update({ external_state: o.current_state ?? null, external_payload: o })
        .eq("id", existing.id);
      return json({ received: true, updated: true });
    }

    const { data: inserted, error } = await supabase
      .from("online_orders")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;

    await log("webhook", true, `New Uber Eats order ${o.display_id ?? orderId}`, { order_id: inserted.id });

    // Optional auto-accept
    const config = await getConfig();
    if (config?.auto_accept_orders) {
      const accept = await uberFetch(`/v1/eats/orders/${orderId}/accept_pos_order`, {
        method: "POST",
        body: JSON.stringify({ reason: "Accepted automatically by POS" }),
      });
      if (accept.ok) {
        await supabase.from("online_orders").update({ status: "accepted" }).eq("id", inserted.id);
      } else {
        await log("auto_accept", false, `Auto-accept failed (${accept.status})`, accept.body);
      }
    }

    return json({ received: true });
  } catch (err: any) {
    console.error("uber-eats-webhook", err);
    await log("webhook", false, err.message);
    return json({ error: err.message }, 500);
  }
});