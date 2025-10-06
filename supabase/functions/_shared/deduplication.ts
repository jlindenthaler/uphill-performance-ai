/**
 * Shared deduplication logic for Edge Functions
 * Automatically removes duplicate activities from the database
 */

interface ActivityForDeduplication {
  id: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number | null;
  sport_mode: string;
  external_sync_source?: string | null;
  created_at: string;
  // Data completeness fields
  power_time_series?: any;
  heart_rate_time_series?: any;
  cadence_time_series?: any;
  speed_time_series?: any;
  distance_time_series?: any;
  altitude_time_series?: any;
  temperature_time_series?: any;
  time_time_series?: any;
  gps_data?: any;
  avg_power?: number | null;
  avg_heart_rate?: number | null;
  calories?: number | null;
}

interface DeduplicationTolerances {
  durationToleranceSeconds: number;
  distanceToleranceMeters: number;
  timeWindowMinutes: number;
}

const DEFAULT_TOLERANCES: DeduplicationTolerances = {
  durationToleranceSeconds: 30,
  distanceToleranceMeters: 100,
  timeWindowMinutes: 5,
};

/**
 * Check if two activities are duplicates based on core characteristics
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

  // Check time difference
  const date1 = new Date(activity1.date).getTime();
  const date2 = new Date(activity2.date).getTime();
  const timeDiffMinutes = Math.abs(date1 - date2) / 1000 / 60;

  if (timeDiffMinutes > tolerances.timeWindowMinutes) {
    return false;
  }

  // Check duration difference
  const durationDiff = Math.abs(activity1.duration_seconds - activity2.duration_seconds);
  if (durationDiff > tolerances.durationToleranceSeconds) {
    return false;
  }

  // Check distance if both have it
  if (activity1.distance_meters && activity2.distance_meters) {
    const distanceDiff = Math.abs(activity1.distance_meters - activity2.distance_meters);
    if (distanceDiff > tolerances.distanceToleranceMeters) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate data completeness score for an activity
 * Higher score means more complete data
 */
export function calculateDataCompleteness(activity: ActivityForDeduplication): number {
  let score = 0;

  // Time series data (most valuable)
  if (activity.power_time_series) score += 30;
  if (activity.heart_rate_time_series) score += 20;
  if (activity.gps_data) score += 25;
  if (activity.cadence_time_series) score += 10;
  if (activity.speed_time_series) score += 5;
  if (activity.altitude_time_series) score += 5;
  if (activity.temperature_time_series) score += 2;
  if (activity.distance_time_series) score += 3;

  return score;
}

/**
 * Find and remove duplicate activities from the database
 * Keeps the version with the most complete data
 */
export async function findAndRemoveDuplicates(
  supabase: any,
  newActivity: ActivityForDeduplication,
  userId: string,
  tolerances: DeduplicationTolerances = DEFAULT_TOLERANCES
): Promise<{ duplicatesRemoved: number; keptActivityId: string }> {
  console.log(`Checking for duplicates of activity ${newActivity.id}...`);

  // Build time window for query
  const activityDate = new Date(newActivity.date);
  const startWindow = new Date(activityDate.getTime() - tolerances.timeWindowMinutes * 60 * 1000);
  const endWindow = new Date(activityDate.getTime() + tolerances.timeWindowMinutes * 60 * 1000);

  // Query for potential duplicates
  const { data: potentialDuplicates, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_mode', newActivity.sport_mode)
    .gte('date', startWindow.toISOString())
    .lte('date', endWindow.toISOString())
    .neq('id', newActivity.id);

  if (error) {
    console.error('Error querying for duplicates:', error);
    return { duplicatesRemoved: 0, keptActivityId: newActivity.id };
  }

  if (!potentialDuplicates || potentialDuplicates.length === 0) {
    console.log('No potential duplicates found');
    return { duplicatesRemoved: 0, keptActivityId: newActivity.id };
  }

  // Filter to actual duplicates
  const actualDuplicates = potentialDuplicates.filter(activity =>
    areActivitiesDuplicates(newActivity, activity, tolerances)
  );

  if (actualDuplicates.length === 0) {
    console.log('No actual duplicates found after filtering');
    return { duplicatesRemoved: 0, keptActivityId: newActivity.id };
  }

  console.log(`Found ${actualDuplicates.length} duplicate(s) for activity ${newActivity.id}`);

  // Include the new activity in the comparison
  const allVersions = [newActivity, ...actualDuplicates];

  // Sort by data completeness (highest first), then by external source preference, then by creation time
  const sorted = allVersions.sort((a, b) => {
    const aScore = calculateDataCompleteness(a);
    const bScore = calculateDataCompleteness(b);
    
    if (aScore !== bScore) {
      return bScore - aScore; // Higher score first
    }

    // Prefer external sync sources
    const aIsExternal = a.external_sync_source !== null;
    const bIsExternal = b.external_sync_source !== null;
    if (aIsExternal && !bIsExternal) return -1;
    if (!aIsExternal && bIsExternal) return 1;

    // Most recent first
    const aCreatedTime = new Date(a.created_at).getTime();
    const bCreatedTime = new Date(b.created_at).getTime();
    return bCreatedTime - aCreatedTime;
  });

  const bestVersion = sorted[0];
  const versionsToDelete = sorted.slice(1);

  console.log(`Best version: ${bestVersion.id} (score: ${calculateDataCompleteness(bestVersion)}, source: ${bestVersion.external_sync_source || 'manual'})`);

  // Delete inferior versions
  const idsToDelete = versionsToDelete.map(v => v.id);
  
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Error deleting duplicate activities:', deleteError);
      return { duplicatesRemoved: 0, keptActivityId: bestVersion.id };
    }

    console.log(`✅ Deleted ${idsToDelete.length} duplicate(s), kept ${bestVersion.id}`);
    
    // Log details of what was deleted
    versionsToDelete.forEach(v => {
      console.log(`  - Deleted ${v.id} (score: ${calculateDataCompleteness(v)}, source: ${v.external_sync_source || 'manual'})`);
    });
  }

  return { 
    duplicatesRemoved: idsToDelete.length,
    keptActivityId: bestVersion.id 
  };
}
