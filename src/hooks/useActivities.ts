import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';
import { parseFitFile, ParsedActivityData } from '@/utils/fitParser';
import { updateTrainingHistoryForDate } from '@/utils/pmcCalculator';
import { populatePowerProfileForActivity } from '@/utils/powerAnalysis';
import { useUserTimezone } from './useUserTimezone';
import { useToast } from '@/hooks/use-toast';
import { generateActivityName, shouldUseAutoName } from '@/utils/activityNaming';

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
  const { timezone } = useUserTimezone();
  const { toast } = useToast();
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

  const uploadActivity = async (
    file: File, 
    activityName?: string, 
    notes?: string,
    cpTestData?: {
      activity_type: string;
      cp_test_protocol: string;
      cp_test_target_duration?: number;
    }
  ) => {
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
        name: shouldUseAutoName(activityName) 
          ? generateActivityName({ date: new Date().toISOString(), sportMode: 'cycling' })
          : activityName || file.name.replace(/\.[^/.]+$/, ""),
        sport_mode: 'cycling', // Default fallback, will be overridden by FIT data if available
        date: new Date().toISOString(), // Store full timestamp, not just date
        duration_seconds: 0,
        file_path: fileName,
        file_type: file.type || file.name.split('.').pop(),
        original_filename: file.name,
        // Add CP test data if provided
        ...(cpTestData && {
          activity_type: cpTestData.activity_type,
          cp_test_protocol: cpTestData.cp_test_protocol,
          cp_test_target_duration: cpTestData.cp_test_target_duration
        })
      };

      // Try to parse FIT file if it's a .fit file
      const isFileType = (extensions: string[]) => 
        extensions.some(ext => file.name.toLowerCase().endsWith(ext.toLowerCase()));

      if (isFileType(['.fit'])) {
        try {
          console.log('Parsing FIT file...');
          const parsedData: ParsedActivityData = await parseFitFile(file, timezone);
          console.log('FIT file parsed successfully:', parsedData);
          console.log('Original activity date (before merge):', activityData.date);
          console.log('Parsed activity date:', parsedData.date);
          
          // Merge parsed data with basic activity data - prioritize FIT file data
          activityData = {
            ...activityData,
            ...parsedData,
            // Determine activity name using auto-naming if user didn't provide one
            name: shouldUseAutoName(activityName) 
              ? generateActivityName({ date: parsedData.date || activityData.date, sportMode: parsedData.sport_mode || 'cycling' })
              : activityName || parsedData.name || activityData.name,
            // Always use FIT-detected sport mode as it's most accurate
            sport_mode: parsedData.sport_mode || activityData.sport_mode
          };
          
          console.log('Final merged activity date:', activityData.date);
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

      // Populate power profile data if GPS data is available
      if (activityData.gps_data) {
        try {
          await populatePowerProfileForActivity(
            user.id,
            savedActivity.id,
            activityData.gps_data,
            activityData.sport_mode,
            activityData.date
          );
          console.log('Power profile data updated successfully');
        } catch (powerProfileError) {
          console.warn('Failed to update power profile data:', powerProfileError);
        }
      }

      // Process CP test if this is a CP test activity
      if (cpTestData?.activity_type === 'cp_test') {
        try {
          const { CPProcessingEngine } = await import('@/utils/cpProcessingEngine');
          CPProcessingEngine.triggerProcessing(user.id);
          console.log('CP processing triggered for user:', user.id);
        } catch (cpError) {
          console.warn('Failed to trigger CP processing:', cpError);
        }
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

  const backfillPowerProfile = async () => {
    if (!user) return;
    
    try {
      const { backfillPowerProfileData } = await import('@/utils/powerAnalysis');
      await backfillPowerProfileData(user.id);
      console.log('Power profile backfill completed');
    } catch (error) {
      console.error('Error during power profile backfill:', error);
    }
  };

  const reprocessActivityTimestamps = async () => {
    if (!user) return;
    
    console.log('Starting activity timestamp reprocessing...');
    setLoading(true);
    
    try {
      // Get all FIT activities for this user
      const { data: activities, error: fetchError } = await supabase
        .from('activities')
        .select('id, file_path, file_type, original_filename')
        .eq('user_id', user.id)
        .eq('file_type', 'fit');

      if (fetchError) throw fetchError;

      console.log(`Found ${activities?.length || 0} FIT activities to reprocess`);
      
      for (const activity of activities || []) {
        if (!activity.file_path) continue;
        
        try {
          // Download the FIT file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('activity-files')
            .download(activity.file_path);

          if (downloadError) {
            console.warn(`Failed to download file for activity ${activity.id}:`, downloadError);
            continue;
          }

          // Create a File object from the downloaded data
          const file = new File([fileData], activity.original_filename || 'activity.fit');
          
          // Re-parse the FIT file
          const parsedData = await parseFitFile(file, timezone);
          console.log(`Reparsed activity ${activity.id}, new date:`, parsedData.date);
          
          // Update the activity with the correct timestamp
          const { error: updateError } = await supabase
            .from('activities')
            .update({ date: parsedData.date })
            .eq('id', activity.id)
            .eq('user_id', user.id);

          if (updateError) {
            console.warn(`Failed to update activity ${activity.id}:`, updateError);
            continue;
          }

          console.log(`Successfully updated timestamp for activity ${activity.id}`);
        } catch (error) {
          console.warn(`Error reprocessing activity ${activity.id}:`, error);
        }
      }
      
      // Refresh the activities list
      await fetchActivities();
      console.log('Activity timestamp reprocessing completed');
      
    } catch (error) {
      console.error('Error during activity timestamp reprocessing:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const recalculateTLIBasedOnLabResults = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch all lab results for the user, ordered by test date
      const { data: labResults, error: labError } = await supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: true });

      if (labError) throw labError;

      // Fetch all activities for the user
      const { data: allActivities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (activitiesError) throw activitiesError;

      if (!allActivities || !labResults) return;

      let updatedCount = 0;

      // Process each activity
      for (const activity of allActivities) {
        if (!activity.normalized_power || !activity.duration_seconds) continue;

        // Find the most recent lab result before this activity's date
        const relevantLabResult = labResults
          .filter(lab => 
            lab.test_date && 
            lab.sport_mode === activity.sport_mode &&
            new Date(lab.test_date) <= new Date(activity.date)
          )
          .pop(); // Get the most recent one

        if (!relevantLabResult) continue;

        // Determine FTP using hierarchy: LT2/GT -> VT2 -> skip
        let ftp: number | null = null;
        
        if (relevantLabResult.lt2_power && relevantLabResult.lt2_power > 0) {
          ftp = relevantLabResult.lt2_power;
        } else if (relevantLabResult.gt && relevantLabResult.gt > 0) {
          ftp = relevantLabResult.gt;
        } else if (relevantLabResult.vt2_power && relevantLabResult.vt2_power > 0) {
          ftp = relevantLabResult.vt2_power;
        }

        if (!ftp || ftp <= 0) continue;

        // Recalculate TSS with the determined FTP
        const { calculateTSSWithCustomFTP } = await import('@/utils/fitParser');
        const newTSS = calculateTSSWithCustomFTP(
          activity.normalized_power,
          activity.duration_seconds,
          ftp
        );

        if (newTSS === null || newTSS === activity.tss) continue;

        // Update the activity with new TSS
        const { error: updateError } = await supabase
          .from('activities')
          .update({ tss: newTSS })
          .eq('id', activity.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      // Refresh activities data
      await fetchActivities();

      // Trigger PMC recalculation since TSS values changed
      const { populateTrainingHistory } = await import('@/utils/pmcCalculator');
      await populateTrainingHistory(user.id);

      toast({
        title: "TLI Recalculation Complete",
        description: `Updated ${updatedCount} activities with lab result-based FTP values.`,
      });

    } catch (error) {
      console.error('Error recalculating TLI:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate TLI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    activities,
    loading,
    fetchActivities,
    uploadActivity,
    deleteActivity,
    updateActivity,
    backfillPowerProfile,
    reprocessActivityTimestamps,
    recalculateTLIBasedOnLabResults
  };
}