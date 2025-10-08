import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Download, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useSportMode } from '@/contexts/SportModeContext';
import { scienceWorkouts } from '@/utils/scienceWorkouts';

export function WorkoutLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'json' | 'zwo' | 'erg' | 'mrc'>('json');
  const { sportMode } = useSportMode();
  const { saveWorkout, exportWorkout } = useWorkouts();
  const { toast } = useToast();

  const handleExport = async (workout: any) => {
    try {
      // Convert erg_schema to simple structure for export
      const warmupMin = workout.erg_schema?.warmup?.duration_min || 10;
      const cooldownMin = workout.erg_schema?.cooldown?.duration_min || 10;
      const sets = workout.erg_schema?.sets || [];
      
      const workoutData = {
        name: workout.title,
        description: workout.protocol,
        sport_mode: sportMode,
        structure: workout.erg_schema,
        duration_minutes: warmupMin + cooldownMin + sets.reduce((sum: number, set: any) => 
          sum + (set.on_sec * (set.reps || 1) + (set.off_sec || 0) * (set.reps || 1)) / 60, 0),
        tss: 50, // Estimated
      };
      
      await exportWorkout(workoutData as any, exportFormat);
      toast({
        title: "Workout Exported",
        description: `${workout.title} exported as ${exportFormat.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the workout.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCalendar = async (workout: any) => {
    try {
      const warmupMin = workout.erg_schema?.warmup?.duration_min || 10;
      const cooldownMin = workout.erg_schema?.cooldown?.duration_min || 10;
      const sets = workout.erg_schema?.sets || [];
      
      const workoutData = {
        name: workout.title,
        description: workout.protocol,
        sport_mode: sportMode,
        structure: workout.erg_schema,
        duration_minutes: warmupMin + cooldownMin + sets.reduce((sum: number, set: any) => 
          sum + (set.on_sec * (set.reps || 1) + (set.off_sec || 0) * (set.reps || 1)) / 60, 0),
        tss: 50, // Estimated
      };
      
      await saveWorkout(workoutData as any);
      
      toast({
        title: "Workout Added",
        description: `${workout.title} has been added to your calendar.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Add Workout",
        description: "There was an error adding the workout to your calendar.",
        variant: "destructive",
      });
    }
  };

  const handleCreateWorkout = async (workout: any) => {
    try {
      const warmupMin = workout.erg_schema?.warmup?.duration_min || 10;
      const cooldownMin = workout.erg_schema?.cooldown?.duration_min || 10;
      const sets = workout.erg_schema?.sets || [];
      
      const workoutData = {
        name: workout.title,
        description: workout.protocol,
        sport_mode: sportMode,
        structure: workout.erg_schema,
        duration_minutes: warmupMin + cooldownMin + sets.reduce((sum: number, set: any) => 
          sum + (set.on_sec * (set.reps || 1) + (set.off_sec || 0) * (set.reps || 1)) / 60, 0),
        tss: 50, // Estimated
      };
      
      await saveWorkout(workoutData as any);
      
      toast({
        title: "Workout Created",
        description: `${workout.title} has been created and saved to your library.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Create Workout",
        description: "There was an error creating the workout.",
        variant: "destructive",
      });
    }
  };

  const getZoneColor = (zone: string) => {
    const colors: Record<string, string> = {
      'Z1': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Z2': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'Z3': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Z4': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[zone] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const filteredWorkouts = scienceWorkouts.filter((workout: any) => {
    const matchesSearch = workout.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (workout.reference && workout.reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || workout.zone === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Science-Based Workout Library</h1>
        <p className="text-muted-foreground">Research-backed training sessions from peer-reviewed studies</p>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search workouts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="Z1">Zone 1</SelectItem>
            <SelectItem value="Z2">Zone 2</SelectItem>
            <SelectItem value="Z3">Zone 3</SelectItem>
            <SelectItem value="Z4">Zone 4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Export format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="zwo">ZWO (Zwift)</SelectItem>
            <SelectItem value="erg">ERG</SelectItem>
            <SelectItem value="mrc">MRC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredWorkouts.map((workout: any) => (
          <Card key={workout.id} className="shadow-md">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{workout.title}</CardTitle>
                  <CardDescription className="mt-2">{workout.protocol}</CardDescription>
                </div>
                <Badge className={getZoneColor(workout.zone)}>
                  {workout.zone}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Expected Outcome</h4>
                  <p className="text-sm text-muted-foreground">{workout.outcome}</p>
                </div>

                {workout.reference && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Research Reference</h4>
                    <p className="text-xs text-muted-foreground">{workout.reference}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Intensity Anchor</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on {workout.intensity.anchor}
                    {workout.intensity.fallback && ` (fallback: ${workout.intensity.fallback.join(', ')})`}
                  </p>
                </div>

                {workout.erg_schema && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Workout Structure</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="p-2 rounded bg-muted">
                        <span className="font-medium">Warmup:</span> {workout.erg_schema.warmup.duration_min}min
                      </div>
                      <div className="p-2 rounded bg-primary/10">
                        <span className="font-medium">Main:</span> {workout.erg_schema.sets.length} sets
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <span className="font-medium">Cooldown:</span> {workout.erg_schema.cooldown.duration_min}min
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport(workout)}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAddToCalendar(workout)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                Add to Calendar
              </Button>
              <Button 
                size="sm"
                onClick={() => handleCreateWorkout(workout)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Workout
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {filteredWorkouts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No workouts found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
