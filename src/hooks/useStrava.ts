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
        // Redirect to Strava authorization page
        window.location.href = data.authUrl;
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

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      // Update user profile to remove Strava connection
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          strava_connected: false
        })
        .eq('user_id', user.user.id);

      if (profileError) {
        throw new Error('Failed to disconnect Strava account');
      }

      // Clear encrypted tokens (they will remain encrypted but profile will show disconnected)
      const { error: tokenError } = await supabase
        .from('encrypted_strava_tokens')
        .delete()
        .eq('user_id', user.user.id);

      if (tokenError) {
        console.warn('Failed to clear Strava tokens, but profile updated:', tokenError);
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
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('strava-oauth', {
        body: { action: 'check_connection' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to check Strava connection');
      }

      setConnectionStatus(prev => ({ 
        ...prev, 
        isConnected: data?.isConnected || false,
        loading: false
      }));
    } catch (err) {
      console.error('Error checking Strava connection:', err);
      setConnectionStatus(prev => ({ 
        ...prev, 
        loading: false, 
        error: err instanceof Error ? err.message : 'Failed to check connection'
      }));
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