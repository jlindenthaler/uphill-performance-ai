import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  try {
    // Handle Garmin handshake verification (GET/HEAD requests)
    if (req.method === 'GET' || req.method === 'HEAD') {
      console.log('Garmin handshake verification request received')
      return new Response('ok', { status: 200 })
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Handle webhook notifications (POST requests)
    if (req.method === 'POST') {
      const notification = await req.json()
      console.log('Garmin webhook notification received:', JSON.stringify(notification, null, 2))

      // Process notification in background (don't await)
      processNotification(notification)

      // Immediately respond with 200 OK
      return new Response('ok', { status: 200 })
    }

    // Unsupported method
    console.log(`Unsupported method: ${req.method}`)
    return new Response('ok', { status: 200 })

  } catch (error) {
    console.error('Garmin webhook error:', error)
    // Always return 200 to Garmin to avoid retry storms
    return new Response('ok', { status: 200 })
  }
})

async function processNotification(notification: any) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract notification details
    const {
      userId: garminUserId,
      userAccessToken: pullToken,
      summaryId,
      callbackURL,
      type
    } = notification

    console.log(`Processing notification type: ${type} for Garmin user: ${garminUserId}`)

    // Handle deregistration
    if (type === 'USER_DEREGISTRATION') {
      await handleDeregistration(garminUserId, supabase)
      return
    }

    // Handle activity notifications
    if (type === 'ACTIVITY' && callbackURL && pullToken) {
      await processActivity(garminUserId, pullToken, callbackURL, summaryId, supabase)
      return
    }

    console.log(`Unhandled notification type: ${type}`)

  } catch (error) {
    console.error('Error processing notification:', error)
  }
}

async function processActivity(
  garminUserId: string,
  pullToken: string,
  callbackURL: string,
  summaryId: string,
  supabase: any
) {
  try {
    console.log(`Fetching activity from: ${callbackURL}`)

    // Fetch activity data using Pull Token
    const response = await fetch(`${callbackURL}?token=${pullToken}`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch activity: ${response.status} ${response.statusText}`)
      return
    }

    const activityData = await response.json()
    console.log('Activity data received:', JSON.stringify(activityData, null, 2))

    // Find the user_id from garmin_tokens
    const { data: tokenData } = await supabase
      .from('garmin_tokens')
      .select('user_id')
      .eq('user_id', garminUserId)
      .maybeSingle()

    // If we can't find by user_id, the garminUserId might be stored differently
    // Let's try to find any garmin_tokens record and use that user_id
    let userId = tokenData?.user_id

    if (!userId) {
      // Try to find by checking profiles with garmin_connected
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('garmin_connected', true)
        .limit(1)

      if (profiles && profiles.length > 0) {
        userId = profiles[0].user_id
        console.log(`Mapped Garmin user ${garminUserId} to app user ${userId}`)
      }
    }

    if (!userId) {
      console.error(`Could not find user_id for Garmin user: ${garminUserId}`)
      return
    }

    // Check if activity already exists
    const garminId = activityData.activityId?.toString() || summaryId
    const { data: existing } = await supabase
      .from('activities')
      .select('id')
      .eq('user_id', userId)
      .eq('garmin_activity_id', garminId)
      .maybeSingle()

    if (existing) {
      console.log(`Activity ${garminId} already exists, skipping`)
      return
    }

    // Map activity to our schema
    const mappedActivity = {
      user_id: userId,
      garmin_activity_id: garminId,
      name: activityData.activityName || activityData.name || 'Garmin Activity',
      date: activityData.startTimeGMT || activityData.startTime || new Date().toISOString(),
      duration_seconds: Math.round(activityData.duration || activityData.movingDuration || 0),
      distance_meters: activityData.distance || null,
      elevation_gain_meters: activityData.elevationGain || activityData.totalAscent || null,
      avg_heart_rate: activityData.averageHR || activityData.avgHr || null,
      max_heart_rate: activityData.maxHR || activityData.maxHr || null,
      calories: activityData.calories || null,
      sport_mode: mapGarminSportType(activityData.activityType?.typeKey || activityData.activityType),
      external_sync_source: 'garmin',
      activity_type: 'normal'
    }

    // Insert activity
    const { error: insertError } = await supabase
      .from('activities')
      .insert(mappedActivity)

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Activity ${garminId} duplicate detected, skipping`)
      } else {
        console.error(`Failed to insert activity ${garminId}:`, insertError.message)
      }
    } else {
      console.log(`✓ Activity synced: "${mappedActivity.name}" (ID: ${garminId})`)
    }

  } catch (error) {
    console.error('Error processing activity:', error)
  }
}

async function handleDeregistration(garminUserId: string, supabase: any) {
  try {
    console.log(`Handling deregistration for Garmin user: ${garminUserId}`)

    // Find user by garmin tokens
    const { data: tokenData } = await supabase
      .from('garmin_tokens')
      .select('user_id')
      .eq('user_id', garminUserId)
      .maybeSingle()

    if (!tokenData) {
      console.log('No tokens found for deregistration')
      return
    }

    const userId = tokenData.user_id

    // Delete tokens
    await supabase
      .from('garmin_tokens')
      .delete()
      .eq('user_id', userId)

    // Update profile
    await supabase
      .from('profiles')
      .update({ garmin_connected: false })
      .eq('user_id', userId)

    console.log(`✓ Deregistered Garmin for user: ${userId}`)

  } catch (error) {
    console.error('Error handling deregistration:', error)
  }
}

function mapGarminSportType(activityType: string | undefined): string {
  if (!activityType) return 'other'
  
  const type = activityType.toLowerCase()
  
  // Cycling activities
  if (type.includes('cycling') || type.includes('bike') || type.includes('gravel')) {
    return 'cycling'
  }
  
  // Running activities
  if (type.includes('running') || type.includes('run') || type.includes('trail')) {
    return 'running'
  }
  
  // Swimming activities
  if (type.includes('swimming') || type.includes('swim')) {
    return 'swimming'
  }
  
  // Default to other
  return 'other'
}
