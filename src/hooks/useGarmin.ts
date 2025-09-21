import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GarminConnectionStatus {
  isConnected: boolean;
  loading: boolean;
  error: string | null;
}

export function useGarmin() {
  const [connectionStatus, setConnectionStatus] = useState<GarminConnectionStatus>({
    isConnected: false,
    loading: false,
    error: null
  });
  const { toast } = useToast();

  const initiateGarminConnection = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { action: 'get_auth_url' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initiate Garmin connection');
      }

      if (data?.authUrl) {
        // Open Garmin authorization in new window
        window.open(data.authUrl, 'garmin_auth', 'width=600,height=600');
        
        toast({
          title: "Garmin Authorization",
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

  const handleGarminCallback = async (oauthToken: string, oauthVerifier: string) => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { 
          action: 'handle_callback',
          code: oauthToken,
          state: oauthVerifier
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to complete Garmin connection');
      }

      if (data?.success) {
        setConnectionStatus(prev => ({ ...prev, isConnected: true }));
        
        toast({
          title: "Success!",
          description: "Your Garmin Connect account has been connected successfully."
        });

        // Automatically sync recent activities
        await syncGarminActivities();
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

  const syncGarminActivities = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { action: 'sync_activities' }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync Garmin activities');
      }

      if (data?.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.synced || 0} activities from Garmin Connect.`
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

  const disconnectGarmin = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      // Update user profile to remove Garmin connection
      const { error } = await supabase
        .from('profiles')
        .update({
          garmin_connected: false,
          garmin_access_token: null,
          garmin_token_secret: null
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        throw new Error('Failed to disconnect Garmin account');
      }

      setConnectionStatus(prev => ({ ...prev, isConnected: false }));
      
      toast({
        title: "Disconnected",
        description: "Your Garmin Connect account has been disconnected."
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

  const checkGarminConnection = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('garmin_connected')
        .eq('user_id', user.user.id)
        .single();

      setConnectionStatus(prev => ({ 
        ...prev, 
        isConnected: profile?.garmin_connected || false 
      }));
    } catch (err) {
      console.error('Error checking Garmin connection:', err);
    }
  };

  return {
    connectionStatus,
    initiateGarminConnection,
    handleGarminCallback,
    syncGarminActivities,
    disconnectGarmin,
    checkGarminConnection
  };
}