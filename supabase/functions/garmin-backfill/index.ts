import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // ✅ Authenticated Supabase client
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });
    // ✅ Verify user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const { daysBack = 90 } = await req.json().catch(()=>({
        daysBack: 90
      }));
    console.log(`Backfill: user=${user.id}, daysBack=${daysBack}`);
    // ✅ Get token
    const { data: tokenData, error: tokenError } = await supabase.from("garmin_tokens").select("access_token, expires_at").eq("user_id", user.id).single();
    if (tokenError || !tokenData?.access_token) {
      return new Response(JSON.stringify({
        error: "Garmin not connected"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const accessToken = tokenData.access_token;
    // ✅ Date range chunking
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    const chunkMs = 30 * 24 * 60 * 60 * 1000; // 30 days per chunk
    let currentStart = startDate.getTime();
    let inserted = 0;
    let skipped = 0;
    while(currentStart < endDate.getTime()){
      const currentEnd = Math.min(currentStart + chunkMs, endDate.getTime());
      const url = `${GARMIN_API_BASE}/activities?uploadStartTimeInSeconds=${Math.floor(currentStart / 1000)}&uploadEndTimeInSeconds=${Math.floor(currentEnd / 1000)}`;
      console.log(`Fetching activities: ${new Date(currentStart).toISOString()} → ${new Date(currentEnd).toISOString()}`);
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        console.error(`Failed to fetch: ${response.status}`);
        currentStart = currentEnd;
        continue;
      }
      const activities = await response.json();
      if (!Array.isArray(activities) || activities.length === 0) {
        currentStart = currentEnd;
        continue;
      }
      for (const act of activities){
        const summaryId = act.summaryId?.toString();
        if (!summaryId) continue;
        // ✅ Check if exists
        const { data: existing } = await supabase.from("activities").select("id").eq("garmin_activity_id", summaryId).eq("user_id", user.id).maybeSingle();
        if (existing) {
          skipped++;
          continue;
        }
        const mapped = {
          user_id: user.id,
          garmin_activity_id: summaryId,
          name: act.activityName || "Garmin Activity",
          date: act.startTimeInSeconds ? new Date(act.startTimeInSeconds * 1000).toISOString() : new Date().toISOString(),
          duration_seconds: act.durationInSeconds || 0,
          distance_meters: act.distanceInMeters || null,
          elevation_gain_meters: act.elevationGainInMeters || null,
          avg_heart_rate: act.averageHeartRateInBeatsPerMinute || null,
          max_heart_rate: act.maxHeartRateInBeatsPerMinute || null,
          calories: act.activeKilocalories || null,
          sport_mode: mapGarminSportType(act.activityType),
          activity_type: "normal",
          external_sync_source: "garmin"
        };
        const { error: insertError } = await supabase.from("activities").insert(mapped);
        if (insertError) {
          console.error(`Insert failed for ${summaryId}:`, insertError);
          skipped++;
          continue;
        }
        inserted++;
        // ✅ Queue job for worker to download FIT later
        await supabase.from("garmin_backfill_jobs").insert({
          user_id: user.id,
          summary_id: summaryId,
          status: "pending"
        });
      }
      currentStart = currentEnd;
    }
    return new Response(JSON.stringify({
      success: true,
      inserted,
      skipped
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
function mapGarminSportType(type: string | null | undefined): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes("run")) return "running";
  if (t.includes("bike") || t.includes("cycling")) return "cycling";
  if (t.includes("swim")) return "swimming";
  return null;
}
