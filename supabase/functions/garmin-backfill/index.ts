import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GARMIN_API_BASE = 'https://apis.garmin.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { daysBack = 90 } = await req.json().catch(() => ({ daysBack: 90 }));

    console.log(`Starting Garmin backfill for user ${user.id}: ${daysBack} days`);

    // Get access token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('garmin_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData?.access_token) {
      throw new Error('Garmin not connected');
    }

    // Check if token needs refresh
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
    if (expiresAt && expiresAt < new Date()) {
      console.log('Access token expired, needs refresh');
      throw new Error('Token expired - please reconnect your Garmin account');
    }

    const accessToken = tokenData.access_token;
    
    // Calculate date range (Garmin API requires Unix timestamps in seconds)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    console.log(`Fetching activities from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    let totalSynced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Garmin API has 30-day limit per request, so we chunk the requests
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    let currentStart = startDate.getTime();
    const endTime = endDate.getTime();

    while (currentStart < endTime) {
      const currentEnd = Math.min(currentStart + thirtyDays, endTime);
      
      console.log(`Fetching chunk: ${new Date(currentStart).toISOString()} to ${new Date(currentEnd).toISOString()}`);

      try {
        // Fetch activity list for this chunk
        const activityListUrl = `${GARMIN_API_BASE}/wellness-api/rest/activities`;
        const activityListParams = new URLSearchParams({
          uploadStartTimeInSeconds: Math.floor(currentStart / 1000).toString(),
          uploadEndTimeInSeconds: Math.floor(currentEnd / 1000).toString(),
        });

        console.log(`Calling: ${activityListUrl}?${activityListParams}`);

        const listResponse = await fetch(`${activityListUrl}?${activityListParams}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!listResponse.ok) {
          console.error(`Activity list fetch failed: ${listResponse.status} ${listResponse.statusText}`);
          const errorText = await listResponse.text();
          console.error('Error body:', errorText);
          totalErrors++;
          currentStart = currentEnd;
          continue;
        }

        const activities = await listResponse.json();
        console.log(`Received ${activities?.length || 0} activities for this chunk`);

        if (!activities || activities.length === 0) {
          currentStart = currentEnd;
          continue;
        }

        // Process each activity
        for (const activitySummary of activities) {
          try {
            const summaryId = activitySummary.summaryId;
            
            if (!summaryId) {
              console.warn('Activity missing summaryId, skipping');
              totalSkipped++;
              continue;
            }

            // Check if already exists
            const { data: existingActivity } = await supabaseClient
              .from('activities')
              .select('id')
              .eq('garmin_activity_id', summaryId)
              .eq('user_id', user.id)
              .maybeSingle();

            if (existingActivity) {
              console.log(`Activity ${summaryId} already exists, skipping`);
              totalSkipped++;
              continue;
            }

            // Fetch detailed activity data
            const detailsUrl = `${GARMIN_API_BASE}/wellness-api/rest/activityDetails/${summaryId}`;
            const detailsResponse = await fetch(detailsUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (!detailsResponse.ok) {
              console.error(`Failed to fetch details for ${summaryId}: ${detailsResponse.status}`);
              totalErrors++;
              continue;
            }

            const activityDetails = await detailsResponse.json();

            // Map to database schema
            const mappedActivity = {
              user_id: user.id,
              garmin_activity_id: summaryId,
              name: activityDetails.activityName || activitySummary.activityName || 'Garmin Activity',
              sport_mode: mapGarminSportType(activityDetails.activityType || activitySummary.activityType),
              date: new Date((activityDetails.startTimeInSeconds || activitySummary.startTimeInSeconds) * 1000).toISOString(),
              duration_seconds: Math.round(activityDetails.duration || activitySummary.duration || 0),
              distance_meters: activityDetails.distance || activitySummary.distance || null,
              elevation_gain_meters: activityDetails.elevationGain || activitySummary.elevationGain || null,
              avg_power: activityDetails.averagePower || null,
              max_power: activityDetails.maxPower || null,
              avg_heart_rate: activityDetails.averageHeartRate ? Math.round(activityDetails.averageHeartRate) : null,
              max_heart_rate: activityDetails.maxHeartRate ? Math.round(activityDetails.maxHeartRate) : null,
              avg_speed_kmh: activityDetails.averageSpeed ? activityDetails.averageSpeed * 3.6 : null, // m/s to km/h
              calories: activityDetails.calories || null,
              external_sync_source: 'garmin',
              activity_type: 'normal',
            };

            // Insert activity
            const { error: insertError } = await supabaseClient
              .from('activities')
              .insert(mappedActivity);

            if (insertError) {
              console.error(`Failed to insert activity ${summaryId}:`, insertError.message);
              totalErrors++;
            } else {
              console.log(`✓ Synced activity ${summaryId}: ${mappedActivity.name}`);
              totalSynced++;
            }

          } catch (activityError) {
            console.error('Error processing individual activity:', activityError);
            totalErrors++;
          }
        }

      } catch (chunkError) {
        console.error('Error processing chunk:', chunkError);
        totalErrors++;
      }

      currentStart = currentEnd;
    }

    console.log(`Backfill complete: ${totalSynced} synced, ${totalSkipped} skipped, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: totalSynced,
        skipped: totalSkipped,
        errors: totalErrors,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Garmin backfill error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function mapGarminSportType(garminType: string | undefined): string {
  if (!garminType) return 'cycling';
  
  const type = garminType.toLowerCase();
  const mapping: Record<string, string> = {
    'cycling': 'cycling',
    'running': 'running',
    'mountain_biking': 'cycling',
    'road_biking': 'cycling',
    'indoor_cycling': 'cycling',
    'virtual_ride': 'cycling',
    'trail_running': 'running',
    'treadmill_running': 'running',
    'swimming': 'swimming',
    'open_water_swimming': 'swimming',
  };
  
  return mapping[type] || 'cycling';
}
