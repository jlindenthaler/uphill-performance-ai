import { useState, useCallback } from 'react';
import { useWorkouts } from './useWorkouts';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DragState {
  isDragging: boolean;
  draggedWorkoutId: string | null;
  draggedWorkoutName: string | null;
}

export function useWorkoutDragAndDrop() {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedWorkoutId: null,
    draggedWorkoutName: null
  });
  const { scheduleWorkout } = useWorkouts();
  const { toast } = useToast();

  const handleDragStart = useCallback((e: React.DragEvent, workoutId: string, workoutName: string) => {
    e.dataTransfer.setData('text/plain', workoutId);
    e.dataTransfer.effectAllowed = 'move';
    
    setDragState({
      isDragging: true,
      draggedWorkoutId: workoutId,
      draggedWorkoutName: workoutName
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedWorkoutId: null,
      draggedWorkoutName: null
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    const workoutId = e.dataTransfer.getData('text/plain');
    
    if (workoutId && dragState.draggedWorkoutId === workoutId) {
      try {
        await scheduleWorkout(workoutId, targetDate);
        toast({
          title: "Workout moved",
          description: `"${dragState.draggedWorkoutName}" moved to ${format(targetDate, 'MMM d, yyyy')}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to move workout. Please try again.",
          variant: "destructive"
        });
      }
    }
    
    handleDragEnd();
  }, [dragState, scheduleWorkout, toast, handleDragEnd]);

  return {
    dragState,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
}