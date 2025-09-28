import { useState, useEffect } from 'react';
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
  privacy_mode: boolean;
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
        }, {
          onConflict: 'user_id'
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

  const uploadAvatar = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Math.random()}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: user.id, 
        avatar_url: data.publicUrl 
      }, {
        onConflict: 'user_id'
      })

    if (updateError) throw updateError

    await fetchProfile()
    toast({
      title: "Avatar updated successfully",
      description: "Your profile picture has been updated.",
    })

    return data.publicUrl
  }

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
    uploadAvatar,
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
        }, {
          onConflict: 'user_id'
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