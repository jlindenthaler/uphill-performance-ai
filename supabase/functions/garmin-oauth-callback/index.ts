import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const GARMIN_CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET")!;
const FUNC_BASE = Deno.env.get("FUNCTION_BASE")!;

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    // 1. Look up PKCE data
    const { data: pkceData, error: pkceError } = await supabaseClient
      .from("oauth_pkce")
      .select("*")
      .eq("state", state)
      .single();

    if (pkceError || !pkceData) {
      console.error("PKCE lookup failed:", pkceError);
      return new Response("Invalid state", { status: 400 });
    }

    const { code_verifier, user_id, origin_url } = pkceData;

    // 2. Exchange code for tokens
    const tokenResponse = await fetch("https://connect.garmin.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        code,
        code_verifier,
        grant_type: "authorization_code",
        redirect_uri: `${FUNC_BASE}/garmin-oauth-callback`,
      }),
    });

    const rawText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error("Garmin token exchange failed:", rawText);
      return new Response("Token exchange failed", { status: 400 });
    }

    const tokenParams = new URLSearchParams(rawText);
    const access_token = tokenParams.get("access_token");
    const refresh_token = tokenParams.get("refresh_token");
    const expires_in = parseInt(tokenParams.get("expires_in") ?? "0");

    if (!access_token || !refresh_token) {
      console.error("Garmin token parse failed:", rawText);
      return new Response("Invalid token response from Garmin", { status: 400 });
    }

    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    // 3. Store tokens
    const { error: tokenError } = await supabaseClient
      .from("garmin_tokens")
      .upsert({
        user_id,
        access_token,
        refresh_token,
        expires_at,
      });

    if (tokenError) {
      console.error("Token storage failed:", tokenError);
    }

    // 4. Update profile connection flag
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({ garmin_connected: true })
      .eq("user_id", user_id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // 5. Redirect back to frontend
    const redirectUrl = origin_url ?? "https://uphill-ai.uphill.com.au";
    const finalUrl = `${redirectUrl}/settings/integrations?garmin=connected`;
    return Response.redirect(finalUrl, 302);

  } catch (err) {
    console.error("Garmin OAuth callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
