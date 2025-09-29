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
    const action = url.searchParams.get('action');

    console.log('Garmin auth request:', req.method, url.pathname + url.search);

    // Handle OAuth callback from Garmin
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      console.log('Garmin OAuth callback params:', {
        code: code ? 'present' : 'missing',
        state: state || 'missing',
        error: error
      });

      if (error) {
        console.error('Garmin OAuth error:', error);
        return Response.redirect(`https://uphill-ai.uphill.com.au/?tab=integrations&garmin_error=${encodeURIComponent(error)}`);
      }

      if (!code || !state) {
        console.error('Missing required OAuth parameters');
        return Response.redirect(`https://uphill-ai.uphill.com.au/?tab=integrations&garmin_error=missing_parameters`);
      }

      // Create a simple success page that will communicate with the parent window
      const successPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Garmin Authorization</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #22c55e; }
            .error { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>Garmin Authorization Successful!</h2>
            <p>You can close this window now.</p>
          </div>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'garmin_auth_success',
                code: '${code}',
                state: '${state}'
              }, '*');
              window.close();
            } else {
              // Fallback: redirect to main app
              setTimeout(() => {
                window.location.href = 'https://uphill-ai.uphill.com.au/?tab=integrations&garmin_connected=true';
              }, 2000);
            }
          </script>
        </body>
        </html>
      `;

      return new Response(successPage, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // For other requests, return 404
    return new Response('Not Found', { status: 404 });

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