import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) return new Response("no token", { status: 500 });

    const url = new URL(req.url);
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");
    let topic = url.searchParams.get("type") || url.searchParams.get("topic");

    if (!paymentId) {
      try {
        const body = await req.json();
        paymentId = body?.data?.id ?? body?.id ?? paymentId;
        topic = body?.type ?? body?.topic ?? topic;
      } catch { /* body may be empty */ }
    }

    console.log("MP webhook", { topic, paymentId });

    if (!paymentId || (topic && topic !== "payment")) {
      return new Response("ok", { status: 200 });
    }

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!payRes.ok) {
      const text = await payRes.text();
      console.error("MP payment lookup failed", payRes.status, text);
      return new Response("ok", { status: 200 });
    }
    const payment = await payRes.json();

    const orderId =
      payment?.metadata?.online_order_id ||
      payment?.external_reference;
    if (!orderId) return new Response("ok", { status: 200 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const status =
      payment.status === "approved" ? "paid" :
      payment.status === "refunded" || payment.status === "charged_back" ? "refunded" :
      payment.status === "rejected" || payment.status === "cancelled" ? "failed" :
      "pending";

    await supabase
      .from("online_orders")
      .update({
        payment_status: status,
        payment_reference: String(payment.id),
      })
      .eq("id", orderId);

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("mercadopago-webhook error", err);
    return new Response("ok", { status: 200 });
  }
});