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
        // Open Strava authorization in popup window
        const authWindow = window.open(
          data.authUrl, 
          'strava_auth', 
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!authWindow) {
          throw new Error('Popup blocked. Please allow popups and try again.');
        }

        // Listen for auth success/error messages
        const messageHandler = async (event: MessageEvent) => {
          console.log('Received message from popup:', event.origin, event.data);
          
          // Verify origin for security - allow messages from Supabase domain
          if (!event.origin.includes('supabase.co') && event.origin !== window.location.origin) {
            console.log('Message origin rejected:', event.origin);
            return;
          }

          if (event.data.type === 'strava_auth_success') {
            console.log('Processing Strava auth success');
            clearInterval(pollClosed);
            clearInterval(pollLocalStorage);
            window.removeEventListener('message', messageHandler);
            authWindow?.close();
            
            // Handle the OAuth callback
            await handleStravaCallback(event.data.code, event.data.state);
          } else if (event.data.type === 'strava_auth_error') {
            console.log('Processing Strava auth error');
            clearInterval(pollClosed);
            clearInterval(pollLocalStorage);
            window.removeEventListener('message', messageHandler);
            authWindow?.close();
            
            setConnectionStatus(prev => ({ 
              ...prev, 
              loading: false, 
              error: `Strava authorization failed: ${event.data.error}` 
            }));
            
            toast({
              title: "Authorization Failed",
              description: `Strava authorization failed: ${event.data.error}`,
              variant: "destructive"
            });
          }
        };

        window.addEventListener('message', messageHandler);

        // Poll localStorage as fallback communication method
        const pollLocalStorage = setInterval(() => {
          try {
            const result = localStorage.getItem('strava_auth_result');
            if (result) {
              const authResult = JSON.parse(result);
              // Only process results from the last 5 minutes
              if (Date.now() - authResult.timestamp < 300000) {
                localStorage.removeItem('strava_auth_result');
                
                if (authResult.type === 'success') {
                  console.log('Processing localStorage auth success');
                  clearInterval(pollClosed);
                  clearInterval(pollLocalStorage);
                  window.removeEventListener('message', messageHandler);
                  authWindow?.close();
                  
                  handleStravaCallback(authResult.code, authResult.state);
                } else if (authResult.type === 'error') {
                  console.log('Processing localStorage auth error');
                  clearInterval(pollClosed);
                  clearInterval(pollLocalStorage);
                  window.removeEventListener('message', messageHandler);
                  authWindow?.close();
                  
                  setConnectionStatus(prev => ({ 
                    ...prev, 
                    loading: false, 
                    error: `Strava authorization failed: ${authResult.error}` 
                  }));
                  
                  toast({
                    title: "Authorization Failed",
                    description: `Strava authorization failed: ${authResult.error}`,
                    variant: "destructive"
                  });
                }
              }
            }
          } catch (e) {
            console.error('Error checking localStorage:', e);
          }
        }, 1000);

        // Handle if popup is closed manually
        const pollClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(pollClosed);
            clearInterval(pollLocalStorage);
            window.removeEventListener('message', messageHandler);
            setConnectionStatus(prev => ({ 
              ...prev, 
              loading: false, 
              error: 'Authorization cancelled by user' 
            }));
          }
        }, 1000);
        
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