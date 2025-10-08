import { useState, useEffect } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';
import { getSportFilterArray } from '@/utils/sportModeMapping';

interface WorkoutStructure {
  warmup: string;
  mainSet: string;
  cooldown: string;
  intervals: Array<{
    zone: number;
    duration: number;
    power: number;
  }>;
}

interface Workout {
  id?: string;
  name: string;
  description?: string;
  structure: any; // Using any to match Supabase Json type
  duration_minutes: number;
  tss: number;
  scheduled_date?: string;
  completed_date?: string;
}

export function useWorkouts(filterBySport: boolean = true) {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWorkouts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id);

      // Apply sport filter if enabled - includes all variations (walk, hike, etc. for running)
      if (filterBySport) {
        const sportVariations = getSportFilterArray(sportMode);
        query = query.in('sport_mode', sportVariations);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setWorkouts(data as Workout[] || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkout = async (workout: Workout) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        sport_mode: sportMode,
        ...workout,
      });

    if (error) throw error;
    await fetchWorkouts();
  };

  const scheduleWorkout = async (workoutId: string, scheduledDate: Date) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('workouts')
      .update({ scheduled_date: scheduledDate.toISOString() })
      .eq('id', workoutId)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchWorkouts();
  };

  const deleteWorkout = async (workoutId: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', user.id);

    if (error) throw error;
    await fetchWorkouts();
  };

  const exportWorkout = async (
    workout: any, 
    format: 'json' | 'zwo' | 'erg' | 'mrc' = 'json',
    thresholds?: any
  ) => {
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    if (format === 'json') {
      content = JSON.stringify(workout, null, 2);
      mimeType = 'application/json';
      fileExtension = 'json';
    } else {
      // For other formats, we need thresholds and the science-workouts package
      if (!thresholds) {
        // Fetch user thresholds if not provided
        const { getThresholdsFromLabResults } = await import('@/utils/scienceWorkouts');
        if (!user) throw new Error('User not authenticated');
        thresholds = await getThresholdsFromLabResults(user.id, sportMode);
      }

      const { exportToZWO, exportToERG, exportToMRC } = await import('@/utils/scienceWorkouts');
      
      // Convert workout structure to package format if needed
      const packageWorkout = workout.erg_schema ? workout : {
        id: workout.id || 'custom',
        title: workout.name,
        zone: workout.sport_mode || sportMode,
        protocol: workout.description || '',
        reference: '',
        doi: null,
        outcome: '',
        intensity: {
          anchor: 'FTP',
          fallback: ['CP', 'MAP'],
          targets: { work: 1.0 }
        },
        erg_schema: workout.structure || {
          warmup: { duration_min: 10, target: 0.6 },
          sets: [],
          cooldown: { duration_min: 10, target: 0.6 }
        },
        exportable_formats: ['zwo', 'erg', 'mrc']
      };

      switch (format) {
        case 'zwo':
          content = exportToZWO(packageWorkout, thresholds);
          mimeType = 'application/xml';
          fileExtension = 'zwo';
          break;
        case 'erg':
          content = exportToERG(packageWorkout, thresholds);
          mimeType = 'text/plain';
          fileExtension = 'erg';
          break;
        case 'mrc':
          content = exportToMRC(packageWorkout, thresholds);
          mimeType = 'text/plain';
          fileExtension = 'mrc';
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    }

    const dataBlob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(workout.name || workout.title || 'workout').replace(/\s+/g, '_')}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (user) {
      fetchWorkouts();
    }
  }, [user, filterBySport ? sportMode : null]);

  return {
    workouts,
    loading,
    saveWorkout,
    scheduleWorkout,
    exportWorkout,
    deleteWorkout,
    fetchWorkouts
  };
}