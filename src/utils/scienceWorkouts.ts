import { 
  scienceWorkouts, 
  makeIntensityResolver, 
  exportToZWO, 
  exportToERG, 
  exportToMRC,
  type Workout,
  type Thresholds 
} from './science-workouts';
import { supabase } from '@/integrations/supabase/client';

// Re-export package types and data
export { scienceWorkouts, makeIntensityResolver, exportToZWO, exportToERG, exportToMRC };
export type { Workout, Thresholds };

// Adapter function to get thresholds from user's lab results
export async function getThresholdsFromLabResults(
  userId: string, 
  sportMode: string = 'cycling'
): Promise<Thresholds> {
  // Fetch lab results
  const { data: labResults } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('test_date', { ascending: false })
    .limit(1)
    .single();

  // Fetch CP results
  const { data: cpResults } = await supabase
    .from('cp_results')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('test_date', { ascending: false })
    .limit(1)
    .single();

  // Build thresholds object matching package format
  const thresholds: Thresholds = {
    AeT: labResults?.aet || undefined,
    GT: labResults?.gt || undefined,
    MAP: labResults?.map_value || undefined,
    CP: cpResults?.cp_watts || labResults?.critical_power || undefined,
    FTP: undefined, // Will be calculated by resolver if needed
  };

  return thresholds;
}

// Convert package workout to Supabase workout schema
export function convertToWorkoutSchema(workout: any, sportMode: string = 'cycling') {
  // Calculate total duration
  const totalDuration = [
    ...(workout.warmup || []),
    ...(workout.mainSet || []),
    ...(workout.cooldown || [])
  ].reduce((sum: number, interval: any) => sum + interval.duration, 0);

  // Estimate TSS (rough calculation: ~1 TSS per minute at threshold)
  const estimatedTSS = totalDuration * 0.8; // Conservative estimate

  return {
    name: workout.name,
    description: workout.description,
    sport_mode: sportMode,
    structure: {
      warmup: workout.warmup,
      mainSet: workout.mainSet,
      cooldown: workout.cooldown,
      research: workout.research,
      category: workout.category,
    },
    duration_minutes: Math.round(totalDuration),
    tss: estimatedTSS,
  };
}
