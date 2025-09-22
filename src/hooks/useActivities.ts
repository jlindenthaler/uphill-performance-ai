import { useState, useEffect } from 'react';
import { useAuth, useAIAnalysis } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface Activity {
  id: string;
  user_id: string;
  name: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_pace_per_km?: number;
  avg_speed_kmh?: number;
  calories?: number;
  tss?: number;
  intensity_factor?: number;
  variability_index?: number;
  file_path?: string;
  file_type?: string;
  original_filename?: string;
  gps_data?: any;
  lap_data?: any;
  notes?: string;
  weather_conditions?: any;
  created_at: string;
  updated_at: string;
}

export function useActivities() {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = async (limit?: number) => {
    if (!user) return;
    
    console.log('Fetching activities for user:', user.id);
    setLoading(true);
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      console.log('Fetched activities:', data?.length || 0, 'activities');
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadActivity = async (file: File, activityName?: string) => {
    if (!user) throw new Error('User not authenticated');

    console.log('Starting upload activity process for:', file.name);
    setLoading(true);
    try {
      // Parse FIT file client-side
      let parsedData;
      if (file.name.toLowerCase().endsWith('.fit')) {
        console.log('Parsing FIT file client-side...');
        try {
          const { parseFitFile } = await import('@/utils/fitParser');
          parsedData = await parseFitFile(file);
          console.log('Client-side FIT parsing successful:', parsedData);
        } catch (error) {
          console.error('Client-side FIT parsing failed, using fallback:', error);
          const { generateFallbackData } = await import('@/utils/fitParser');
          parsedData = generateFallbackData(file);
        }
      } else {
        console.log('Non-FIT file, generating fallback data');
        const { generateFallbackData } = await import('@/utils/fitParser');
        parsedData = generateFallbackData(file);
      }

      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      console.log('Uploading file to storage:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('activity-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      console.log('File uploaded to storage successfully');

      // Prepare activity data
      const activityData = {
        ...parsedData,
        name: activityName || parsedData.name || file.name.replace(/\.[^/.]+$/, ""),
        file_path: fileName,
        file_type: file.type || file.name.split('.').pop(),
        original_filename: file.name,
        sport_mode: sportMode
      };

      console.log('Saving activity data:', activityData);
      const { data: saveResult, error: saveError } = await supabase.functions
        .invoke('fit-parser', {
          body: {
            action: 'save_activity',
            activityData
          }
        });

      if (saveError) throw saveError;

      // Return the saved activity data
      console.log('Activity saved successfully:', saveResult);
      return saveResult;
    } catch (error) {
      console.error('Error uploading activity:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Get activity details first
      const { data: activity, error: fetchError } = await supabase
        .from('activities')
        .select('file_path')
        .eq('id', activityId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from database
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Delete file from storage if exists
      if (activity.file_path) {
        await supabase.storage
          .from('activity-files')
          .remove([activity.file_path]);
      }

      // Refresh activities list
      await fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<Activity>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh activities list
      await fetchActivities();
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
    
    // Listen for activity upload events
    const handleActivityUploaded = () => {
      console.log('Activity uploaded event received, refreshing activities...');
      fetchActivities();
    };
    
    window.addEventListener('activity-uploaded', handleActivityUploaded);
    
    return () => {
      window.removeEventListener('activity-uploaded', handleActivityUploaded);
    };
  }, [user, sportMode]);

  return {
    activities,
    loading,
    fetchActivities,
    uploadActivity,
    deleteActivity,
    updateActivity
  };
}