// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// --- Load Secrets ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GARMIN_CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID");
const GARMIN_CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET");
const TOKEN_URL = "https://connect.garmin.com/oauth2/token";
const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
serve(async ()=>{
  try {
    console.log("Starting Garmin token refresh job...");
    // 1️⃣ Get all stored tokens (user_id, refresh_token, expiry)
    const { data: tokens, error: fetchErr } = await sb.from("garmin_tokens").select("user_id, refresh_token, expires_at");
    if (fetchErr) {
      console.error("Failed to fetch tokens:", fetchErr.message);
      return new Response(JSON.stringify({
        error: fetchErr.message
      }), {
        status: 500
      });
    }
    if (!tokens || tokens.length === 0) {
      console.log("No tokens to refresh.");
      return new Response(JSON.stringify({
        success: true,
        message: "No tokens found"
      }), {
        status: 200
      });
    }
    // 2️⃣ Loop through tokens and refresh only those expiring soon
    const now = Date.now();
    const soonThreshold = 12 * 60 * 60 * 1000; // 12 hours in ms
    for (const row of tokens){
      const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0;
      if (expiresAt - now > soonThreshold) {
        console.log(`Skipping refresh for ${row.user_id}: expires later`);
        continue;
      }
      console.log(`Refreshing token for user: ${row.user_id}`);
      const body = new URLSearchParams();
      body.append("grant_type", "refresh_token");
      body.append("refresh_token", row.refresh_token);
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`)}`
        },
        body
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Garmin refresh failed for ${row.user_id}:`, text);
        continue;
      }
      const refreshed = await res.json();
      const { error: updateErr } = await sb.from("garmin_tokens").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + refreshed.refresh_token_expires_in * 1000).toISOString(),
        scope: refreshed.scope,
        token_type: refreshed.token_type
      }).eq("user_id", row.user_id);
      if (updateErr) {
        console.error(`DB update failed for ${row.user_id}:`, updateErr.message);
      } else {
        console.log(`Token refreshed successfully for ${row.user_id}`);
      }
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200
    });
  } catch (e) {
    console.error("Token refresh job failed:", e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500
    });
  }
});
