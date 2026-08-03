import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, json, log, requireUser, uberFetch } from "../_shared/uberEats.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { order_id, action, reason } = await req.json();
    if (!order_id || !action) return json({ error: "order_id and action are required" }, 400);

    const supabase = admin();
    const { data: order, error } = await supabase
      .from("online_orders")
      .select("id, external_order_id, external_provider")
      .eq("id", order_id)
      .maybeSingle();
    if (error || !order) return json({ error: "Order not found" }, 404);
    if (order.external_provider !== "uber_eats" || !order.external_order_id) {
      return json({ error: "Not an Uber Eats order" }, 400);
    }

    const uid = order.external_order_id;
    let path: string;
    let body: Record<string, unknown> = {};

    switch (action) {
      case "accept":
        path = `/v1/eats/orders/${uid}/accept_pos_order`;
        body = { reason: reason ?? "Accepted in POS" };
        break;
      case "deny":
        path = `/v1/eats/orders/${uid}/deny_pos_order`;
        body = { reason: { explanation: reason ?? "Unable to fulfill", type: "STORE_CLOSED" } };
        break;
      case "cancel":
        path = `/v1/eats/orders/${uid}/cancel`;
        body = { reason: reason ?? "Cancelled by store" };
        break;
      case "ready":
        path = `/v1/eats/orders/${uid}/restaurant_order_ready`;
        break;
      default:
        return json({ error: "Unknown action" }, 400);
    }

    const res = await uberFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    await log(`order_${action}`, res.ok, res.ok ? `Order ${uid} ${action}` : `Failed to ${action} order (${res.status})`, res.ok ? null : res.body);

    if (!res.ok) return json({ error: `Uber Eats rejected the ${action} (${res.status})`, details: res.body }, 502);
    return json({ success: true });
  } catch (err: any) {
    console.error("uber-eats-order-action", err);
    return json({ error: err.message }, 500);
  }
});