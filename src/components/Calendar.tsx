import { useState } from "react";
import { Calendar as CalendarPrimitive } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar as CalendarIcon, Clock, Target } from "lucide-react";
import { useSportMode } from "@/contexts/SportModeContext";

interface Workout {
  id: string;
  date: Date;
  title: string;
  duration: number;
  type: string;
  sport: string;
  completed?: boolean;
}

export function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([
    {
      id: '1',
      date: new Date(),
      title: 'FTP Test',
      duration: 60,
      type: 'Test',
      sport: 'cycling',
      completed: false
    },
    {
      id: '2', 
      date: new Date(Date.now() + 86400000),
      title: 'Easy Run',
      duration: 45,
      type: 'Endurance',
      sport: 'running',
      completed: false
    }
  ]);
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const { sportMode } = useSportMode();

  const workoutTemplates = {
    cycling: [
      { name: 'FTP Test', duration: 60, type: 'Test' },
      { name: 'Sweet Spot', duration: 90, type: 'Threshold' },
      { name: 'VO2 Max Intervals', duration: 75, type: 'VO2' },
      { name: 'Recovery Ride', duration: 60, type: 'Recovery' }
    ],
    running: [
      { name: 'Tempo Run', duration: 60, type: 'Threshold' },
      { name: '5K Intervals', duration: 45, type: 'VO2' },
      { name: 'Long Run', duration: 120, type: 'Endurance' },
      { name: 'Easy Run', duration: 45, type: 'Recovery' }
    ],
    swimming: [
      { name: 'CSS Test', duration: 45, type: 'Test' },
      { name: 'Threshold Set', duration: 60, type: 'Threshold' },
      { name: 'Sprint Sets', duration: 45, type: 'VO2' },
      { name: 'Technique Focus', duration: 60, type: 'Technique' }
    ]
  };

  const getWorkoutsForDate = (date: Date) => {
    return workouts.filter(workout => 
      workout.date.toDateString() === date.toDateString()
    );
  };

  const addWorkout = (template: any) => {
    if (!selectedDate) return;
    
    const newWorkout: Workout = {
      id: Date.now().toString(),
      date: selectedDate,
      title: template.name,
      duration: template.duration,
      type: template.type,
      sport: sportMode,
      completed: false
    };
    
    setWorkouts([...workouts, newWorkout]);
    setIsAddWorkoutOpen(false);
  };

  const toggleWorkoutComplete = (workoutId: string) => {
    setWorkouts(workouts.map(workout =>
      workout.id === workoutId 
        ? { ...workout, completed: !workout.completed }
        : workout
    ));
  };

  const selectedDateWorkouts = selectedDate ? getWorkoutsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Training Calendar</h1>
          <p className="text-muted-foreground">
            Plan and track your workouts
          </p>
        </div>
        <Dialog open={isAddWorkoutOpen} onOpenChange={setIsAddWorkoutOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Workout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Workout</DialogTitle>
              <DialogDescription>
                Choose a workout template for {selectedDate?.toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm font-medium">
                Current Sport: <Badge variant="outline">{sportMode}</Badge>
              </div>
              <div className="grid gap-2">
                {workoutTemplates[sportMode as keyof typeof workoutTemplates]?.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    onClick={() => addWorkout(template)}
                    className="justify-start p-4 h-auto"
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {template.duration} min • {template.type}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Monthly View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarPrimitive
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasWorkout: (date) => getWorkoutsForDate(date).length > 0,
                completed: (date) => getWorkoutsForDate(date).some(w => w.completed)
              }}
              modifiersStyles={{
                hasWorkout: { 
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold'
                },
                completed: {
                  backgroundColor: 'hsl(var(--success) / 0.2)',
                  color: 'hsl(var(--success))'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {selectedDate?.toLocaleDateString() || "Select Date"}
            </CardTitle>
            <CardDescription>
              {selectedDateWorkouts.length} workout{selectedDateWorkouts.length !== 1 ? 's' : ''} planned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedDateWorkouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No workouts planned for this date
                </p>
              ) : (
                selectedDateWorkouts.map((workout) => (
                  <div 
                    key={workout.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      workout.completed 
                        ? 'bg-success/10 border-success/20' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{workout.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {workout.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {workout.duration} min
                          <Badge variant="secondary" className="text-xs">
                            {workout.sport}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={workout.completed ? "default" : "outline"}
                        onClick={() => toggleWorkoutComplete(workout.id)}
                      >
                        {workout.completed ? "✓" : "○"}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}