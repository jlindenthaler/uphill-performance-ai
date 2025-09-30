import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Garmin OAuth 2.0 endpoints (official)
const GARMIN_AUTH_URL = 'https://connect.garmin.com/oauth2Confirm';
const GARMIN_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
const GARMIN_API_BASE = 'https://apis.garmin.com';

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Handle OAuth callback FIRST (no auth required - this is Garmin redirecting back)
    if (url.searchParams.has('code') || url.searchParams.has('error')) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for callback
      );
      return await handleCallback(req, supabaseClient);
    }

    // For all other actions, require authentication
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

    const action = url.searchParams.get('action');

    // Handle other actions
    const { action: bodyAction } = await req.json().catch(() => ({ action: null }));
    const finalAction = action || bodyAction;

    console.log('Garmin OAuth action:', finalAction, 'for user:', user.id);

    switch (finalAction) {
      case 'authorize':
        return await handleAuthorize(user.id, supabaseClient);
      case 'sync':
        return await syncActivities(user.id, supabaseClient);
      case 'disconnect':
        return await handleDisconnect(user.id, supabaseClient);
      default:
        throw new Error(`Unknown action: ${finalAction}`);
    }
  } catch (error) {
    console.error('Garmin OAuth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAuthorize(userId: string, supabaseClient: any) {
  console.log('Starting authorization for user:', userId);

  const clientId = Deno.env.get('GARMIN_CLIENT_ID');
  const redirectUri = Deno.env.get('GARMIN_REDIRECT_URI');

  if (!clientId || !redirectUri) {
    throw new Error('Garmin OAuth credentials not configured');
  }

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  console.log('Generated PKCE challenge');

  // Store code verifier in database
  const { error: upsertError } = await supabaseClient
    .from('garmin_tokens')
    .upsert({
      user_id: userId,
      code_verifier: codeVerifier,
      access_token: 'pending', // Placeholder
    }, {
      onConflict: 'user_id'
    });

  if (upsertError) {
    console.error('Failed to store code verifier:', upsertError);
    throw new Error('Failed to initiate OAuth');
  }

  // Build authorization URL
  const authUrl = new URL(GARMIN_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('state', userId); // Simple state = userId

  console.log('Authorization URL generated:', authUrl.toString());

  return new Response(
    JSON.stringify({ authUrl: authUrl.toString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCallback(req: Request, supabaseClient: any) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // userId
  const error = url.searchParams.get('error');

  console.log('OAuth callback received - code:', !!code, 'state:', state, 'error:', error);

  const origin = Deno.env.get('APP_ORIGIN') || 'https://uphill-ai.uphill.com.au';

  if (error || !code || !state) {
    console.error('OAuth callback error:', error || 'Missing code or state');
    return Response.redirect(`${origin}?garmin_error=${error || 'invalid_callback'}`);
  }

  const userId = state;

  try {
    // Get stored code verifier
    const { data: tokenData, error: fetchError } = await supabaseClient
      .from('garmin_tokens')
      .select('code_verifier')
      .eq('user_id', userId)
      .single();

    if (fetchError || !tokenData?.code_verifier) {
      console.error('Failed to retrieve code verifier:', fetchError);
      throw new Error('Invalid OAuth state');
    }

    console.log('Retrieved code verifier for user:', userId);

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    console.log('Token request params:', {
      grant_type: 'authorization_code',
      client_id: Deno.env.get('GARMIN_CLIENT_ID'),
      redirect_uri: Deno.env.get('GARMIN_REDIRECT_URI'),
      code_verifier_length: tokenData.code_verifier?.length,
      code_length: code.length
    });

    const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: Deno.env.get('GARMIN_CLIENT_ID')!,
        client_secret: Deno.env.get('GARMIN_CLIENT_SECRET')!,
        redirect_uri: Deno.env.get('GARMIN_REDIRECT_URI')!,
        code_verifier: tokenData.code_verifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        body: errorText
      });
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received successfully');

    // Store tokens
    const { error: updateError } = await supabaseClient
      .from('garmin_tokens')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        code_verifier: null, // Clear verifier
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to store tokens:', updateError);
      throw new Error('Failed to save tokens');
    }

    // Update profile
    await supabaseClient
      .from('profiles')
      .update({ garmin_connected: true })
      .eq('user_id', userId);

    console.log('Garmin connected successfully for user:', userId);

    return Response.redirect(`${origin}?garmin_connected=true`);
  } catch (error) {
    console.error('Callback error:', error);
    return Response.redirect(`${origin}?garmin_error=token_exchange_failed`);
  }
}

async function syncActivities(userId: string, supabaseClient: any) {
  console.log('Syncing activities for user:', userId);

  // Get access token
  const { data: tokenData, error: tokenError } = await supabaseClient
    .from('garmin_tokens')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (tokenError || !tokenData?.access_token) {
    throw new Error('No valid Garmin connection found');
  }

  // Calculate time range (last 30 days)
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  // Try multiple possible Garmin API endpoints with time range parameters
  const possibleEndpoints = [
    `${GARMIN_API_BASE}/activitylist-service/activities/search/activities`,
    `${GARMIN_API_BASE}/activity-service/activity/list`,
    `${GARMIN_API_BASE}/wellness-api/rest/activities?uploadStartTimeInSeconds=${startTime}&uploadEndTimeInSeconds=${endTime}`
  ];

  let activities = null;
  let lastError = null;

  for (const endpoint of possibleEndpoints) {
    console.log('Trying Garmin endpoint:', endpoint);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json'
          },
        });

        console.log('Garmin API response status:', response.status);

        if (response.ok) {
          activities = await response.json();
          console.log('Successfully fetched activities from:', endpoint);
          console.log('Activities count:', activities?.length || Array.isArray(activities) ? activities.length : 'Not an array');
          break;
        } else if (response.status === 429 || response.status === 503) {
          // Rate limit or service unavailable - retry with exponential backoff
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`Rate limited or service unavailable. Waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          const errorText = await response.text();
          console.error(`Endpoint ${endpoint} failed:`, response.status, errorText);
          lastError = `${response.status}: ${errorText}`;
          break;
        }
      } catch (err) {
        console.error(`Error fetching from ${endpoint}:`, err);
        lastError = err instanceof Error ? err.message : 'Unknown error';
        break;
      }
    }
    
    if (activities) break;
  }

  if (!activities) {
    console.error('All Garmin API endpoints failed. Last error:', lastError);
    throw new Error(`Failed to fetch activities from Garmin. Last error: ${lastError}`);
  }

  let synced = 0;
  let skipped = 0;
  const activitiesArray = Array.isArray(activities) ? activities : activities.activities || [];

  console.log('Processing', activitiesArray.length, 'activities');

  for (const activity of activitiesArray) {
    try {
      // Check if activity already exists
      const garminId = activity.activityId?.toString() || activity.id?.toString();
      if (!garminId) {
        console.warn('Activity missing ID, skipping:', activity);
        continue;
      }

      const { data: existing } = await supabaseClient
        .from('activities')
        .select('id')
        .eq('user_id', userId)
        .eq('garmin_activity_id', garminId)
        .maybeSingle();

      if (existing) {
        console.log(`Garmin activity ${garminId} already exists, skipping`);
        skipped++;
        continue;
      }

      // Map Garmin activity to our schema
      const mappedActivity = {
        user_id: userId,
        garmin_activity_id: garminId,
        name: activity.activityName || activity.name || 'Garmin Activity',
        date: activity.startTimeGMT || activity.startTime || new Date().toISOString(),
        duration_seconds: Math.round(activity.duration || activity.movingDuration || 0),
        distance_meters: activity.distance || null,
        elevation_gain_meters: activity.elevationGain || activity.totalAscent || null,
        avg_heart_rate: activity.averageHR || activity.avgHr || null,
        max_heart_rate: activity.maxHR || activity.maxHr || null,
        calories: activity.calories || null,
        sport_mode: mapGarminSportType(activity.activityType?.typeKey || activity.activityType),
        external_sync_source: 'garmin',
        activity_type: 'normal'
      };

      const { error: insertError } = await supabaseClient
        .from('activities')
        .insert(mappedActivity);

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate key - another sync may have added it
          console.log(`Garmin activity ${garminId} duplicate detected during insert, skipping`);
          skipped++;
        } else {
          console.error(`Failed to insert activity ${garminId}:`, insertError.message, insertError.details);
        }
      } else {
        synced++;
        console.log(`✓ Synced: "${mappedActivity.name}" (ID: ${garminId})`);
      }
    } catch (activityError) {
      console.error('Error processing Garmin activity:', activityError);
    }
  }

  console.log(`Garmin sync completed. Synced: ${synced}, Skipped (already exists): ${skipped}, Total processed: ${activitiesArray.length}`);

  return new Response(
    JSON.stringify({ success: true, synced, skipped, total: activitiesArray.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleDisconnect(userId: string, supabaseClient: any) {
  console.log('Disconnecting Garmin for user:', userId);

  // Delete tokens
  await supabaseClient
    .from('garmin_tokens')
    .delete()
    .eq('user_id', userId);

  // Update profile
  await supabaseClient
    .from('profiles')
    .update({ garmin_connected: false })
    .eq('user_id', userId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function mapGarminSportType(garminType: string | undefined): string {
  const mapping: Record<string, string> = {
    'cycling': 'cycling',
    'running': 'running',
    'mountain_biking': 'cycling',
    'road_biking': 'cycling',
    'indoor_cycling': 'cycling',
    'trail_running': 'running',
  };
  return mapping[garminType?.toLowerCase() || ''] || 'cycling';
}
