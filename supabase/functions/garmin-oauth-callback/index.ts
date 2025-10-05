// Garmin OAuth Callback Edge Function
// Handles token exchange, stores tokens, updates profile, and redirects back to the app

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const GARMIN_CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET")!;
const GARMIN_TOKEN_URL = "https://apis.garmin.com/wellness-api/rest/oauth2/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    // Retrieve PKCE data using state
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: pkceData, error: pkceError } = await supabaseAdmin
      .from("oauth_pkce")
      .select("code_verifier, user_id, origin_url")
      .eq("state", state)
      .maybeSingle();

    if (pkceError || !pkceData) {
      console.error("PKCE lookup failed:", pkceError);
      return new Response("Invalid state", { status: 400 });
    }

    const { code_verifier: codeVerifier, user_id: userId, origin_url: originUrl } = pkceData;

    // Exchange code for tokens
    const tokenRes = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Garmin token exchange failed:", errorText);
      return new Response("Token exchange failed", { status: 400 });
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in, garmin_user_id } = tokens;
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens in garmin_tokens table
    const { error: tokenInsertError } = await supabaseAdmin.from("garmin_tokens").upsert({
      user_id: userId,
      garmin_user_id: garmin_user_id?.toString(),
      access_token,
      refresh_token,
      expires_at: expiresAt,
    }, { onConflict: "user_id" });

    if (tokenInsertError) {
      console.error("Error inserting Garmin tokens:", tokenInsertError);
      return new Response("Failed to store tokens", { status: 500 });
    }

    // Update profiles.garmin_connected = true
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ garmin_connected: true })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // don't fail — tokens are still stored
    }

    // Clean up PKCE row (optional but good hygiene)
    await supabaseAdmin.from("oauth_pkce").delete().eq("state", state);

    // Build final redirect URL
    const baseRedirect = originUrl?.replace(/\/$/, "") || "https://your-app-domain.com/settings/integrations";
    const finalUrl = `${baseRedirect}?garmin=connected`;

    console.log(`Redirecting user ${userId} back to: ${finalUrl}`);

    return Response.redirect(finalUrl, 302);
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
