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
      .select('access_token, refresh_token, expires_at, garmin_user_id')
      .eq('user_id', job.user_id)
      .single();

    if (!tokenData?.access_token) {
      await supabaseAdmin
        .from('garmin_backfill_jobs')
        .update({ 
          status: 'error',
          last_error: 'Garmin token not found',
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      throw new Error('Garmin token not found');
    }

    // Check if token is expired and try to refresh
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      if (expiresAt <= now && tokenData.refresh_token) {
        console.log('Token expired, attempting refresh...');
        // Token refresh would go here - for now, error out
        await supabaseAdmin
          .from('garmin_backfill_jobs')
          .update({ 
            status: 'error',
            last_error: 'Token expired - please reconnect Garmin',
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        throw new Error('Token expired - please reconnect Garmin');
      }
    }

    let totalSynced = job.activities_synced || 0;
    let totalSkipped = job.activities_skipped || 0;
    let currentDate = job.progress_date ? new Date(job.progress_date) : new Date(job.start_date);
    const endDate = new Date(job.end_date);

    console.log(`Starting backfill from ${currentDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Token info: has_token=${!!tokenData.access_token}, garmin_user_id=${tokenData.garmin_user_id}`);

    // Process day by day
    while (currentDate <= endDate) {
      const dayStart = Math.floor(currentDate.getTime() / 1000);
      const dayEnd = dayStart + CHUNK_SIZE_SECONDS;

      console.log(`Fetching activities for ${currentDate.toISOString().split('T')[0]}`);

      // Use the correct Garmin API endpoint format
      const activitiesUrl = `${GARMIN_API_BASE}/activities`;
      const params = new URLSearchParams({
        uploadStartTimeInSeconds: dayStart.toString(),
        uploadEndTimeInSeconds: dayEnd.toString()
      });

      console.log(`Request URL: ${activitiesUrl}?${params.toString()}`);

      const response = await fetch(`${activitiesUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch activities: ${response.status}`, errorBody);
        console.error(`Response headers:`, Object.fromEntries(response.headers.entries()));
        
        // If we get 401/403, mark job as error (token issue)
        if (response.status === 401 || response.status === 403) {
          await supabaseAdmin
            .from('garmin_backfill_jobs')
            .update({ 
              status: 'error',
              last_error: `Authentication failed: ${errorBody}. Please reconnect Garmin.`,
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);
          throw new Error('Authentication failed - please reconnect Garmin');
        }
        
        // Move to next day on other errors to avoid getting stuck
        currentDate.setDate(currentDate.getDate() + 1);
        
        await supabaseAdmin
          .from('garmin_backfill_jobs')
          .update({ 
            progress_date: currentDate.toISOString(),
            last_error: `HTTP ${response.status}: ${errorBody}`,
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
          avg_heart_rate: activity.averageHeartRateInBeatsPerMinute ? Math.round(activity.averageHeartRateInBeatsPerMinute) : null,
          max_heart_rate: activity.maxHeartRateInBeatsPerMinute ? Math.round(activity.maxHeartRateInBeatsPerMinute) : null,
          calories: activity.activeKilocalories ? Math.round(activity.activeKilocalories) : null,
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
