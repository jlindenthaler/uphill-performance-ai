import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

export interface AIRequest {
  task: 'daily_recommendations' | 'chat_assistant' | 'activity_analysis' | 'workout_generation' | 'session_feedback';
  context: {
    user_id: string;
    sport_mode: string;
    training_data?: any;
    message?: string;
    activity_data?: any;
    workout_data?: any;
    requirements?: any;
  };
}

export function useAITrainingCoach() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { sportMode } = useSportMode();

  const callAI = useCallback(async (request: Omit<AIRequest, 'context'> & { 
    context?: Partial<AIRequest['context']> 
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-training-coach', {
        body: {
          ...request,
          context: {
            user_id: user.id,
            sport_mode: sportMode,
            ...request.context
          }
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data.success) {
        // Use fallback response if AI is unavailable
        return data.fallback || data.error;
      }

      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(errorMessage);
      
      // Return fallback based on request type
      if (request.task === 'daily_recommendations') {
        return "Focus on consistent training and proper recovery. Listen to your body and adjust intensity based on how you feel today.";
      }
      return "I'm currently unavailable, but keep up the great training!";
    } finally {
      setLoading(false);
    }
  }, [user, sportMode]);

  const getDailyRecommendation = useCallback(async () => {
    return await callAI({ task: 'daily_recommendations' });
  }, [callAI]);

  const getChatResponse = useCallback(async (message: string) => {
    return await callAI({ 
      task: 'chat_assistant',
      context: { message }
    });
  }, [callAI]);

  const getActivityAnalysis = useCallback(async (activityData: any) => {
    return await callAI({ 
      task: 'activity_analysis',
      context: { activity_data: activityData }
    });
  }, [callAI]);

  const generateWorkout = useCallback(async (requirements: any) => {
    return await callAI({ 
      task: 'workout_generation',
      context: { requirements }
    });
  }, [callAI]);

  const getSessionFeedback = useCallback(async (activityData: any, workoutData?: any) => {
    return await callAI({ 
      task: 'session_feedback',
      context: { 
        activity_data: activityData,
        workout_data: workoutData 
      }
    });
  }, [callAI]);

  return {
    loading,
    error,
    getDailyRecommendation,
    getChatResponse,
    getActivityAnalysis,
    generateWorkout,
    getSessionFeedback
  };
}