import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const GARMIN_CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET")!;
const FUNC_BASE = Deno.env.get("FUNCTION_BASE")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    const { data: pkceRow } = await supabase.from("oauth_pkce").select("*").eq("state", state).maybeSingle();
    if (!pkceRow) {
      console.error("PKCE lookup failed");
      return new Response("Invalid state", { status: 400 });
    }

    const tokenResponse = await fetch("https://connectapi.garmin.com/oauth-service/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        code,
        code_verifier: pkceRow.code_verifier,
        grant_type: "authorization_code",
        redirect_uri: `${FUNC_BASE}/garmin-oauth-callback`,
      }),
    });

    const tokenText = await tokenResponse.text();
    const tokenData = Object.fromEntries(new URLSearchParams(tokenText));

    if (!tokenResponse.ok) {
      console.error("Garmin token exchange failed:", tokenText);
      return new Response("Token exchange failed", { status: 400 });
    }

    await supabase.from("garmin_tokens").upsert({
      user_id: pkceRow.user_id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString(),
    });

    await supabase.from("profiles").update({ garmin_connected: true }).eq("user_id", pkceRow.user_id);

    const finalUrl = `${pkceRow.origin_url || "https://uphill-ai.uphill.com.au"}/settings/integrations?garmin=connected`;
    return Response.redirect(finalUrl, 302);
  } catch (err) {
    console.error("Garmin OAuth callback error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
