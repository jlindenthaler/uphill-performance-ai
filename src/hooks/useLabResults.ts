import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface LabResults {
  vo2_max?: number;
  vla_max?: number;
  fat_max?: number;
  crossover_point?: number;
  fat_max_intensity?: number;
}

export function useLabResults() {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [labResults, setLabResults] = useState<LabResults | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLabResults = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .maybeSingle();

      if (error) throw error;
      setLabResults(data);
    } catch (error) {
      console.error('Error fetching lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLabResults = async (results: LabResults) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('lab_results')
      .upsert({
        user_id: user.id,
        sport_mode: sportMode,
        ...results,
      });

    if (error) throw error;
    await fetchLabResults();
  };

  useEffect(() => {
    if (user) {
      fetchLabResults();
    }
  }, [user, sportMode]);

  return {
    labResults,
    loading,
    saveLabResults,
    fetchLabResults
  };
}