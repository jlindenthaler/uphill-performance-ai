import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useSupabase";
import { toast } from "sonner";

export interface StravaConnection {
  connected: boolean;
  athlete_id?: string;
  expires_at?: string;
}

export const useStrava = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Check connection status
  const { data: connection, isLoading } = useQuery({
    queryKey: ['strava-connection', user?.id],
    queryFn: async (): Promise<StravaConnection> => {
      if (!user) return { connected: false };
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('strava_connected')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.strava_connected) {
        const { data: tokens } = await supabase
          .from('strava_tokens')
          .select('athlete_id, expires_at')
          .eq('user_id', user.id)
          .single();
        
        return {
          connected: true,
          athlete_id: tokens?.athlete_id,
          expires_at: tokens?.expires_at,
        };
      }
      
      return { connected: false };
    },
    enabled: !!user,
  });

  // Connect to Strava
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: {},
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    },
    onError: (error) => {
      console.error('Strava connection error:', error);
      toast.error('Failed to connect to Strava. Please try again.');
    },
  });

  // Disconnect from Strava  
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.functions.invoke('strava-auth', {
        body: { action: 'disconnect' },
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Disconnected from Strava');
      queryClient.invalidateQueries({ queryKey: ['strava-connection'] });
    },
    onError: (error) => {
      console.error('Strava disconnect error:', error);
      toast.error('Failed to disconnect from Strava');
    },
  });

  // Handle OAuth callback result
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('strava_connected');
    const error = urlParams.get('strava_error');
    
    if (connected === 'true') {
      toast.success('Successfully connected to Strava!');
      queryClient.invalidateQueries({ queryKey: ['strava-connection'] });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error('Strava connection was denied or failed');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [queryClient]);

  return {
    connection,
    isLoading,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
};