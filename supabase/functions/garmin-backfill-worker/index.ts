import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GARMIN_API_BASE = 'https://connectapi.garmin.com/modern/proxy';
const GARMIN_OAUTH_BASE = 'https://connectapi.garmin.com/oauth-service/oauth';
const CHUNK_SIZE_SECONDS = 86400; // 1 day (Garmin API limit)
const THROTTLE_MS = 200; // 200ms between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Initial retry delay

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
    let accessToken = tokenData.access_token;
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      // Refresh token if expired or expiring soon (within 5 minutes)
      const expiringThreshold = new Date(now.getTime() + 5 * 60 * 1000);
      if (expiresAt <= expiringThreshold) {
        console.log('Token expired or expiring soon, attempting refresh...');
        
        if (!tokenData.refresh_token) {
          await supabaseAdmin
            .from('garmin_backfill_jobs')
            .update({ 
              status: 'error',
              last_error: 'Token expired and no refresh token available - please reconnect Garmin',
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);
          throw new Error('Token expired - please reconnect Garmin');
        }

        try {
          // Refresh the token
          const refreshResponse = await fetch(`${GARMIN_OAUTH_BASE}/access_token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: Deno.env.get('GARMIN_CLIENT_ID') ?? '',
              client_secret: Deno.env.get('GARMIN_CLIENT_SECRET') ?? '',
            }),
          });

          if (!refreshResponse.ok) {
            const errorText = await refreshResponse.text();
            console.error('Token refresh failed:', errorText);
            await supabaseAdmin
              .from('garmin_backfill_jobs')
              .update({ 
                status: 'error',
                last_error: 'Failed to refresh token - please reconnect Garmin',
                updated_at: new Date().toISOString() 
              })
              .eq('id', job.id);
            throw new Error('Failed to refresh token - please reconnect Garmin');
          }

          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;

          // Update token in database
          const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);
          await supabaseAdmin
            .from('garmin_tokens')
            .update({
              access_token: refreshData.access_token,
              refresh_token: refreshData.refresh_token || tokenData.refresh_token,
              expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', job.user_id);

          console.log('Token refreshed successfully');
        } catch (refreshError) {
          console.error('Error during token refresh:', refreshError);
          await supabaseAdmin
            .from('garmin_backfill_jobs')
            .update({ 
              status: 'error',
              last_error: 'Token refresh error - please reconnect Garmin',
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);
          throw new Error('Token refresh error - please reconnect Garmin');
        }
      }
    }

    let totalSynced = job.activities_synced || 0;
    let totalSkipped = job.activities_skipped || 0;
    let currentDate = job.progress_date ? new Date(job.progress_date) : new Date(job.start_date);
    const endDate = new Date(job.end_date);

    console.log(`Starting backfill from ${currentDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`Token info: has_token=${!!accessToken}, garmin_user_id=${tokenData.garmin_user_id}`);

    // Process day by day
    while (currentDate <= endDate) {
      const dayStart = Math.floor(currentDate.getTime() / 1000);
      const dayEnd = dayStart + CHUNK_SIZE_SECONDS;

      console.log(`Fetching activities for ${currentDate.toISOString().split('T')[0]}`);

      // Use Garmin Connect Partner API with Bearer authentication
      const activitiesUrl = `${GARMIN_API_BASE}/activitylist-service/activities/search/activities`;
      const params = new URLSearchParams({
        start: '0',
        limit: '100',
        startDate: currentDate.toISOString().split('T')[0],
        endDate: currentDate.toISOString().split('T')[0],
      });

      console.log(`Request URL: ${activitiesUrl}?${params.toString()}`);

      // Retry logic with exponential backoff
      let response: Response | null = null;
      let lastError: string | null = null;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          response = await fetch(`${activitiesUrl}?${params.toString()}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          });

          // If successful or non-retryable error, break
          if (response.ok || (response.status !== 429 && response.status !== 500 && response.status !== 503)) {
            break;
          }

          lastError = `HTTP ${response.status}`;
          console.log(`Retryable error: ${lastError}`);
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError.message : 'Network error';
          console.error(`Fetch error on attempt ${attempt + 1}:`, lastError);
          
          // Don't retry on network errors that aren't timeouts
          if (attempt === MAX_RETRIES - 1) {
            break;
          }
        }
      }

      if (!response || !response.ok) {
        const errorBody = response ? await response.text() : lastError || 'No response';
        const statusCode = response?.status || 0;
        console.error(`Failed to fetch activities after ${MAX_RETRIES} attempts: ${statusCode}`, errorBody);
        
        // If we get 401/403, it's likely an authentication issue
        if (statusCode === 401 || statusCode === 403) {
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
            last_error: `HTTP ${statusCode}: ${errorBody}`,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        
        await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
        continue;
      }

      const activities = await response.json();

      // Process each activity (response is an array)
      const activityList = Array.isArray(activities) ? activities : [];
      
      for (const activity of activityList) {
        // Map sport type first to check if supported
        const sportMode = mapGarminSportType(activity.activityType?.typeKey);
        
        // Skip if not a supported activity type
        if (!sportMode) {
          console.log(`Skipping activity ${activity.activityId} - unsupported type: ${activity.activityType?.typeKey}`);
          totalSkipped++;
          continue;
        }

        // Check if activity already exists
        const { data: existing } = await supabaseAdmin
          .from('activities')
          .select('id')
          .eq('user_id', job.user_id)
          .eq('garmin_activity_id', activity.activityId.toString())
          .maybeSingle();

        if (existing) {
          console.log(`Skipping existing activity ${activity.activityId}`);
          totalSkipped++;
          continue;
        }

        // Map and insert activity (Connect API uses different field names)
        const activityData = {
          user_id: job.user_id,
          garmin_activity_id: activity.activityId.toString(),
          external_sync_source: 'garmin',
          name: activity.activityName || 'Garmin Activity',
          date: activity.startTimeLocal || activity.startTimeGMT,
          duration_seconds: activity.duration ? Math.round(activity.duration) : 0,
          distance_meters: activity.distance,
          elevation_gain_meters: activity.elevationGain,
          avg_heart_rate: activity.averageHR ? Math.round(activity.averageHR) : null,
          max_heart_rate: activity.maxHR ? Math.round(activity.maxHR) : null,
          avg_power: activity.avgPower || null,
          max_power: activity.maxPower || null,
          normalized_power: activity.normPower || null,
          avg_speed_kmh: activity.averageSpeed ? activity.averageSpeed * 3.6 : null,
          calories: activity.calories ? Math.round(activity.calories) : null,
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
    'cycling': 'cycling',
    'road_biking': 'cycling',
    'mountain_biking': 'cycling',
    'gravel_cycling': 'cycling',
    'indoor_cycling': 'cycling',
    'virtual_ride': 'cycling',
    'running': 'running',
    'street_running': 'running',
    'trail_running': 'running',
    'treadmill_running': 'running',
    'track_running': 'running',
    'virtual_run': 'running',
    'swimming': 'swimming',
    'open_water_swimming': 'swimming',
    'lap_swimming': 'swimming',
    'pool_swimming': 'swimming',
  };
  
  return typeMap[garminType.toLowerCase()] || null;
}
