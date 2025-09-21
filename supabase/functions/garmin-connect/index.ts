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

    const { action, code, state } = await req.json()

    switch (action) {
      case 'get_auth_url':
        return await getGarminAuthUrl()
      case 'handle_callback':
        return await handleGarminCallback(supabaseClient, user.id, code, state)
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
    return new Response(JSON.stringify({ error: error.message }), {
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

  const state = crypto.randomUUID()
  const authUrl = new URL('https://connect.garmin.com/oauthConfirm')
  authUrl.searchParams.set('oauth_consumer_key', clientId)
  authUrl.searchParams.set('oauth_signature_method', 'HMAC-SHA1')
  authUrl.searchParams.set('oauth_timestamp', Math.floor(Date.now() / 1000).toString())
  authUrl.searchParams.set('oauth_nonce', crypto.randomUUID())
  authUrl.searchParams.set('oauth_version', '1.0')
  authUrl.searchParams.set('oauth_callback', redirectUri)

  return new Response(JSON.stringify({ 
    authUrl: authUrl.toString(),
    state 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function handleGarminCallback(supabaseClient: any, userId: string, oauthToken: string, oauthVerifier: string) {
  try {
    const clientId = Deno.env.get('GARMIN_CLIENT_ID')
    const clientSecret = Deno.env.get('GARMIN_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      throw new Error('Garmin API credentials not configured')
    }

    // Exchange the temporary token for an access token
    const tokenResponse = await fetch('https://connectapi.garmin.com/oauth-service/oauth/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `OAuth oauth_consumer_key="${clientId}", oauth_token="${oauthToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${Math.floor(Date.now() / 1000)}", oauth_nonce="${crypto.randomUUID()}", oauth_version="1.0", oauth_verifier="${oauthVerifier}"`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const tokenData = await tokenResponse.text()
    const params = new URLSearchParams(tokenData)
    const accessToken = params.get('oauth_token')
    const accessTokenSecret = params.get('oauth_token_secret')

    if (!accessToken || !accessTokenSecret) {
      throw new Error('Failed to obtain access token from Garmin')
    }

    // Store the tokens securely in user profile
    const { error } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: userId,
        garmin_access_token: accessToken,
        garmin_token_secret: accessTokenSecret,
        garmin_connected: true
      })

    if (error) {
      throw new Error('Failed to store Garmin tokens')
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Successfully connected to Garmin Connect'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error handling Garmin callback:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function syncGarminActivities(supabaseClient: any, userId: string) {
  try {
    // Get user's Garmin tokens
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('garmin_access_token, garmin_token_secret')
      .eq('user_id', userId)
      .single()

    if (!profile?.garmin_access_token) {
      throw new Error('Garmin account not connected')
    }

    // Fetch activities from Garmin Connect (last 30 days)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    const endDate = new Date()

    const activitiesUrl = `https://connectapi.garmin.com/activitylist-service/activities/search/activities?start=${startDate.toISOString().split('T')[0]}&limit=50`
    
    const response = await fetchWithGarminAuth(activitiesUrl, profile.garmin_access_token, profile.garmin_token_secret)
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}

async function getActivityDetails(supabaseClient: any, userId: string, activityId: string) {
  try {
    // Get user's Garmin tokens
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('garmin_access_token, garmin_token_secret')
      .eq('user_id', userId)
      .single()

    if (!profile?.garmin_access_token) {
      throw new Error('Garmin account not connected')
    }

    // Fetch detailed activity data including GPS
    const detailsUrl = `https://connectapi.garmin.com/activity-service/activity/${activityId}`
    const response = await fetchWithGarminAuth(detailsUrl, profile.garmin_access_token, profile.garmin_token_secret)
    const activityDetails = await response.json()

    return new Response(JSON.stringify({ 
      success: true,
      activity: activityDetails
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching activity details:', error)
    return new Response(JSON.stringify({ error: error.message }), {
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
  const clientId = Deno.env.get('GARMIN_CLIENT_ID')
  const clientSecret = Deno.env.get('GARMIN_CLIENT_SECRET')
  
  if (!clientId || !clientSecret) {
    throw new Error('Garmin API credentials not configured')
  }

  // Create OAuth 1.0a signature
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomUUID()

  const authHeader = `OAuth oauth_consumer_key="${clientId}", oauth_token="${accessToken}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0"`

  return fetch(url, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  })
}