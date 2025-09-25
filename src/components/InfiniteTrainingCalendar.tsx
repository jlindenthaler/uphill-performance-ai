import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Target, Activity, Zap, X, Dumbbell, MoreHorizontal, Trash2, Copy, Clipboard } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, getDay, addDays, startOfMonth, addMonths, subMonths } from "date-fns";
import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import { ActivityDetailModal } from './ActivityDetailModal';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatDateInUserTimezone } from '@/utils/dateFormat';
import { useWorkoutClipboard } from '@/hooks/useWorkoutClipboard';
import { useWorkoutDragAndDrop } from '@/hooks/useWorkoutDragAndDrop';
import { useIsMobile } from '@/hooks/use-mobile';

interface CalendarEvent {
  id: string;
  type: 'workout' | 'goal' | 'activity';
  title: string;
  date: Date;
  data: any;
}

interface WeekSummary {
  duration: string;
  distance: string;
  tss: string;
  elevationGain: string;
  work: string;
  atpFitness: string;
  atpFatigue: string;
  atpForm: string;
}

export const InfiniteTrainingCalendar: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeks, setWeeks] = useState<Date[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { goals } = useGoals();
  const { workouts, deleteWorkout, saveWorkout } = useWorkouts();
  const { activities, deleteActivity } = useActivities();
  const { trainingHistory } = useTrainingHistory(90); // Extended range for infinite scroll
  const { timezone } = useUserTimezone();
  const { clipboardData, copyWorkout, hasClipboardData, clearClipboard } = useWorkoutClipboard();
  const { dragState, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useWorkoutDragAndDrop();
  const isMobile = useIsMobile();

  // Initialize weeks around current week
  useEffect(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const initialWeeks = [];
    for (let i = -4; i <= 4; i++) {
      initialWeeks.push(addWeeks(weekStart, i));
    }
    setWeeks(initialWeeks);
    setCurrentWeek(weekStart);
  }, []);

  // Center the current week in viewport on initial load
  useEffect(() => {
    if (weeks.length > 0 && scrollContainerRef.current && isInitialLoad) {
      setTimeout(() => {
        if (scrollContainerRef.current && isInitialLoad) {
          const weekHeight = 180; // Height per week row
          const { clientHeight } = scrollContainerRef.current;
          const currentWeekIndex = 4; // Current week is at index 4 in the weeks array
          
          // Calculate position to center the current week in viewport
          const targetScrollTop = (currentWeekIndex * weekHeight) - (clientHeight / 2) + (weekHeight / 2);
          
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
          
          // Mark initial load as complete
          setIsInitialLoad(false);
        }
      }, 500); // Longer delay to ensure month dropdown doesn't interfere
    }
  }, [weeks.length, isInitialLoad]);

  // Generate month options for dropdown (2 years back, 2 years forward)
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = -24; i <= 24; i++) {
      const date = addMonths(now, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
        date: date
      });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();
  const currentMonthValue = format(currentWeek, 'yyyy-MM');

  const scrollToWeek = (targetWeek: Date) => {
    if (!scrollContainerRef.current) return;
    
    // Find the week index in the current weeks array
    const weekIndex = weeks.findIndex(week => 
      isSameDay(week, startOfWeek(targetWeek, { weekStartsOn: 1 }))
    );
    
    if (weekIndex >= 0) {
      // Calculate scroll position (approximately 180px per week)
      const scrollPosition = weekIndex * 180;
      scrollContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    } else {
      // Week not in current range, need to rebuild weeks array around target
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
      const newWeeks = [];
      for (let i = -4; i <= 4; i++) {
        newWeeks.push(addWeeks(weekStart, i));
      }
      setWeeks(newWeeks);
      setCurrentWeek(weekStart);
      
      // Scroll to middle after state update
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: 4 * 180, // Middle of the range
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const handleMonthSelect = (monthValue: string) => {
    // Don't override scroll position during initial load
    if (isInitialLoad) return;
    
    const selectedMonth = monthOptions.find(option => option.value === monthValue);
    if (selectedMonth) {
      const firstWeekOfMonth = startOfWeek(startOfMonth(selectedMonth.date), { weekStartsOn: 1 });
      scrollToWeek(firstWeekOfMonth);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    scrollToWeek(today);
  };

  // Infinite scroll handlers
  const loadMoreWeeks = useCallback((direction: 'before' | 'after') => {
    setWeeks(prevWeeks => {
      if (direction === 'before') {
        const newWeek = subWeeks(prevWeeks[0], 1);
        return [newWeek, ...prevWeeks];
      } else {
        const newWeek = addWeeks(prevWeeks[prevWeeks.length - 1], 1);
        return [...prevWeeks, newWeek];
      }
    });
  }, []);

  // Debounced function to update current week based on viewport
  const updateCurrentWeekFromScroll = useCallback(() => {
    if (!scrollContainerRef.current || weeks.length === 0) return;

    const { scrollTop, clientHeight } = scrollContainerRef.current;
    
    // Calculate which week is at the center of the viewport
    const weekHeight = 180; // Approximate height per week row
    const viewportCenter = scrollTop + (clientHeight / 2);
    const centerWeekIndex = Math.floor(viewportCenter / weekHeight);
    
    // Ensure the index is within bounds
    if (centerWeekIndex >= 0 && centerWeekIndex < weeks.length) {
      const visibleWeek = weeks[centerWeekIndex];
      
      // Only update if we've moved to a different month
      if (format(visibleWeek, 'yyyy-MM') !== format(currentWeek, 'yyyy-MM')) {
        setCurrentWeek(visibleWeek);
      }
    }
  }, [weeks, currentWeek]);

  // Debounced version to prevent excessive updates
  const debouncedUpdateCurrentWeek = useCallback(() => {
    const timeoutId = setTimeout(updateCurrentWeekFromScroll, 150);
    return () => clearTimeout(timeoutId);
  }, [updateCurrentWeekFromScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Load more weeks at the top
    if (scrollTop < 100) {
      loadMoreWeeks('before');
    }
    
    // Load more weeks at the bottom
    if (scrollTop + clientHeight > scrollHeight - 100) {
      loadMoreWeeks('after');
    }

    // Update current week based on viewport (debounced)
    debouncedUpdateCurrentWeek();
  }, [loadMoreWeeks, debouncedUpdateCurrentWeek]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Keyboard shortcuts for copy/paste (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'v' && hasClipboardData()) {
          e.preventDefault();
          // Note: Paste will be handled via day cell click when clipboard has data
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, hasClipboardData]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add scheduled workouts
    workouts.forEach(workout => {
      if (workout.scheduled_date) {
        const workoutDate = new Date(workout.scheduled_date);
        if (isSameDay(workoutDate, day)) {
          events.push({
            id: workout.id,
            type: 'workout',
            title: workout.name,
            date: day,
            data: workout
          });
        }
      }
    });

    // Add completed activities
    activities.forEach(activity => {
      const activityDate = new Date(activity.date);
      if (isSameDay(activityDate, day)) {
        events.push({
          id: activity.id,
          type: 'activity',
          title: activity.name,
          date: day,
          data: activity
        });
      }
    });

    // Add goals that fall on this day
    goals.forEach(goal => {
      const goalDate = new Date(goal.event_date);
      if (isSameDay(goalDate, day)) {
        events.push({
          id: goal.id,
          type: 'goal',
          title: goal.name,
          date: day,
          data: goal
        });
      }
    });

    return events;
  };

  const getWeekSummary = (weekStart: Date): WeekSummary => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekActivities = activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= weekStart && activityDate <= weekEnd;
    });

    const weekStats = {
      duration: weekActivities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0),
      distance: weekActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0) / 1000,
      tss: weekActivities.reduce((sum, a) => sum + (a.tss || 0), 0),
      elevation: 0,
      work: weekActivities.reduce((sum, a) => sum + ((a.avg_power || 0) * (a.duration_seconds || 0) / 1000), 0)
    };

    // Get PMC values from training history for this week
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
    const weekMetrics = trainingHistory.find(h => h.date === weekEndStr) || trainingHistory[trainingHistory.length - 1];
    const ctl = weekMetrics?.ctl || 0;
    const atl = weekMetrics?.atl || 0;
    const tsb = weekMetrics?.tsb || 0;

    return {
      duration: `${Math.floor(weekStats.duration / 3600)}:${Math.floor((weekStats.duration % 3600) / 60).toString().padStart(2, '0')}`,
      distance: weekStats.distance.toFixed(1),
      tss: Math.round(weekStats.tss).toString(),
      elevationGain: Math.round(weekStats.elevation).toString(),
      work: Math.round(weekStats.work).toString(),
      atpFitness: Math.round(ctl).toString(),
      atpFatigue: Math.round(atl).toString(),
      atpForm: Math.round(tsb).toString()
    };
  };

  const handlePasteWorkout = async (targetDate: Date) => {
    if (!clipboardData) return;

    try {
      // Create a new workout based on clipboard data
      const newWorkout = {
        name: clipboardData.name,
        description: clipboardData.description,
        structure: clipboardData.structure,
        duration_minutes: clipboardData.duration_minutes,
        tss: clipboardData.tss,
        scheduled_date: targetDate.toISOString()
      };

      await saveWorkout(newWorkout);
      clearClipboard();
    } catch (error) {
      console.error('Failed to paste workout:', error);
    }
  };

  const renderEvent = (event: CalendarEvent) => {
    let bgColor = '';
    let textColor = '';
    let icon = null;

    switch (event.type) {
      case 'workout':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        icon = <Target className="w-3 h-3" />;
        break;
      case 'activity':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = <Activity className="w-3 h-3" />;
        break;
      case 'goal':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        icon = <Zap className="w-3 h-3" />;
        break;
    }

    const handleEventClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (event.type === 'workout') {
        setSelectedWorkout(event.data);
      } else if (event.type === 'activity') {
        setSelectedActivity(event.data);
      }
    };

    return (
      <div
        key={event.id}
        className={`${bgColor} ${textColor} p-1 mb-1 rounded text-xs flex items-center justify-between group hover:opacity-80 ${
          dragState.isDragging && dragState.draggedWorkoutId === event.id ? 'opacity-50' : ''
        }`}
        title={event.title}
        draggable={!isMobile && event.type === 'workout'}
        onDragStart={(e) => event.type === 'workout' && handleDragStart(e, event.id, event.title)}
        onDragEnd={handleDragEnd}
      >
        <div 
          className="flex items-center gap-1 flex-1 min-w-0 cursor-pointer"
          onClick={handleEventClick}
        >
          {icon}
          <span className="truncate text-xs">{event.title}</span>
          {event.type === 'activity' && event.data.tss && (
            <span className="ml-auto text-xs font-medium">{Math.round(event.data.tss)}</span>
          )}
        </div>
        {(event.type === 'workout' || event.type === 'activity') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border">
              {event.type === 'workout' && (
                <>
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={() => copyWorkout(event.data)}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy Workout
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete {event.type === 'workout' ? 'Workout' : 'Activity'}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {event.type} "{event.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (event.type === 'workout') {
                          deleteWorkout(event.id);
                        } else if (event.type === 'activity') {
                          deleteActivity(event.id);
                        }
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  const getDayMetrics = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    const activities = dayEvents.filter(e => e.type === 'activity');
    
    if (activities.length === 0) return null;

    const totalTSS = activities.reduce((sum, activity) => sum + (activity.data.tss || 0), 0);
    const totalDuration = activities.reduce((sum, activity) => sum + (activity.data.duration_seconds || 0), 0);
    
    return {
      tss: Math.round(totalTSS),
      duration: Math.round(totalDuration / 60), // minutes
      distance: activities.reduce((sum, activity) => sum + (activity.data.distance_meters || 0), 0) / 1000 // km
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Calendar</h1>
          <p className="text-muted-foreground">Plan and track your training activities</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={currentMonthValue} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border max-h-[300px]">
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            Today
          </Button>
        </div>
      </div>

      {/* Infinite Scrolling Calendar */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={scrollContainerRef}
            className="max-h-[800px] overflow-y-auto"
            style={{ scrollBehavior: 'smooth' }}
          >
            {weeks.map((weekStart) => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
              const weekSummary = getWeekSummary(weekStart);
              const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

              return (
                <div key={weekStart.toISOString()} className={`border-b ${isCurrentWeek ? 'bg-primary/5' : ''}`}>
                  {/* Week Header - Simplified */}
                  {isCurrentWeek && (
                    <div className="p-2 border-b bg-muted/20">
                      <Badge variant="secondary">Current Week</Badge>
                    </div>
                  )}
                  
                  {/* Days Grid */}
                  <div className="grid grid-cols-8 min-h-[120px]">
                    {/* Day Headers */}
                    <div className="col-span-7 grid grid-cols-7 border-r">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <div key={day} className="p-2 text-center font-medium text-muted-foreground border-r last:border-r-0 text-xs bg-muted/10">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Week Summary Label */}
                    <div className="p-2 text-center font-medium text-muted-foreground text-xs bg-muted/20">
                      SUMMARY
                    </div>

                    {/* Day Cells */}
                    <div className="col-span-7 grid grid-cols-7 border-r">
                      {weekDays.map((day) => {
                        const events = getEventsForDay(day);
                        const dayMetrics = getDayMetrics(day);
                        const isToday = isSameDay(day, new Date());
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                        return (
                          <div
                            key={day.toISOString()}
                            className={`min-h-[120px] border-r border-b last:border-r-0 p-2 cursor-pointer relative ${
                              isToday ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''
                            } ${isWeekend ? 'bg-muted/10' : ''} ${
                              dragState.isDragging ? 'hover:bg-primary/10 transition-colors' : ''
                            } ${hasClipboardData() ? 'hover:bg-secondary/10' : ''}`}
                            onDragOver={!isMobile ? handleDragOver : undefined}
                            onDrop={!isMobile ? (e) => handleDrop(e, day) : undefined}
                            onClick={hasClipboardData() ? () => handlePasteWorkout(day) : undefined}
                          >
                            {/* Paste indicator */}
                            {hasClipboardData() && (
                              <div className="absolute top-1 right-1 text-primary">
                                <Clipboard className="w-3 h-3" />
                              </div>
                            )}

                            {/* Day Number */}
                            <div className={`text-sm font-medium mb-2 ${
                              isToday ? 'text-primary font-bold' : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            
                            {/* Day Metrics */}
                            {dayMetrics && (
                              <div className="text-xs text-muted-foreground mb-2 space-y-1">
                                {dayMetrics.tss > 0 && (
                                  <div className="flex justify-between">
                                    <span>TLI:</span>
                                    <span className="font-medium">{dayMetrics.tss}</span>
                                  </div>
                                )}
                                {dayMetrics.duration > 0 && (
                                  <div className="flex justify-between">
                                    <span>Time:</span>
                                    <span className="font-medium">{Math.floor(dayMetrics.duration / 60)}h{dayMetrics.duration % 60}m</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Events */}
                            <div className="space-y-1 overflow-hidden">
                              {events.slice(0, 3).map(renderEvent)}
                              {events.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{events.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Week Summary */}
                    <div className="p-2 bg-muted/5 border-b text-xs space-y-2">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-600">Fitness</span>
                          <span className="font-bold text-blue-600">{weekSummary.atpFitness}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-pink-600">Fatigue</span>
                          <span className="font-bold text-pink-600">{weekSummary.atpFatigue}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-orange-600">Form</span>
                          <span className="font-bold text-orange-600">{weekSummary.atpForm}</span>
                        </div>
                      </div>
                      
                      <hr className="my-2" />
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Duration</span>
                          <span className="font-medium">{weekSummary.duration}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Distance</span>
                          <span className="font-medium">{weekSummary.distance} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TLI</span>
                          <span className="font-medium">{weekSummary.tss}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Work</span>
                          <span className="font-medium">{weekSummary.work} kJ</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Workout Detail Modal */}
      <WorkoutDetailModal
        workout={selectedWorkout}
        open={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
      />

      {/* Activity Detail Modal */}
      <ActivityDetailModal
        activity={selectedActivity}
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
};