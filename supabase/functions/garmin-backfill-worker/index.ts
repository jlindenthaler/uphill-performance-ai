import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';
const CHUNK_SIZE_SECONDS = 86400; // 1 day (Garmin API limit)
const THROTTLE_MS = 200; // 200ms between requests

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the oldest pending job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('garmin_backfill_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (jobError || !job) {
      console.log('No pending jobs found');
      return new Response(JSON.stringify({ message: 'No jobs to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing job ${job.id} for user ${job.user_id}`);

    // Mark job as running
    await supabaseAdmin
      .from('garmin_backfill_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    // Get Garmin token
    const { data: tokenData } = await supabaseAdmin
      .from('garmin_tokens')
      .select('access_token')
      .eq('user_id', job.user_id)
      .single();

    if (!tokenData?.access_token) {
      throw new Error('Garmin token not found');
    }

    let totalSynced = job.activities_synced || 0;
    let totalSkipped = job.activities_skipped || 0;
    let currentDate = job.progress_date ? new Date(job.progress_date) : new Date(job.start_date);
    const endDate = new Date(job.end_date);

    // Process day by day
    while (currentDate <= endDate) {
      const dayStart = Math.floor(currentDate.getTime() / 1000);
      const dayEnd = dayStart + CHUNK_SIZE_SECONDS;

      console.log(`Fetching activities for ${currentDate.toISOString().split('T')[0]}`);

      const activitiesUrl = `${GARMIN_API_BASE}/activities?uploadStartTimeInSeconds=${dayStart}&uploadEndTimeInSeconds=${dayEnd}`;

      const response = await fetch(activitiesUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch activities: ${response.status}`, errorBody);
        
        // Move to next day even on error to avoid getting stuck
        currentDate.setDate(currentDate.getDate() + 1);
        
        await supabaseAdmin
          .from('garmin_backfill_jobs')
          .update({ 
            progress_date: currentDate.toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        
        await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
        continue;
      }

      const activities = await response.json();

      // Process each activity
      for (const activity of activities) {
        // Map sport type first to check if supported
        const sportMode = mapGarminSportType(activity.activityType);
        
        // Skip if not a supported activity type
        if (!sportMode) {
          console.log(`Skipping activity ${activity.activityId} - unsupported type: ${activity.activityType}`);
          totalSkipped++;
          continue;
        }

        // Check if activity already exists
        const { data: existing } = await supabaseAdmin
          .from('activities')
          .select('id')
          .eq('user_id', job.user_id)
          .eq('garmin_activity_id', activity.activityId)
          .maybeSingle();

        if (existing) {
          console.log(`Skipping existing activity ${activity.activityId}`);
          totalSkipped++;
          continue;
        }

        // Map and insert activity
        const activityData = {
          user_id: job.user_id,
          garmin_activity_id: activity.activityId,
          external_sync_source: 'garmin',
          name: activity.activityName || 'Garmin Activity',
          date: new Date(activity.startTimeInSeconds * 1000).toISOString(),
          duration_seconds: activity.durationInSeconds || 0,
          distance_meters: activity.distanceInMeters,
          elevation_gain_meters: activity.elevationGainInMeters,
          avg_heart_rate: activity.averageHeartRateInBeatsPerMinute,
          max_heart_rate: activity.maxHeartRateInBeatsPerMinute,
          calories: activity.activeKilocalories,
          sport_mode: sportMode,
          activity_type: 'normal',
        };

        const { error: insertError } = await supabaseAdmin
          .from('activities')
          .insert(activityData);

        if (insertError) {
          console.error(`Failed to insert activity ${activity.activityId}:`, insertError);
        } else {
          totalSynced++;
        }
      }

      // Update job progress
      currentDate.setDate(currentDate.getDate() + 1);
      await supabaseAdmin
        .from('garmin_backfill_jobs')
        .update({ 
          progress_date: currentDate.toISOString(),
          activities_synced: totalSynced,
          activities_skipped: totalSkipped,
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);

      // Throttle to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
    }

    // Mark job as completed
    await supabaseAdmin
      .from('garmin_backfill_jobs')
      .update({ 
        status: 'completed', 
        activities_synced: totalSynced,
        activities_skipped: totalSkipped,
        updated_at: new Date().toISOString() 
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} completed: ${totalSynced} synced, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: job.id,
        synced: totalSynced, 
        skipped: totalSkipped 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Worker error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapGarminSportType(garminType: string | undefined): string | null {
  if (!garminType) return null;
  
  const typeMap: Record<string, string> = {
    'CYCLING': 'cycling',
    'ROAD_BIKING': 'cycling',
    'MOUNTAIN_BIKING': 'cycling',
    'GRAVEL_CYCLING': 'cycling',
    'INDOOR_CYCLING': 'cycling',
    'RUNNING': 'running',
    'TRAIL_RUNNING': 'running',
    'TREADMILL_RUNNING': 'running',
    'TRACK_RUNNING': 'running',
    'SWIMMING': 'swimming',
    'OPEN_WATER_SWIMMING': 'swimming',
    'LAP_SWIMMING': 'swimming',
  };
  
  return typeMap[garminType.toUpperCase()] || null;
}
