// Garmin Backfill Edge Function
// Handles historical activity import in 1-day chunks with token refresh and a 1-year cap

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";
const CHUNK_MS = 24 * 60 * 60 * 1000; // 1 day
const MAX_DAYS_PER_RUN = 365; // 1 year cap per import run
const CLIENT_ID = Deno.env.get("GARMIN_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GARMIN_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

// 🔄 Refresh token helper
async function ensureGarminToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from("garmin_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) throw new Error("Garmin not connected");

  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt > new Date()) {
    return tokenRow.access_token;
  }

  // Refresh
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

// 🏃 Backfill main
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Params
    const { startDate, endDate } = await req.json().catch(() => ({}));

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - MAX_DAYS_PER_RUN * CHUNK_MS);

    const totalDaysRequested = Math.ceil((end.getTime() - start.getTime()) / CHUNK_MS);
    const cappedDays = Math.min(totalDaysRequested, MAX_DAYS_PER_RUN);

    // Adjust end if needed
    const cappedEnd = new Date(start.getTime() + cappedDays * CHUNK_MS);

    console.log(`Backfill requested: ${totalDaysRequested} days, capped at ${cappedDays}`);

    let current = start.getTime();
    let inserted = 0;
    let skipped = 0;

    for (let day = 0; day < cappedDays; day++) {
      const currentEnd = current + CHUNK_MS;
      const accessToken = await ensureGarminToken(supabase, user.id);

      const url = `${GARMIN_API_BASE}/activities?uploadStartTimeInSeconds=${Math.floor(current / 1000)}&uploadEndTimeInSeconds=${Math.floor(currentEnd / 1000)}`;
      console.log(`Fetching: ${new Date(current).toISOString()} → ${new Date(currentEnd).toISOString()}`);

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      });

      if (!res.ok) {
        console.error(`Garmin fetch failed: ${res.status} ${res.statusText}`);
        current = currentEnd;
        continue;
      }

      const activities = await res.json();
      if (!Array.isArray(activities) || activities.length === 0) {
        current = currentEnd;
        continue;
      }

      const mapped = activities.map((act: any) => ({
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
      })).filter((x: any) => x.garmin_activity_id);

      if (mapped.length > 0) {
        const { error } = await supabase
          .from("activities")
          .upsert(mapped, { onConflict: "user_id,garmin_activity_id" });
        if (error) {
          console.error("Insert error:", error);
        } else {
          inserted += mapped.length;
        }
      }

      // optional: small delay to avoid hammering Garmin
      await new Promise(r => setTimeout(r, 200));

      current = currentEnd;
    }

    const remainingYears = Math.max(0, Math.ceil(totalDaysRequested / 365) - 1);

    return new Response(JSON.stringify({
      success: true,
      inserted,
      skipped,
      totalDaysProcessed: cappedDays,
      capped: totalDaysRequested > cappedDays,
      remainingYears,
      message: remainingYears > 0
        ? `Imported ${cappedDays} days (~1 year) of Garmin history. ${remainingYears} more year(s) remaining — run again tomorrow to continue.`
        : `Imported ${cappedDays} days of Garmin history successfully.`,
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

function mapGarminSportType(type: string) {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes("run")) return "running";
  if (t.includes("bike") || t.includes("cycling")) return "cycling";
  if (t.includes("swim")) return "swimming";
  return null;
}
