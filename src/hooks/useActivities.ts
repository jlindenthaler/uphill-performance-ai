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
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadActivity = async (file: File, activityName?: string) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    try {
      // Upload file to storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('activity-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Process the file
      const { data: processResult, error: processError } = await supabase.functions
        .invoke('process-activity', {
          body: {
            action: 'process_file',
            filePath: fileName
          }
        });

      if (processError) throw processError;

      // Save the activity
      const activityData = {
        ...processResult.data,
        name: activityName || processResult.data.name || file.name.replace(/\.[^/.]+$/, ""),
        file_path: fileName,
        file_type: file.type || file.name.split('.').pop(),
        original_filename: file.name,
        sport_mode: sportMode
      };

      const { data: saveResult, error: saveError } = await supabase.functions
        .invoke('process-activity', {
          body: {
            action: 'save_activity',
            activityData
          }
        });

      if (saveError) throw saveError;

      // Refresh activities list
      await fetchActivities();
      
      return saveResult.activity;
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