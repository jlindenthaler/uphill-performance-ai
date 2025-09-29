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
      
      try {
        // Check if user has strava_connected flag in profiles
        const { data: profile, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('strava_connected')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.warn('Profile query error:', profileError);
          return { connected: false };
        }
        
        if ((profile as any)?.strava_connected) {
          const { data: tokens, error: tokensError } = await (supabase as any)
            .from('strava_tokens')
            .select('athlete_id, expires_at')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (tokensError) {
            console.warn('Tokens query error:', tokensError);
            return { connected: true }; // Connected but can't get details
          }
          
          return {
            connected: true,
            athlete_id: (tokens as any)?.athlete_id || undefined,
            expires_at: (tokens as any)?.expires_at || undefined,
          };
        }
        
        return { connected: false };
      } catch (error) {
        console.error('Connection check error:', error);
        return { connected: false };
      }
    },
    enabled: !!user,
  });

  // Connect to Strava
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('No session found');
      
      const { data, error } = await supabase.functions.invoke('strava-auth?action=authorize', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
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
      
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('No session found');
      
      const { data, error } = await supabase.functions.invoke('strava-auth?action=disconnect', {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`,
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