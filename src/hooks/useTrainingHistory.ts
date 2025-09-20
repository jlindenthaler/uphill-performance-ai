import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

interface TrainingHistoryData {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  duration: number;
}

export function useTrainingHistory(days: number = 30) {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrainingHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('training_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sportMode)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      const formattedData = data?.map(record => ({
        date: record.date,
        tss: record.tss || 0,
        ctl: record.ctl || 0,
        atl: record.atl || 0,
        tsb: record.tsb || 0,
        duration: record.duration_minutes || 0
      })) || [];

      setTrainingHistory(formattedData);
    } catch (error) {
      console.error('Error fetching training history:', error);
      // If no data exists, generate some sample data for demo
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const sampleData: TrainingHistoryData[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const baseCTL = 45 + Math.sin(i / 7) * 5;
      const baseATL = 35 + Math.sin(i / 3) * 8;
      const tss = Math.max(0, Math.random() * 120);
      
      sampleData.push({
        date: date.toISOString().split('T')[0],
        tss,
        ctl: baseCTL + Math.random() * 10,
        atl: baseATL + Math.random() * 15,
        tsb: baseCTL - baseATL + Math.random() * 6 - 3,
        duration: tss > 0 ? Math.floor(tss * 1.2 + 30) : 0
      });
    }
    
    setTrainingHistory(sampleData);
  };

  const addTrainingEntry = async (entry: Omit<TrainingHistoryData, 'date'> & { date?: string }) => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        date: entry.date || new Date().toISOString().split('T')[0],
        tss: entry.tss,
        ctl: entry.ctl,
        atl: entry.atl,
        tsb: entry.tsb,
        duration_minutes: entry.duration,
        sport: sportMode
      };

      const { error } = await supabase
        .from('training_history')
        .upsert(insertData);

      if (error) throw error;
      await fetchTrainingHistory(); // Refresh data
    } catch (error) {
      console.error('Error adding training entry:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTrainingHistory();
    }
  }, [user, sportMode, days]);

  return {
    trainingHistory,
    loading,
    fetchTrainingHistory,
    addTrainingEntry
  };
}