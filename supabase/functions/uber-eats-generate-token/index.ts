import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  json,
  log,
  requireUser,
  requestClientCredentialsToken,
  storeOAuthTokens,
  UBER_SCOPES,
  type UberEnv,
} from "../_shared/uberEats.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    await requireUser(req);
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const env: UberEnv = body?.environment === "production" ? "production" : "sandbox";
    const scope = typeof body?.scope === "string" && body.scope.trim() ? body.scope.trim() : UBER_SCOPES;

    const tokens = await requestClientCredentialsToken(scope, env);
    await storeOAuthTokens(tokens, env);
    await log("oauth_token", true, `Access token generated (${env}) with scopes: ${tokens.scope ?? scope}`);

    return json({
      success: true,
      message: "Access token generated and stored",
      environment: env,
      scope: tokens.scope ?? scope,
      expires_in: tokens.expires_in ?? null,
    });
  } catch (err: any) {
    await log("oauth_token", false, err.message);
    return json({ error: err.message }, 400);
  }
});
