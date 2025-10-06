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
      // Query 1: Get all-time best values
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .order('duration_seconds', { ascending: true });

      if (allTimeError) throw allTimeError;

      // Query 2: Get date-range filtered values
      let rangeQuery = supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .order('duration_seconds', { ascending: true });

      // Add date filter if dateRangeDays is provided
      if (dateRangeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        rangeQuery = rangeQuery.gte('date_achieved', cutoffDate.toISOString());
      }

      // Exclude specific activity if provided
      if (excludeActivityId) {
        rangeQuery = rangeQuery.neq('activity_id', excludeActivityId);
      }

      const { data: rangeData, error: rangeError } = await rangeQuery;

      if (rangeError) throw rangeError;

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

      // Process range-filtered data
      const rangeMap = new Map();
      rangeData?.forEach(record => {
        const durationSeconds = record.duration_seconds;
        const existing = rangeMap.get(durationSeconds);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        if (value && (!existing || (isRunning ? value < existing : value > existing))) {
          rangeMap.set(durationSeconds, value);
        }
      });

      // Combine data - use all unique durations
      const allDurations = new Set([...allTimeMap.keys(), ...rangeMap.keys()]);
      const profile = Array.from(allDurations).map(durationSeconds => ({
        duration: formatDuration(durationSeconds),
        durationSeconds: durationSeconds,
        current: rangeMap.get(durationSeconds) || allTimeMap.get(durationSeconds) || 0,
        best: allTimeMap.get(durationSeconds) || 0,
        date: new Date().toISOString(),
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      setPowerProfile(profile);
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

  const recalculateFromActivities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Build date filter
      let query = supabase
        .from('activities')
        .select('id, date, power_time_series, speed_time_series, gps_data')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .order('date', { ascending: false });

      if (dateRangeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        query = query.gte('date', cutoffDate.toISOString());
      }

      const { data: activities, error } = await query;
      if (error) throw error;

      // Standard durations to calculate (in seconds)
      const durations = [1, 5, 10, 15, 20, 30, 60, 120, 180, 300, 360, 600, 900, 1200, 1800, 2400, 3600];
      const bestValues = new Map<number, number>();

      // Process each activity
      activities?.forEach(activity => {
        let records: any[] = [];
        
        // Get the appropriate time series data
        if (isRunning) {
          if (activity.speed_time_series) {
            records = activity.speed_time_series as any[];
          } else if (activity.gps_data && typeof activity.gps_data === 'object' && 'trackPoints' in activity.gps_data) {
            records = (activity.gps_data as any).trackPoints || [];
          }
        } else {
          if (activity.power_time_series) {
            records = activity.power_time_series as any[];
          } else if (activity.gps_data && typeof activity.gps_data === 'object' && 'trackPoints' in activity.gps_data) {
            records = (activity.gps_data as any).trackPoints || [];
          }
        }

        if (!records || records.length === 0) return;

        // Calculate mean max for each duration
        durations.forEach(duration => {
          if (records.length < duration) return;

          let value: number | null = null;
          if (isRunning) {
            value = calculateMeanMaximalPace(records, duration);
          } else {
            value = calculateMeanMaximalPower(records, duration);
          }

          if (value && value > 0) {
            const existing = bestValues.get(duration);
            // For running (pace), lower is better; for cycling (power), higher is better
            if (!existing || (isRunning ? value < existing : value > existing)) {
              bestValues.set(duration, value);
            }
          }
        });
      });

      // Convert to PowerProfileData format
      const profile = Array.from(bestValues.entries()).map(([durationSeconds, value]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds,
        current: value,
        best: value,
        date: new Date().toISOString(),
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      setRecalculatedProfile(profile);
    } catch (error) {
      console.error('Error recalculating power profile from activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPowerProfile();
      recalculateFromActivities();
    }
  }, [user, sportMode, dateRangeDays, excludeActivityId]);

  // Listen for activity uploads to refresh power profile
  useEffect(() => {
    const handleActivityUpload = () => {
      console.log('Activity uploaded, refreshing power profile');
      fetchPowerProfile();
    };

    window.addEventListener('activity-uploaded', handleActivityUpload);
    return () => window.removeEventListener('activity-uploaded', handleActivityUpload);
  }, []);

  return {
    powerProfile,
    recalculatedProfile,
    loading,
    fetchPowerProfile,
    addPowerProfileEntry,
    recalculateFromActivities
  };
}