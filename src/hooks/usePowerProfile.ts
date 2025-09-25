import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

interface PowerProfileData {
  duration: string;
  current: number;
  best: number;
  date: string;
  unit: string;
  allTimeBest?: number;
  rangeBest?: number;
}

export function usePowerProfile(dateRangeDays?: number) {
  const { user } = useAuth();
  const { sportMode, isRunning } = useSportMode();
  const [powerProfile, setPowerProfile] = useState<PowerProfileData[]>([]);
  const [loading, setLoading] = useState(false);

  const durations = [
    { seconds: 5, label: '5s' },
    { seconds: 60, label: '1min' },
    { seconds: 300, label: '5min' },
    { seconds: 1200, label: '20min' },
    { seconds: 3600, label: '60min' }
  ];

  const fetchPowerProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .in('duration_seconds', durations.map(d => d.seconds))
        .order('date_achieved', { ascending: false });

      // Add date filter if dateRangeDays is provided - Fixed to properly filter by date range
      if (dateRangeDays && dateRangeDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        cutoffDate.setHours(0, 0, 0, 0); // Start of day for consistent filtering
        query = query.gte('date_achieved', cutoffDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Create separate maps for range-filtered and all-time records
      const allTimeProfileMap = new Map();
      const rangeFilteredProfileMap = new Map();
      const mostRecentMap = new Map(); // Track most recent for "current"
      
      const cutoffDate = dateRangeDays ? new Date(Date.now() - (dateRangeDays * 24 * 60 * 60 * 1000)) : null;

      data?.forEach(record => {
        const duration = durations.find(d => d.seconds === record.duration_seconds);
        if (!duration) return;

        const recordDate = new Date(record.date_achieved);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        // All-time best processing
        const existing = allTimeProfileMap.get(duration.seconds);
        if (!existing || (isRunning ? value < existing.best : value > existing.best)) {
          allTimeProfileMap.set(duration.seconds, {
            duration: duration.label,
            current: value || 0,
            best: value || 0,
            date: record.date_achieved,
            unit: isRunning ? 'min/km' : 'W'
          });
        }

        // Most recent processing (for current values)
        const recentExisting = mostRecentMap.get(duration.seconds);
        if (!recentExisting || new Date(record.date_achieved) > new Date(recentExisting.date)) {
          mostRecentMap.set(duration.seconds, {
            duration: duration.label,
            current: value || 0,
            best: value || 0,
            date: record.date_achieved,
            unit: isRunning ? 'min/km' : 'W'
          });
        }

        // Range-filtered processing if within date range
        if (!cutoffDate || recordDate >= cutoffDate) {
          const rangeExisting = rangeFilteredProfileMap.get(duration.seconds);
          if (!rangeExisting || (isRunning ? value < rangeExisting.best : value > rangeExisting.best)) {
            rangeFilteredProfileMap.set(duration.seconds, {
              duration: duration.label,
              current: value || 0,
              best: value || 0,
              date: record.date_achieved,
              unit: isRunning ? 'min/km' : 'W',
              rangeBest: value || 0 // Track range-specific best
            });
          }
        }
      });

      // Combine data: use range-filtered best when available, otherwise all-time best
      const activeMap = dateRangeDays ? rangeFilteredProfileMap : allTimeProfileMap;
      
      // Fill in missing durations with proper current/best separation
      const profile = durations.map(duration => {
        const allTimeData = allTimeProfileMap.get(duration.seconds);
        const rangeData = rangeFilteredProfileMap.get(duration.seconds);
        const recentData = mostRecentMap.get(duration.seconds);
        
        // Current = most recent value, Best = best within range (or all-time if no range)
        const current = recentData?.current || 0;
        const best = dateRangeDays ? (rangeData?.rangeBest || 0) : (allTimeData?.best || 0);
        const allTimeBest = allTimeData?.best || 0;
        
        return {
          duration: duration.label,
          current,
          best,
          allTimeBest, // Add all-time best for comparison
          date: (rangeData || allTimeData || recentData)?.date || new Date().toISOString(),
          unit: isRunning ? 'min/km' : 'W',
          rangeBest: rangeData?.rangeBest || 0 // Specific range best
        };
      });

      setPowerProfile(profile);
    } catch (error) {
      console.error('Error fetching power profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPowerProfileEntry = async (durationSeconds: number, value: number) => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        duration_seconds: durationSeconds,
        sport: sportMode,
        date_achieved: new Date().toISOString(),
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

  useEffect(() => {
    if (user) {
      fetchPowerProfile();
    }
  }, [user, sportMode, dateRangeDays]);

  return {
    powerProfile,
    loading,
    fetchPowerProfile,
    addPowerProfileEntry
  };
}