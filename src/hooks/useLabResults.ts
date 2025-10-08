import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface LabResults {
  id?: string;
  vo2_max?: number;
  vla_max?: number;
  fat_max?: number;
  crossover_point?: number;
  fat_max_intensity?: number;
  body_weight?: number;
  map_value?: number;
  resting_hr?: number;
  max_hr?: number;
  aet?: number;
  aet_hr?: number;
  gt?: number;
  gt_hr?: number;
  critical_power?: number;
  w_prime?: number;
  metabolic_efficiency?: number;
  created_at?: string;
  updated_at?: string;
  // Additional fields for comprehensive lab results
  vt1_hr?: number;
  vt1_power?: number;
  vt2_hr?: number;
  vt2_power?: number;
  lt1_hr?: number;
  lt1_power?: number;
  lt2_hr?: number;
  lt2_power?: number;
  rmr?: number;
  fat_oxidation_rate?: number;
  carb_oxidation_rate?: number;
  test_date?: string;
  test_type?: string;
  notes?: string;
}

export { type LabResults };

export function useLabResults() {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [labResults, setLabResults] = useState<LabResults | null>(null);
  const [allLabResults, setAllLabResults] = useState<LabResults[]>([]);
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
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setLabResults(data);
    } catch (error) {
      console.error('Error fetching lab results:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLabResults = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('lab_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .order('test_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllLabResults(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching all lab results:', error);
      return [];
    }
  };

  const saveLabResults = async (results: Partial<LabResults>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('lab_results')
      .insert({
        user_id: user.id,
        sport_mode: sportMode,
        ...results,
      });

    if (error) throw error;
    await fetchLabResults();
    await fetchAllLabResults();
  };

  const updateLabResults = async (id: string, results: Partial<LabResults>) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('lab_results')
      .update(results)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchLabResults();
    await fetchAllLabResults();
  };

  const deleteLabResult = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('lab_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchLabResults();
    await fetchAllLabResults();
  };

  useEffect(() => {
    if (user) {
      fetchLabResults();
      fetchAllLabResults();
    }
  }, [user, sportMode]);

  return {
    labResults,
    allLabResults,
    loading,
    saveLabResults,
    updateLabResults,
    deleteLabResult,
    fetchLabResults,
    fetchAllLabResults
  };
}