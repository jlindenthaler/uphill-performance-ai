import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';

interface CombinedTrainingHistoryData {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  duration: number;
}

export function useCombinedTrainingHistory(days: number = 30) {
  const { user } = useAuth();
  const [trainingHistory, setTrainingHistory] = useState<CombinedTrainingHistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCombinedTrainingHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch training history for all sports
      const { data, error } = await supabase
        .from('training_history')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Aggregate PMC values by date across all sports
        const aggregatedData = new Map<string, CombinedTrainingHistoryData>();
        
        data.forEach(record => {
          const dateKey = record.date;
          if (aggregatedData.has(dateKey)) {
            const existing = aggregatedData.get(dateKey)!;
            existing.tss += record.tss || 0;
            existing.duration += record.duration_minutes || 0;
            // For PMC values, take the max since they should be calculated consistently
            // but might vary slightly due to rounding across sports
            existing.ctl = Math.max(existing.ctl, record.ctl || 0);
            existing.atl = Math.max(existing.atl, record.atl || 0);
            existing.tsb = Math.max(existing.tsb, record.tsb || 0);
          } else {
            aggregatedData.set(dateKey, {
              date: record.date,
              tss: record.tss || 0,
              ctl: record.ctl || 0,
              atl: record.atl || 0,
              tsb: record.tsb || 0,
              duration: record.duration_minutes || 0
            });
          }
        });

        setTrainingHistory(Array.from(aggregatedData.values()).sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        setTrainingHistory([]);
      }
    } catch (error) {
      console.error('Error fetching combined training history:', error);
      setTrainingHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCombinedTrainingHistory();
    }
  }, [user, days]);

  return {
    trainingHistory,
    loading,
    fetchCombinedTrainingHistory
  };
}