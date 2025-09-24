import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

export interface WeeklyTarget {
  id: string;
  user_id: string;
  weekly_tli_target: number;
  weekly_sessions_target: number;
  sport_mode: string;
  created_at: string;
  updated_at: string;
}

export const useWeeklyTargets = () => {
  const [weeklyTarget, setWeeklyTarget] = useState<WeeklyTarget | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { sportMode } = useSportMode();

  const fetchWeeklyTarget = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('weekly_targets')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .maybeSingle();

      if (error) throw error;
      setWeeklyTarget(data);
    } catch (error) {
      console.error('Error fetching weekly targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateWeeklyTarget = async (targets: { 
    weekly_tli_target: number; 
    weekly_sessions_target: number;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('weekly_targets')
        .upsert({
          user_id: user.id,
          sport_mode: sportMode,
          ...targets
        }, {
          onConflict: 'user_id,sport_mode'
        })
        .select()
        .single();

      if (error) throw error;
      
      setWeeklyTarget(data as WeeklyTarget);
      return data;
    } catch (error) {
      console.error('Error updating weekly targets:', error);
      return null;
    }
  };

  const deleteWeeklyTarget = async () => {
    if (!user || !weeklyTarget) return false;

    try {
      const { error } = await supabase
        .from('weekly_targets')
        .delete()
        .eq('id', weeklyTarget.id);

      if (error) throw error;

      setWeeklyTarget(null);
      return true;
    } catch (error) {
      console.error('Error deleting weekly target:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchWeeklyTarget();
  }, [user, sportMode]);

  return {
    weeklyTarget,
    loading,
    createOrUpdateWeeklyTarget,
    deleteWeeklyTarget,
    refetch: fetchWeeklyTarget
  };
};