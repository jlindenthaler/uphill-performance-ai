import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Target, Activity, Zap, X, Dumbbell, MoreHorizontal, Trash2, Copy, Clipboard, Sparkles } from "lucide-react";
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
import { AITrainingPlanWizard } from './AITrainingPlanWizard';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';

interface CalendarEvent {
  id: string;
  type: 'workout' | 'goal' | 'activity' | 'plan_session';
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
  const [currentWeek, setCurrentWeek] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeks, setWeeks] = useState<Date[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentWeekRef = useRef<HTMLDivElement>(null);
  const manualSelectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualSelectionRef = useRef(false);
  const { goals } = useGoals();
  const { workouts, deleteWorkout, saveWorkout } = useWorkouts(false); // Show all sports
  const { activities, deleteActivity } = useActivities(false); // Show all sports
  const { trainingHistory } = useTrainingHistory(90); // Extended range for infinite scroll
  const { timezone } = useUserTimezone();
  const { clipboardData, copyWorkout, hasClipboardData, clearClipboard } = useWorkoutClipboard();
  const { dragState, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useWorkoutDragAndDrop();
  const isMobile = useIsMobile();
  const [isAIPlanWizardOpen, setIsAIPlanWizardOpen] = useState(false);
  const { getPlanSessions, deletePlanSession, deletePlan, getActivePlan } = useTrainingPlan();
  const [planSessions, setPlanSessions] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);

  // Fetch plan sessions when wizard closes (to refresh after new plan creation)
  const handleWizardClose = useCallback(async (wasOpen: boolean) => {
    setIsAIPlanWizardOpen(wasOpen);
    
    if (!wasOpen && weeks.length > 0) {
      // Wizard was closed, refresh plan sessions
      const startDate = weeks[0];
      const endDate = addWeeks(weeks[weeks.length - 1], 1);
      const sessions = await getPlanSessions(startDate, endDate);
      setPlanSessions(sessions || []);
    }
  }, [weeks, getPlanSessions]);

  // Initialize weeks around current week
  useEffect(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const initialWeeks = [];
    for (let i = -4; i <= 4; i++) {
      initialWeeks.push(addWeeks(weekStart, i));
    }
    setWeeks(initialWeeks);
    setCurrentWeek(weekStart);
  }, []);

  // Fetch plan sessions and active plan for visible weeks
  useEffect(() => {
    const fetchPlanData = async () => {
      if (weeks.length === 0) return;
      
      const startDate = weeks[0];
      const endDate = addWeeks(weeks[weeks.length - 1], 1);
      
      const sessions = await getPlanSessions(startDate, endDate);
      setPlanSessions(sessions || []);
      
      const plan = await getActivePlan();
      setActivePlan(plan);
    };

    fetchPlanData();
  }, [weeks, getPlanSessions, getActivePlan]);

  // Center the current week in viewport on initial load
  useEffect(() => {
    if (weeks.length > 0 && currentWeekRef.current && isInitialLoad) {
      setTimeout(() => {
        if (currentWeekRef.current && isInitialLoad) {
          currentWeekRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'center'
          });
          
          // Mark initial load as complete after a longer delay
          setTimeout(() => {
            setIsInitialLoad(false);
          }, 1000);
        }
      }, 100);
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
    const selectedMonth = monthOptions.find(option => option.value === monthValue);
    if (selectedMonth) {
      const firstWeekOfMonth = startOfWeek(startOfMonth(selectedMonth.date), { weekStartsOn: 1 });
      
      // Set manual selection flag to prevent scroll updates
      isManualSelectionRef.current = true;
      
      setCurrentWeek(firstWeekOfMonth);
      scrollToWeek(firstWeekOfMonth);
      
      // Clear any existing timeout
      if (manualSelectionTimeoutRef.current) {
        clearTimeout(manualSelectionTimeoutRef.current);
      }
      
      // Re-enable scroll updates after 2 seconds
      manualSelectionTimeoutRef.current = setTimeout(() => {
        isManualSelectionRef.current = false;
      }, 2000);
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    scrollToWeek(today);
  };

  // Infinite scroll handlers
  const loadMoreWeeks = useCallback((direction: 'before' | 'after') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (direction === 'before') {
      // Save current scroll position and height before adding weeks
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;
      
      setWeeks(prevWeeks => {
        const newWeek = subWeeks(prevWeeks[0], 1);
        return [newWeek, ...prevWeeks];
      });
      
      // Restore scroll position after new weeks are added
      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        const heightDiff = newScrollHeight - oldScrollHeight;
        container.scrollTop = oldScrollTop + heightDiff;
      });
    } else {
      setWeeks(prevWeeks => {
        const newWeek = addWeeks(prevWeeks[prevWeeks.length - 1], 1);
        return [...prevWeeks, newWeek];
      });
    }
  }, []);

  // Update current week based on viewport - only after initial load
  const updateCurrentWeekFromScroll = useCallback(() => {
    // Don't update if initial load or manual selection is active
    if (!scrollContainerRef.current || weeks.length === 0 || isInitialLoad || isManualSelectionRef.current) return;

    const { scrollTop, clientHeight } = scrollContainerRef.current;
    
    // Calculate which week is near the top of the viewport
    const weekHeight = 180;
    const topWeekIndex = Math.floor(scrollTop / weekHeight);
    
    if (topWeekIndex >= 0 && topWeekIndex < weeks.length) {
      const visibleWeek = weeks[topWeekIndex];
      
      // Only update if we've moved to a different month
      const currentMonth = format(currentWeek, 'yyyy-MM');
      const visibleMonth = format(visibleWeek, 'yyyy-MM');
      
      if (currentMonth !== visibleMonth) {
        setCurrentWeek(visibleWeek);
      }
    }
  }, [weeks, currentWeek, isInitialLoad]);

  // Debounced version to prevent rapid updates
  const debouncedUpdateCurrentWeek = useRef<NodeJS.Timeout | null>(null);
  
  const scheduleCurrentWeekUpdate = useCallback(() => {
    if (debouncedUpdateCurrentWeek.current) {
      clearTimeout(debouncedUpdateCurrentWeek.current);
    }
    debouncedUpdateCurrentWeek.current = setTimeout(updateCurrentWeekFromScroll, 300);
  }, [updateCurrentWeekFromScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // More aggressive threshold for loading previous weeks
    if (scrollTop < 400) {
      loadMoreWeeks('before');
    }
    
    // Load more weeks at the bottom
    if (scrollTop + clientHeight > scrollHeight - 400) {
      loadMoreWeeks('after');
    }

    // Update current week based on viewport (debounced)
    scheduleCurrentWeekUpdate();
  }, [loadMoreWeeks, scheduleCurrentWeekUpdate]);

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

    // Add plan sessions
    planSessions.forEach(session => {
      if (session.scheduled_date) {
        const sessionDate = new Date(session.scheduled_date);
        if (isSameDay(sessionDate, day)) {
          events.push({
            id: session.id,
            type: 'plan_session',
            title: session.session_name || 'Training Session',
            date: day,
            data: session
          });
        }
      }
    });

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
    const weekMetrics = trainingHistory.find(h => h.date === weekEndStr);
    
    let ctl = 0;
    let atl = 0;
    let tsb = 0;
    
    if (weekMetrics) {
      // We have actual data for this week
      ctl = weekMetrics.ctl || 0;
      atl = weekMetrics.atl || 0;
      tsb = weekMetrics.tsb || 0;
    } else if (trainingHistory.length > 0) {
      // Project PMC values for future weeks with decay
      const lastHistoryData = trainingHistory[trainingHistory.length - 1];
      const lastDate = new Date(lastHistoryData.date);
      const daysSinceLastData = Math.floor((weekEnd.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastData > 0) {
        // Apply decay for each day without training
        let projectedCTL = lastHistoryData.ctl || 0;
        let projectedATL = lastHistoryData.atl || 0;
        
        for (let i = 0; i < daysSinceLastData; i++) {
          // CTL decays with 42-day time constant
          projectedCTL = projectedCTL * (1 - 1/42);
          // ATL decays with 7-day time constant
          projectedATL = projectedATL * (1 - 1/7);
        }
        
        ctl = projectedCTL;
        atl = projectedATL;
        tsb = ctl - atl;
      } else {
        // Use last known values if weekEnd is before last data
        ctl = lastHistoryData.ctl || 0;
        atl = lastHistoryData.atl || 0;
        tsb = lastHistoryData.tsb || 0;
      }
    }

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
      case 'plan_session':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        icon = <Sparkles className="w-3 h-3" />;
        break;
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
      // For plan_session, we could open a detail modal in the future
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
          {event.type === 'plan_session' && event.data.tss_target && (
            <span className="ml-auto text-xs font-medium">{Math.round(event.data.tss_target)} TSS</span>
          )}
        </div>
        {(event.type === 'workout' || event.type === 'activity' || event.type === 'plan_session') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-5 w-5 p-0 opacity-50 group-hover:opacity-100 hover:bg-accent transition-all ml-1 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
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
                    Delete {event.type === 'plan_session' ? 'Plan Session' : event.type === 'workout' ? 'Workout' : 'Activity'}
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {event.type === 'plan_session' ? 'plan session' : event.type} "{event.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        if (event.type === 'workout') {
                          deleteWorkout(event.id);
                        } else if (event.type === 'activity') {
                          deleteActivity(event.id);
                        } else if (event.type === 'plan_session') {
                          const success = await deletePlanSession(event.id);
                          if (success) {
                            // Refresh plan sessions
                            if (weeks.length > 0) {
                              const startDate = weeks[0];
                              const endDate = addWeeks(weeks[weeks.length - 1], 1);
                              const sessions = await getPlanSessions(startDate, endDate);
                              setPlanSessions(sessions || []);
                            }
                          }
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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header - Fixed */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
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
          
          {activePlan && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Plan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-background border border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Training Plan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{activePlan.plan_name}" and all {planSessions.length} associated sessions. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      const success = await deletePlan(activePlan.id);
                      if (success) {
                        setPlanSessions([]);
                        setActivePlan(null);
                      }
                    }}
                  >
                    Delete Plan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          <Button onClick={() => setIsAIPlanWizardOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Create AI Plan
          </Button>
        </div>
      </div>

      {/* Infinite Scrolling Calendar - Takes remaining space */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto"
            style={{ 
              scrollBehavior: 'smooth',
            } as React.CSSProperties}
          >
            {weeks.map((weekStart) => {
              const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
              const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
              const weekSummary = getWeekSummary(weekStart);
              const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

              return (
                <div 
                  key={weekStart.toISOString()} 
                  ref={isCurrentWeek ? currentWeekRef : null}
                  className={`border-b ${isCurrentWeek ? 'bg-primary/5' : ''}`}
                >
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
                          <span className="text-[hsl(var(--ltl-blue))]">LTL (Fitness)</span>
                          <span className="font-bold text-[hsl(var(--ltl-blue))]">{weekSummary.atpFitness}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[hsl(var(--stl-pink))]">STL (Fatigue)</span>
                          <span className="font-bold text-[hsl(var(--stl-pink))]">{weekSummary.atpFatigue}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[hsl(var(--fi-yellow))]">FI (Form)</span>
                          <span className="font-bold text-[hsl(var(--fi-yellow))]">{parseInt(weekSummary.atpForm) > 0 ? '+' : ''}{weekSummary.atpForm}</span>
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

      {/* AI Training Plan Wizard */}
      <AITrainingPlanWizard 
        open={isAIPlanWizardOpen} 
        onOpenChange={handleWizardClose}
      />
    </div>
  );
};