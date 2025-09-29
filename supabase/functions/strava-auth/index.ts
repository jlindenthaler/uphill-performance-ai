import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url)
    let action = url.searchParams.get('action')

    // For POST requests, get action from body
    if (req.method === 'POST') {
      const body = await req.json()
      action = body.action
    }

    // Check for valid action
    if (!action || !['authorize', 'callback', 'disconnect'].includes(action)) {
      throw new Error('Invalid or missing action parameter')
    }

    // For callback, we don't have user session - Strava calls this directly
    if (action === 'callback') {
      // Handle OAuth callback without requiring auth header
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state') // This contains the user ID
      const error = url.searchParams.get('error')

      if (error) {
        console.error('Strava OAuth error:', error)
        return Response.redirect(`https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com/#/settings/integrations?strava_error=denied`)
      }

      if (!code || !state) {
        throw new Error('Missing code or state parameter')
      }

      // Use service role client for database operations during callback
      const supabaseServiceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Exchange code for tokens
      const clientId = Deno.env.get('STRAVA_CLIENT_ID')
      const clientSecret = Deno.env.get('STRAVA_CLIENT_SECRET')
      
      const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens')
      }

      const tokenData = await tokenResponse.json()
      console.log('Strava token exchange successful for user:', state)

      // Store tokens in database using the user ID from state
      const { error: dbError } = await supabaseServiceClient
        .from('strava_tokens')
        .upsert({
          user_id: state, // Use state as user_id
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          athlete_id: tokenData.athlete?.id?.toString()
        })

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error('Failed to store tokens')
      }

      // Update profile to mark Strava as connected
      await supabaseServiceClient
        .from('profiles')
        .update({ strava_connected: true })
        .eq('user_id', state)

      // Redirect back to app with success
      return Response.redirect(`https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com/#/settings/integrations?strava_connected=true`)
    }

    // For other actions, require authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      throw new Error('User not authenticated')
    }

    if (action === 'authorize') {
      // Step 1: Redirect to Strava authorization
      const clientId = Deno.env.get('STRAVA_CLIENT_ID')
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/strava-auth?action=callback`
      
      const authUrl = `https://www.strava.com/oauth/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `approval_prompt=force&` +
        `scope=read,activity:read_all&` +
        `state=${user.id}` // Pass user ID as state for security

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'disconnect') {
      // Disconnect Strava account
      const { error: deleteError } = await supabaseClient
        .from('strava_tokens')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        throw new Error('Failed to delete tokens')
      }

      // Update profile
      await supabaseClient
        .from('profiles')
        .update({ strava_connected: false })
        .eq('user_id', user.id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Strava auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})