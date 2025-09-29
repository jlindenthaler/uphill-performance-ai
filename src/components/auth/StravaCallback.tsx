import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStrava } from "@/hooks/useStrava";
import { useToast } from "@/hooks/use-toast";

export function StravaCallback() {
  const navigate = useNavigate();
  const { handleStravaCallback } = useStrava();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('StravaCallback: Starting callback handling');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      console.log('StravaCallback: URL params:', { code: !!code, state, error });

      if (error) {
        console.error('StravaCallback: Authorization error:', error);
        toast({
          title: "Authorization Failed",
          description: `Strava authorization failed: ${error}`,
          variant: "destructive"
        });
        // Redirect to integrations tab on error
        navigate('/?tab=integrations', { replace: true });
        return;
      }

      if (code && state) {
        try {
          console.log('StravaCallback: Calling handleStravaCallback...');
          await handleStravaCallback(code, state);
          console.log('StravaCallback: Success! Redirecting to integrations tab...');
          // Navigate to home with integrations tab active
          navigate('/?tab=integrations', { replace: true });
        } catch (err) {
          console.error('StravaCallback: Error during callback:', err);
          toast({
            title: "Connection Failed",
            description: "Failed to complete Strava connection. Please try again.",
            variant: "destructive"
          });
          // Redirect to integrations tab on error
          navigate('/?tab=integrations', { replace: true });
        }
      } else {
        console.error('StravaCallback: Missing code or state');
        toast({
          title: "Authorization Failed",
          description: "Missing authorization code from Strava",
          variant: "destructive"
        });
        // Redirect to integrations tab on error
        navigate('/?tab=integrations', { replace: true });
      }
    };

    handleCallback();
  }, [handleStravaCallback, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting your Strava account...</p>
      </div>
    </div>
  );
}