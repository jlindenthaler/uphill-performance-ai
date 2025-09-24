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
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const { goals } = useGoals();
  const { workouts, deleteWorkout } = useWorkouts();
  const { activities, deleteActivity } = useActivities();
  const { trainingHistory } = useTrainingHistory(90); // Extended for infinite scroll
  const { timezone } = useUserTimezone();

  // Generate 12 weeks of calendar data (6 before and 5 after current week)
  const weeks = useMemo(() => {
    const weeksToShow = 12;
    const startWeek = subWeeks(currentWeek, 6);
    
    return Array.from({ length: weeksToShow }, (_, i) => {
      const weekStart = addWeeks(startWeek, i);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      return { weekStart, weekEnd, days };
    });
  }, [currentWeek]);

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

    // Get PMC values for this week from training history
    const weekMetrics = trainingHistory.find(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

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
      }
    };
  };

  // Get events for each day
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

      {/* Infinite Scrolling Calendar */}
      <div className="space-y-8">
        {weeks.map(({ weekStart, weekEnd, days }, weekIndex) => {
          const weekStats = getWeeklyStats(weekStart, weekEnd);
          const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));
          
          return (
            <Card key={weekStart.toISOString()} className={isCurrentWeek ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-0">
                {/* Week Header */}
                <div className="p-4 border-b bg-muted/20">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">
                      {formatDateInUserTimezone(weekStart, timezone, 'MMM d')} - {formatDateInUserTimezone(weekEnd, timezone, 'MMM d, yyyy')}
                    </h3>
                    {isCurrentWeek && <Badge variant="default">Current Week</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-8 gap-0">
                  {/* Days Grid - 7 columns */}
                  <div className="lg:col-span-7">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b">
                      {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                        <div key={day} className="p-3 text-center font-medium text-muted-foreground border-r last:border-r-0">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7">
                      {days.map((day) => {
                        const events = getEventsForDay(day);
                        const dayMetrics = getDayMetrics(day);
                        const isDayToday = isToday(day);
                        const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                        return (
                          <div
                            key={day.toISOString()}
                            className={`min-h-[160px] border-r border-b last:border-r-0 p-3 ${
                              isDayToday ? 'bg-primary/5 ring-2 ring-primary ring-inset' : 'bg-background'
                            } ${isWeekend ? 'bg-muted/10' : ''}`}
                          >
                            {/* Day Number */}
                            <div className={`text-lg font-semibold mb-3 ${
                              isDayToday ? 'text-primary' : 'text-foreground'
                            }`}>
                              {format(day, 'd')}
                            </div>
                            
                            {/* Day Metrics */}
                            {dayMetrics && (
                              <div className="text-xs text-muted-foreground mb-3 space-y-1">
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
                            <div className="space-y-2 overflow-hidden">
                              {events.slice(0, 4).map(renderEvent)}
                              {events.length > 4 && (
                                <div className="text-xs text-muted-foreground">
                                  +{events.length - 4} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Summary - 1 column */}
                  <div className="lg:col-span-1 border-l bg-muted/10">
                    <div className="p-4 space-y-4">
                      <h4 className="font-semibold text-sm">WEEK SUMMARY</h4>
                      
                      {/* Fitness Metrics */}
                      <div className="space-y-2">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{weekStats.fitness.ctl}</div>
                          <div className="text-xs text-muted-foreground">LTL</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-pink-600">{weekStats.fitness.atl}</div>
                          <div className="text-xs text-muted-foreground">STL</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">{weekStats.fitness.tsb}</div>
                          <div className="text-xs text-muted-foreground">FI</div>
                        </div>
                      </div>

                      <hr />

                      {/* Completed Stats */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-blue-600">COMPLETED</h5>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-medium">{weekStats.completed.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TLI:</span>
                            <span className="font-medium">{weekStats.completed.tss}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dist:</span>
                            <span className="font-medium">{weekStats.completed.distance}km</span>
                          </div>
                        </div>
                      </div>

                      <hr />

                      {/* Planned Stats */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-green-600">PLANNED</h5>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Workouts:</span>
                            <span className="font-medium">{weekStats.planned.workouts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time:</span>
                            <span className="font-medium">{weekStats.planned.duration}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TLI:</span>
                            <span className="font-medium">{weekStats.planned.tss}</span>
                          </div>
                        </div>
                      </div>
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