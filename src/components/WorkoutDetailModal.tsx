import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, BookOpen, Target, Clock, Zap, Download, Calendar, CheckCircle, X } from "lucide-react";
import { WorkoutBlock } from "./WorkoutBlock";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useToast } from "@/hooks/use-toast";

interface Workout {
  id?: string;
  name: string;
  description?: string;
  structure: any;
  duration_minutes: number;
  tss: number;
  scheduled_date?: string;
  completed_date?: string;
}

interface WorkoutDetailModalProps {
  workout: Workout | null;
  open: boolean;
  onClose: () => void;
}

export function WorkoutDetailModal({ workout, open, onClose }: WorkoutDetailModalProps) {
  const { exportWorkout } = useWorkouts();
  const { toast } = useToast();

  if (!workout) return null;

  const handleExportWorkout = () => {
    exportWorkout(workout);
    toast({
      title: "Workout exported",
      description: `${workout.name} has been downloaded as JSON`,
    });
  };

  const handleMarkComplete = async () => {
    // This would update the workout as completed
    toast({
      title: "Workout completed",
      description: `${workout.name} marked as complete`,
    });
  };

  const getZoneColor = (zone: number) => {
    switch (zone) {
      case 1: return 'bg-zone-1 text-zone-1-foreground';
      case 2: return 'bg-zone-2 text-zone-2-foreground';
      case 3: return 'bg-zone-3 text-zone-3-foreground';
      case 4: return 'bg-zone-4 text-zone-4-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Extract zones from intervals if available
  const intervals = workout.structure?.intervals || [];
  const zones = [...new Set(intervals.map((interval: any) => interval.zone))].filter((zone): zone is number => typeof zone === 'number');
  
  // Parse structure for display
  const structureDisplay = {
    warmup: workout.structure?.warmup || "Standard warmup",
    mainSet: workout.structure?.mainSet || "Main training intervals",
    cooldown: workout.structure?.cooldown || "Easy cooldown"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {workout.name}
              </DialogTitle>
              {workout.description && (
                <CardDescription>{workout.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              {zones.map((zone) => (
                <Badge key={zone} className={getZoneColor(zone)}>
                  Zone {zone}
                </Badge>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{workout.duration_minutes} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">TSS: {workout.tss}</span>
            </div>
            {workout.scheduled_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(workout.scheduled_date).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Workout Visual Block */}
          {intervals.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Workout Structure</h4>
              <WorkoutBlock intervals={intervals} />
            </div>
          )}

          {/* Training Structure */}
          <div className="space-y-3">
            <h4 className="font-semibold">Training Structure</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">WARMUP</p>
                <p className="text-sm">{structureDisplay.warmup}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <p className="text-xs font-medium text-primary">MAIN SET</p>
                <p className="text-sm">{structureDisplay.mainSet}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">COOLDOWN</p>
                <p className="text-sm">{structureDisplay.cooldown}</p>
              </div>
            </div>
          </div>

          {/* Workout Notes */}
          {workout.structure?.notes && (
            <div className="space-y-3">
              <h4 className="font-semibold">Notes</h4>
              <div className="p-4 rounded-lg border bg-muted/10">
                <p className="text-sm">{workout.structure.notes}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportWorkout}
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
            {!workout.completed_date && workout.scheduled_date && (
              <Button 
                size="sm" 
                className="primary-gradient"
                onClick={handleMarkComplete}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}