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

export function usePowerProfile(timeWindow: string = '90-day', excludeActivityId?: string) {
  const { user } = useAuth();
  const { sportMode, isRunning } = useSportMode();
  const [powerProfile, setPowerProfile] = useState<PowerProfileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [recalculatedProfile, setRecalculatedProfile] = useState<PowerProfileData[]>([]);

  const fetchPowerProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log(`[Power Profile] Fetching for sport: ${sportMode}, timeWindow: ${timeWindow}`);
      
      // Calculate cutoff date for time window
      const cutoffDate = new Date();
      if (timeWindow !== 'all-time') {
        const days = parseInt(timeWindow.split('-')[0]);
        cutoffDate.setDate(cutoffDate.getDate() - days);
      }
      
      // Get data for selected time window (primary display)
      let windowQuery = supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .eq('time_window', timeWindow);
      
      // Apply date filter for rolling windows
      if (timeWindow !== 'all-time') {
        windowQuery = windowQuery.gte('date_achieved', cutoffDate.toISOString());
      }
      
      const { data: windowData, error: windowError } = await windowQuery
        .order('duration_seconds', { ascending: true });

      if (windowError) throw windowError;
      console.log(`[Power Profile] Fetched ${windowData?.length || 0} ${timeWindow} records`);

      // Get all-time best values for comparison
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('power_profile')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .eq('time_window', 'all-time')
        .order('duration_seconds', { ascending: true });

      if (allTimeError) throw allTimeError;
      console.log(`[Power Profile] Fetched ${allTimeData?.length || 0} all-time records`);

      // Process selected time window data
      const windowMap = new Map();
      windowData?.forEach(record => {
        const durationSeconds = record.duration_seconds;
        const existing = windowMap.get(durationSeconds);
        const value = isRunning ? record.pace_per_km : record.power_watts;
        
        if (value && (!existing || (isRunning ? value < existing : value > existing))) {
          windowMap.set(durationSeconds, value);
        }
      });

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

      console.log(`[Power Profile] Processed ${windowMap.size} ${timeWindow} durations, ${allTimeMap.size} all-time durations`);

      // Create profile for display (selected time window)
      const displayProfile = Array.from(windowMap.entries()).map(([durationSeconds, value]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds: durationSeconds,
        current: value,
        best: allTimeMap.get(durationSeconds) || value, // Show all-time best for comparison
        date: new Date().toISOString(),
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      // Create all-time profile (kept for background/reference)
      const allTimeProfile = Array.from(allTimeMap.entries()).map(([durationSeconds, value]) => ({
        duration: formatDuration(durationSeconds),
        durationSeconds: durationSeconds,
        current: value,
        best: value,
        date: new Date().toISOString(),
        unit: isRunning ? 'min/km' : 'W'
      })).sort((a, b) => a.durationSeconds - b.durationSeconds);

      // Set selected window as primary display, all-time as reference
      setPowerProfile(displayProfile);
      setRecalculatedProfile(allTimeProfile);
      console.log(`[Power Profile] Updated: ${displayProfile.length} ${timeWindow} points, ${allTimeProfile.length} all-time points`);
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
      const baseData = {
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

      // Insert into all time windows
      const rollingWindows = [7, 14, 30, 60, 90, 365];
      const insertData = [
        { ...baseData, time_window: 'all-time' },
        ...rollingWindows.map(days => ({ ...baseData, time_window: `${days}-day` }))
      ];

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
  }, [user, sportMode, timeWindow, excludeActivityId]);

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