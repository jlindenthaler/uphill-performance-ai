import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Clock, Target, Activity, Zap, X, Dumbbell, MoreHorizontal, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addDays } from "date-fns";
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const { goals } = useGoals();
  const { workouts, deleteWorkout } = useWorkouts();
  const { activities, deleteActivity } = useActivities();
  const { trainingHistory } = useTrainingHistory(30);
  const { timezone } = useUserTimezone();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Calculate weekly summary data for current and next week
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const nextWeekStart = addDays(currentWeekEnd, 1);
  const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
  
  // Calculate current week stats from activities
  const currentWeekActivities = activities.filter(activity => {
    const activityDate = new Date(activity.date);
    return activityDate >= currentWeekStart && activityDate <= currentWeekEnd;
  });

  // Calculate next week planned workouts
  const nextWeekWorkouts = workouts.filter(workout => {
    if (!workout.scheduled_date) return false;
    const workoutDate = new Date(workout.scheduled_date);
    return workoutDate >= nextWeekStart && workoutDate <= nextWeekEnd;
  });

  const currentWeekStats = {
    duration: currentWeekActivities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0),
    distance: currentWeekActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0) / 1000,
    tss: currentWeekActivities.reduce((sum, a) => sum + (a.tss || 0), 0),
    elevation: currentWeekActivities.reduce((sum, a) => sum + (a.elevation_gain_meters || 0), 0),
    work: currentWeekActivities.reduce((sum, a) => sum + ((a.avg_power || 0) * (a.duration_seconds || 0) / 1000), 0)
  };

  const nextWeekStats = {
    plannedWorkouts: nextWeekWorkouts.length,
    plannedDuration: nextWeekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) * 60
  };

  // Get PMC values from training history
  const latestMetrics = trainingHistory.length > 0 ? trainingHistory[trainingHistory.length - 1] : null;
  const ctl = latestMetrics?.ctl || 0;
  const atl = latestMetrics?.atl || 0;
  const tsb = latestMetrics?.tsb || 0;

  const weeklyStats = {
    // Current week (completed)
    duration: `${Math.floor(currentWeekStats.duration / 3600)}:${Math.floor((currentWeekStats.duration % 3600) / 60).toString().padStart(2, '0')}`,
    distance: currentWeekStats.distance.toFixed(1),
    tss: Math.round(currentWeekStats.tss).toString(),
    elevationGain: Math.round(currentWeekStats.elevation).toString(),
    work: Math.round(currentWeekStats.work).toString(),
    
    // Next week (planned)
    nextWeekWorkouts: nextWeekStats.plannedWorkouts,
    nextWeekDuration: `${Math.floor(nextWeekStats.plannedDuration / 3600)}:${Math.floor((nextWeekStats.plannedDuration % 3600) / 60).toString().padStart(2, '0')}`,
    
    // PMC values from training history
    atpFitness: Math.round(ctl).toString(),
    atpFatigue: Math.round(atl).toString(),
    atpForm: Math.round(tsb).toString(),
    atpPeriod: 'Base 1 - Week 3',
    limiters: ['Endurance', 'Speed Skill']
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

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {formatDateInUserTimezone(currentDate, timezone, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="p-0">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 border-b">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <div key={day} className="p-3 text-center font-medium text-muted-foreground border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const events = getEventsForDay(day);
                  const dayMetrics = getDayMetrics(day);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[120px] border-r border-b last:border-r-0 p-2 ${
                        isCurrentMonth ? 'bg-background' : 'bg-muted/20'
                      } ${isToday ? 'ring-2 ring-primary ring-inset' : ''} ${
                        isWeekend && isCurrentMonth ? 'bg-muted/10' : ''
                      }`}
                    >
                      {/* Day Number */}
                      <div className={`text-sm font-medium mb-2 ${
                        isToday ? 'text-primary font-bold' : 
                        isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
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
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SUMMARY</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fitness Metrics */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">Fitness</span>
                  <span className="text-lg font-bold text-blue-600">{weeklyStats.atpFitness} LTL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-pink-600">Fatigue</span>
                  <span className="text-lg font-bold text-pink-600">{weeklyStats.atpFatigue} STL</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-600">Form</span>
                  <span className="text-lg font-bold text-orange-600">{weeklyStats.atpForm} FI</span>
                </div>
              </div>

              <hr className="my-4" />

              {/* Current Week Stats */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-600 mb-2">This Week (Completed)</h4>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-medium">{weeklyStats.duration} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Distance</span>
                  <span className="font-medium">{weeklyStats.distance} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">TLI</span>
                  <span className="font-medium">{weeklyStats.tss}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">El. Gain</span>
                  <span className="font-medium">{weeklyStats.elevationGain} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Work</span>
                  <span className="font-medium">{weeklyStats.work} kJ</span>
                </div>
              </div>

              <hr className="my-4" />

              {/* Next Week Stats */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-green-600 mb-2">Next Week (Planned)</h4>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Workouts</span>
                  <span className="font-medium">{weeklyStats.nextWeekWorkouts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="font-medium">{weeklyStats.nextWeekDuration} hrs</span>
                </div>
              </div>

              <hr className="my-4" />

              {/* Training Period */}
              <div className="text-center">
                <p className="text-sm font-medium">ATP Period</p>
                <p className="text-sm text-muted-foreground">{weeklyStats.atpPeriod}</p>
              </div>

              <hr className="my-4" />

              {/* Limiters */}
              <div>
                <p className="text-sm font-medium mb-2">ATP Bike Limiters</p>
                <div className="flex flex-wrap gap-1">
                  {weeklyStats.limiters.map((limiter, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {limiter}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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