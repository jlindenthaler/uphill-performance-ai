import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  full_name: string;
  avatar_url: string;
  timezone: string;
  units: 'metric' | 'imperial';
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  email_notifications: boolean;
  workout_reminders: boolean;
  data_sharing: boolean;
  auto_sync: boolean;
  default_sport: 'cycling' | 'running';
  privacy_mode: boolean;
}

interface ExternalConnection {
  id: string;
  provider: 'strava' | 'trainingpeaks' | 'garmin' | 'zwift' | 'trainerroad' | 'mywhoosh';
  provider_user_id?: string;
  is_active: boolean;
  last_sync?: string;
  sync_settings: Record<string, any>;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          timezone: data.timezone || 'UTC',
          units: (data.units as 'metric' | 'imperial') || 'metric'
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...updates,
        });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password reset sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    resetPassword,
    refetchProfile: fetchProfile
  };
}

export function useAppSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings({
          theme: (data.theme as 'light' | 'dark' | 'system') || 'dark',
          notifications_enabled: data.notifications_enabled ?? true,
          email_notifications: data.email_notifications ?? true,
          workout_reminders: data.workout_reminders ?? true,
          data_sharing: data.data_sharing ?? false,
          auto_sync: data.auto_sync ?? true,
          default_sport: (data.default_sport as 'cycling' | 'running') || 'cycling',
          privacy_mode: data.privacy_mode ?? false
        });
      } else {
        // Create default settings if none exist
        const defaultSettings: AppSettings = {
          theme: 'dark',
          notifications_enabled: true,
          email_notifications: true,
          workout_reminders: true,
          data_sharing: false,
          auto_sync: true,
          default_sport: 'cycling',
          privacy_mode: false
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          ...updates,
        });

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Settings updated",
        description: "Your preferences have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  return {
    settings,
    loading,
    updateSettings,
    refetchSettings: fetchSettings
  };
}

export function useExternalConnections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConnections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('external_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setConnections(data?.map(item => ({
        id: item.id,
        provider: item.provider as ExternalConnection['provider'],
        provider_user_id: item.provider_user_id || undefined,
        is_active: item.is_active,
        last_sync: item.last_sync || undefined,
        sync_settings: (item.sync_settings as Record<string, any>) || {}
      })) || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectProvider = async (provider: ExternalConnection['provider']) => {
    // This would initiate OAuth flow in a real implementation
    toast({
      title: "Connect " + provider,
      description: "OAuth integration coming soon. This will redirect to " + provider + " for authorization.",
    });
  };

  const disconnectProvider = async (provider: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('external_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;

      setConnections(prev => prev.filter(conn => conn.provider !== provider));
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${provider}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateConnectionSettings = async (provider: string, settings: Record<string, any>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('external_connections')
        .update({ sync_settings: settings })
        .eq('user_id', user.id)
        .eq('provider', provider);

      if (error) throw error;

      setConnections(prev => 
        prev.map(conn => 
          conn.provider === provider 
            ? { ...conn, sync_settings: settings }
            : conn
        )
      );

      toast({
        title: "Settings updated",
        description: `${provider} sync settings have been updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  return {
    connections,
    loading,
    connectProvider,
    disconnectProvider,
    updateConnectionSettings,
    refetchConnections: fetchConnections
  };
}