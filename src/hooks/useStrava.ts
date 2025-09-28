import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StravaConnectionStatus {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
}

export function useStrava() {
  const [connectionStatus, setConnectionStatus] = useState<StravaConnectionStatus>({
    isConnected: false,
    loading: false,
    error: null
  });
  const { toast } = useToast();

  const initiateStravaConnection = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('strava-oauth', {
        body: { action: 'get_auth_url' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initiate Strava connection');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.authUrl) {
        // Open Strava authorization in new window
        const authWindow = window.open(data.authUrl, 'strava_auth', 'width=600,height=600');
        
        // Listen for auth success message
        const messageHandler = async (event: MessageEvent) => {
          if (event.data.type === 'strava_auth_success') {
            window.removeEventListener('message', messageHandler);
            
            // Handle the OAuth callback
            await handleStravaCallback(event.data.code, event.data.state);
          }
        };

        window.addEventListener('message', messageHandler);
        
        toast({
          title: "Strava Authorization",
          description: "Please complete the authorization process in the popup window."
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionStatus(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setConnectionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const handleStravaCallback = async (code: string, state: string) => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('strava-oauth', {
        body: { 
          action: 'handle_callback',
          code: code,
          state: state
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to complete Strava connection');
      }

      if (data?.success) {
        setConnectionStatus(prev => ({ ...prev, isConnected: true }));
        
        toast({
          title: "Success!",
          description: "Your Strava account has been connected successfully."
        });

        // Automatically sync recent activities
        await syncStravaActivities();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionStatus(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setConnectionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const syncStravaActivities = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('strava-sync');

      if (error) {
        throw new Error(error.message || 'Failed to sync Strava activities');
      }

      if (data?.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.synced || 0} activities from Strava.`
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionStatus(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setConnectionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const disconnectStrava = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      // Update user profile to remove Strava connection
      const { error } = await supabase
        .from('profiles')
        .update({
          strava_connected: false
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        throw new Error('Failed to disconnect Strava account');
      }

      setConnectionStatus(prev => ({ ...prev, isConnected: false }));
      
      toast({
        title: "Disconnected",
        description: "Your Strava account has been disconnected."
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionStatus(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Disconnection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setConnectionStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const checkStravaConnection = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('strava_connected')
        .eq('user_id', user.user.id)
        .single();

      setConnectionStatus(prev => ({ 
        ...prev, 
        isConnected: profile?.strava_connected || false 
      }));
    } catch (err) {
      console.error('Error checking Strava connection:', err);
    }
  };

  return {
    connectionStatus,
    initiateStravaConnection,
    handleStravaCallback,
    syncStravaActivities,
    disconnectStrava,
    checkStravaConnection
  };
}