import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

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

  const fetchPowerProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .order('duration_seconds', { ascending: true });

      // Add date filter if dateRangeDays is provided
      if (dateRangeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
        query = query.gte('date_achieved', cutoffDate.toISOString());
      }

      // Exclude specific activity if provided
      if (excludeActivityId) {
        query = query.neq('activity_id', excludeActivityId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by duration and get best values (highest power or lowest pace)
      const profileMap = new Map();
      data?.forEach(record => {
        const durationSeconds = record.duration_seconds;
        const existing = profileMap.get(durationSeconds);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        if (value && (!existing || (isRunning ? value < existing.best : value > existing.best))) {
          profileMap.set(durationSeconds, {
            duration: formatDuration(durationSeconds),
            durationSeconds: durationSeconds,
            current: value,
            best: value,
            date: record.date_achieved,
            unit: isRunning ? 'min/km' : 'W'
          });
        }
      });

      // Convert map to array and sort by duration
      const profile = Array.from(profileMap.values()).sort((a, b) => 
        a.durationSeconds - b.durationSeconds
      );

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

  useEffect(() => {
    if (user) {
      fetchPowerProfile();
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
    loading,
    fetchPowerProfile,
    addPowerProfileEntry
  };
}