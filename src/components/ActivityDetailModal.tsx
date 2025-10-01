import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Clock, 
  MapPin, 
  Zap, 
  Target, 
  Heart, 
  Activity, 
  TrendingUp, 
  X,
  Edit,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { EnhancedMapView } from "./EnhancedMapView";
import { formatActivityDateTime } from "@/utils/dateFormat";
import { useUserTimezone } from "@/hooks/useUserTimezone";

interface Activity {
  id?: string;
  name: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  avg_speed_kmh?: number;
  avg_pace_per_km?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  tss?: number;
  intensity_factor?: number;
  variability_index?: number;
  elevation_gain_meters?: number;
  calories?: number;
  gps_data?: any;
  notes?: string;
  file_type?: string;
  original_filename?: string;
}

interface ActivityDetailModalProps {
  activity: Activity | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
}

export function ActivityDetailModal({ activity, open, onClose, onEdit, onDelete }: ActivityDetailModalProps) {
  const { timezone } = useUserTimezone();
  
  if (!activity) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatSpeed = (kmh: number) => `${kmh.toFixed(1)} km/h`;
  
  const formatPace = (pacePerKm: number) => {
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  };

  const formatPower = (watts: number) => `${watts.toFixed(0)}W`;

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case 'cycling':
        return '🚴';
      case 'running':
        return '🏃';
      case 'swimming':
        return '🏊';
      default:
        return '💪';
    }
  };

  const isCycling = activity.sport_mode === 'cycling';
  const isRunning = activity.sport_mode === 'running';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getSportIcon(activity.sport_mode)}</span>
              <div>
                <div>{activity.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {formatActivityDateTime(activity.date, timezone)}
                </div>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activity.sport_mode}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Activity
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-background border border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the activity "{activity.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            onDelete?.(activity.id!);
                            onClose();
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-muted-foreground mr-1" />
              </div>
              <div className="text-2xl font-bold">{formatDuration(activity.duration_seconds)}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>

            {activity.distance_meters && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <MapPin className="w-4 h-4 text-muted-foreground mr-1" />
                </div>
                <div className="text-2xl font-bold">{formatDistance(activity.distance_meters)}</div>
                <div className="text-sm text-muted-foreground">Distance</div>
              </div>
            )}

            {activity.avg_speed_kmh && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-muted-foreground mr-1" />
                </div>
                <div className="text-2xl font-bold">{formatSpeed(activity.avg_speed_kmh)}</div>
                <div className="text-sm text-muted-foreground">Avg Speed</div>
              </div>
            )}

            {activity.avg_heart_rate && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Heart className="w-4 h-4 text-red-500 mr-1" />
                </div>
                <div className="text-2xl font-bold">{activity.avg_heart_rate}</div>
                <div className="text-sm text-muted-foreground">Avg HR</div>
              </div>
            )}
          </div>

          <Separator />

          {/* Performance Metrics */}
          {(activity.avg_power || activity.avg_pace_per_km) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {isCycling && activity.avg_power && (
                    <>
                      <div>
                        <div className="text-sm text-muted-foreground">Average Power</div>
                        <div className="text-lg font-semibold">{formatPower(activity.avg_power)}</div>
                      </div>
                      {activity.max_power && (
                        <div>
                          <div className="text-sm text-muted-foreground">Max Power</div>
                          <div className="text-lg font-semibold">{formatPower(activity.max_power)}</div>
                        </div>
                      )}
                      {activity.normalized_power && (
                        <div>
                          <div className="text-sm text-muted-foreground">Normalized Power</div>
                          <div className="text-lg font-semibold">{formatPower(activity.normalized_power)}</div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {isRunning && activity.avg_pace_per_km && (
                    <div>
                      <div className="text-sm text-muted-foreground">Average Pace</div>
                      <div className="text-lg font-semibold">{formatPace(activity.avg_pace_per_km)}</div>
                    </div>
                  )}

                  {activity.max_heart_rate && (
                    <div>
                      <div className="text-sm text-muted-foreground">Max Heart Rate</div>
                      <div className="text-lg font-semibold">{activity.max_heart_rate} bpm</div>
                    </div>
                  )}

                  {activity.elevation_gain_meters && (
                    <div>
                      <div className="text-sm text-muted-foreground">Elevation Gain</div>
                      <div className="text-lg font-semibold">{activity.elevation_gain_meters.toFixed(0)}m</div>
                    </div>
                  )}

                  {activity.calories && (
                    <div>
                      <div className="text-sm text-muted-foreground">Calories</div>
                      <div className="text-lg font-semibold">{activity.calories}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Training Load */}
          {(activity.tss || activity.intensity_factor || activity.variability_index) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Training Load
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activity.tss && (
                    <div>
                      <div className="text-sm text-muted-foreground">Training Load Index</div>
                      <div className="text-lg font-semibold">{activity.tss.toFixed(0)}</div>
                    </div>
                  )}
                  {activity.intensity_factor && (
                    <div>
                      <div className="text-sm text-muted-foreground">Intensity Index</div>
                      <div className="text-lg font-semibold">{activity.intensity_factor.toFixed(2)}</div>
                    </div>
                  )}
                  {activity.variability_index && (
                    <div>
                      <div className="text-sm text-muted-foreground">Effort Ratio</div>
                      <div className="text-lg font-semibold">{activity.variability_index.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* GPS Route */}
          {activity.gps_data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  GPS Route
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedMapView 
                  gpsData={activity.gps_data} 
                  className="h-[340px] rounded-lg"
                />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {activity.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{activity.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* File Information */}
          {activity.original_filename && (
            <Card>
              <CardHeader>
                <CardTitle>File Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <div>Original file: {activity.original_filename}</div>
                  {activity.file_type && <div>File type: {activity.file_type}</div>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {(onEdit || onDelete) && (
            <div className="flex justify-end gap-2">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(activity)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && activity.id && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDelete(activity.id!)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}