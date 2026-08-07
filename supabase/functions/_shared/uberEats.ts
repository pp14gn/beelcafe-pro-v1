import { createClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-uber-signature",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

export const UBER_API = "https://api.uber.com";
const UBER_AUTH = "https://auth.uber.com/oauth/v2/token";

export const UBER_LOGIN_BASE = {
  sandbox: "https://sandbox-login.uber.com",
  production: "https://login.uber.com",
} as const;

export type UberEnv = keyof typeof UBER_LOGIN_BASE;

export function tokenUrl(env: UberEnv) {
  return `${UBER_LOGIN_BASE[env] ?? UBER_LOGIN_BASE.sandbox}/oauth/v2/token`;
}

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

/** Step 2: client-credentials grant — generate an access token from the app credentials. */
export async function requestClientCredentialsToken(scope: string, env: UberEnv) {
  const clientId = Deno.env.get("UBER_EATS_CLIENT_ID");
  const clientSecret = Deno.env.get("UBER_EATS_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Uber Eats credentials are not configured.");

  // Uber rejects a token request with "the current application environment is mismatched
  // with the OAuth server runtime environment" when the app was registered against a
  // different OAuth host. Try the selected host first, then the other known hosts.
  const candidates = Array.from(
    new Set([tokenUrl(env), UBER_AUTH, tokenUrl("production"), tokenUrl("sandbox")]),
  );

  let lastError = "";
  for (const url of candidates) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: scope || UBER_SCOPES,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return body as { access_token: string; token_type?: string; scope?: string; expires_in?: number };
    }
    lastError = `Token request failed at ${url} (${res.status}): ${JSON.stringify(body)}`;
    const err = String((body as any)?.error ?? "");
    const desc = String((body as any)?.error_description ?? "");
    const retryable = err === "unauthorized_client" || desc.includes("environment");
    if (!retryable) break;
  }
  throw new Error(lastError || "Token request failed");
}

/** Exchange an authorization code (step 4) for user access + refresh tokens. */
export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  env: UberEnv,
) {
  const clientId = Deno.env.get("UBER_EATS_CLIENT_ID");
  const clientSecret = Deno.env.get("UBER_EATS_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Uber Eats credentials are not configured.");

  const res = await fetch(tokenUrl(env), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  return body as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  };
}

/** Persist (single-row) the OAuth tokens obtained on behalf of the Uber user. */
export async function storeOAuthTokens(
  tokens: { access_token: string; refresh_token?: string; token_type?: string; scope?: string; expires_in?: number },
  env: UberEnv,
) {
  const supabase = admin();
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 2592000) * 1000).toISOString();
  const row = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_type: tokens.token_type ?? "Bearer",
    scope: tokens.scope ?? null,
    expires_at: expiresAt,
    environment: env,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await supabase.from("uber_eats_oauth").select("id").limit(1).maybeSingle();
  if (existing?.id) await supabase.from("uber_eats_oauth").update(row).eq("id", existing.id);
  else await supabase.from("uber_eats_oauth").insert(row);

  const { data: cfg } = await supabase.from("uber_eats_config").select("id").limit(1).maybeSingle();
  if (cfg?.id) {
    await supabase.from("uber_eats_config").update({
      authorized_at: new Date().toISOString(),
      authorized_scopes: tokens.scope ?? null,
      auth_environment: env,
    }).eq("id", cfg.id);
  }
  cachedToken = { token: tokens.access_token, expiresAt: Date.parse(expiresAt) };
}

/** Re-mint an expired token with the same scopes/environment via client credentials. */
async function renewStoredToken(row: any): Promise<string | null> {
  const env = (row?.environment ?? "production") as UberEnv;
  try {
    const tokens = await requestClientCredentialsToken(row?.scope ?? UBER_SCOPES, env);
    await storeOAuthTokens(tokens, env);
    return tokens.access_token;
  } catch (e: any) {
    await log("oauth_renew", false, e.message);
    return null;
  }
}

/** Returns the user-authorized token when available, otherwise a client-credentials token. */
export async function getUberToken(): Promise<string> {
  const clientId = Deno.env.get("UBER_EATS_CLIENT_ID");
  const clientSecret = Deno.env.get("UBER_EATS_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Uber Eats credentials are not configured (UBER_EATS_CLIENT_ID / UBER_EATS_CLIENT_SECRET).");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  // Prefer the stored token generated in Settings → Uber Eats.
  const { data: stored } = await admin()
    .from("uber_eats_oauth")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (stored?.access_token) {
    const expiresAt = stored.expires_at ? Date.parse(stored.expires_at) : 0;
    if (expiresAt > Date.now() + 60_000) {
      cachedToken = { token: stored.access_token, expiresAt };
      return stored.access_token;
    }
    const renewed = await renewStoredToken(stored);
    if (renewed) return renewed;
  }

  const body = await requestClientCredentialsToken(
    UBER_SCOPES,
    (stored?.environment ?? "production") as UberEnv,
  );
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