import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StravaActivity {
  id: number
  name: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  type: string
  start_date: string
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  average_watts?: number
  max_watts?: number
  weighted_average_watts?: number
  kilojoules?: number
  average_cadence?: number
  suffer_score?: number
}

async function refreshStravaTokens(supabase: any, userId: string, refreshToken: string) {
  const clientId = Deno.env.get('STRAVA_CLIENT_ID')
  const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')

  console.log('Refreshing Strava tokens for user:', userId)

  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token refresh failed:', response.status, errorText)
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const tokenData = await response.json()
  
  // Update tokens in database
  const { error } = await supabase
    .from('strava_tokens')
    .update({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000).toISOString()
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to update refreshed tokens:', error)
    throw new Error('Failed to update refreshed tokens')
  }

  console.log('Tokens refreshed successfully')
  return tokenData.access_token
}

async function getValidAccessToken(supabase: any, userId: string) {
  const { data: tokenData, error } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !tokenData) {
    throw new Error('No Strava tokens found for user')
  }

  // Check if token is expired (refresh 5 minutes before expiry)
  const expiresAt = new Date(tokenData.expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinutesFromNow) {
    console.log('Token expired or expiring soon, refreshing...')
    return await refreshStravaTokens(supabase, userId, tokenData.refresh_token)
  }

  return tokenData.access_token
}

async function fetchStravaActivities(accessToken: string, after?: number, page = 1, perPage = 30) {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString()
  })
  
  if (after) {
    params.append('after', after.toString())
  }

  console.log(`Fetching Strava activities: page=${page}, per_page=${perPage}, after=${after}`)

  const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to fetch activities:', response.status, errorText)
    throw new Error(`Failed to fetch activities: ${response.status}`)
  }

  return await response.json() as StravaActivity[]
}

function mapStravaActivityToDatabase(activity: StravaActivity, userId: string) {
  return {
    user_id: userId,
    name: activity.name,
    date: activity.start_date,
    duration_seconds: activity.moving_time,
    distance_meters: activity.distance,
    elevation_gain_meters: activity.total_elevation_gain,
    avg_speed_kmh: activity.average_speed * 3.6, // Convert m/s to km/h
    avg_heart_rate: activity.average_heartrate,
    max_heart_rate: activity.max_heartrate,
    avg_power: activity.average_watts,
    max_power: activity.max_watts,
    normalized_power: activity.weighted_average_watts,
    avg_cadence: activity.average_cadence,
    calories: activity.kilojoules ? Math.round(activity.kilojoules * 4.184) : null, // Convert kJ to calories
    tss: activity.suffer_score,
    sport_mode: activity.type.toLowerCase() === 'ride' ? 'cycling' : 
                activity.type.toLowerCase() === 'run' ? 'running' : 
                activity.type.toLowerCase(),
    external_sync_source: 'strava',
    strava_activity_id: activity.id.toString(),
    activity_type: 'normal'
  }
}

async function syncActivitiesForUser(supabase: any, userId: string, sinceDate?: Date) {
  try {
    console.log(`Starting activity sync for user: ${userId}`)
    
    const accessToken = await getValidAccessToken(supabase, userId)
    
    // Get the timestamp for filtering activities (if provided)
    const after = sinceDate ? Math.floor(sinceDate.getTime() / 1000) : undefined
    
    let page = 1
    let totalSynced = 0
    let totalSkipped = 0
    let hasMore = true

    while (hasMore && page <= 10) { // Limit to 10 pages to prevent runaway loops
      let retryCount = 0;
      const maxRetries = 3;
      let activities: StravaActivity[] = [];
      
      // Retry logic for fetching activities
      while (retryCount < maxRetries) {
        try {
          activities = await fetchStravaActivities(accessToken, after, page, 30);
          break; // Success - exit retry loop
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMessage.includes('429') || errorMessage.includes('503')) {
            retryCount++;
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`Rate limited or service unavailable. Waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error; // Non-retryable error
          }
        }
      }
      
      if (activities.length === 0) {
        console.log('No more activities to sync')
        hasMore = false
        break
      }

      console.log(`Processing ${activities.length} activities from page ${page}`)

      for (const activity of activities) {
        try {
          // Check if activity already exists by strava_activity_id
          const { data: existing } = await supabase
            .from('activities')
            .select('id')
            .eq('user_id', userId)
            .eq('strava_activity_id', activity.id.toString())
            .maybeSingle()

          if (existing) {
            console.log(`Activity ${activity.id} already exists, skipping`)
            totalSkipped++
            continue
          }

          // Insert new activity
          const activityData = mapStravaActivityToDatabase(activity, userId)
          const { error } = await supabase
            .from('activities')
            .insert(activityData)

          if (error) {
            // Handle duplicate constraint error gracefully
            if (error.code === '23505') {
              console.log(`Duplicate detected during insert for activity ${activity.id}, skipping`)
              totalSkipped++
            } else {
              console.error(`Failed to insert activity ${activity.id}:`, error.message, error.details)
            }
          } else {
            totalSynced++
            console.log(`✓ Synced: "${activity.name}" (ID: ${activity.id})`)
          }
        } catch (activityError) {
          console.error(`Error processing activity ${activity.id}:`, activityError)
        }
      }

      page++
      if (activities.length < 30) {
        hasMore = false
      }

      // Rate limiting - wait 1 second between pages
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`Sync completed for user ${userId}. Synced: ${totalSynced}, Skipped: ${totalSkipped}`)
    return { success: true, activitiesSynced: totalSynced, activitiesSkipped: totalSkipped }

  } catch (error) {
    console.error(`Sync failed for user ${userId}:`, error)
    throw error
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Strava sync request: ${req.method}`)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log(`Processing sync request for user: ${user.id}`)

    let sinceDate: Date | undefined
    
    // For POST requests, check if there's a since date
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        if (body.since) {
          sinceDate = new Date(body.since)
        }
      } catch {
        // Ignore JSON parsing errors
      }
    }

    // Check if user has Strava tokens
    const { data: stravaToken } = await supabaseClient
      .from('strava_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!stravaToken) {
      return new Response(JSON.stringify({ 
        error: 'Strava not connected. Please connect your Strava account first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Perform the sync
    const result = await syncActivitiesForUser(supabaseClient, user.id, sinceDate)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Strava sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Determine appropriate status code
    let statusCode = 500
    if (errorMessage.includes('not connected') || errorMessage.includes('No Strava tokens')) {
      statusCode = 400
    } else if (errorMessage.includes('Token refresh failed')) {
      statusCode = 401
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error instanceof Error ? error.stack : undefined 
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})