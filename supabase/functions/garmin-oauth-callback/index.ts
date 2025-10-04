// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
const CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET");
const FUNC_BASE = Deno.env.get("FUNCTION_BASE");
const REDIRECT_URI = `${FUNC_BASE}/garmin-oauth-callback`;
const TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
// 👤 Temporary test user (replace with real auth user later)
const TEST_USER_ID = "e91f0a35-b125-47d4-bafb-51187ef27089";
serve(async (req)=>{
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return new Response(JSON.stringify({
        error: "missing_code_or_state"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 1️⃣ Retrieve PKCE verifier
    const { data, error } = await sb.from("oauth_pkce").select("code_verifier").eq("state", state).single();
    if (error || !data) {
      console.error("State lookup failed:", error);
      return new Response(JSON.stringify({
        error: "invalid_state"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Delete PKCE row (one-time use)
    await sb.from("oauth_pkce").delete().eq("state", state);
    // 2️⃣ Exchange code + verifier for tokens
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("client_id", CLIENT_ID);
    form.set("client_secret", CLIENT_SECRET);
    form.set("code", code);
    form.set("code_verifier", data.code_verifier);
    form.set("redirect_uri", REDIRECT_URI);
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form.toString()
    });
    const raw = await r.text();
    if (!r.ok) {
      console.error("Token exchange failed", r.status, raw);
      return new Response(JSON.stringify({
        error: "token_exchange_failed",
        status: r.status,
        body: raw
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const token = JSON.parse(raw);
    const now = Date.now();
    const expiresAt = new Date(now + token.expires_in * 1000).toISOString();
    const refreshExpiresAt = new Date(now + token.refresh_token_expires_in * 1000).toISOString();
    // 3️⃣ Upsert tokens into DB
    const { error: upsertError } = await sb.from("garmin_tokens").upsert({
      user_id: TEST_USER_ID,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scope: token.scope,
      token_type: token.token_type,
      expires_at: expiresAt,
      refresh_expires_at: refreshExpiresAt
    }, {
      onConflict: "user_id"
    });
    if (upsertError) {
      console.error("Failed to store tokens:", upsertError);
      return new Response(JSON.stringify({
        error: "db_upsert_failed",
        details: upsertError.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 4️⃣ Return a simple success message
    return new Response(JSON.stringify({
      success: true,
      stored_for: TEST_USER_ID
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("Callback error:", e);
    return new Response(JSON.stringify({
      error: "server_error",
      message: e.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
