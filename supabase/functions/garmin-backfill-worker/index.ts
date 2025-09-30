import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GARMIN_HEALTH_API_BASE = 'https://apis.garmin.com/wellness-api/rest';
const GARMIN_OAUTH_BASE = 'https://connectapi.garmin.com/oauth-service/oauth';
const CHUNK_SIZE_SECONDS = 86400; // 1 day (Garmin Health API limit)
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

    // Process day by day using Garmin Health API
    while (currentDate <= endDate) {
      const dayStart = Math.floor(currentDate.getTime() / 1000);
      const dayEnd = dayStart + CHUNK_SIZE_SECONDS;

      console.log(`Fetching activities for ${currentDate.toISOString().split('T')[0]}`);

      // Step 1: Get activity summaries using Garmin Health API
      const summariesUrl = `${GARMIN_HEALTH_API_BASE}/activities?uploadStartTimeInSeconds=${dayStart}&uploadEndTimeInSeconds=${dayEnd}`;
      console.log(`Calling Health API: ${summariesUrl}`);

      let response: Response;
      try {
        response = await fetch(summariesUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        console.log(`Response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch activities (${response.status}):`, errorText.substring(0, 200));
          
          // If we get 401/403, it's likely an authentication issue
          if (response.status === 401 || response.status === 403) {
            await supabaseAdmin
              .from('garmin_backfill_jobs')
              .update({ 
                status: 'error',
                last_error: `Authentication failed. Please reconnect Garmin with 'activity' scope.`,
                updated_at: new Date().toISOString() 
              })
              .eq('id', job.id);
            throw new Error('Authentication failed - please reconnect Garmin');
          }
          
          // Move to next day on other errors
          currentDate.setDate(currentDate.getDate() + 1);
          await supabaseAdmin
            .from('garmin_backfill_jobs')
            .update({ 
              progress_date: currentDate.toISOString(),
              last_error: `HTTP ${response.status}: ${errorText}`,
              updated_at: new Date().toISOString() 
            })
            .eq('id', job.id);
          
          await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
          continue;
        }
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error';
        console.error('Fetch error:', errorMsg);
        
        currentDate.setDate(currentDate.getDate() + 1);
        await supabaseAdmin
          .from('garmin_backfill_jobs')
          .update({ 
            progress_date: currentDate.toISOString(),
            last_error: errorMsg,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id);
        
        await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
        continue;
      }

      const activities = await response.json();

      // Process each activity summary
      const activityList = Array.isArray(activities) ? activities : [];
      console.log(`Found ${activityList.length} activities for this day`);
      
      for (const summary of activityList) {
        const summaryId = summary.summaryId;
        const activityType = summary.activityType;
        
        // Map sport type first to check if supported
        const sportMode = mapGarminSportType(activityType);
        
        // Skip if not a supported activity type
        if (!sportMode) {
          console.log(`Skipping activity ${summaryId} - unsupported type: ${activityType}`);
          totalSkipped++;
          continue;
        }

        // Check if activity already exists
        const { data: existing } = await supabaseAdmin
          .from('activities')
          .select('id')
          .eq('user_id', job.user_id)
          .eq('garmin_activity_id', summaryId.toString())
          .maybeSingle();

        if (existing) {
          console.log(`Skipping existing activity ${summaryId}`);
          totalSkipped++;
          continue;
        }

        // Step 2: Download FIT file for this activity
        const fitUrl = `${GARMIN_HEALTH_API_BASE}/activity/${summaryId}/download`;
        console.log(`Downloading FIT file: ${fitUrl}`);
        
        try {
          const fitResponse = await fetch(fitUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (!fitResponse.ok) {
            console.error(`Failed to download FIT file for ${summaryId}: ${fitResponse.status}`);
            totalSkipped++;
            continue;
          }

          const fitBuffer = await fitResponse.arrayBuffer();
          const fitBlob = new Blob([fitBuffer]);
          
          // Save FIT file to Supabase storage
          const fileName = `${job.user_id}/${summaryId}_${Date.now()}.fit`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from('activity-files')
            .upload(fileName, fitBlob, {
              contentType: 'application/fit',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Failed to upload FIT file for ${summaryId}:`, uploadError);
            totalSkipped++;
            continue;
          }

          // Insert basic activity record (FIT parsing will happen later via existing upload flow)
          const activityData = {
            user_id: job.user_id,
            garmin_activity_id: summaryId.toString(),
            external_sync_source: 'garmin',
            name: summary.activityName || 'Garmin Activity',
            date: summary.startTimeInSeconds ? new Date(summary.startTimeInSeconds * 1000).toISOString() : new Date().toISOString(),
            duration_seconds: summary.durationInSeconds || 0,
            distance_meters: summary.distanceInMeters || null,
            elevation_gain_meters: summary.elevationGainInMeters || null,
            avg_heart_rate: summary.averageHeartRateInBeatsPerMinute || null,
            max_heart_rate: summary.maxHeartRateInBeatsPerMinute || null,
            calories: summary.activeKilocalories || null,
            sport_mode: sportMode,
            activity_type: 'normal',
            file_type: 'fit',
            file_path: fileName,
          };

          const { error: insertError } = await supabaseAdmin
            .from('activities')
            .insert(activityData);

          if (insertError) {
            console.error(`Failed to insert activity ${summaryId}:`, insertError);
          } else {
            console.log(`✓ Successfully synced activity ${summaryId}`);
            totalSynced++;
          }

          // Throttle between FIT downloads
          await new Promise(resolve => setTimeout(resolve, THROTTLE_MS));
        } catch (error) {
          console.error(`Error processing activity ${summaryId}:`, error);
          totalSkipped++;
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
    // Cycling variants
    'CYCLING': 'cycling',
    'ROAD_BIKING': 'cycling',
    'MOUNTAIN_BIKING': 'cycling',
    'GRAVEL_CYCLING': 'cycling',
    'INDOOR_CYCLING': 'cycling',
    'VIRTUAL_RIDE': 'cycling',
    'BIKE': 'cycling',
    // Running variants
    'RUNNING': 'running',
    'STREET_RUNNING': 'running',
    'TRAIL_RUNNING': 'running',
    'TREADMILL_RUNNING': 'running',
    'TRACK_RUNNING': 'running',
    'VIRTUAL_RUN': 'running',
    'RUN': 'running',
    // Swimming variants
    'SWIMMING': 'swimming',
    'OPEN_WATER_SWIMMING': 'swimming',
    'LAP_SWIMMING': 'swimming',
    'POOL_SWIMMING': 'swimming',
    'SWIM': 'swimming',
  };
  
  return typeMap[garminType.toUpperCase()] || null;
}
