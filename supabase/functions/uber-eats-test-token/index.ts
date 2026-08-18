import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { admin, corsHeaders, getConfig, json, log, requireUser } from "../_shared/uberEats.ts";

// Sandbox guide: https://developer.uber.com/docs/eats/guides/sandbox
const API_BASE = {
  sandbox: "https://sandbox-api.uber.com",
  production: "https://api.uber.com",
} as const;

async function probe(base: string, path: string, token: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const text = await res.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    return { path, status: res.status, ok: res.ok, ms: Date.now() - started, body };
  } catch (e: any) {
    return { path, status: 0, ok: false, ms: Date.now() - started, body: { error: e.message } };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { data: stored } = await admin()
      .from("uber_eats_oauth")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!stored?.access_token) {
      return json({ error: "No access token stored yet. Generate one first." }, 400);
    }

    const env = (stored.environment === "production" ? "production" : "sandbox") as keyof typeof API_BASE;
    const base = API_BASE[env];
    const expiresAt = stored.expires_at ? Date.parse(stored.expires_at) : 0;
    const expired = expiresAt > 0 && expiresAt <= Date.now();

    const config = await getConfig();
    const storeId = config?.store_id ?? null;

    const checks = [await probe(base, "/v1/eats/stores", stored.access_token)];
    if (storeId) {
      checks.push(await probe(base, `/v1/eats/stores/${storeId}`, stored.access_token));
      checks.push(await probe(base, `/v1/eats/stores/${storeId}/status`, stored.access_token));
    }

    const authOk = checks.every((c) => c.status !== 401 && c.status !== 403);
    const summary = authOk
      ? "Token accepted by Uber (no 401/403 responses)."
      : "Uber rejected the token (401/403) — regenerate it or check scopes/environment.";

    await log("token_test", authOk, `${summary} env=${env}`, checks);

    return json({
      success: true,
      environment: env,
      api_base: base,
      token_preview: `${String(stored.access_token).slice(0, 8)}…`,
      token_type: stored.token_type ?? "Bearer",
      scope: stored.scope ?? null,
      expires_at: stored.expires_at ?? null,
      expired,
      store_id: storeId,
      auth_ok: authOk,
      summary,
      checks,
    });
  } catch (err: any) {
    await log("token_test", false, err.message);
    return json({ error: err.message }, 500);
  }
});
