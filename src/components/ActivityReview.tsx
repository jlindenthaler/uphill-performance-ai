import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Zap, Heart, TrendingUp, Filter, Search, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';
import { ActivityDetail } from './ActivityDetail';
import { PowerProfileChart } from './PowerProfileChart';

export function ActivityReview() {
  const { activities, loading, deleteActivity } = useActivities();
  const { sportMode } = useSportMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [filterSport, setFilterSport] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport = filterSport === 'all' || activity.sport_mode === filterSport;
    return matchesSearch && matchesSport;
  }).sort((a, b) => {
    if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'distance') return (b.distance_meters || 0) - (a.distance_meters || 0);
    if (sortBy === 'duration') return b.duration_seconds - a.duration_seconds;
    return 0;
  });

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters?: number) => {
    if (!meters) return 'N/A';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
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

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'cycling': return '🚴';
      case 'running': return '🏃';
      case 'swimming': return '🏊';
      default: return '🏃';
    }
  };

  const handleActivityClick = (activity: any) => {
    setSelectedActivity(activity);
  };

  const handleBackToList = () => {
    setSelectedActivity(null);
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (confirm('Are you sure you want to delete this activity?')) {
      await deleteActivity(activityId);
      setSelectedActivity(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedActivity) {
    return (
      <ActivityDetail 
        activity={selectedActivity}
        onBack={handleBackToList}
        onDelete={handleDeleteActivity}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Power/Pace Profile Section */}
      <PowerProfileChart />
      
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recent Activities</h2>
          <p className="text-muted-foreground">
            {activities.length} activities • {filterSport !== 'all' ? filterSport : 'all sports'}
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Select value={filterSport} onValueChange={setFilterSport}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="cycling">Cycling</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="swimming">Swimming</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="duration">Duration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No activities yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first activity to start tracking your progress
            </p>
            <Button>Upload Activity</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="cursor-pointer hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group border-border/50 hover:border-primary/20" onClick={() => handleActivityClick(activity)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="relative">
                      <div className="text-2xl group-hover:scale-110 transition-transform duration-300">{getSportIcon(activity.sport_mode)}</div>
                      {activity.tss && activity.tss > 100 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-zone-3 rounded-full border border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors truncate">{activity.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {activity.sport_mode}
                        </Badge>
                        {activity.tss && (
                          <Badge variant="secondary" className="text-xs">
                            <Target className="h-2 w-2 mr-1" />
                            TSS {Math.round(activity.tss)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center min-w-fit">
                    <div className="px-2">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium">Duration</span>
                      </div>
                      <div className="font-bold text-sm">{formatDuration(activity.duration_seconds)}</div>
                    </div>
                    
                    <div className="px-2">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs font-medium">Distance</span>
                      </div>
                      <div className="font-bold text-sm">{formatDistance(activity.distance_meters)}</div>
                    </div>
                    
                    {activity.sport_mode === 'cycling' && activity.avg_power && (
                      <div className="px-2">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Zap className="h-3 w-3" />
                          <span className="text-xs font-medium">Avg Power</span>
                        </div>
                        <div className="font-bold text-sm text-zone-3">{activity.avg_power}W</div>
                      </div>
                    )}
                    
                    {activity.sport_mode === 'running' && activity.avg_pace_per_km && (
                      <div className="px-2">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs font-medium">Avg Pace</span>
                        </div>
                        <div className="font-bold text-sm text-zone-2">{formatPace(activity.avg_pace_per_km)}</div>
                      </div>
                    )}
                    
                    {activity.avg_heart_rate && (
                      <div className="px-2">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs font-medium">Avg HR</span>
                        </div>
                        <div className="font-bold text-sm text-red-400">{activity.avg_heart_rate} bpm</div>
                      </div>
                    )}
                    
                    {activity.avg_speed_kmh && !activity.avg_pace_per_km && (
                      <div className="px-2">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs font-medium">Avg Speed</span>
                        </div>
                        <div className="font-bold text-sm">{formatSpeed(activity.avg_speed_kmh)}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {activity.notes && (
                  <div className="mt-3 p-2 bg-muted/50 rounded-md border-l-2 border-primary/30">
                    <p className="text-xs text-muted-foreground italic truncate">{activity.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}