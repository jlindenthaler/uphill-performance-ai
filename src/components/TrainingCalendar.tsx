import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Calendar, Target, Dumbbell, MoreHorizontal, Trash2, Activity, Zap, Sparkles } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useCombinedTrainingHistory } from "@/hooks/useCombinedTrainingHistory";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from "date-fns";
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { formatDateInUserTimezone } from '@/utils/dateFormat';
import { PMCStatusBadge } from './pmc/PMCStatusBadge';
import { AITrainingPlanWizard } from './AITrainingPlanWizard';

interface CalendarEvent {
  id: string;
  type: 'workout' | 'goal';
  title: string;
  date: Date;
  data: any;
}

interface WorkoutPopupProps {
  workout: any;
  onClose: () => void;
}

const WorkoutPopup: React.FC<WorkoutPopupProps> = ({ workout, onClose }) => {
  const { timezone } = useUserTimezone();
  // Mock zone data - in a real app this would come from workout.structure
  const zoneData = [
    { zone: 1, label: 'Zone 1: <AeT', color: 'bg-blue-400', power: '150W', duration: '15min' },
    { zone: 2, label: 'Zone 2: AeT-GT', color: 'bg-yellow-400', power: '100W', duration: '5min' },
    { zone: 3, label: 'Zone 3: GT-MAP', color: 'bg-orange-400', power: '120W', duration: '10min' },
    { zone: 4, label: 'Zone 4: >MAP', color: 'bg-red-400', power: '', duration: '' },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="space-y-4 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{workout.name}</h2>
              <Badge variant="secondary" className="bg-red-500 text-white">
                {workout.sport_mode?.toUpperCase() || 'VO2MAX'}
              </Badge>
            </div>
            <Badge variant="outline" className="bg-red-500 text-white border-red-500">
              Zone 4
            </Badge>
          </div>
          
          <p className="text-muted-foreground">
            {workout.description || 'High-intensity interval training with short work intervals'}
          </p>
          
          {/* Key Metrics */}
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">⏱</span>
              </div>
              <span className="font-medium">{workout.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">⚡</span>
              </div>
              <span className="font-medium">TLI: {workout.tss || 95}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">📅</span>
              </div>
              <span className="font-medium">{formatDateInUserTimezone(new Date(), timezone, 'yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Workout Structure Visualization */}
        <div className="space-y-4">
          <h3 className="font-semibold">Workout Structure</h3>
          <div className="relative bg-gradient-to-r from-blue-400 via-blue-400 to-blue-400 rounded-lg h-16 flex items-center justify-between px-4 overflow-hidden">
            {/* Zone segments */}
            <div className="flex-1 h-full bg-blue-400 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="font-semibold">150W</div>
                <div className="text-xs">15min</div>
              </div>
            </div>
            <div className="w-8 h-12 bg-red-500 mx-1 flex items-center justify-center">
              <div className="text-center text-white text-xs leading-none">
                <div>3x</div>
                <div>30s</div>
              </div>
            </div>
            <div className="flex-1 h-full bg-blue-400 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="font-semibold">100W</div>
                <div className="text-xs">5min</div>
              </div>
            </div>
            <div className="w-16 h-12 bg-orange-400 mx-1 flex items-center justify-center">
              <div className="text-center text-white text-xs">
                <div className="font-semibold">120W</div>
                <div>10min</div>
              </div>
            </div>
          </div>
          
          {/* Zone Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {zoneData.map((zone) => (
              <div key={zone.zone} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${zone.color}`}></div>
                <span className="text-xs text-muted-foreground">{zone.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Purpose & Benefits */}
        <div className="space-y-3">
          <h3 className="font-semibold">Purpose & Benefits</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Improves VO2max, neuromuscular power, and anaerobic capacity. The short intervals allow for sustained
            high power outputs at or above MAP while maintaining good form.
          </p>
        </div>

        {/* Training Structure */}
        <div className="space-y-3">
          <h3 className="font-semibold">Training Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">WARMUP</div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="font-medium">15min progressive build</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">MAIN SET</div>
              <div className="bg-primary/10 rounded-lg p-3">
                <div className="font-medium">3 sets of 13x (30s @ 120%</div>
                <div className="font-medium">MAP : 15s recovery), 5min</div>
                <div className="font-medium">between sets</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">COOLDOWN</div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="font-medium">10min easy spin</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface GoalPopupProps {
  goal: any;
  onClose: () => void;
}

const GoalPopup: React.FC<GoalPopupProps> = ({ goal, onClose }) => {
  const { timezone } = useUserTimezone();
  
  return (
  <Dialog open={true} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          {goal.name}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Event Date</p>
          <p className="font-medium">{formatDateInUserTimezone(goal.event_date, timezone, 'PPP')}</p>
        </div>
        {goal.location && (
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-medium">{goal.location}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Event Type</p>
          <p className="font-medium capitalize">{goal.event_type}</p>
        </div>
        {goal.target_performance && (
          <div>
            <p className="text-sm text-muted-foreground">Target Performance</p>
            <p className="font-medium">{goal.target_performance}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
            {goal.status}
          </Badge>
          <Badge variant="outline">
            Priority {goal.priority}
          </Badge>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  );
};

export const TrainingCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isAIPlanWizardOpen, setIsAIPlanWizardOpen] = useState(false);
  const { goals } = useGoals();
  const { workouts, deleteWorkout } = useWorkouts();
  const { timezone } = useUserTimezone();
  const { trainingHistory } = useCombinedTrainingHistory(90);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate weekly PMC summaries
  const weeklyPMCSummaries = useMemo(() => {
    const weeks = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekData = trainingHistory.filter(day => {
        const date = new Date(day.date);
        return date >= weekStart && date <= weekEnd;
      });

      const endOfWeekData = weekData[weekData.length - 1];
      
      let ltl = 0;
      let stl = 0;
      let fi = 0;
      
      if (endOfWeekData) {
        // We have actual data for this week
        ltl = endOfWeekData.ctl || 0;
        stl = endOfWeekData.atl || 0;
        fi = endOfWeekData.tsb || 0;
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
          
          ltl = projectedCTL;
          stl = projectedATL;
          fi = ltl - stl;
        } else {
          // Use last known values if weekEnd is before last data
          ltl = lastHistoryData.ctl || 0;
          stl = lastHistoryData.atl || 0;
          fi = lastHistoryData.tsb || 0;
        }
      }
      
      return {
        weekStart,
        weekEnd,
        ltl,
        stl,
        fi,
        weeklyTSS: weekData.reduce((sum, day) => sum + (day.tss || 0), 0)
      };
    });
  }, [monthStart, monthEnd, trainingHistory]);

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

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const renderEvent = (event: CalendarEvent) => {
    const baseClasses = "text-xs p-1 mb-1 rounded flex items-center justify-between group hover:opacity-80";
    const typeClasses = event.type === 'workout' 
      ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
      : "bg-red-100 text-red-700 hover:bg-red-200";

    const handleEventClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedEvent(event);
    };

    return (
      <div
        key={event.id}
        className={`${baseClasses} ${typeClasses}`}
        title={event.title}
      >
        <span 
          className="truncate cursor-pointer flex-1"
          onClick={handleEventClick}
        >
          {event.title}
        </span>
        {event.type === 'workout' && (
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete Workout
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the workout "{event.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        deleteWorkout(event.id);
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Calendar</h1>
          <p className="text-muted-foreground mt-1">Visualize your training schedule and key events</p>
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
        </div>
        
        <Button onClick={() => setIsAIPlanWizardOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Create AI Training Plan
        </Button>
      </div>

      {/* Monthly PMC Summary */}
      {weeklyPMCSummaries.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Month PMC Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3 w-3 text-[hsl(var(--ltl-blue))]" />
                  <span className="text-xs text-muted-foreground">LTL Trend</span>
                </div>
                <div className="text-lg font-bold text-[hsl(var(--ltl-blue))]">
                  {weeklyPMCSummaries[0]?.ltl.toFixed(0)} → {weeklyPMCSummaries[weeklyPMCSummaries.length - 1]?.ltl.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-3 w-3 text-[hsl(var(--stl-pink))]" />
                  <span className="text-xs text-muted-foreground">STL Trend</span>
                </div>
                <div className="text-lg font-bold text-[hsl(var(--stl-pink))]">
                  {weeklyPMCSummaries[0]?.stl.toFixed(0)} → {weeklyPMCSummaries[weeklyPMCSummaries.length - 1]?.stl.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-[hsl(var(--fi-yellow))]" />
                  <span className="text-xs text-muted-foreground">FI Trend</span>
                </div>
                <div className="text-lg font-bold text-[hsl(var(--fi-yellow))]">
                  {weeklyPMCSummaries[0]?.fi > 0 ? '+' : ''}{weeklyPMCSummaries[0]?.fi.toFixed(0)} → 
                  {weeklyPMCSummaries[weeklyPMCSummaries.length - 1]?.fi > 0 ? '+' : ''}{weeklyPMCSummaries[weeklyPMCSummaries.length - 1]?.fi.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current Form</div>
                <PMCStatusBadge fi={weeklyPMCSummaries[weeklyPMCSummaries.length - 1]?.fi || 0} size="sm" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, i) => (
              <div key={`empty-${i}`} className="h-24 border border-border bg-muted/20"></div>
            ))}
            
            {/* Month days */}
            {days.map(day => {
              const events = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <div
                  key={day.toISOString()}
                  className={`h-24 border border-border p-1 ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/20'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-primary font-bold' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    {events.slice(0, 2).map(renderEvent)}
                    {events.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{events.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Popups */}
      {selectedEvent && selectedEvent.type === 'workout' && (
        <WorkoutPopup
          workout={selectedEvent.data}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      
      {selectedEvent && selectedEvent.type === 'goal' && (
        <GoalPopup
          goal={selectedEvent.data}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* AI Training Plan Wizard */}
      <AITrainingPlanWizard
        open={isAIPlanWizardOpen}
        onOpenChange={setIsAIPlanWizardOpen}
      />
    </div>
  );
};