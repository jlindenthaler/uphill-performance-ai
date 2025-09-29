import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GarminActivity {
  activityId: string
  activityName: string
  description: string
  startTimeLocal: string
  activityType: {
    typeId: number
    typeKey: string
  }
  distance: number
  duration: number
  elapsedDuration: number
  movingDuration: number
  elevationGain: number
  elevationLoss: number
  averageSpeed: number
  maxSpeed: number
  calories: number
  averageHR: number
  maxHR: number
  averagePower: number
  maxPower: number
  normalizedPower: number
  trainingStressScore: number
  intensityFactor: number
  variabilityIndex: number
}

// PKCE helper functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, code, state, codeVerifier } = await req.json()

    switch (action) {
      case 'get_auth_url':
        return await getGarminAuthUrl()
      case 'handle_callback':
        return await handleGarminCallback(supabaseClient, user.id, code, state, codeVerifier)
      case 'sync_activities':
        return await syncGarminActivities(supabaseClient, user.id)
      case 'get_activity_details':
        const { activityId } = await req.json()
        return await getActivityDetails(supabaseClient, user.id, activityId)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
  } catch (error) {
    console.error('Error in garmin-connect function:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getGarminAuthUrl() {
  const clientId = Deno.env.get('GARMIN_CLIENT_ID')
  const redirectUri = Deno.env.get('GARMIN_REDIRECT_URI')
  
  if (!clientId || !redirectUri) {
    return new Response(JSON.stringify({ error: 'Garmin API configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Generate PKCE code verifier and challenge for OAuth 2.0 with PKCE
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const state = crypto.randomUUID()

  // OAuth 2.0 authorization URL for Garmin Connect (with PKCE)
  // Using the correct Garmin OAuth2 PKCE endpoint as per documentation
  const authUrl = new URL('https://connect.garmin.com/oauth2Confirm')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', `https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com`)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('state', state)
  // Note: No scope parameter needed for Garmin OAuth2 PKCE

  console.log('Generated Garmin OAuth 2.0 PKCE auth URL:', authUrl.toString())

  return new Response(JSON.stringify({ 
    authUrl: authUrl.toString(),
    state,
    codeVerifier // We'll need this for the token exchange
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleGarminCallback(supabaseClient: any, userId: string, code: string, state: string, codeVerifier?: string) {
  try {
    const clientId = Deno.env.get('GARMIN_CLIENT_ID')
    const clientSecret = Deno.env.get('GARMIN_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GARMIN_REDIRECT_URI')
    
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Garmin API credentials not configured')
    }

    if (!codeVerifier) {
      throw new Error('Code verifier missing for PKCE flow')
    }

    console.log('Exchanging authorization code for access token with PKCE...')

    // Exchange authorization code for access token (OAuth 2.0 with PKCE)
    const tokenResponse = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: `https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Garmin token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Garmin token exchange successful for user:', userId)

    // Store tokens using secure encrypted storage
    const { error: functionError } = await supabaseClient.rpc('store_garmin_tokens_secure', {
      p_user_id: userId,
      p_access_token: tokenData.access_token,
      p_token_secret: tokenData.refresh_token || ''
    })

    if (functionError) {
      throw new Error(`Failed to store encrypted Garmin tokens: ${functionError.message}`)
    }

    // Log security audit
    await supabaseClient
      .from('token_access_audit')
      .insert({
        user_id: userId,
        access_type: 'token_stored',
        ip_address: null,
        user_agent: null
      })

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully connected to Garmin Connect'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error handling Garmin callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function syncGarminActivities(supabaseClient: any, userId: string) {
  try {
    // Get user's encrypted Garmin tokens
    const { data: tokens } = await supabaseClient.rpc('get_garmin_tokens_secure', {
      p_user_id: userId
    })

    if (!tokens || tokens.length === 0) {
      throw new Error('Garmin account not connected')
    }

    const { access_token, token_secret } = tokens[0]

    // Fetch activities from Garmin Connect (last 30 days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()

    const activitiesUrl = `https://connectapi.garmin.com/activitylist-service/activities/search/activities?start=${startDate.toISOString().split('T')[0]}&limit=50`
    
    const response = await fetchWithGarminAuth(activitiesUrl, access_token, token_secret)
    const activities: GarminActivity[] = await response.json()

    // Convert and save activities to our database
    for (const garminActivity of activities) {
      const activityData = convertGarminActivity(garminActivity)
      
      await supabaseClient
        .from('activities')
        .upsert({
          user_id: userId,
          ...activityData,
          garmin_activity_id: garminActivity.activityId
        })
    }

    return new Response(JSON.stringify({ 
      success: true,
      synced: activities.length,
      message: `Successfully synced ${activities.length} activities from Garmin Connect`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error syncing Garmin activities:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function getActivityDetails(supabaseClient: any, userId: string, activityId: string) {
  try {
    // Get user's encrypted Garmin tokens
    const { data: tokens } = await supabaseClient.rpc('get_garmin_tokens_secure', {
      p_user_id: userId
    })

    if (!tokens || tokens.length === 0) {
      throw new Error('Garmin account not connected')
    }

    const { access_token, token_secret } = tokens[0]

    // Fetch detailed activity data including GPS
    const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${activityId}`
    const response = await fetchWithGarminAuth(detailsUrl, access_token, token_secret)
    const activityDetails = await response.json()

    return new Response(JSON.stringify({ 
      success: true,
      activity: activityDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching activity details:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

function convertGarminActivity(garminActivity: GarminActivity) {
  // Map sport types
  const sportMapping: Record<string, string> = {
    'running': 'running',
    'cycling': 'cycling',
    'swimming': 'swimming',
    'biking': 'cycling',
    'road_biking': 'cycling',
    'mountain_biking': 'cycling'
  }

  const sportMode = sportMapping[garminActivity.activityType?.typeKey] || 'cycling'

  return {
    name: garminActivity.activityName || 'Garmin Activity',
    sport_mode: sportMode,
    date: new Date(garminActivity.startTimeLocal).toISOString().split('T')[0],
    duration_seconds: garminActivity.duration || garminActivity.movingDuration,
    distance_meters: garminActivity.distance ? Math.round(garminActivity.distance * 1000) : null,
    elevation_gain_meters: garminActivity.elevationGain || null,
    avg_speed_kmh: garminActivity.averageSpeed ? garminActivity.averageSpeed * 3.6 : null,
    calories: garminActivity.calories || null,
    avg_heart_rate: garminActivity.averageHR || null,
    max_heart_rate: garminActivity.maxHR || null,
    avg_power: garminActivity.averagePower || null,
    max_power: garminActivity.maxPower || null,
    normalized_power: garminActivity.normalizedPower || null,
    tss: garminActivity.trainingStressScore || null,
    intensity_factor: garminActivity.intensityFactor || null,
    variability_index: garminActivity.variabilityIndex || null,
    notes: garminActivity.description || null
  }
}

async function fetchWithGarminAuth(url: string, accessToken: string, tokenSecret: string) {
  // For OAuth 2.0, we'll use Bearer token authentication
  return fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  })
}