import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Zap, Heart, TrendingUp, Filter, Search, Target, Award, ArrowLeft, Edit, Trash2, ChevronDown, ChevronUp, Upload, Plus, RotateCcw, MoreHorizontal } from 'lucide-react';
import { formatActivityDate, formatActivityDateTime } from '@/utils/dateFormat';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { usePaginatedActivities } from '@/hooks/usePaginatedActivities';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';
import { ActivityUploadNew } from './ActivityUploadNew';
import { EnhancedMapView } from './EnhancedMapView';
import { EnhancedPowerProfileChart } from './EnhancedPowerProfileChart';
import { ActivityAnalysisChart } from './ActivityAnalysisChart';

export function Activities() {
  const { activities, pagination, loadNextPage, loadActivityDetails, refreshActivities, isLoading } = usePaginatedActivities(20);
  const { deleteActivity, reprocessActivityTimestamps } = useActivities();
  const { sportMode } = useSportMode();
  const { timezone } = useUserTimezone();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [filterSport, setFilterSport] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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
    if (!kmh || kmh === 0) return 'N/A';
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

  const formatCadence = (rpm?: number) => {
    if (!rpm) return 'N/A';
    return `${Math.round(rpm)} rpm`;
  };


  const getSportIcon = (sport: string) => {
    switch (sport) {
      case 'cycling': return '🚴';
      case 'running': return '🏃';
      case 'swimming': return '🏊';
      default: return '🏃';
    }
  };

  const handleActivityToggle = async (activityId: string) => {
    try {
      console.log('Toggling activity:', activityId, 'current expanded:', expandedActivity);
      if (expandedActivity === activityId) {
        setExpandedActivity(null);
      } else {
        // Load full activity details when expanding
        await loadActivityDetails(activityId);
        setExpandedActivity(activityId);
      }
    } catch (error) {
      console.error('Error toggling activity:', error);
      // Reset to safe state on error
      setExpandedActivity(null);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(activityId);
    if (expandedActivity === activityId) {
      setExpandedActivity(null);
    }
  };

  const handleUploadSuccess = (activityId?: string) => {
    console.log('handleUploadSuccess called with activityId:', activityId);
    // Close the modal immediately
    setUploadModalOpen(false);
    
    // Refresh the activities list
    refreshActivities();
    
    if (activityId) {
      // Expand the newly uploaded activity after a brief delay to ensure data is loaded
      setTimeout(async () => {
        console.log('Expanding activity:', activityId);
        await loadActivityDetails(activityId);
        setExpandedActivity(activityId);
      }, 1000);
    }
  };

  const renderExpandedActivity = (activity: any) => (
    <div className="space-y-6 pt-4 border-t">

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
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {formatSpeed(activity.avg_speed_kmh)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Speed</div>
          </CardContent>
        </Card>
        
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

      {/* Activity Analysis Chart - Timeline */}
      <div className="mt-6">
        <ActivityAnalysisChart activity={activity} />
      </div>

      {/* Enhanced Power Profile - With Activity Comparison */}
      <div className="mt-6">
        <EnhancedPowerProfileChart activity={activity} />
      </div>
      
      {/* GPS Route Map */}
      {activity.gps_data && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Route Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedMapView gpsData={activity.gps_data} activity={activity} className="w-full h-96" />
          </CardContent>
        </Card>
      )}

      {/* Activity Analysis Chart */}
      <div className="mt-6">
        <ActivityAnalysisChart activity={activity} />
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
            
            {activity.avg_cadence && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Cadence</span>
                <span className="font-medium">{formatCadence(activity.avg_cadence)}</span>
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

        {/* Training Load & Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Training Load
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Training stress and intensity metrics for this activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Training Load Index</span>
              <span className="font-medium">
                {activity.tss ? Math.round(activity.tss) : 'N/A'}
              </span>
            </div>
            
            {activity.intensity_factor && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intensity Index</span>
                <span className="font-medium">{activity.intensity_factor.toFixed(2)}</span>
              </div>
            )}
            
            {activity.variability_index && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effort Ratio</span>
                <span className="font-medium">{activity.variability_index.toFixed(2)}</span>
              </div>
            )}

            {/* Activity Bests Summary */}
            {activity.power_curve_cache && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium mb-2">Activity Bests</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(activity.power_curve_cache)
                    .slice(0, 4)
                    .map(([duration, data]: [string, any]) => {
                      const durationSeconds = parseInt(duration);
                      const formatDuration = (seconds: number) => {
                        if (seconds < 60) return `${seconds}s`;
                        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
                        return `${Math.floor(seconds / 3600)}h`;
                      };
                      return (
                        <div key={duration} className="flex justify-between">
                          <span className="text-muted-foreground">{formatDuration(durationSeconds)}</span>
                          <span className="font-medium">{Math.round(data.value)}W</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* File Information & Upload Details */}
      <Card>
        <CardHeader>
          <CardTitle>File Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activity.original_filename && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Filename</span>
              <span className="font-medium text-sm">{activity.original_filename}</span>
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
            <span className="font-medium text-sm">{formatActivityDateTime(activity.created_at, timezone)}</span>
          </div>
          {activity.weather_conditions && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weather</span>
              <span className="font-medium text-sm">{JSON.stringify(activity.weather_conditions)}</span>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );

  // Debug timezone and dates
  if (activities.length > 0) {
    console.log('Activities timezone debug:', {
      timezone,
      firstActivity: activities[0],
      formattedDate: formatActivityDateTime(activities[0].date, timezone)
    });
  }

  if (isLoading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-muted-foreground mt-2">
            Review activities and upload new training data • Timezone: {timezone}
          </p>
        </div>
        <Button onClick={() => setUploadModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Upload Activity
        </Button>
      </div>

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
            <SelectContent className="bg-popover border border-border">
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
            <SelectContent className="bg-popover border border-border">
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
            <Button onClick={() => setUploadModalOpen(true)}>Upload Activity</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Collapsible 
              key={activity.id} 
              open={expandedActivity === activity.id}
              onOpenChange={(open) => {
                try {
                  console.log('Collapsible onOpenChange:', open, 'for activity:', activity.id);
                  setExpandedActivity(open ? activity.id : null);
                } catch (error) {
                  console.error('Error in onOpenChange:', error);
                  // Reset to safe state
                  setExpandedActivity(null);
                }
              }}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start space-x-4 flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivityToggle(activity.id);
                        }}>
                        <div className="relative">
                          <div className="text-2xl transition-transform duration-300">{getSportIcon(activity.sport_mode)}</div>
                          {activity.tss && activity.tss > 100 && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-zone-3 rounded-full border border-background"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg transition-colors truncate">{activity.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatActivityDateTime(activity.date, timezone)}</span>
                                </span>
                                <Badge variant="outline" className="capitalize">
                                  {activity.sport_mode}
                                </Badge>
                                {activity.tss && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Target className="h-2 w-2 mr-1" />
                                    TLI {Math.round(activity.tss)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
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
                                        onClick={() => handleDeleteActivity(activity.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
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
                          
                          {activity.sport_mode === 'cycling' && (
                            <>
                              {activity.avg_power && (
                                <div className="px-2">
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                    <Zap className="h-3 w-3" />
                                    <span className="text-xs font-medium">Avg Power</span>
                                  </div>
                                  <div className="font-bold text-sm text-zone-3">{activity.avg_power}W</div>
                                </div>
                              )}
                              <div className="px-2">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span className="text-xs font-medium">Avg Speed</span>
                                </div>
                                <div className="font-bold text-sm text-zone-2">
                                  {activity.avg_speed_kmh ? formatSpeed(activity.avg_speed_kmh) : 'N/A'}
                                </div>
                              </div>
                            </>
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
                          
                          {activity.avg_cadence && (
                            <div className="px-2">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                                <RotateCcw className="h-3 w-3" />
                                <span className="text-xs font-medium">Avg Cadence</span>
                              </div>
                              <div className="font-bold text-sm text-purple-400">{activity.avg_cadence} rpm</div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center">
                          {expandedActivity === activity.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {activity.notes && (
                      <div className="mt-3 p-2 bg-muted/50 rounded-md border-l-2 border-primary/30">
                        <p className="text-xs text-muted-foreground italic truncate">{activity.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="border-t">
                      {renderExpandedActivity(activity)}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
          
          {/* Load More Button */}
          {pagination.hasMore && !isLoading && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={loadNextPage}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Load More Activities
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Activity
            </DialogTitle>
            <DialogDescription>
              Upload your training activity files (GPX, TCX, or FIT) to analyze and track your performance.
            </DialogDescription>
          </DialogHeader>
          <ActivityUploadNew onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}