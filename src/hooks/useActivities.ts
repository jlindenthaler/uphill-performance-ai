import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';
import { parseFitFile, ParsedActivityData } from '@/utils/fitParser';
import { updateTrainingHistoryForDate } from '@/utils/pmcCalculator';

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
  avg_cadence?: number;
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

  const uploadActivity = async (file: File, activityName?: string, notes?: string) => {
    if (!user) throw new Error('User not authenticated');

    console.log('Starting file upload for:', file.name);
    setLoading(true);
    try {
      // Upload file to storage first
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      console.log('Uploading file to storage:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('activity-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;
      console.log('File uploaded to storage successfully');

      let activityData: any = {
        name: activityName || file.name.replace(/\.[^/.]+$/, ""),
        sport_mode: sportMode,
        date: new Date().toISOString().split('T')[0],
        duration_seconds: 0,
        file_path: fileName,
        file_type: file.type || file.name.split('.').pop(),
        original_filename: file.name
      };

      // Try to parse FIT file if it's a .fit file
      const isFileType = (extensions: string[]) => 
        extensions.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));

      if (isFileType(['.fit'])) {
        try {
          console.log('Parsing FIT file...');
          const parsedData: ParsedActivityData = await parseFitFile(file);
          console.log('FIT file parsed successfully:', parsedData);
          
          // Merge parsed data with basic activity data
          activityData = {
            ...activityData,
            ...parsedData,
            // Keep the user-provided name if specified
            name: activityName || parsedData.name || activityData.name,
            // Keep user-selected sport mode if specified, otherwise use parsed
            sport_mode: sportMode !== 'cycling' ? sportMode : parsedData.sport_mode
          };
        } catch (parseError) {
          console.warn('Failed to parse FIT file, saving basic data:', parseError);
          // Continue with basic data if parsing fails
        }
      } else if (isFileType(['.gpx', '.tcx'])) {
        console.log('GPX/TCX parsing not yet implemented, saving basic data');
        // TODO: Add GPX/TCX parsing in the future
      }

      console.log('Saving activity data:', activityData);
      const { data: savedActivity, error: saveError } = await supabase
        .from('activities')
        .insert({
          ...activityData,
          user_id: user.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      console.log('Activity saved successfully:', savedActivity);
      
      // Update PMC calculations for this date
      try {
        await updateTrainingHistoryForDate(user.id, activityData.date);
        console.log('PMC data updated successfully');
      } catch (pmcError) {
        console.warn('Failed to update PMC data:', pmcError);
      }
      
      return savedActivity;
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