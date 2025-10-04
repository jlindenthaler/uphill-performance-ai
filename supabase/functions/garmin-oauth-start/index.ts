// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Load secrets ---
const CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const AUTH_URL = Deno.env.get("GARMIN_AUTH_URL")!; // should be: https://connect.garmin.com/oauth2Confirm
const FUNC_BASE = Deno.env.get("FUNCTION_BASE")!; // your Supabase functions base URL
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
// --- PKCE helper functions ---
async function sha256(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}
function b64url(u8: Uint8Array) {
  return btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function rnd(len = 64) {
  const cs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const r = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for(let i = 0; i < len; i++)out += cs[r[i] % cs.length];
  return out;
}
serve(async (req)=>{
  try {
    // Get origin from query parameter (passed from frontend)
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin") || "https://uphill.lovable.dev";
    
    // 1️⃣ Generate PKCE verifier & challenge
    const codeVerifier = rnd();
    const codeChallenge = b64url(await sha256(codeVerifier));
    // 2️⃣ Generate state (used as DB key)
    const state = crypto.randomUUID();
    // 3️⃣ Insert verifier and origin into DB with expiry (trigger handles expires_at)
    const { error } = await sb.from("oauth_pkce").insert({
      state,
      code_verifier: codeVerifier,
      origin_url: origin
    });
    if (error) {
      console.error("Failed to persist PKCE:", error);
      return new Response(JSON.stringify({
        error: "server_error",
        details: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // 4️⃣ Build Garmin authorization URL
    const REDIRECT_URI = `${FUNC_BASE}/garmin-oauth-callback`;
    const u = new URL(AUTH_URL);
    u.searchParams.set("client_id", CLIENT_ID);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("redirect_uri", REDIRECT_URI);
    u.searchParams.set("code_challenge", codeChallenge);
    u.searchParams.set("code_challenge_method", "S256");
    u.searchParams.set("state", state);
    // 5️⃣ Redirect the user to Garmin
    return new Response("Redirecting to Garmin…", {
      status: 302,
      headers: {
        Location: u.toString()
      }
    });
  } catch (e) {
    console.error("OAuth start failed:", e);
    const error = e as Error;
    return new Response(JSON.stringify({
      error: "server_error",
      message: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
