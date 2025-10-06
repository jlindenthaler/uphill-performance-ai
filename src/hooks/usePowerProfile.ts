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
      // Always get ALL-TIME best values (no date filtering)
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .order('duration_seconds', { ascending: true });

      if (allTimeError) throw allTimeError;

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

      // Create profile with all-time bests
      const profile = Array.from(allTimeMap.entries()).map(([durationSeconds, value]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds: durationSeconds,
        current: value,
        best: value,
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
      // Query activities directly with date filter - limit to avoid timeout
      let query = supabase
        .from('activities')
        .select('id, date, duration_seconds, name, power_time_series, speed_time_series, gps_data')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .order('date', { ascending: false })
        .limit(50); // Limit to recent 50 activities to avoid timeout

      if (dateRangeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        console.log(`[Power Profile] Querying activities since ${cutoffDate.toISOString().split('T')[0]}`);
        query = query.gte('date', cutoffDate.toISOString());
      }

      const { data: activities, error } = await query;
      if (error) throw error;

      console.log(`[Power Profile] Found ${activities?.length || 0} activities to analyze`);

      // Standard durations to calculate (in seconds)
      const durations = [1, 5, 10, 15, 20, 30, 60, 120, 180, 300, 360, 600, 900, 1200, 1800, 2400, 3600, 4200, 5400, 7200];
      const bestValues = new Map<number, { value: number, activityName: string, date: string }>();

      // Process each activity
      activities?.forEach(activity => {
        let records: any[] = [];
        
        // Try to get data from multiple sources
        if (isRunning) {
          if (activity.speed_time_series && Array.isArray(activity.speed_time_series)) {
            records = activity.speed_time_series as any[];
          } else if (activity.gps_data && typeof activity.gps_data === 'object' && 'trackPoints' in activity.gps_data) {
            records = (activity.gps_data as any).trackPoints || [];
          }
        } else {
          if (activity.power_time_series && Array.isArray(activity.power_time_series)) {
            records = activity.power_time_series as any[];
          } else if (activity.gps_data && typeof activity.gps_data === 'object' && 'trackPoints' in activity.gps_data) {
            records = (activity.gps_data as any).trackPoints || [];
          }
        }

        if (!records || records.length === 0) {
          console.log(`[Power Profile] No data for activity: ${activity.name}`);
          return;
        }

        console.log(`[Power Profile] Processing ${activity.name}: ${records.length} data points`);

        // Calculate mean max for each duration
        durations.forEach(duration => {
          if (records.length < duration) return; // Skip if not enough data points
          
          let bestValue: number | null = null;
          
          // Calculate rolling averages - work directly with number arrays
          for (let i = 0; i <= records.length - duration; i++) {
            const slice = records.slice(i, i + duration);
            
            if (isRunning) {
              // For running: records are speeds in m/s, convert to pace (min/km)
              const validSpeeds = slice.filter(s => typeof s === 'number' && s > 0);
              if (validSpeeds.length === 0) continue;
              
              const avgSpeed = validSpeeds.reduce((sum, s) => sum + s, 0) / validSpeeds.length;
              const paceMinPerKm = avgSpeed > 0 ? (1000 / 60) / avgSpeed : null;
              
              if (paceMinPerKm !== null && (bestValue === null || paceMinPerKm < bestValue)) {
                bestValue = paceMinPerKm;
              }
            } else {
              // For cycling: records are power values in watts
              const validPower = slice.filter(p => typeof p === 'number' && p >= 0);
              if (validPower.length === 0) continue;
              
              const avgPower = validPower.reduce((sum, p) => sum + p, 0) / validPower.length;
              
              if (avgPower > 0 && (bestValue === null || avgPower > bestValue)) {
                bestValue = avgPower;
              }
            }
          }
          
          if (bestValue !== null && bestValue > 0) {
            const existing = bestValues.get(duration);
            // For running (pace), lower is better; for cycling (power), higher is better
            if (!existing || (isRunning ? bestValue < existing.value : bestValue > existing.value)) {
              bestValues.set(duration, {
                value: bestValue,
                activityName: activity.name,
                date: activity.date
              });
            }
          }
        });
      });

      console.log(`[Power Profile] Calculated ${bestValues.size} duration bests from ${activities?.length} activities`);

      // Convert to PowerProfileData format
      const profile = Array.from(bestValues.entries()).map(([durationSeconds, data]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds,
        current: data.value,
        best: data.value,
        date: data.date,
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      console.log(`[Power Profile] Sample results:`, profile.slice(0, 5).map(p => 
        `${p.duration}: ${p.current.toFixed(0)}${p.unit}`
      ));

      setRecalculatedProfile(profile);
    } catch (error) {
      console.error('Error recalculating power profile:', error);
      setRecalculatedProfile([]); // Clear on error
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