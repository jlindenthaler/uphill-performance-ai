import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Zap, Heart, TrendingUp, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';

export function ActivityReview() {
  const { activities, loading } = useActivities();
  const { sportMode } = useSportMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Review</h2>
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
        <div className="grid gap-4">
          {filteredActivities.map((activity) => (
            <Card key={activity.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getSportIcon(activity.sport_mode)}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{activity.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(activity.date).toLocaleDateString()}</span>
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {activity.sport_mode}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">Duration</span>
                      </div>
                      <div className="font-semibold">{formatDuration(activity.duration_seconds)}</div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs">Distance</span>
                      </div>
                      <div className="font-semibold">{formatDistance(activity.distance_meters)}</div>
                    </div>
                    
                    {activity.sport_mode === 'cycling' && activity.avg_power && (
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                          <Zap className="h-3 w-3" />
                          <span className="text-xs">Avg Power</span>
                        </div>
                        <div className="font-semibold">{activity.avg_power}W</div>
                      </div>
                    )}
                    
                    {activity.sport_mode === 'running' && activity.avg_pace_per_km && (
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">Avg Pace</span>
                        </div>
                        <div className="font-semibold">{formatPace(activity.avg_pace_per_km)}</div>
                      </div>
                    )}
                    
                    {activity.avg_heart_rate && (
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                          <Heart className="h-3 w-3" />
                          <span className="text-xs">Avg HR</span>
                        </div>
                        <div className="font-semibold">{activity.avg_heart_rate} bpm</div>
                      </div>
                    )}
                    
                    {activity.avg_speed_kmh && (
                      <div>
                        <div className="flex items-center justify-center space-x-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs">Avg Speed</span>
                        </div>
                        <div className="font-semibold">{formatSpeed(activity.avg_speed_kmh)}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                {activity.notes && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">{activity.notes}</p>
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