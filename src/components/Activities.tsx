import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Clock, MapPin, Zap, Heart, TrendingUp, Filter, Search, Target, Award, ArrowLeft, Edit, Trash2, ChevronDown, ChevronUp, Upload, Plus, RotateCcw, MoreHorizontal } from 'lucide-react';
import { formatActivityDate, formatActivityDateTime } from '@/utils/dateFormat';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useActivities } from '@/hooks/useActivities';
import { useSportMode } from '@/contexts/SportModeContext';
import { useDeduplicatedActivities } from '@/hooks/useDeduplicatedActivities';
import { ActivityUploadNew } from './ActivityUploadNew';
import { EnhancedMapView } from './EnhancedMapView';
import { EnhancedPowerProfileChart } from './EnhancedPowerProfileChart';
import { ActivityAnalysisChart } from './ActivityAnalysisChart';
import { EditActivityModal } from './EditActivityModal';

export function Activities() {
  const { 
    activities, 
    loading,
    loadingMore,
    hasMore,
    detailedActivities, 
    loadingDetails, 
    fetchActivityDetails,
    fetchMoreActivities,
    deleteActivity, 
    reprocessActivityTimestamps 
  } = useActivities();
  const { sportMode } = useSportMode();
  const { timezone } = useUserTimezone();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [filterSport, setFilterSport] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editActivityData, setEditActivityData] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Apply deduplication
  const { displayActivities, duplicateGroups } = useDeduplicatedActivities(activities, showDuplicates);

  const filteredActivities = displayActivities.filter(activity => {
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

  const getSyncSourceBadge = (source: string | null | undefined) => {
    if (source === 'garmin') {
      return (
        <Badge variant="outline" className="text-xs">
          Garmin
        </Badge>
      );
    }
    if (source === 'strava') {
      return (
        <Badge variant="outline" className="text-xs">
          Strava
        </Badge>
      );
    }
    return null;
  };

  const getDuplicateSourcesBadge = (activity: any) => {
    if (!activity.is_deduplicated || !activity.duplicate_sources) return null;
    
    const sources = activity.duplicate_sources;
    if (sources.length <= 1) return null;

    return (
      <Badge variant="secondary" className="text-xs">
        {sources.join(' + ')}
      </Badge>
    );
  };

  const handleActivityToggle = async (activityId: string) => {
    if (expandedActivity === activityId) {
      setExpandedActivity(null);
    } else {
      setExpandedActivity(activityId);
      // Fetch detailed data if not already cached
      if (!detailedActivities.has(activityId)) {
        await fetchActivityDetails(activityId);
      }
      
      // Scroll to top of the expanded activity after a brief delay
      setTimeout(() => {
        const activityElement = document.getElementById(`activity-${activityId}`);
        if (activityElement) {
          activityElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(activityId);
    if (expandedActivity === activityId) {
      setExpandedActivity(null);
    }
  };

  const handleEditActivity = (activityId: string) => {
    const detailedActivity = detailedActivities.get(activityId);
    if (detailedActivity) {
      setEditActivityData(detailedActivity);
      setEditModalOpen(true);
    }
  };

  const handleUploadSuccess = (activityId?: string) => {
    console.log('handleUploadSuccess called with activityId:', activityId);
    setUploadModalOpen(false);
    
    if (activityId) {
      setTimeout(() => {
        console.log('Expanding activity:', activityId);
        setExpandedActivity(activityId);
      }, 1000);
    }
  };

  const toggleBatchDeleteMode = () => {
    setBatchDeleteMode(!batchDeleteMode);
    setSelectedActivities(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedActivities.size === filteredActivities.length) {
      setSelectedActivities(new Set());
    } else {
      setSelectedActivities(new Set(filteredActivities.map(a => a.id)));
    }
  };

  const toggleActivitySelection = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    if (newSelected.has(activityId)) {
      newSelected.delete(activityId);
    } else {
      newSelected.add(activityId);
    }
    setSelectedActivities(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selectedActivities.size === 0) return;
    
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedActivities);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        await deleteActivity(id);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete activity ${id}:`, error);
        failCount++;
      }
    }

    console.log(`Batch delete completed: ${successCount} deleted, ${failCount} failed`);
    setIsDeleting(false);
    setSelectedActivities(new Set());
    setBatchDeleteMode(false);
  };

  // Infinite scroll implementation
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchMoreActivities();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, fetchMoreActivities]);

  const renderExpandedActivity = (activityId: string) => {
    const detailedActivity = detailedActivities.get(activityId);
    const isLoading = loadingDetails.has(activityId);
    
    if (isLoading) {
      return (
        <div className="space-y-6 pt-4 border-t">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading detailed data...</span>
          </div>
        </div>
      );
    }

    if (!detailedActivity) {
      return (
        <div className="space-y-6 pt-4 border-t">
          <div className="text-center py-8 text-muted-foreground">
            Failed to load detailed activity data. Please try again.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 pt-4 border-t">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatDuration(detailedActivity.duration_seconds)}</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatDistance(detailedActivity.distance_meters)}</div>
              <div className="text-sm text-muted-foreground">Distance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {formatSpeed(detailedActivity.avg_speed_kmh)}
              </div>
              <div className="text-sm text-muted-foreground">Avg Speed</div>
            </CardContent>
          </Card>
          
          {detailedActivity.avg_heart_rate && (
            <Card>
              <CardContent className="p-4 text-center">
                <Heart className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{detailedActivity.avg_heart_rate} bpm</div>
                <div className="text-sm text-muted-foreground">Avg Heart Rate</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Power Profile */}
        <div className="mt-6">
          <EnhancedPowerProfileChart activity={detailedActivity} />
        </div>
        
        {/* GPS Route Map */}
        {detailedActivity.gps_data && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Route Map</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedMapView gpsData={detailedActivity.gps_data} activity={detailedActivity} className="w-full h-80" />
            </CardContent>
          </Card>
        )}

        {/* Activity Analysis Chart */}
        <div className="mt-6">
          <ActivityAnalysisChart activity={detailedActivity} />
        </div>

        {/* Detailed Metrics */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detailedActivity.sport_mode === 'cycling' && (
                <>
                  {detailedActivity.avg_power && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Average Power</span>
                      <span className="font-medium">{formatPower(detailedActivity.avg_power)}</span>
                    </div>
                  )}
                  {detailedActivity.max_power && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max Power</span>
                      <span className="font-medium">{formatPower(detailedActivity.max_power)}</span>
                    </div>
                  )}
                  {detailedActivity.normalized_power && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Normalized Power</span>
                      <span className="font-medium">{formatPower(detailedActivity.normalized_power)}</span>
                    </div>
                  )}
                </>
              )}
              
              {detailedActivity.sport_mode === 'running' && detailedActivity.avg_pace_per_km && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Pace</span>
                  <span className="font-medium">{formatPace(detailedActivity.avg_pace_per_km)}</span>
                </div>
              )}
              
              {detailedActivity.max_heart_rate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Heart Rate</span>
                  <span className="font-medium">{detailedActivity.max_heart_rate} bpm</span>
                </div>
              )}
              
              {detailedActivity.elevation_gain_meters && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Elevation Gain</span>
                  <span className="font-medium">{Math.round(detailedActivity.elevation_gain_meters)} m</span>
                </div>
              )}
              
              {detailedActivity.avg_cadence && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Cadence</span>
                  <span className="font-medium">{formatCadence(detailedActivity.avg_cadence)}</span>
                </div>
              )}
              
              {detailedActivity.calories && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calories</span>
                  <span className="font-medium">{detailedActivity.calories} kcal</span>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Training Load Index</span>
                <span className="font-medium">
                  {detailedActivity.tss ? Math.round(detailedActivity.tss) : 'N/A'}
                </span>
              </div>
              
              {detailedActivity.intensity_factor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Intensity Index</span>
                  <span className="font-medium">{detailedActivity.intensity_factor.toFixed(2)}</span>
                </div>
              )}
              
              {detailedActivity.variability_index && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Effort Ratio</span>
                  <span className="font-medium">{detailedActivity.variability_index.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Notes */}
        {detailedActivity.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{detailedActivity.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Debug timezone and dates
  if (activities.length > 0) {
    console.log('Activities timezone debug:', {
      timezone,
      firstActivity: activities[0],
      formattedDate: formatActivityDateTime(activities[0].date, timezone)
    });
  }

  if (loading) {
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
        <div className="flex gap-2">
          <Button 
            variant={batchDeleteMode ? "destructive" : "outline"}
            onClick={toggleBatchDeleteMode} 
            className="flex items-center gap-2"
          >
            {batchDeleteMode ? <><Trash2 className="w-4 h-4" />Cancel</> : 'Bulk Actions'}
          </Button>
          <Button onClick={() => setUploadModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Upload Activity
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Recent Activities</h2>
            <p className="text-muted-foreground">
              {activities.length} activities • {filterSport !== 'all' ? filterSport : 'all sports'}
            </p>
          </div>
          {batchDeleteMode && (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleSelectAll}
                className="whitespace-nowrap"
              >
                {selectedActivities.size === filteredActivities.length ? 'Deselect All' : 'Select All'}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    disabled={selectedActivities.size === 0 || isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedActivities.size > 0 ? `(${selectedActivities.size})` : ''}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedActivities.size} activities?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the selected activities and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBatchDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Activities
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {!showDuplicates && duplicateGroups.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuplicates(true)}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              Show All Duplicates ({duplicateGroups.size} hidden)
            </Button>
          )}
          {showDuplicates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDuplicates(false)}
              className="flex items-center gap-2"
            >
              Hide Duplicates
            </Button>
          )}
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
              onOpenChange={() => handleActivityToggle(activity.id)}
            >
              <Card id={`activity-${activity.id}`} className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {batchDeleteMode && (
                        <div 
                          className="flex items-center pt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActivitySelection(activity.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedActivities.has(activity.id)}
                            onChange={() => toggleActivitySelection(activity.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </div>
                      )}
                      <div className="flex items-start space-x-4 flex-1" onClick={(e) => e.stopPropagation()}>
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
                                 {getSyncSourceBadge(activity.external_sync_source)}
                                 {getDuplicateSourcesBadge(activity)}
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
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => handleEditActivity(activity.id)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Activity
                                </DropdownMenuItem>
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
                          
                          {/* Remove avg_cadence from summary view since it's not available in ActivitySummary */}
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
                    
                    {/* Remove notes from summary view since they're not available in ActivitySummary */}
                  </CardContent>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {renderExpandedActivity(activity.id)}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel and loading indicator */}
      {!loading && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="flex items-center text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3"></div>
              <span>Loading more activities...</span>
            </div>
          )}
        </div>
      )}

      {/* No More Activities Message */}
      {!loading && !hasMore && activities.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No more activities to load</p>
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

      {/* Edit Activity Modal */}
      <EditActivityModal 
        activity={editActivityData}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}