import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, getConfig, json, log, requireUser, uberFetch } from "../_shared/uberEats.ts";

/**
 * Uber Eats Integration Activation Suite
 * https://developer.uber.com/docs/eats/references/api/integration_activation_suite
 *
 * Actions:
 *  - list_stores        GET    /v1/eats/stores
 *  - get_activation     GET    /v1/eats/stores/{store_id}/pos_data
 *  - activate           POST   /v1/eats/stores/{store_id}/pos_data
 *  - update             PATCH  /v1/eats/stores/{store_id}/pos_data
 *  - deactivate         DELETE /v1/eats/stores/{store_id}/pos_data
 */

const ORDER_MANAGERS = ["ORDER_MANAGER_UBER", "ORDER_MANAGER_POS"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action ?? "get_activation");
    const config = await getConfig();

    if (action === "list_stores") {
      const res = await uberFetch("/v1/eats/stores");
      if (!res.ok) return json({ error: `Uber Eats error (${res.status})`, details: res.body }, 502);
      return json({ success: true, stores: res.body?.stores ?? res.body });
    }

    const storeId = String(body.store_id ?? config?.store_id ?? "");
    if (!storeId) return json({ error: "Set your Uber Eats Store ID in Settings first." }, 400);

    if (action === "get_activation") {
      const res = await uberFetch(`/v1/eats/stores/${storeId}/pos_data`);
      if (res.ok && config?.id) {
        await admin().from("uber_eats_config").update({
          activation_status: res.body?.integration_enabled === false ? "DISABLED" : "ENABLED",
          pos_integration_enabled: res.body?.integration_enabled !== false,
          order_manager: res.body?.order_manager ?? config.order_manager ?? null,
          integrator_store_id: res.body?.integrator_store_id ?? config.integrator_store_id ?? null,
          integrator_brand_id: res.body?.integrator_brand_id ?? config.integrator_brand_id ?? null,
        }).eq("id", config.id);
      }
      return json({ success: res.ok, status: res.status, activation: res.body }, res.ok ? 200 : 502);
    }

    if (action === "activate" || action === "update") {
      const integratorStoreId = String(body.integrator_store_id ?? config?.integrator_store_id ?? storeId);
      const orderManager = ORDER_MANAGERS.includes(String(body.order_manager))
        ? String(body.order_manager)
        : "ORDER_MANAGER_POS";

      const payload: Record<string, unknown> = {
        integrator_store_id: integratorStoreId,
        integration_enabled: body.integration_enabled !== false,
        order_manager: orderManager,
      };
      const brandId = body.integrator_brand_id ?? config?.integrator_brand_id;
      if (brandId) payload.integrator_brand_id = String(brandId);
      if (body.store_configuration_data) payload.store_configuration_data = body.store_configuration_data;

      const res = await uberFetch(`/v1/eats/stores/${storeId}/pos_data`, {
        method: action === "update" ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      await log(
        action === "update" ? "activation_update" : "activation_activate",
        res.ok,
        res.ok ? `POS integration ${action}d for store ${storeId}` : `Activation failed (${res.status})`,
        res.ok ? payload : res.body,
      );

      if (res.ok && config?.id) {
        await admin().from("uber_eats_config").update({
          integrator_store_id: integratorStoreId,
          integrator_brand_id: brandId ? String(brandId) : null,
          order_manager: orderManager,
          pos_integration_enabled: body.integration_enabled !== false,
          activation_status: body.integration_enabled !== false ? "ENABLED" : "DISABLED",
          activated_at: new Date().toISOString(),
        }).eq("id", config.id);
      }

      return json({ success: res.ok, status: res.status, details: res.body, payload }, res.ok ? 200 : 502);
    }

    if (action === "deactivate") {
      const res = await uberFetch(`/v1/eats/stores/${storeId}/pos_data`, { method: "DELETE" });
      await log("activation_deactivate", res.ok, res.ok ? `POS integration removed for ${storeId}` : `Deactivate failed (${res.status})`, res.ok ? null : res.body);
      if (res.ok && config?.id) {
        await admin().from("uber_eats_config").update({
          pos_integration_enabled: false,
          activation_status: "DISABLED",
        }).eq("id", config.id);
      }
      return json({ success: res.ok, status: res.status, details: res.body }, res.ok ? 200 : 502);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("uber-eats-activation", err);
    await log("activation", false, err.message);
    return json({ error: err.message }, 500);
  }
});
