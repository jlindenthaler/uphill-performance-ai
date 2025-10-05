/**
 * Activity deduplication utilities
 * Prevents duplicate activities across different sync sources by matching
 * core activity characteristics within reasonable tolerances
 */

export interface ActivityForDeduplication {
  date: string;
  duration_seconds: number;
  distance_meters?: number | null;
  sport_mode: string;
  external_sync_source?: string | null;
  garmin_activity_id?: string | null;
}

export interface DeduplicationTolerances {
  // Time tolerance for matching activities (in seconds)
  durationTolerance: number;
  // Distance tolerance for matching activities (in meters)
  distanceTolerance: number;
  // Time window for considering activities as potential duplicates (in hours)
  timeWindow: number;
}

// Default tolerances for activity matching
export const DEFAULT_TOLERANCES: DeduplicationTolerances = {
  durationTolerance: 30, // 30 seconds tolerance for duration
  distanceTolerance: 100, // 100 meters tolerance for distance
  timeWindow: 2, // 2 hours before/after activity start time
};

/**
 * Check if two activities are likely duplicates based on their characteristics
 */
export function areActivitiesDuplicates(
  activity1: ActivityForDeduplication,
  activity2: ActivityForDeduplication,
  tolerances: DeduplicationTolerances = DEFAULT_TOLERANCES
): boolean {
  // Must be same sport mode
  if (activity1.sport_mode !== activity2.sport_mode) {
    return false;
  }

  // Check time window - activities must be within the time window
  const date1 = new Date(activity1.date);
  const date2 = new Date(activity2.date);
  const timeDifferenceHours = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
  
  if (timeDifferenceHours > tolerances.timeWindow) {
    return false;
  }

  // Check duration tolerance
  const durationDifference = Math.abs(activity1.duration_seconds - activity2.duration_seconds);
  if (durationDifference > tolerances.durationTolerance) {
    return false;
  }

  // Check distance tolerance (if both activities have distance)
  if (activity1.distance_meters && activity2.distance_meters) {
    const distanceDifference = Math.abs(activity1.distance_meters - activity2.distance_meters);
    if (distanceDifference > tolerances.distanceTolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Build SQL query conditions for finding potential duplicate activities
 */
export function buildDuplicateSearchConditions(
  activity: ActivityForDeduplication,
  userIdField: string = 'user_id',
  tolerances: DeduplicationTolerances = DEFAULT_TOLERANCES
) {
  const activityDate = new Date(activity.date);
  const timeWindowMs = tolerances.timeWindow * 60 * 60 * 1000;
  
  const startTime = new Date(activityDate.getTime() - timeWindowMs).toISOString();
  const endTime = new Date(activityDate.getTime() + timeWindowMs).toISOString();
  
  const minDuration = activity.duration_seconds - tolerances.durationTolerance;
  const maxDuration = activity.duration_seconds + tolerances.durationTolerance;

  const conditions = {
    sport_mode: activity.sport_mode,
    date: `gte.${startTime},lte.${endTime}`,
    duration_seconds: `gte.${minDuration},lte.${maxDuration}`,
  };

  // Add distance conditions if activity has distance
  if (activity.distance_meters) {
    const minDistance = Math.max(0, activity.distance_meters - tolerances.distanceTolerance);
    const maxDistance = activity.distance_meters + tolerances.distanceTolerance;
    conditions['distance_meters'] = `gte.${minDistance},lte.${maxDistance}`;
  }

  return conditions;
}

/**
 * Determine which activity should be kept when duplicates are found
 * Priority: External sync sources > Manual uploads
 * Within same source type: Most recent creation date
 */
export function selectActivityToKeep(activities: (ActivityForDeduplication & { 
  id: string; 
  created_at: string; 
})[]): string {
  if (activities.length === 0) {
    throw new Error('No activities provided');
  }

  if (activities.length === 1) {
    return activities[0].id;
  }

  // Sort by priority: external sync sources first, then by creation date (newest first)
  const sorted = activities.sort((a, b) => {
    // External sync sources have higher priority
    const aIsExternal = a.external_sync_source !== null;
    const bIsExternal = b.external_sync_source !== null;
    
    if (aIsExternal && !bIsExternal) {
      return -1; // a comes first
    }
    if (!aIsExternal && bIsExternal) {
      return 1; // b comes first
    }

    // If both are external or both are manual, sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return sorted[0].id;
}

/**
 * Get activities that should be removed (all except the one to keep)
 */
export function getActivitiesToRemove(activities: (ActivityForDeduplication & { 
  id: string; 
  created_at: string; 
})[]): string[] {
  if (activities.length <= 1) {
    return [];
  }

  const keepId = selectActivityToKeep(activities);
  return activities
    .filter(activity => activity.id !== keepId)
    .map(activity => activity.id);
}

/**
 * Log deduplication results for debugging
 */
export function logDeduplicationResult(
  newActivity: ActivityForDeduplication,
  duplicatesFound: any[],
  action: 'skipped' | 'merged' | 'created'
) {
  console.log(`[Deduplication] Activity: ${newActivity.sport_mode} on ${newActivity.date}`);
  console.log(`[Deduplication] Duration: ${newActivity.duration_seconds}s, Distance: ${newActivity.distance_meters || 'N/A'}m`);
  console.log(`[Deduplication] Found ${duplicatesFound.length} potential duplicates`);
  console.log(`[Deduplication] Action: ${action}`);
  
  if (duplicatesFound.length > 0) {
    console.log('[Deduplication] Duplicate details:', duplicatesFound.map(d => ({
      id: d.id,
      source: d.external_sync_source || 'manual',
      date: d.date,
      duration: d.duration_seconds,
      distance: d.distance_meters
    })));
  }
}

export interface ActivityWithData {
  id: string;
  created_at: string;
  external_sync_source?: string | null;
  power_time_series?: any;
  gps_data?: any;
  heart_rate_time_series?: any;
  cadence_time_series?: any;
  altitude_time_series?: any;
  elevation_profile?: any;
  summary_metrics?: any;
}

/**
 * Calculate data completeness score for an activity
 * Higher score means more complete data
 */
export function calculateDataCompleteness(activity: ActivityWithData): number {
  let score = 0;
  
  // Power data is highly valuable
  if (activity.power_time_series && Array.isArray(activity.power_time_series) && activity.power_time_series.length > 0) {
    score += 10;
  }
  
  // GPS/location data
  if (activity.gps_data && Array.isArray(activity.gps_data) && activity.gps_data.length > 0) {
    score += 10;
  }
  
  // Heart rate data
  if (activity.heart_rate_time_series && Array.isArray(activity.heart_rate_time_series) && activity.heart_rate_time_series.length > 0) {
    score += 8;
  }
  
  // Cadence data
  if (activity.cadence_time_series && Array.isArray(activity.cadence_time_series) && activity.cadence_time_series.length > 0) {
    score += 5;
  }
  
  // Elevation data
  if ((activity.altitude_time_series && Array.isArray(activity.altitude_time_series) && activity.altitude_time_series.length > 0) ||
      (activity.elevation_profile && Array.isArray(activity.elevation_profile) && activity.elevation_profile.length > 0)) {
    score += 5;
  }
  
  // Summary metrics
  if (activity.summary_metrics && Object.keys(activity.summary_metrics).length > 0) {
    score += 3;
  }
  
  return score;
}