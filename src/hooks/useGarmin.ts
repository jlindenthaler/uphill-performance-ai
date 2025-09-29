import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from "@/hooks/useSupabase";
import { toast } from "sonner";

export interface GarminConnection {
  connected: boolean;
}

export const useGarmin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Check connection status
  const { data: connection, isLoading } = useQuery({
    queryKey: ['garmin-connection', user?.id],
    queryFn: async (): Promise<GarminConnection> => {
      if (!user) return { connected: false };
      
      try {
        // Check if user has garmin_connected flag in profiles
        const { data: profile, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('garmin_connected')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.warn('Profile query error:', profileError);
          return { connected: false };
        }
        
        return {
          connected: (profile as any)?.garmin_connected || false
        };
      } catch (error) {
        console.error('Connection check error:', error);
        return { connected: false };
      }
    },
    enabled: !!user,
  });

  // Connect to Garmin
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('No session found');
      
      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { action: 'get_auth_url' },
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data?.authUrl) {
        // Store code verifier for the callback
        sessionStorage.setItem('garmin_code_verifier', data.codeVerifier);
        sessionStorage.setItem('garmin_state', data.state);
        
        // Navigate to Garmin authorization in same window
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    },
    onError: (error) => {
      console.error('Garmin connection error:', error);
      toast.error('Failed to connect to Garmin. Please try again.');
    },
  });

  // Disconnect from Garmin  
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      // Update user profile to remove Garmin connection
      const { error } = await supabase
        .from('profiles')
        .update({
          garmin_connected: false,
          garmin_access_token: null,
          garmin_token_secret: null
        })
        .eq('user_id', user.id);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Disconnected from Garmin');
      queryClient.invalidateQueries({ queryKey: ['garmin-connection'] });
    },
    onError: (error) => {
      console.error('Garmin disconnect error:', error);
      toast.error('Failed to disconnect from Garmin');
    },
  });

  // Handle OAuth callback result
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check both URL search params and hash params for the callback parameters
    const connected = urlParams.get('garmin_connected') || hashParams.get('garmin_connected');
    const error = urlParams.get('garmin_error') || hashParams.get('garmin_error');
    const code = urlParams.get('code') || hashParams.get('code');
    const state = urlParams.get('state') || hashParams.get('state');
    
    if (code && state) {
      // Handle OAuth callback
      const codeVerifier = sessionStorage.getItem('garmin_code_verifier');
      const storedState = sessionStorage.getItem('garmin_state');
      
      if (codeVerifier && storedState === state) {
        handleGarminCallback(code, state, codeVerifier);
      } else {
        toast.error('OAuth state mismatch or missing code verifier');
      }
      
      // Clean up
      sessionStorage.removeItem('garmin_code_verifier');
      sessionStorage.removeItem('garmin_state');
    } else if (connected === 'true') {
      toast.success('Successfully connected to Garmin!');
      queryClient.invalidateQueries({ queryKey: ['garmin-connection'] });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
    } else if (error) {
      const errorMessage = error === 'denied' 
        ? 'Garmin connection was denied' 
        : 'Failed to connect to Garmin';
      toast.error(errorMessage);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
    }
  }, [queryClient]);

  const handleGarminCallback = async (code: string, state: string, codeVerifier: string) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('No session found');

      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { 
          action: 'handle_callback',
          code: code,
          state: state,
          codeVerifier: codeVerifier
        },
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to complete Garmin connection');
      }

      if (data?.success) {
        toast.success('Successfully connected to Garmin!');
        queryClient.invalidateQueries({ queryKey: ['garmin-connection'] });
        
        // Automatically sync recent activities
        await syncActivities();
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Connection failed: ${errorMessage}`);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const syncActivities = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('No session found');

      const { data, error } = await supabase.functions.invoke('garmin-connect', {
        body: { action: 'sync_activities' },
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync Garmin activities');
      }

      if (data?.success) {
        toast.success(`Successfully synced ${data.synced || 0} activities from Garmin.`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Sync failed: ${errorMessage}`);
    }
  };

  return {
    connection,
    isLoading,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
};