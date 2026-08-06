import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  exchangeAuthorizationCode,
  log,
  storeOAuthTokens,
  type UberEnv,
} from "../_shared/uberEats.ts";

function page(title: string, message: string, ok: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0c;color:#fafafa;display:grid;place-items:center;height:100vh;margin:0}
.card{max-width:420px;padding:28px;border-radius:14px;background:#17171a;border:1px solid #2a2a2f;text-align:center}
h1{font-size:18px;margin:0 0 8px}p{font-size:14px;color:#a1a1aa;margin:0;word-break:break-word}
.dot{font-size:34px}</style></head>
<body><div class="card"><div class="dot">${ok ? "✅" : "⚠️"}</div><h1>${title}</h1><p>${message}</p></div>
<script>
try{window.opener&&window.opener.postMessage({source:"uber-eats-oauth",ok:${ok}},"*");}catch(e){}
${ok ? "setTimeout(function(){window.close();},1500);" : ""}
</script></body></html>`,
    { status: ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state") ?? "";
  const env: UberEnv = state.includes("production") ? "production" : "sandbox";
  // The redirect_uri sent to Uber must match exactly what we used to authorize.
  const redirectUri = `${url.origin}${url.pathname}`;

  if (error) {
    await log("oauth_callback", false, `Authorization denied: ${error}`, null);
    return page("Authorization failed", error, false);
  }
  if (!code) return page("Missing code", "No authorization code was returned by Uber.", false);

  try {
    const tokens = await exchangeAuthorizationCode(code, redirectUri, env);
    await storeOAuthTokens(tokens, env);
    await log("oauth_callback", true, `App authorized (${env}) with scopes: ${tokens.scope ?? "n/a"}`, null);
    return page("App authorized", "You can close this window and return to the POS.", true);
  } catch (e: any) {
    await log("oauth_callback", false, e.message, null);
    return page("Authorization failed", e.message, false);
  }
});
