// Garmin Backfill Edge Function - Pagination Version (No Time Parameters)
// Fetches historical activities page-by-page and filters locally by date

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";
const CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MAX_DAYS_PER_RUN = 365; // limit to 1 year per run for large histories

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔄 Ensure token is valid / refresh if needed
async function ensureGarminToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from("garmin_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) {
    throw new Error("Garmin not connected");
  }

  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt > new Date()) {
    return tokenRow.access_token;
  }

  const res = await fetch("https://apis.garmin.com/wellness-api/rest/oauth2/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokenRow.refresh_token,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Garmin token refresh failed:", errText);
    throw new Error("Failed to refresh Garmin token");
  }

  const newTokens = await res.json();
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  await supabase.from("garmin_tokens").update({
    access_token: newTokens.access_token,
    expires_at: newExpiresAt,
    refresh_token: newTokens.refresh_token ?? tokenRow.refresh_token,
  }).eq("user_id", userId);

  return newTokens.access_token;
}

// 🧠 Sport type mapper
function mapGarminSportType(type: string) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes("run")) return "running";
  if (t.includes("bike") || t.includes("cycling")) return "cycling";
  if (t.includes("swim")) return "swimming";
  return null;
}

// 🏃 Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Parse request
    const { startDate, endDate } = await req.json().catch(() => ({}));
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing startDate or endDate" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const cappedDays = Math.min(totalDays, MAX_DAYS_PER_RUN);
    const cappedEnd = new Date(start.getTime() + cappedDays * 24 * 60 * 60 * 1000);
    const startSec = Math.floor(start.getTime() / 1000);
    const endSec = Math.floor(cappedEnd.getTime() / 1000);

    console.log(`Garmin backfill: ${start.toISOString()} → ${cappedEnd.toISOString()}`);

    const accessToken = await ensureGarminToken(supabase, user.id);

    // 🚀 Pagination loop
    let page = 1;
    let inserted = 0;
    let skipped = 0;

    while (true) {
      const url = `${GARMIN_API_BASE}/activities?page=${page}`;
      console.log(`Fetching Garmin page ${page}: ${url}`);

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Garmin fetch failed [${res.status}] page ${page}: ${errText}`);
        break;
      }

      const activities = await res.json();
      if (!Array.isArray(activities) || activities.length === 0) {
        console.log(`Page ${page}: no more activities, stopping.`);
        break;
      }

      // Filter activities locally by start date
      const filtered = activities.filter((act: any) => {
        const ts = act.startTimeInSeconds;
        return ts && ts >= startSec && ts < endSec;
      });

      if (filtered.length > 0) {
        const mapped = filtered.map((act: any) => ({
          user_id: user.id,
          garmin_activity_id: act.summaryId?.toString(),
          name: act.activityName || "Garmin Activity",
          date: act.startTimeInSeconds
            ? new Date(act.startTimeInSeconds * 1000).toISOString()
            : new Date().toISOString(),
          duration_seconds: act.durationInSeconds || 0,
          distance_meters: act.distanceInMeters || null,
          elevation_gain_meters: act.elevationGainInMeters || null,
          avg_heart_rate: act.averageHeartRateInBeatsPerMinute || null,
          max_heart_rate: act.maxHeartRateInBeatsPerMinute || null,
          calories: act.activeKilocalories || null,
          sport_mode: mapGarminSportType(act.activityType),
          external_sync_source: "garmin",
        })).filter(x => x.garmin_activity_id);

        const { error: insertError } = await supabase
          .from("activities")
          .upsert(mapped, { onConflict: "user_id,garmin_activity_id" });

        if (insertError) {
          console.error(`Supabase insert error page ${page}:`, insertError);
        } else {
          inserted += mapped.length;
        }
      }

      page++;
      await new Promise(r => setTimeout(r, 150)); // avoid hammering Garmin
    }

    const remainingYears = Math.max(0, Math.ceil(totalDays / 365) - 1);

    return new Response(JSON.stringify({
      success: true,
      inserted,
      skipped,
      start: start.toISOString(),
      end: cappedEnd.toISOString(),
      totalDaysProcessed: cappedDays,
      remainingYears,
      message: remainingYears > 0
        ? `Imported activities from ${start.toISOString()} to ${cappedEnd.toISOString()} (~1 year). ${remainingYears} more year(s) remaining — run again tomorrow to continue.`
        : `Imported activities from ${start.toISOString()} to ${cappedEnd.toISOString()} successfully.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Backfill error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
