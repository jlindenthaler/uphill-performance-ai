import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Verify the user is authenticated
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const STRAVA_CLIENT_ID = Deno.env.get('STRAVA_CLIENT_ID');
    const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET');

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: 'Strava integration is pending approval. Please check back later.' 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get stored Strava tokens (placeholder - in production would decrypt properly)
    const { data: tokenData, error: tokenError } = await supabaseClient.rpc('get_strava_tokens_secure', {
      p_user_id: user.id
    });

    if (tokenError || !tokenData || tokenData.length === 0) {
      throw new Error('No Strava connection found. Please connect your Strava account first.');
    }

    const tokens = tokenData[0];
    let accessToken = tokens.access_token;

    // Check if token needs refresh (simplified - in production would use actual stored tokens)
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    
    if (now >= expiresAt) {
      // Refresh the token
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: STRAVA_CLIENT_ID,
          client_secret: STRAVA_CLIENT_SECRET,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh Strava access token');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update stored tokens
      await supabaseClient.rpc('store_strava_tokens_secure', {
        p_user_id: user.id,
        p_access_token: refreshData.access_token,
        p_refresh_token: refreshData.refresh_token,
        p_expires_at: new Date(refreshData.expires_at * 1000).toISOString(),
        p_scope: refreshData.scope || tokens.scope,
        p_athlete_id: tokens.athlete_id,
      });
    }

    // Fetch recent activities from Strava
    const activitiesResponse = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!activitiesResponse.ok) {
      throw new Error('Failed to fetch activities from Strava');
    }

    const stravaActivities = await activitiesResponse.json();
    console.log(`Fetched ${stravaActivities.length} activities from Strava for user:`, user.id);

    let syncedCount = 0;

    // Process each activity
    for (const activity of stravaActivities) {
      // Check if activity already exists
      const { data: existingActivity } = await supabaseClient
        .from('activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('external_sync_source', 'strava')
        .eq('garmin_activity_id', activity.id.toString()) // Reuse this field for Strava ID
        .single();

      if (existingActivity) {
        continue; // Skip if already synced
      }

      // Map Strava activity to our schema
      const mappedActivity = {
        user_id: user.id,
        name: activity.name,
        date: activity.start_date,
        duration_seconds: activity.elapsed_time,
        distance_meters: activity.distance,
        elevation_gain_meters: activity.total_elevation_gain,
        avg_power: activity.average_watts,
        max_power: activity.max_watts,
        normalized_power: activity.weighted_average_watts,
        avg_heart_rate: Math.round(activity.average_heartrate),
        max_heart_rate: activity.max_heartrate,
        avg_speed_kmh: activity.average_speed ? activity.average_speed * 3.6 : null, // m/s to km/h
        avg_cadence: Math.round(activity.average_cadence),
        calories: activity.calories,
        sport_mode: mapStravaActivityType(activity.sport_type || activity.type),
        activity_type: 'normal',
        external_sync_source: 'strava',
        garmin_activity_id: activity.id.toString(), // Store Strava ID here
        summary_metrics: {
          strava_id: activity.id,
          sport_type: activity.sport_type || activity.type,
          trainer: activity.trainer,
          commute: activity.commute,
          manual: activity.manual,
          private: activity.private,
          gear_id: activity.gear_id,
          average_temp: activity.average_temp,
          has_kudoed: activity.has_kudoed,
          kudos_count: activity.kudos_count,
          comment_count: activity.comment_count,
          athlete_count: activity.athlete_count,
        },
      };

      // Insert the activity
      const { error: insertError } = await supabaseClient
        .from('activities')
        .insert(mappedActivity);

      if (insertError) {
        console.error('Error inserting Strava activity:', insertError);
        continue;
      }

      syncedCount++;
    }

    console.log(`Successfully synced ${syncedCount} new activities from Strava for user:`, user.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        synced: syncedCount,
        total_fetched: stravaActivities.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in strava-sync function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to map Strava activity types to our sport modes
function mapStravaActivityType(stravaType: string): string {
  const typeMap: Record<string, string> = {
    'Ride': 'cycling',
    'VirtualRide': 'cycling',
    'EBikeRide': 'cycling',
    'Run': 'running',
    'VirtualRun': 'running',
    'TrailRun': 'running',
    'Swim': 'swimming',
    'Workout': 'cycling', // Default fallback
    'WeightTraining': 'strength',
    'Crosstraining': 'other',
    'Elliptical': 'other',
    'StairStepper': 'other',
    'Walk': 'running', // Map walking to running for simplicity
    'Hike': 'running',
  };

  return typeMap[stravaType] || 'cycling'; // Default to cycling
}