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

    console.log('Strava OAuth request received for user:', user.id);

    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      console.log('Strava credentials not configured - integration pending approval');
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

    // Handle POST requests (from frontend)
    if (req.method === 'POST') {
      const { action, code, state } = await req.json();

      if (action === 'get_auth_url') {
        // Generate OAuth URL for Strava
        const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/strava-oauth`;
        const scope = 'read,activity:read_all';
        const state = user.id; // Use user ID as state for security
        
        const authUrl = `https://www.strava.com/oauth/authorize?` +
          `client_id=${STRAVA_CLIENT_ID}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `approval_prompt=force&` +
          `scope=${encodeURIComponent(scope)}&` +
          `state=${state}`;

        console.log('Generated Strava OAuth URL for user:', user.id, 'Redirect URI:', redirectUri);
        
        return new Response(
          JSON.stringify({ authUrl }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (action === 'handle_callback' && code && state) {
        // Verify state matches user ID for security
        if (state !== user.id) {
          console.error('State mismatch. Expected:', user.id, 'Received:', state);
          throw new Error('Invalid state parameter - security check failed');
        }

        console.log('Exchanging authorization code for tokens for user:', user.id);

        // Exchange code for access token
        const tokenResponse = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', tokenResponse.status, errorText);
          throw new Error(`Failed to exchange code for token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('Token exchange successful for user:', user.id, 'Athlete ID:', tokenData.athlete?.id);
        
        if (tokenData.error) {
          console.error('Strava OAuth error:', tokenData.error);
          throw new Error(`Strava OAuth error: ${tokenData.error}`);
        }

        // Store tokens securely using the existing function
        const { error: storeError } = await supabaseClient.rpc('store_strava_tokens_secure', {
          p_user_id: user.id,
          p_access_token: tokenData.access_token,
          p_refresh_token: tokenData.refresh_token,
          p_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          p_scope: tokenData.scope,
          p_athlete_id: tokenData.athlete?.id || null,
        });

        if (storeError) {
          console.error('Error storing Strava tokens:', storeError);
          throw new Error(`Failed to store Strava tokens securely: ${storeError.message}`);
        }

        console.log('Successfully connected Strava for user:', user.id, 'Profile updated');

        return new Response(
          JSON.stringify({ 
            success: true,
            athlete: tokenData.athlete,
            message: 'Strava account connected successfully'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Handle check connection status
      if (action === 'check_connection') {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('strava_connected')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: tokenData } = await supabaseClient.rpc('get_strava_tokens_secure', {
          p_user_id: user.id
        });

        const isConnected = profile?.strava_connected && tokenData && tokenData.length > 0;
        const hasValidToken = tokenData && tokenData.length > 0 && new Date(tokenData[0]?.expires_at) > new Date();

        return new Response(
          JSON.stringify({ 
            isConnected,
            hasValidToken,
            expiresAt: tokenData?.[0]?.expires_at || null
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      throw new Error('Invalid action specified');
    }

    // Handle GET requests (OAuth callback from Strava)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      console.log('OAuth callback received - Code:', !!code, 'State:', state, 'Error:', error);

      if (error) {
        console.error('Strava OAuth error:', error);
        return new Response(
          `<html><body><script>
            window.opener.postMessage({type: 'strava_auth_error', error: '${error}'}, '*');
            window.close();
          </script><p>Authorization cancelled or failed: ${error}</p></body></html>`,
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      }

      if (code && state) {
        console.log('OAuth callback successful, sending message to opener');
        return new Response(
          `<html><body><script>
            window.opener.postMessage({type: 'strava_auth_success', code: '${code}', state: '${state}'}, '*');
            window.close();
          </script><p>Authorization successful! This window will close automatically.</p></body></html>`,
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          }
        );
      }

      return new Response(
        `<html><body><script>
          window.opener.postMessage({type: 'strava_auth_error', error: 'Missing authorization code'}, '*');
          window.close();
        </script><p>Authorization failed - missing code or state</p></body></html>`,
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        }
      );
    }

    throw new Error('Invalid request method');

  } catch (error) {
    console.error('Error in strava-oauth function:', error);
    
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