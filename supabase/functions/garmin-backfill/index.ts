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
    
    // ✅ Date range chunking (30 days per request as per Garmin docs)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysBack);
    const chunkMs = 30 * 24 * 60 * 60 * 1000; // 30 days per chunk (Garmin maximum)
    
    let currentStart = startDate.getTime();
    let requestsSent = 0;
    
    console.log(`Starting Garmin backfill: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    while(currentStart < endDate.getTime()){
      const currentEnd = Math.min(currentStart + chunkMs, endDate.getTime());
      
      // ✅ Use the official BACKFILL endpoint with correct parameters (per Garmin Activity API v1.2.3)
      const url = `${GARMIN_API_BASE}/backfill/activities?summaryStartTimeInSeconds=${Math.floor(currentStart / 1000)}&summaryEndTimeInSeconds=${Math.floor(currentEnd / 1000)}`;
      
      console.log(`Sending backfill request: ${new Date(currentStart).toISOString()} → ${new Date(currentEnd).toISOString()}`);
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json"
        }
      });
      
      // ✅ Backfill endpoint returns 202 Accepted (asynchronous processing)
      // Activities will arrive later via the garmin-webhook endpoint
      if (response.status === 202) {
        console.log(`✅ Backfill request accepted. Activities will arrive via webhook.`);
        requestsSent++;
      } else if (response.status === 409) {
        console.log(`⚠️ Duplicate backfill request (already processing): ${response.status}`);
        requestsSent++;
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`❌ Backfill request failed: ${response.status} - ${errorText}`);
        // Continue to next chunk even if one fails
      }
      
      currentStart = currentEnd;
    }
    
    console.log(`Backfill complete: ${requestsSent} request(s) sent to Garmin. Activities will arrive asynchronously via webhook.`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Backfill initiated for ${daysBack} days. Activities will sync via webhook.`,
      requestsSent
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
