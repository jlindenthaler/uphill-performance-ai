import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';

interface RecoverySession {
  id: string;
  session_date: string;
  duration_minutes: number;
  pre_fatigue_level: number;
  post_fatigue_level: number;
  effectiveness_rating: number;
  muscle_groups: string[];
  recovery_tools_used: string[];
  notes: string | null;
  sport_mode: string;
  created_at: string;
}

export function useRecoverySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<RecoverySession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recovery_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching recovery sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('recovery_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSessions();
    } catch (error) {
      console.error('Error deleting recovery session:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  return {
    sessions,
    loading,
    fetchSessions,
    deleteSession
  };
}