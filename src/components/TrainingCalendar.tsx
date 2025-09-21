import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, Target, Dumbbell } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { useWorkouts } from "@/hooks/useWorkouts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

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
              <span className="font-medium">TSS: {workout.tss || 95}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">📅</span>
              </div>
              <span className="font-medium">{format(new Date(), 'yyyy')}</span>
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

const GoalPopup: React.FC<GoalPopupProps> = ({ goal, onClose }) => (
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
          <p className="font-medium">{format(new Date(goal.event_date), 'PPP')}</p>
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

export const TrainingCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const { goals } = useGoals();
  const { workouts } = useWorkouts();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
    const baseClasses = "text-xs p-1 mb-1 rounded cursor-pointer truncate";
    const typeClasses = event.type === 'workout' 
      ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
      : "bg-red-100 text-red-700 hover:bg-red-200";

    return (
      <div
        key={event.id}
        className={`${baseClasses} ${typeClasses}`}
        onClick={() => handleEventClick(event)}
        title={event.title}
      >
        {event.title}
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
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
    </div>
  );
};