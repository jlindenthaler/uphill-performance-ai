import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const THROTTLE_MS = 500; // 500ms delay between requests to respect rate limits
const PER_PAGE = 200; // Maximum allowed by Strava

interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type?: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_cadence?: number;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshStravaTokens(supabase: any, userId: string, refreshToken: string): Promise<string> {
  console.log('Refreshing Strava tokens...');
  
  const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to refresh tokens: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  const expiresAt = new Date((tokenData.expires_at || Date.now() / 1000 + 21600) * 1000);

  await supabase
    .from('strava_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokenData.access_token;
}

async function getValidAccessToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenData, error: tokenError } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (tokenError || !tokenData) {
    throw new Error('No Strava tokens found');
  }

  const expiresAt = new Date(tokenData.expires_at);
  const now = new Date();
  const bufferMinutes = 5;

  if (expiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000) {
    return await refreshStravaTokens(supabase, userId, tokenData.refresh_token);
  }

  return tokenData.access_token;
}

async function fetchStravaActivitiesPage(
  accessToken: string,
  page: number,
  before: number,
  after: number
): Promise<StravaActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set('per_page', PER_PAGE.toString());
  url.searchParams.set('page', page.toString());
  url.searchParams.set('before', before.toString());
  url.searchParams.set('after', after.toString());

  console.log(`Fetching page ${page} with before=${before}, after=${after}`);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.statusText}`);
  }

  return await response.json();
}

function mapStravaActivityToDatabase(activity: StravaActivity, userId: string) {
  // Map Strava activity types to our sport modes
  const typeMap: Record<string, string> = {
    'ride': 'cycling',
    'virtualride': 'cycling',
    'ebikeride': 'cycling',
    'mountainbikeride': 'cycling',
    'gravelride': 'cycling',
    'run': 'running',
    'virtualrun': 'running',
    'trailrun': 'running',
    'swim': 'swimming',
  };
  
  const activityType = (activity.sport_type || activity.type || '').toLowerCase();
  const sportMode = typeMap[activityType] || null;
  
  return {
    user_id: userId,
    strava_activity_id: activity.id.toString(),
    external_sync_source: 'strava',
    name: activity.name,
    sport_mode: sportMode,
    date: activity.start_date,
    duration_seconds: activity.moving_time || activity.elapsed_time,
    distance_meters: activity.distance,
    elevation_gain_meters: activity.total_elevation_gain,
    avg_speed_kmh: activity.average_speed ? activity.average_speed * 3.6 : null,
    avg_heart_rate: activity.average_heartrate || null,
    max_heart_rate: activity.max_heartrate || null,
    avg_power: activity.average_watts || null,
    max_power: activity.max_watts || null,
    normalized_power: activity.weighted_average_watts || null,
    avg_cadence: activity.average_cadence ? Math.round(activity.average_cadence) : null,
    calories: activity.kilojoules ? Math.round(activity.kilojoules) : null,
  };
}

async function processBackfillJob(supabase: any, job: any) {
  console.log(`Processing job ${job.id} for user ${job.user_id}`);

  try {
    // Mark job as running
    await supabase
      .from('strava_backfill_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', job.id);

    const accessToken = await getValidAccessToken(supabase, job.user_id);
    
    const beforeTimestamp = Math.floor(new Date(job.end_date).getTime() / 1000);
    const afterTimestamp = Math.floor(new Date(job.start_date).getTime() / 1000);
    
    let currentPage = job.current_page || 1;
    let totalSynced = job.activities_synced || 0;
    let totalSkipped = job.activities_skipped || 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`Fetching page ${currentPage}...`);
      
      const activities = await fetchStravaActivitiesPage(
        accessToken,
        currentPage,
        beforeTimestamp,
        afterTimestamp
      );

      if (activities.length === 0) {
        console.log('No more activities to fetch');
        hasMore = false;
        break;
      }

      console.log(`Fetched ${activities.length} activities from page ${currentPage}`);

      // Check for existing activities
      const stravaIds = activities.map(a => a.id.toString());
      const { data: existingActivities } = await supabase
        .from('activities')
        .select('strava_activity_id')
        .eq('user_id', job.user_id)
        .in('strava_activity_id', stravaIds);

      const existingIds = new Set(
        existingActivities?.map((a: any) => a.strava_activity_id) || []
      );

      // Filter out existing activities
      const newActivities = activities.filter(a => !existingIds.has(a.id.toString()));
      
      if (newActivities.length > 0) {
        // Map and filter activities
        const mappedActivities = newActivities
          .map(a => mapStravaActivityToDatabase(a, job.user_id))
          .filter(a => a.sport_mode !== null); // Only keep supported activity types

        console.log(`Filtered to ${mappedActivities.length} supported activities out of ${newActivities.length}`);

        if (mappedActivities.length > 0) {
          const { error: insertError } = await supabase
            .from('activities')
            .insert(mappedActivities);

          if (insertError) {
            console.error('Error inserting activities:', insertError);
            throw insertError;
          }
        }

        // Update counters
        totalSynced += mappedActivities.length;
        const skippedCount = newActivities.length - mappedActivities.length;
        totalSkipped += skippedCount;
        console.log(`Inserted ${mappedActivities.length} new activities, skipped ${skippedCount} unsupported types`);
      }

      // Count already-existing activities as skipped
      totalSkipped += activities.length - newActivities.length;

      // Update job progress
      await supabase
        .from('strava_backfill_jobs')
        .update({
          current_page: currentPage,
          activities_synced: totalSynced,
          activities_skipped: totalSkipped,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Check if we got less than PER_PAGE, meaning this is the last page
      if (activities.length < PER_PAGE) {
        console.log('Reached last page (partial results)');
        hasMore = false;
      } else {
        currentPage++;
        await sleep(THROTTLE_MS);
      }
    }

    // Mark job as completed
    await supabase
      .from('strava_backfill_jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} completed: ${totalSynced} synced, ${totalSkipped} skipped`);

    return {
      success: true,
      synced: totalSynced,
      skipped: totalSkipped,
    };
  } catch (error) {
    console.error('Error processing job:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await supabase
      .from('strava_backfill_jobs')
      .update({
        status: 'error',
        last_error: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    throw error;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the oldest pending job
    const { data: pendingJobs, error: jobError } = await supabase
      .from('strava_backfill_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobError) {
      throw jobError;
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending jobs to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const job = pendingJobs[0];
    const result = await processBackfillJob(supabase, job);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Worker error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
