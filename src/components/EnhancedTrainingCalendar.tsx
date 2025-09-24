import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Target, Activity, Zap, X, Dumbbell, MoreHorizontal, Trash2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, getDay, addDays, isToday } from "date-fns";
import { useGoals } from '@/hooks/useGoals';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useActivities } from '@/hooks/useActivities';
import { useTrainingHistory } from '@/hooks/useTrainingHistory';
import { WorkoutDetailModal } from './WorkoutDetailModal';
import { ActivityDetailModal } from './ActivityDetailModal';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatDateInUserTimezone } from '@/utils/dateFormat';

interface CalendarEvent {
  id: string;
  type: 'workout' | 'goal' | 'activity';
  title: string;
  date: Date;
  data: any;
}

export const EnhancedTrainingCalendar: React.FC = () => {
  // Initialize to current week for immediate proper display
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const { goals } = useGoals();
  const { workouts, deleteWorkout } = useWorkouts();
  const { activities, deleteActivity } = useActivities();
  const { trainingHistory } = useTrainingHistory(90);
  const { timezone } = useUserTimezone();

  // Focus on current week - only show current week initially for better performance
  const weeks = useMemo(() => {
    const todayWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    // Show current week plus 2 weeks before and 3 weeks after for context
    const weeksToShow = 6;
    const startWeek = subWeeks(todayWeek, 2);
    
    return Array.from({ length: weeksToShow }, (_, i) => {
      const weekStart = addWeeks(startWeek, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return { weekStart, weekEnd, days };
    });
  }, []);

  // Calculate weekly stats for each week
  const getWeeklyStats = (weekStart: Date, weekEnd: Date) => {
    const weekActivities = activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= weekStart && activityDate <= weekEnd;
    });

    const weekWorkouts = workouts.filter(workout => {
      if (!workout.scheduled_date) return false;
      const workoutDate = new Date(workout.scheduled_date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    const completedStats = {
      duration: weekActivities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0),
      distance: weekActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0) / 1000,
      tss: weekActivities.reduce((sum, a) => sum + (a.tss || 0), 0),
      elevation: weekActivities.reduce((sum, a) => sum + (a.elevation_gain_meters || 0), 0),
      work: weekActivities.reduce((sum, a) => sum + ((a.avg_power || 0) * (a.duration_seconds || 0) / 1000), 0)
    };

    const plannedStats = {
      workouts: weekWorkouts.length,
      duration: weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) * 60,
      tss: weekWorkouts.reduce((sum, w) => sum + (w.tss || 0), 0)
    };

    // Get PMC values for this week - find the most recent entry within the week
    const weekMetrics = trainingHistory
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    // Calculate weekly changes by comparing with previous week
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
    const prevWeekMetrics = trainingHistory
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= prevWeekStart && entryDate <= prevWeekEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const ctlChange = (weekMetrics?.ctl || 0) - (prevWeekMetrics?.ctl || 0);
    const atlChange = (weekMetrics?.atl || 0) - (prevWeekMetrics?.atl || 0);
    const tsbChange = (weekMetrics?.tsb || 0) - (prevWeekMetrics?.tsb || 0);

    return {
      completed: {
        duration: `${Math.floor(completedStats.duration / 3600)}:${Math.floor((completedStats.duration % 3600) / 60).toString().padStart(2, '0')}`,
        distance: completedStats.distance.toFixed(1),
        tss: Math.round(completedStats.tss),
        elevation: Math.round(completedStats.elevation),
        work: Math.round(completedStats.work)
      },
      planned: {
        workouts: plannedStats.workouts,
        duration: `${Math.floor(plannedStats.duration / 3600)}:${Math.floor((plannedStats.duration % 3600) / 60).toString().padStart(2, '0')}`,
        tss: Math.round(plannedStats.tss)
      },
      fitness: {
        ctl: Math.round(weekMetrics?.ctl || 0),
        atl: Math.round(weekMetrics?.atl || 0),
        tsb: Math.round(weekMetrics?.tsb || 0)
      },
      changes: {
        ctl: Math.round(ctlChange),
        atl: Math.round(atlChange),
        tsb: Math.round(tsbChange)
      }
    };
  };

  // Get events for each day with improved date handling
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Add scheduled workouts with timezone-aware comparison
    workouts.forEach(workout => {
      if (workout.scheduled_date) {
        const workoutDate = new Date(workout.scheduled_date);
        // Normalize both dates to start of day for proper comparison
        const normalizedWorkoutDate = new Date(workoutDate.getFullYear(), workoutDate.getMonth(), workoutDate.getDate());
        const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        
        if (normalizedWorkoutDate.getTime() === normalizedDay.getTime()) {
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

    // Add completed activities with improved date comparison
    activities.forEach(activity => {
      const activityDate = new Date(activity.date);
      // Normalize dates for comparison
      const normalizedActivityDate = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
      const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      
      if (normalizedActivityDate.getTime() === normalizedDay.getTime()) {
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
      const normalizedGoalDate = new Date(goalDate.getFullYear(), goalDate.getMonth(), goalDate.getDate());
      const normalizedDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      
      if (normalizedGoalDate.getTime() === normalizedDay.getTime()) {
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
        className={`${bgColor} ${textColor} p-1 mb-1 rounded text-xs flex items-center justify-between group hover:opacity-80`}
        title={event.title}
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
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            Week of {formatDateInUserTimezone(currentWeek, timezone, 'MMM d, yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      {/* Optimized Calendar - TrainingPeaks Style */}
      <div className="space-y-2">
        {weeks.map(({ weekStart, weekEnd, days }, weekIndex) => {
          const weekStats = getWeeklyStats(weekStart, weekEnd);
          const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
          
          return (
            <Card key={weekStart.toISOString()} className={`${isCurrentWeek ? 'ring-2 ring-primary' : ''} overflow-hidden`}>
              <CardContent className="p-0">
                <div className="grid grid-cols-8 gap-0">
                  {/* Days Grid - 7 columns optimized */}
                  <div className="col-span-7">
                    {/* Compact Day Headers */}
                    <div className="grid grid-cols-7 border-b bg-muted/10">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Compact Days */}
                    <div className="grid grid-cols-7">
                      {days.map((day) => {
                        const events = getEventsForDay(day);
                        const dayMetrics = getDayMetrics(day);
                        const isDayToday = isToday(day);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                        return (
                          <div
                            key={day.toISOString()}
                            className={`min-h-[120px] border-r border-b last:border-r-0 p-2 ${
                              isDayToday ? 'bg-primary/5 ring-2 ring-primary ring-inset' : 'bg-background'
                            } ${isWeekend ? 'bg-muted/5' : ''}`}
                          >
                            {/* Compact Day Number */}
                            <div className={`text-sm font-semibold mb-1 ${
                              isDayToday ? 'text-primary' : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            
                            {/* Compact Day Metrics */}
                            {dayMetrics && (
                              <div className="text-xs space-y-0.5 mb-2">
                                {dayMetrics.tss > 0 && (
                                  <div className="text-center">
                                    <span className="font-bold text-zone-3">{dayMetrics.tss}</span>
                                    <span className="text-muted-foreground ml-1">TLI</span>
                                  </div>
                                )}
                                {dayMetrics.duration > 0 && (
                                  <div className="text-xs text-center text-muted-foreground">
                                    {Math.floor(dayMetrics.duration / 60)}h{dayMetrics.duration % 60}m
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Compact Events */}
                            <div className="space-y-1 overflow-hidden">
                              {events.slice(0, 3).map(event => (
                                <div
                                  key={event.id}
                                  className={`text-xs p-1 rounded cursor-pointer truncate ${
                                    event.type === 'activity' ? 'bg-green-100 text-green-800' :
                                    event.type === 'workout' ? 'bg-blue-100 text-blue-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                  onClick={() => {
                                    if (event.type === 'workout') setSelectedWorkout(event.data);
                                    if (event.type === 'activity') setSelectedActivity(event.data);
                                  }}
                                >
                                  {event.title}
                                </div>
                              ))}
                              {events.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{events.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Weekly Summary - Right side like TrainingPeaks */}
                  <div className="col-span-1 border-l bg-muted/5 p-3 min-h-[120px] flex flex-col justify-between">
                    <div className="text-center space-y-1">
                      <div className="text-xs font-medium text-muted-foreground mb-2">
                        {formatDateInUserTimezone(weekStart, timezone, 'MMM d')}
                      </div>
                      {isCurrentWeek && (
                        <Badge variant="default" className="text-xs px-1 py-0">Current</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-ltl">
                          {weekStats.changes.ctl > 0 ? '+' : ''}{weekStats.changes.ctl}
                        </div>
                        <div className="text-xs text-muted-foreground">ΔLong Term Load</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stl">
                          {weekStats.changes.atl > 0 ? '+' : ''}{weekStats.changes.atl}
                        </div>
                        <div className="text-xs text-muted-foreground">ΔShort Term Load</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-fi">
                          {weekStats.changes.tsb > 0 ? '+' : ''}{weekStats.changes.tsb}
                        </div>
                        <div className="text-xs text-muted-foreground">ΔForm Index</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground text-center">
                      <div>{weekStats.completed.tss} TLI</div>
                      <div>{weekStats.completed.duration}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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