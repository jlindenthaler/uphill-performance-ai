import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useSupabase';

export interface RecoveryTool {
  id: string;
  tool_name: string;
  available: boolean;
  frequency?: string;
  notes?: string;
  user_id: string;
  sport_mode?: string;
  created_at: string;
  updated_at: string;
}

export function useRecoveryTools() {
  const [tools, setTools] = useState<RecoveryTool[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTools = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('recovery_tools')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (error) {
      console.error('Error fetching recovery tools:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [user]);

  return {
    tools,
    loading,
    refetch: fetchTools
  };
}