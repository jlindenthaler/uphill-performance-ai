import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';
import { calculateMeanMaximalPower, calculateMeanMaximalPace } from '@/utils/powerAnalysis';

interface PowerProfileData {
  duration: string;
  durationSeconds: number;
  current: number;
  best: number;
  date: string;
  unit: string;
}

export function usePowerProfile(dateRangeDays?: number, excludeActivityId?: string) {
  const { user } = useAuth();
  const { sportMode, isRunning } = useSportMode();
  const [powerProfile, setPowerProfile] = useState<PowerProfileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculatedProfile, setRecalculatedProfile] = useState<PowerProfileData[]>([]);

  const fetchPowerProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log(`[Power Profile] Fetching for sport: ${sportMode}, dateRange: ${dateRangeDays || 'all-time'}`);
      
      // Get all-time best values from cache
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .order('duration_seconds', { ascending: true });

      if (allTimeError) throw allTimeError;
      console.log(`[Power Profile] Fetched ${allTimeData?.length || 0} all-time records`);

      // Get date-filtered values if dateRangeDays is specified
      let dateFilteredData = null;
      if (dateRangeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        console.log(`[Power Profile] Fetching date-filtered data since ${cutoffDate.toISOString()}`);
        
        const { data, error } = await supabase
          .from('power_profile')
          .select('*')
          .eq('user_id', user.id)
          .eq('sport', sportMode)
          .gte('date_achieved', cutoffDate.toISOString())
          .order('duration_seconds', { ascending: true });

        if (!error) {
          dateFilteredData = data;
          console.log(`[Power Profile] Fetched ${dateFilteredData?.length || 0} date-filtered records`);
        }
      }

      // Process all-time best data
      const allTimeMap = new Map();
      allTimeData?.forEach(record => {
        const durationSeconds = record.duration_seconds;
        const existing = allTimeMap.get(durationSeconds);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        if (value && (!existing || (isRunning ? value < existing : value > existing))) {
          allTimeMap.set(durationSeconds, value);
        }
      });

      // Process date-filtered data if available
      const dateFilteredMap = new Map();
      if (dateFilteredData) {
        dateFilteredData.forEach(record => {
          const durationSeconds = record.duration_seconds;
          const existing = dateFilteredMap.get(durationSeconds);
          const value = isRunning ? record.pace_per_km : record.power_watts;
          
          if (value && (!existing || (isRunning ? value < existing : value > existing))) {
            dateFilteredMap.set(durationSeconds, value);
          }
        });
      }

      console.log(`[Power Profile] Processed ${allTimeMap.size} all-time durations, ${dateFilteredMap.size} filtered durations`);

      // Create all-time profile
      const profile = Array.from(allTimeMap.entries()).map(([durationSeconds, value]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds: durationSeconds,
        current: value,
        best: value,
        date: new Date().toISOString(),
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      // Create date-filtered profile (for recalculatedProfile compatibility)
      const filteredProfile = dateFilteredMap.size > 0 
        ? Array.from(dateFilteredMap.entries()).map(([durationSeconds, value]) => ({
            duration: formatDuration(durationSeconds),
            durationSeconds: durationSeconds,
            current: value,
            best: allTimeMap.get(durationSeconds) || value,
            date: new Date().toISOString(),
            unit: isRunning ? 'min/km' : 'W'
          })).sort((a, b) => a.durationSeconds - b.durationSeconds)
        : [];

      setPowerProfile(profile);
      setRecalculatedProfile(filteredProfile);
      console.log(`[Power Profile] Updated: ${profile.length} all-time points, ${filteredProfile.length} filtered points`);
    } catch (error) {
      console.error('Error fetching power profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
  };

  const addPowerProfileEntry = async (durationSeconds: number, value: number) => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        duration_seconds: durationSeconds,
        sport: sportMode,
        date_achieved: new Date().toISOString(),
        activity_id: null, // Manual entry, no associated activity
        ...(isRunning 
          ? { pace_per_km: value } 
          : { power_watts: value }
        )
      };

      const { error } = await supabase
        .from('power_profile')
        .insert(insertData);

      if (error) throw error;
      await fetchPowerProfile(); // Refresh data
    } catch (error) {
      console.error('Error adding power profile entry:', error);
    }
  };

  // Simplified recalculation - primarily for backfill purposes
  const recalculateFromActivities = async () => {
    // This function is now mainly used for backfill
    // Regular usage should rely on the cached power_profile table
    console.log('Note: Power profile now uses cached data. Use backfill for historical data.');
    setRecalculatedProfile([]);
  };

  useEffect(() => {
    if (user) {
      fetchPowerProfile();
    }
  }, [user, sportMode, dateRangeDays, excludeActivityId]);

  // Listen for power profile updates (triggered after activity upload background processing)
  useEffect(() => {
    const handlePowerProfileUpdate = (event: CustomEvent) => {
      // Only refresh if it's for this user and sport mode
      if (event.detail?.userId === user?.id && event.detail?.sportMode === sportMode) {
        console.log('Power profile updated, refreshing data');
        fetchPowerProfile();
      }
    };

    const handleActivityUpload = () => {
      // Legacy event support - also refresh on direct activity upload event
      console.log('Activity uploaded, refreshing power profile');
      fetchPowerProfile();
    };

    window.addEventListener('powerProfileUpdated', handlePowerProfileUpdate as EventListener);
    window.addEventListener('activity-uploaded', handleActivityUpload);
    
    return () => {
      window.removeEventListener('powerProfileUpdated', handlePowerProfileUpdate as EventListener);
      window.removeEventListener('activity-uploaded', handleActivityUpload);
    };
  }, [user?.id, sportMode]);

  return {
    powerProfile,
    recalculatedProfile,
    loading,
    fetchPowerProfile,
    addPowerProfileEntry,
    recalculateFromActivities
  };
}