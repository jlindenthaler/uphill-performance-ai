import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';
import { toast } from 'sonner';
import type { TrainingPlanFormData } from '@/components/AITrainingPlanWizard';
import { logger } from '@/utils/logger';

export function useTrainingPlan() {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async (formData: TrainingPlanFormData) => {
    if (!user) {
      toast.error('Please sign in to generate a training plan');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-ai-plan', {
        body: {
          ...formData,
          sportMode,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        throw new Error('Plan generation failed');
      }

      toast.success(`Training plan created! ${data.plan.sessionCount} sessions over ${data.plan.totalWeeks} weeks`);
      return data.plan;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate training plan';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getActivePlan = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('training_plans')
        .select(`
          *,
          plan_blocks (
            *,
            plan_sessions (*)
          )
        `)
        .eq('user_id', user.id)
        .eq('sport_mode', sportMode)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching active plan:', err);
      return null;
    }
  };

  const getPlanSessions = async (startDate: Date, endDate: Date) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('plan_sessions')
        .select(`
          *,
          plan_blocks!inner (
            *,
            training_plans!inner (
              user_id,
              sport_mode,
              status
            )
          )
        `)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0])
        .eq('plan_blocks.training_plans.user_id', user.id)
        .eq('plan_blocks.training_plans.sport_mode', sportMode)
        .eq('plan_blocks.training_plans.status', 'active');

      if (error) throw error;
      
      logger.info('[Plan Sessions] Fetched:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        count: data?.length || 0,
        sportMode
      });
      
      return data || [];
    } catch (err) {
      console.error('Error fetching plan sessions:', err);
      return [];
    }
  };

  const updatePlanSession = async (sessionId: string, updates: Partial<any>) => {
    try {
      const { error } = await supabase
        .from('plan_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
      toast.success('Session updated');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update session';
      toast.error(message);
      return false;
    }
  };

  const markSessionComplete = async (sessionId: string) => {
    return updatePlanSession(sessionId, { completed: true });
  };

  const deletePlanSession = async (sessionId: string) => {
    if (!user) {
      toast.error('Please sign in to delete sessions');
      return false;
    }

    try {
      const { error } = await supabase
        .from('plan_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success('Plan session deleted');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete session';
      toast.error(message);
      return false;
    }
  };

  return {
    generatePlan,
    getActivePlan,
    getPlanSessions,
    updatePlanSession,
    markSessionComplete,
    deletePlanSession,
    loading,
    error,
  };
}
