import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting FIT worker job processing...");

    // Get pending jobs (limit to 10 at a time)
    const { data: jobs, error: jobsError } = await supabase
      .from("garmin_fit_jobs")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3) // Max 3 attempts
      .order("created_at", { ascending: true })
      .limit(10);

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      throw jobsError;
    }

    if (!jobs || jobs.length === 0) {
      console.log("No pending jobs found");
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobs.length} pending jobs`);
    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        console.log(`Processing job ${job.id} for activity ${job.garmin_activity_id}`);

        // Update attempts
        await supabase
          .from("garmin_fit_jobs")
          .update({ 
            attempts: job.attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);

        // Get user's Garmin token
        const { data: tokenData, error: tokenError } = await supabase
          .from("garmin_tokens")
          .select("access_token")
          .eq("user_id", job.user_id)
          .single();

        if (tokenError || !tokenData?.access_token) {
          console.error(`No token found for user ${job.user_id}`);
          await supabase
            .from("garmin_fit_jobs")
            .update({
              status: "error",
              last_error: "No Garmin token found",
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);
          failed++;
          continue;
        }

        // Fetch activity details from Garmin
        const detailsUrl = `${GARMIN_API_BASE}/activityDetails/${job.garmin_activity_id}`;
        console.log(`Fetching activity details from: ${detailsUrl}`);

        const detailsResponse = await fetch(detailsUrl, {
          headers: {
            "Authorization": `Bearer ${tokenData.access_token}`,
            "Accept": "application/json",
          },
        });

        if (!detailsResponse.ok) {
          const errorText = await detailsResponse.text();
          console.error(`Failed to fetch activity details: ${detailsResponse.status} - ${errorText}`);
          
          await supabase
            .from("garmin_fit_jobs")
            .update({
              status: job.attempts + 1 >= 3 ? "error" : "pending",
              last_error: `HTTP ${detailsResponse.status}: ${errorText}`,
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);
          
          failed++;
          continue;
        }

        const activityDetails = await detailsResponse.json();
        console.log(`Received activity details with ${activityDetails.samples?.length || 0} samples`);

        // Parse and store the time series data
        const samples = activityDetails.samples || [];
        
        const powerSeries: number[] = [];
        const heartRateSeries: number[] = [];
        const cadenceSeries: number[] = [];
        const speedSeries: number[] = [];
        const distanceSeries: number[] = [];
        const altitudeSeries: number[] = [];
        const temperatureSeries: number[] = [];
        const timeSeries: number[] = [];
        const gpsData: any[] = [];

        for (const sample of samples) {
          timeSeries.push(sample.startTimeInSeconds || 0);
          powerSeries.push(sample.powerInWatts || 0);
          heartRateSeries.push(sample.heartRate || 0);
          cadenceSeries.push(sample.bikeCadenceInRPM || 0);
          speedSeries.push(sample.speedMetersPerSecond || 0);
          distanceSeries.push(sample.totalDistanceInMeters || 0);
          altitudeSeries.push(sample.elevationInMeters || 0);
          temperatureSeries.push(sample.airTemperatureCelcius || 0);

          if (sample.latitudeInDegree && sample.longitudeInDegree) {
            gpsData.push({
              lat: sample.latitudeInDegree,
              lon: sample.longitudeInDegree,
              alt: sample.elevationInMeters,
              time: sample.startTimeInSeconds,
            });
          }
        }

        // Update activity with time series data
        const { error: updateError } = await supabase
          .from("activities")
          .update({
            power_time_series: powerSeries.length > 0 ? powerSeries : null,
            heart_rate_time_series: heartRateSeries.length > 0 ? heartRateSeries : null,
            cadence_time_series: cadenceSeries.length > 0 ? cadenceSeries : null,
            speed_time_series: speedSeries.length > 0 ? speedSeries : null,
            distance_time_series: distanceSeries.length > 0 ? distanceSeries : null,
            altitude_time_series: altitudeSeries.length > 0 ? altitudeSeries : null,
            temperature_time_series: temperatureSeries.length > 0 ? temperatureSeries : null,
            time_time_series: timeSeries.length > 0 ? timeSeries : null,
            gps_data: gpsData.length > 0 ? gpsData : null,
            updated_at: new Date().toISOString()
          })
          .eq("garmin_activity_id", job.garmin_activity_id)
          .eq("user_id", job.user_id);

        if (updateError) {
          console.error(`Failed to update activity: ${updateError.message}`);
          await supabase
            .from("garmin_fit_jobs")
            .update({
              status: "error",
              last_error: `Failed to update activity: ${updateError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq("id", job.id);
          failed++;
          continue;
        }

        // Mark job as completed
        await supabase
          .from("garmin_fit_jobs")
          .update({
            status: "completed",
            last_error: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);

        console.log(`✅ Successfully processed activity ${job.garmin_activity_id}`);
        processed++;

      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        await supabase
          .from("garmin_fit_jobs")
          .update({
            status: job.attempts + 1 >= 3 ? "error" : "pending",
            last_error: jobError instanceof Error ? jobError.message : "Unknown error",
            updated_at: new Date().toISOString()
          })
          .eq("id", job.id);
        failed++;
      }
    }

    console.log(`Worker completed: ${processed} processed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Worker completed",
        processed,
        failed,
        total: jobs.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
