import React from 'react';
import { Calendar, Clock, MapPin, Zap, Heart, TrendingUp, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Activity {
  id: string;
  user_id: string;
  name: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_pace_per_km?: number;
  avg_speed_kmh?: number;
  calories?: number;
  tss?: number;
  intensity_factor?: number;
  variability_index?: number;
  file_path?: string;
  file_type?: string;
  original_filename?: string;
  gps_data?: any;
  lap_data?: any;
  notes?: string;
  weather_conditions?: any;
  created_at: string;
  updated_at: string;
}

interface ActivityDetailProps {
  activity: Activity;
  onBack: () => void;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
}

export function ActivityDetail({ activity, onBack, onEdit, onDelete }: ActivityDetailProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
  };

  const formatSpeed = (kmh?: number) => {
    if (!kmh) return 'N/A';
    return `${kmh.toFixed(1)} km/h`;
  };

  const formatPace = (pacePerKm?: number) => {
    if (!pacePerKm) return 'N/A';
    const minutes = Math.floor(pacePerKm);
    const seconds = Math.round((pacePerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  const formatPower = (watts?: number) => {
    if (!watts) return 'N/A';
    return `${Math.round(watts)}W`;
  };

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'cycling': return '🚴';
      case 'running': return '🏃';
      case 'swimming': return '🏊';
      default: return '🏃';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getSportIcon(activity.sport_mode)}</span>
              <h1 className="text-3xl font-bold">{activity.name}</h1>
            </div>
            <div className="flex items-center space-x-4 text-muted-foreground mt-2">
              <span className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(activity.date).toLocaleDateString()}</span>
              </span>
              <Badge variant="outline" className="capitalize">
                {activity.sport_mode}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {onEdit && (
            <Button variant="outline" size="icon" onClick={() => onEdit(activity)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" size="icon" onClick={() => onDelete(activity.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{formatDuration(activity.duration_seconds)}</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <MapPin className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{formatDistance(activity.distance_meters)}</div>
            <div className="text-sm text-muted-foreground">Distance</div>
          </CardContent>
        </Card>
        
        {activity.avg_speed_kmh && (
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatSpeed(activity.avg_speed_kmh)}</div>
              <div className="text-sm text-muted-foreground">Avg Speed</div>
            </CardContent>
          </Card>
        )}
        
        {activity.avg_heart_rate && (
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{activity.avg_heart_rate} bpm</div>
              <div className="text-sm text-muted-foreground">Avg Heart Rate</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.sport_mode === 'cycling' && (
              <>
                {activity.avg_power && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Power</span>
                    <span className="font-medium">{formatPower(activity.avg_power)}</span>
                  </div>
                )}
                {activity.max_power && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Power</span>
                    <span className="font-medium">{formatPower(activity.max_power)}</span>
                  </div>
                )}
                {activity.normalized_power && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Normalized Power</span>
                    <span className="font-medium">{formatPower(activity.normalized_power)}</span>
                  </div>
                )}
              </>
            )}
            
            {activity.sport_mode === 'running' && activity.avg_pace_per_km && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Pace</span>
                <span className="font-medium">{formatPace(activity.avg_pace_per_km)}</span>
              </div>
            )}
            
            {activity.max_heart_rate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Heart Rate</span>
                <span className="font-medium">{activity.max_heart_rate} bpm</span>
              </div>
            )}
            
            {activity.elevation_gain_meters && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Elevation Gain</span>
                <span className="font-medium">{Math.round(activity.elevation_gain_meters)} m</span>
              </div>
            )}
            
            {activity.calories && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calories</span>
                <span className="font-medium">{activity.calories} kcal</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Load */}
        <Card>
          <CardHeader>
            <CardTitle>Training Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.tss && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Stress Score</span>
                <span className="font-medium">{Math.round(activity.tss)}</span>
              </div>
            )}
            
            {activity.intensity_factor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intensity Factor</span>
                <span className="font-medium">{activity.intensity_factor.toFixed(2)}</span>
              </div>
            )}
            
            {activity.variability_index && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Variability Index</span>
                <span className="font-medium">{activity.variability_index.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Notes */}
      {activity.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{activity.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* File Information */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.original_filename && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Filename</span>
              <span className="font-medium">{activity.original_filename}</span>
            </div>
          )}
          {activity.file_type && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Type</span>
              <span className="font-medium uppercase">{activity.file_type}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uploaded</span>
            <span className="font-medium">{new Date(activity.created_at).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}