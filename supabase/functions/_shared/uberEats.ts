import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-uber-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

export const UBER_API = "https://api.uber.com";
const UBER_AUTH = "https://auth.uber.com/oauth/v2/token";

export const UBER_SCOPES = [
  "eats.store",
  "eats.store.status.write",
  "eats.store.orders.read",
  "eats.order",
  "eats.pos_provisioning",
].join(" ");

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Verify the caller is a signed-in staff user; returns the user id. */
export async function requireUser(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Unauthorized");
  return data.claims.sub as string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getUberToken(): Promise<string> {
  const clientId = Deno.env.get("UBER_EATS_CLIENT_ID");
  const clientSecret = Deno.env.get("UBER_EATS_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Uber Eats credentials are not configured (UBER_EATS_CLIENT_ID / UBER_EATS_CLIENT_SECRET).");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const res = await fetch(UBER_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: UBER_SCOPES,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Uber auth failed (${res.status}): ${JSON.stringify(body)}`);
  cachedToken = {
    token: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in ?? 2592000) * 1000),
  };
  return cachedToken.token;
}

export async function uberFetch(path: string, init: RequestInit = {}) {
  const token = await getUberToken();
  const res = await fetch(`${UBER_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
  return { ok: res.ok, status: res.status, body: parsed };
}

export async function getConfig() {
  const supabase = admin();
  const { data } = await supabase.from("uber_eats_config").select("*").limit(1).maybeSingle();
  return data;
}

export async function log(action: string, success: boolean, message: string, details?: unknown) {
  try {
    await admin().from("uber_eats_sync_log").insert({
      action,
      success,
      message: String(message).slice(0, 2000),
      details: (details ?? null) as any,
    });
  } catch (e) {
    console.error("sync log failed", e);
  }
}

/** Verify Uber webhook HMAC-SHA256 signature (hex) of the raw body using the client secret. */
export async function verifyUberSignature(rawBody: string, signature: string | null): Promise<boolean> {
  const secret = Deno.env.get("UBER_EATS_CLIENT_SECRET");
  if (!secret || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  const a = new TextEncoder().encode(hex.toLowerCase());
  const b = new TextEncoder().encode(signature.trim().toLowerCase());
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}