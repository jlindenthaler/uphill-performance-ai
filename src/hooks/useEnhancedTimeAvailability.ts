import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';

interface DayTimeAvailability {
  day: string;
  training_hours: number;
  recovery_hours: number;
  preferred_training_times: string[]; // e.g., ["morning", "evening"]
  preferred_recovery_times: string[];
}

interface WeeklyTimeAvailability {
  monday: DayTimeAvailability;
  tuesday: DayTimeAvailability;
  wednesday: DayTimeAvailability;
  thursday: DayTimeAvailability;
  friday: DayTimeAvailability;
  saturday: DayTimeAvailability;
  sunday: DayTimeAvailability;
}

const defaultDayAvailability: DayTimeAvailability = {
  day: '',
  training_hours: 1,
  recovery_hours: 0.5,
  preferred_training_times: ['morning'],
  preferred_recovery_times: ['evening']
};

export function useEnhancedTimeAvailability() {
  const { user } = useAuth();
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyTimeAvailability>({
    monday: { ...defaultDayAvailability, day: 'monday' },
    tuesday: { ...defaultDayAvailability, day: 'tuesday' },
    wednesday: { ...defaultDayAvailability, day: 'wednesday' },
    thursday: { ...defaultDayAvailability, day: 'thursday' },
    friday: { ...defaultDayAvailability, day: 'friday' },
    saturday: { ...defaultDayAvailability, day: 'saturday', training_hours: 2, recovery_hours: 1 },
    sunday: { ...defaultDayAvailability, day: 'sunday', training_hours: 2, recovery_hours: 1 }
  });
  const [loading, setLoading] = useState(false);

  const fetchWeeklyAvailability = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_availability')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Use the new weekly_schedule if available
        if (data.weekly_schedule) {
          setWeeklyAvailability(data.weekly_schedule as unknown as WeeklyTimeAvailability);
        } else {
          // Fallback to old format for backwards compatibility
          const trainingHours = data.training_hours_per_day || 1;
          const recoveryHours = data.recovery_hours_per_day || 0.5;
          
          setWeeklyAvailability({
            monday: { ...defaultDayAvailability, day: 'monday', training_hours: trainingHours, recovery_hours: recoveryHours },
            tuesday: { ...defaultDayAvailability, day: 'tuesday', training_hours: trainingHours, recovery_hours: recoveryHours },
            wednesday: { ...defaultDayAvailability, day: 'wednesday', training_hours: trainingHours, recovery_hours: recoveryHours },
            thursday: { ...defaultDayAvailability, day: 'thursday', training_hours: trainingHours, recovery_hours: recoveryHours },
            friday: { ...defaultDayAvailability, day: 'friday', training_hours: trainingHours, recovery_hours: recoveryHours },
            saturday: { ...defaultDayAvailability, day: 'saturday', training_hours: trainingHours * 1.5, recovery_hours: recoveryHours * 1.5 },
            sunday: { ...defaultDayAvailability, day: 'sunday', training_hours: trainingHours * 1.5, recovery_hours: recoveryHours * 1.5 }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching weekly availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWeeklyAvailability = async (availability: WeeklyTimeAvailability) => {
    if (!user) throw new Error('User not authenticated');

    // Calculate averages for backwards compatibility
    const avgTrainingHours = Object.values(availability).reduce((sum, day) => sum + day.training_hours, 0) / 7;
    const avgRecoveryHours = Object.values(availability).reduce((sum, day) => sum + day.recovery_hours, 0) / 7;

    const { error } = await supabase
      .from('time_availability')
      .upsert([{
        user_id: user.id,
        training_hours_per_day: avgTrainingHours,
        recovery_hours_per_day: avgRecoveryHours,
        weekly_schedule: availability as any,
      }], {
        onConflict: 'user_id'
      });

    if (error) throw error;
    setWeeklyAvailability(availability);
  };

  const updateDayAvailability = (day: keyof WeeklyTimeAvailability, updates: Partial<DayTimeAvailability>) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], ...updates }
    }));
  };

  useEffect(() => {
    if (user) {
      fetchWeeklyAvailability();
    }
  }, [user]);

  return {
    weeklyAvailability,
    loading,
    saveWeeklyAvailability,
    updateDayAvailability,
    fetchWeeklyAvailability
  };
}