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

      if (error) {
        toast({
          title: "Authorization Failed",
          description: `Strava authorization failed: ${error}`,
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (code && state) {
        try {
          await handleStravaCallback(code, state);
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Strava callback error:', err);
          navigate('/');
        }
      } else {
        toast({
          title: "Authorization Failed",
          description: "Missing authorization code from Strava",
          variant: "destructive"
        });
        navigate('/');
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