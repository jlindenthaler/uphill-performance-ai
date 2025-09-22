import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';

interface TimeAvailability {
  training_hours_per_day: number;
  recovery_hours_per_day: number;
}

export function useTimeAvailability() {
  const { user } = useAuth();
  const [timeAvailability, setTimeAvailability] = useState<TimeAvailability | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTimeAvailability = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_availability')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setTimeAvailability(data);
    } catch (error) {
      console.error('Error fetching time availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTimeAvailability = async (availability: TimeAvailability) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('time_availability')
      .upsert({
        user_id: user.id,
        ...availability,
      });

    if (error) throw error;
    await fetchTimeAvailability();
  };

  useEffect(() => {
    if (user) {
      fetchTimeAvailability();
    }
  }, [user]);

  return {
    timeAvailability,
    loading,
    saveTimeAvailability,
    fetchTimeAvailability
  };
}