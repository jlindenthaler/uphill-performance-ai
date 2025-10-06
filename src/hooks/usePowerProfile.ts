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
}

export function usePowerProfile(dateRangeDays?: number, excludeActivityId?: string) {
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

      // Group by duration and get best values
      const profileMap = new Map();
      data?.forEach(record => {
        const duration = durations.find(d => d.seconds === record.duration_seconds);
        if (!duration) return;

        const existing = profileMap.get(duration.seconds);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        if (!existing || (isRunning ? value < existing.best : value > existing.best)) {
          profileMap.set(duration.seconds, {
            duration: duration.label,
            current: value || 0,
            best: value || 0,
            date: record.date_achieved,
            unit: isRunning ? 'min/km' : 'W'
          });
        }
      });

      // Fill in missing durations with placeholder data
      const profile = durations.map(duration => {
        const existing = profileMap.get(duration.seconds);
        return existing || {
          duration: duration.label,
          current: 0,
          best: 0,
          date: new Date().toISOString(),
          unit: isRunning ? 'min/km' : 'W'
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