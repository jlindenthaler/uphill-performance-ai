import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface CPResult {
  id?: string;
  user_id?: string;
  sport_mode?: string;
  test_date?: string;
  protocol_used?: string;
  cp_watts?: number;
  w_prime_joules?: number;
  efforts_used?: any; // JSONB from database
  efforts_rejected?: any; // JSONB from database  
  created_at?: string;
  updated_at?: string;
}

export { type CPResult };

export function useCPResults() {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [cpResults, setCPResults] = useState<CPResult[]>([]);
  const [latestCPResult, setLatestCPResult] = useState<CPResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCPResults = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cp_results')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .order('test_date', { ascending: false });

      if (error) throw error;
      
      // Parse JSON fields and set results
      const parsedResults = (data || []).map(result => ({
        ...result,
        efforts_used: typeof result.efforts_used === 'string' ? JSON.parse(result.efforts_used) : result.efforts_used,
        efforts_rejected: typeof result.efforts_rejected === 'string' ? JSON.parse(result.efforts_rejected) : result.efforts_rejected
      }));
      
      setCPResults(parsedResults);
      setLatestCPResult(parsedResults.length > 0 ? parsedResults[0] : null);
    } catch (error) {
      console.error('Error fetching CP results:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCPResult = async (result: {
    test_date: string;
    protocol_used: string;
    cp_watts: number;
    w_prime_joules: number;
    efforts_used?: any;
    efforts_rejected?: any;
  }) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('cp_results')
      .insert({
        user_id: user.id,
        sport_mode: sportMode,
        ...result,
      });

    if (error) throw error;
    await fetchCPResults();
  };

  const deleteCPResult = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('cp_results')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchCPResults();
  };

  useEffect(() => {
    if (user) {
      fetchCPResults();
    }
  }, [user, sportMode]);

  return {
    cpResults,
    latestCPResult,
    loading,
    saveCPResult,
    deleteCPResult,
    fetchCPResults
  };
}