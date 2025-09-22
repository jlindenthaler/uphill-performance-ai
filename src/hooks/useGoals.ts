import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useSupabase';

export interface Goal {
  id: string;
  name: string;
  event_date: string;
  location: string;
  event_type: string;
  priority: string;
  status: 'active' | 'completed' | 'deferred';
  target_performance: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setGoals((data || []) as Goal[]);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{ 
          ...goalData, 
          user_id: user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      
      setGoals(prev => [...prev, data as Goal]);
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => prev.map(goal => 
        goal.id === id ? { ...goal, ...(data as Goal) } : goal
      ));
      return data;
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.filter(goal => goal.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting goal:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    refetch: fetchGoals
  };
};