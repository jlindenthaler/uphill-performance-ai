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

// Lightweight activity summary for list view
interface ActivitySummary {
  id: string;
  user_id: string;
  name: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  avg_power?: number;
  avg_heart_rate?: number;
  avg_speed_kmh?: number;
  avg_pace_per_km?: number;
  tss?: number;
  created_at: string;
  updated_at: string;
}

// Full activity interface with all detailed data
interface Activity extends ActivitySummary {
  elevation_gain_meters?: number;
  max_power?: number;
  normalized_power?: number;
  max_heart_rate?: number;
  avg_cadence?: number;
  calories?: number;
  intensity_factor?: number;
  variability_index?: number;
  file_path?: string;
  file_type?: string;
  original_filename?: string;
  gps_data?: any;
  lap_data?: any;
  notes?: string;
  weather_conditions?: any;
  power_time_series?: any;
  heart_rate_time_series?: any;
  power_curve_cache?: any;
  elevation_profile?: any;
}

export function useActivities(filterBySport: boolean = true) {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const { timezone } = useUserTimezone();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [detailedActivities, setDetailedActivities] = useState<Map<string, Activity>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  const ACTIVITIES_PER_PAGE = 10;

  // Fetch lightweight activity summaries for list view
  const fetchActivities = async (reset: boolean = true) => {
    if (!user) return;
    
    const currentPage = reset ? 0 : page;
    console.log(`Fetching activity summaries for user: ${user.id}, page: ${currentPage}, reset: ${reset}`);
    
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let query = supabase
        .from('activities')
        .select(`
          id,
          user_id,
          name,
          sport_mode,
          date,
          duration_seconds,
          distance_meters,
          avg_power,
          avg_heart_rate,
          avg_speed_kmh,
          avg_pace_per_km,
          tss,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id);

      // Only filter by sport mode if requested
      if (filterBySport) {
        query = query.eq('sport_mode', sportMode);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(currentPage * ACTIVITIES_PER_PAGE, (currentPage + 1) * ACTIVITIES_PER_PAGE - 1);

      if (error) throw error;
      
      const fetchedActivities = data || [];
      console.log(`Fetched ${fetchedActivities.length} activity summaries (page ${currentPage})`);
      
      if (reset) {
        setActivities(fetchedActivities);
      } else {
        setActivities(prev => [...prev, ...fetchedActivities]);
      }
      
      // Check if there are more activities to load
      setHasMore(fetchedActivities.length === ACTIVITIES_PER_PAGE);
      setPage(currentPage + 1);
      
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more activities (for infinite scroll)
  const fetchMoreActivities = async () => {
    if (!hasMore || loadingMore) return;
    await fetchActivities(false);
  };

  // Fetch full activity details for expanded view
  const fetchActivityDetails = async (activityId: string): Promise<Activity | null> => {
    if (!user) return null;
    
    // Check if already in cache
    if (detailedActivities.has(activityId)) {
      return detailedActivities.get(activityId)!;
    }

    // Check if already loading
    if (loadingDetails.has(activityId)) {
      return null;
    }

    console.log('Fetching detailed data for activity:', activityId);
    setLoadingDetails(prev => new Set([...prev, activityId]));
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      console.log('Fetched detailed activity data:', activityId);
      const activityData = data as Activity;
      
      // Cache the detailed data
      setDetailedActivities(prev => new Map([...prev, [activityId, activityData]]));
      
      return activityData;
    } catch (error) {
      console.error('Error fetching activity details:', error);
      return null;
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
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
      
      // Check for potential duplicates before inserting
      const activityForDedup = {
        date: activityData.date,
        duration_seconds: activityData.duration_seconds,
        distance_meters: activityData.distance_meters,
        sport_mode: activityData.sport_mode,
        external_sync_source: null, // Manual upload
        garmin_activity_id: null,
      };

      // Check for potential duplicates based on activity characteristics
      const timeWindow = 2; // 2 hours
      const activityDate = new Date(activityData.date);
      const startTime = new Date(activityDate.getTime() - timeWindow * 60 * 60 * 1000).toISOString();
      const endTime = new Date(activityDate.getTime() + timeWindow * 60 * 60 * 1000).toISOString();
      
      const minDuration = activityData.duration_seconds - 30; // 30 second tolerance
      const maxDuration = activityData.duration_seconds + 30;

      let duplicateQuery = supabase
        .from('activities')
        .select('id, date, duration_seconds, distance_meters, external_sync_source, garmin_activity_id, created_at, name')
        .eq('user_id', user.id)
        .eq('sport_mode', activityData.sport_mode)
        .gte('date', startTime)
        .lte('date', endTime)
        .gte('duration_seconds', minDuration)
        .lte('duration_seconds', maxDuration);

      // Add distance filter if activity has distance
      if (activityData.distance_meters) {
        const minDistance = Math.max(0, activityData.distance_meters - 100); // 100m tolerance
        const maxDistance = activityData.distance_meters + 100;
        duplicateQuery = duplicateQuery
          .gte('distance_meters', minDistance)
          .lte('distance_meters', maxDistance);
      }

      const { data: potentialDuplicates } = await duplicateQuery;

      if (potentialDuplicates && potentialDuplicates.length > 0) {
        console.log(`Found ${potentialDuplicates.length} potential duplicates for uploaded activity`);
        console.log('Duplicate details:', potentialDuplicates.map(d => ({
          id: d.id,
          name: d.name,
          source: d.external_sync_source || 'manual',
          date: d.date,
          duration: d.duration_seconds,
          distance: d.distance_meters
        })));
        
        // Show user a warning about potential duplicate
        toast({
          title: 'Potential Duplicate Activity Detected',
          description: `Found ${potentialDuplicates.length} similar activity(ies) on ${new Date(activityData.date).toLocaleDateString()}. Uploading anyway...`,
          variant: 'default'
        });
        
        // Note: We're still allowing the upload but warning the user
        // In a future version, we could ask for user confirmation
      }
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
      setPage(0);
      setHasMore(true);
      await fetchActivities(true);
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
      setPage(0);
      setHasMore(true);
      await fetchActivities(true);
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      setPage(0);
      setHasMore(true);
      fetchActivities(true);
    }
    
    // Listen for activity upload events
    const handleActivityUploaded = () => {
      console.log('Activity uploaded event received, refreshing activities...');
      setPage(0);
      setHasMore(true);
      fetchActivities(true);
    };
    
    window.addEventListener('activity-uploaded', handleActivityUploaded);
    
    return () => {
      window.removeEventListener('activity-uploaded', handleActivityUploaded);
    };
  }, [user, filterBySport ? sportMode : null]);

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
      setPage(0);
      setHasMore(true);
      await fetchActivities(true);
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
      setPage(0);
      setHasMore(true);
      await fetchActivities(true);

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
    loadingMore,
    hasMore,
    detailedActivities,
    loadingDetails,
    fetchActivities,
    fetchActivityDetails,
    fetchMoreActivities,
    uploadActivity,
    deleteActivity,
    updateActivity,
    backfillPowerProfile,
    reprocessActivityTimestamps,
    recalculateTLIBasedOnLabResults
  };
}