import { useState, useEffect } from 'react';
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

  // Check connection status on mount
  useEffect(() => {
    checkGarminConnection();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const garminConnected = urlParams.get('garmin_connected');
    const garminError = urlParams.get('garmin_error');

    if (garminConnected === 'true') {
      toast({
        title: "Success!",
        description: "Your Garmin Connect account has been connected successfully."
      });
      setConnectionStatus(prev => ({ ...prev, isConnected: true }));
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Automatically sync recent activities
      syncGarminActivities();
    } else if (garminError) {
      toast({
        title: "Connection Failed",
        description: decodeURIComponent(garminError),
        variant: "destructive"
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const initiateGarminConnection = async () => {
    try {
      console.log('Initiating Garmin connection...');
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('garmin-oauth', {
        body: { action: 'authorize' }
      });

      console.log('Garmin OAuth response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Failed to initiate Garmin connection');
      }

      if (data?.authUrl) {
        // Redirect to Garmin authorization
        console.log('Redirecting to Garmin:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setConnectionStatus(prev => ({ ...prev, error: errorMessage, loading: false }));
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const syncGarminActivities = async () => {
    try {
      setConnectionStatus(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('garmin-oauth', {
        body: { action: 'sync' }
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

      const { error } = await supabase.functions.invoke('garmin-oauth', {
        body: { action: 'disconnect' }
      });

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
    syncGarminActivities,
    disconnectGarmin,
    checkGarminConnection
  };
}
