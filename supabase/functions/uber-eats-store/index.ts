import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, getConfig, json, log, requireUser, uberFetch } from "../_shared/uberEats.ts";

const VALID = ["ONLINE", "PAUSED", "OFFLINE"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const config = await getConfig();
    if (!config?.store_id) return json({ error: "Set your Uber Eats Store ID in Settings first." }, 400);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "get";

    if (action === "get") {
      const res = await uberFetch(`/v1/eats/stores/${config.store_id}`);
      if (!res.ok) return json({ error: `Uber Eats error (${res.status})`, details: res.body }, 502);
      return json({ success: true, store: res.body });
    }

    if (action === "set_status") {
      const status = String(body.status ?? "").toUpperCase();
      if (!VALID.includes(status)) return json({ error: "Invalid status" }, 400);

      const payload: Record<string, unknown> = { status };
      if (status === "PAUSED" && body.paused_until) {
        payload.reason = { pause_duration: body.pause_duration ?? "INDEFINITE" };
      }

      const res = await uberFetch(`/v1/eats/stores/${config.store_id}/status`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await log("store_status", res.ok, res.ok ? `Store set to ${status}` : `Failed to set status (${res.status})`, res.ok ? null : res.body);

      if (res.ok) {
        await admin().from("uber_eats_config").update({ store_status: status }).eq("id", config.id);
      }
      return json({ success: res.ok, status, details: res.ok ? undefined : res.body }, res.ok ? 200 : 502);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("uber-eats-store", err);
    return json({ error: err.message }, 500);
  }
});