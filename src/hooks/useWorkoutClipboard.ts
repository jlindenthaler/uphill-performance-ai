import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WorkoutClipboardData {
  id: string;
  name: string;
  description?: string;
  structure: any;
  duration_minutes: number;
  tss: number;
  type: 'workout';
}

export function useWorkoutClipboard() {
  const [clipboardData, setClipboardData] = useState<WorkoutClipboardData | null>(null);
  const { toast } = useToast();

  const copyWorkout = useCallback((workout: any) => {
    setClipboardData({
      id: workout.id,
      name: workout.name,
      description: workout.description,
      structure: workout.structure,
      duration_minutes: workout.duration_minutes,
      tss: workout.tss,
      type: 'workout'
    });
    
    toast({
      title: "Workout copied",
      description: `"${workout.name}" copied to clipboard`,
    });
  }, [toast]);

  const hasClipboardData = useCallback(() => {
    return clipboardData !== null;
  }, [clipboardData]);

  const clearClipboard = useCallback(() => {
    setClipboardData(null);
  }, []);

  return {
    clipboardData,
    copyWorkout,
    hasClipboardData,
    clearClipboard
  };
}