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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Garmin OAuth callback:', { 
      hasCode: !!code, 
      hasState: !!state, 
      error
    });

    if (error) {
      console.error('Garmin OAuth error:', error);
      // Can't determine origin without state, use default
      return Response.redirect(`https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com/?tab=integrations&garmin_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return Response.redirect(`https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com/?tab=integrations&garmin_error=missing_parameters`);
    }

    // Parse state to get userId and origin
    const [userId, origin] = state.split('|')
    const redirectOrigin = origin || 'https://d7238d46-6905-4cbe-9bf1-ade7278def5b.lovableproject.com';

    console.log('Parsed state:', { userId, origin: redirectOrigin });


    // Use service role client to retrieve code verifier and exchange tokens
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Retrieve code verifier from profiles
    const { data: profile, error: profileError } = await supabaseServiceClient
      .from('profiles')
      .select('garmin_code_verifier, garmin_oauth_state')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.garmin_code_verifier) {
      console.error('Failed to retrieve code verifier:', profileError);
      return Response.redirect(`${redirectOrigin}/?tab=integrations&garmin_error=code_verifier_missing`);
    }

    // Verify state matches
    if (profile.garmin_oauth_state !== state) {
      console.error('State mismatch');
      return Response.redirect(`${redirectOrigin}/?tab=integrations&garmin_error=state_mismatch`);
    }

    const codeVerifier = profile.garmin_code_verifier;
    const clientId = Deno.env.get('GARMIN_CLIENT_ID');
    const clientSecret = Deno.env.get('GARMIN_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GARMIN_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/garmin-auth`;


    console.log('Token exchange details:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasCodeVerifier: !!codeVerifier,
      redirectUri,
      codeLength: code.length
    });

    // Exchange code for tokens
    const tokenResponse = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId!,
        client_secret: clientSecret!,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return Response.redirect(`${redirectOrigin}/?tab=integrations&garmin_error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Store tokens securely using RPC
    const { error: storeError } = await supabaseServiceClient.rpc('store_garmin_tokens_secure', {
      p_user_id: userId,
      p_access_token: tokenData.access_token,
      p_token_secret: tokenData.refresh_token || ''
    });

    if (storeError) {
      console.error('Failed to store tokens:', storeError);
      return Response.redirect(`${redirectOrigin}/?tab=integrations&garmin_error=token_storage_failed`);
    }

    // Update profile to mark Garmin as connected and clear temporary OAuth data
    const { error: updateError } = await supabaseServiceClient
      .from('profiles')
      .update({ 
        garmin_connected: true,
        garmin_code_verifier: null,
        garmin_oauth_state: null
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
    }

    console.log('Garmin integration successful, redirecting to:', redirectOrigin);

    // Redirect back to origin with success
    return Response.redirect(`${redirectOrigin}/?tab=integrations&garmin_connected=true`);

  } catch (error) {
    console.error('Garmin auth error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});