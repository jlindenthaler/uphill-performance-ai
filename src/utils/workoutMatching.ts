import { isSameDay } from 'date-fns';

interface Activity {
  id: string;
  date: string;
  tss: number;
  duration_seconds: number;
}

interface Workout {
  id: string;
  scheduled_date?: string;
  completed_date?: string;
  tss: number;
  duration_minutes: number;
}

export function findMatchingWorkout(
  activity: Activity, 
  workouts: Workout[]
): Workout | undefined {
  const activityDate = new Date(activity.date);
  
  // Find workouts scheduled on the same day
  const candidates = workouts.filter(w => 
    w.scheduled_date && 
    isSameDay(new Date(w.scheduled_date), activityDate) &&
    !w.completed_date // Not already marked complete
  );
  
  if (candidates.length === 0) return undefined;
  
  // If multiple, find best match by TSS similarity
  return candidates.reduce((best, current) => {
    const currentDiff = Math.abs(current.tss - (activity.tss || 0));
    const bestDiff = Math.abs(best.tss - (activity.tss || 0));
    return currentDiff < bestDiff ? current : best;
  });
}
