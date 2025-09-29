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
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');

      const success = urlParams.get('success');

      if (error) {
        toast({
          title: "Authorization Failed",
          description: `Strava authorization failed: ${error}`,
          variant: "destructive"
        });
        navigate('/?tab=settings&subtab=integrations', { replace: true });
        return;
      }

      if (success === 'true') {
        toast({
          title: "Success!",
          description: "Your Strava account has been connected successfully.",
        });
        navigate('/?tab=settings&subtab=integrations', { replace: true });
        return;
      }

      // Legacy callback handling for direct code/state params
      if (code && state) {
        try {
          await handleStravaCallback(code, state);
          navigate('/?tab=settings&subtab=integrations', { replace: true });
        } catch (err) {
          console.error('Strava callback error:', err);
          navigate('/?tab=settings&subtab=integrations', { replace: true });
        }
      } else {
        toast({
          title: "Authorization Failed",
          description: "Missing authorization parameters from Strava",
          variant: "destructive"
        });
        navigate('/?tab=settings&subtab=integrations', { replace: true });
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