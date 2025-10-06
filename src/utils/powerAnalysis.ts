import { supabase } from '@/integrations/supabase/client';

// Helper function to unwrap FIT SDK values
const unwrapValue = (obj: any) => {
  if (obj && typeof obj === 'object' && 'value' in obj) {
    return obj.value !== 'undefined' ? obj.value : undefined;
  }
  return obj;
};

// Calculate mean maximal power for different durations
export function calculateMeanMaximalPower(records: any[], targetDurationSeconds: number): number | null {
  if (!records || records.length === 0) return null;

  const powerData = records
    .map(r => unwrapValue(r.power))
    .filter(p => p !== undefined && p !== null && p > 0);
    
  if (powerData.length < targetDurationSeconds) return null;

  let maxAvgPower = 0;
  
  // Calculate rolling average for the target duration
  for (let i = 0; i <= powerData.length - targetDurationSeconds; i++) {
    const window = powerData.slice(i, i + targetDurationSeconds);
    const avgPower = window.reduce((sum, p) => sum + p, 0) / window.length;
    maxAvgPower = Math.max(maxAvgPower, avgPower);
  }
  
  return maxAvgPower > 0 ? maxAvgPower : null;
}

// Calculate mean maximal pace for running activities
export function calculateMeanMaximalPace(records: any[], targetDurationSeconds: number): number | null {
  if (!records || records.length === 0) return null;

  const speedData = records
    .map(r => unwrapValue(r.speed))
    .filter(s => s !== undefined && s !== null && s > 0);
    
  if (speedData.length < targetDurationSeconds) return null;

  let maxAvgSpeed = 0;
  
  // Calculate rolling average for the target duration
  for (let i = 0; i <= speedData.length - targetDurationSeconds; i++) {
    const window = speedData.slice(i, i + targetDurationSeconds);
    const avgSpeed = window.reduce((sum, s) => sum + s, 0) / window.length;
    maxAvgSpeed = Math.max(maxAvgSpeed, avgSpeed);
  }
  
  if (maxAvgSpeed <= 0) return null;
  
  // Convert m/s to min/km
  const kmhSpeed = maxAvgSpeed * 3.6;
  const minPerKm = 60 / kmhSpeed;
  
  return minPerKm;
}

// Extract power profile data from activity records - WKO5 style (all durations)
export function extractPowerProfileFromActivity(gpsData: any, sportMode: string): Array<{ durationSeconds: number; value: number }> {
  if (!gpsData || !gpsData.trackPoints) return [];

  const records = gpsData.trackPoints;
  const isRunning = sportMode === 'running';
  const powerProfile: Array<{ durationSeconds: number; value: number }> = [];

  // Calculate mean max for every second up to 60s
  for (let duration = 1; duration <= 60; duration++) {
    let value: number | null = null;
    
    if (isRunning) {
      value = calculateMeanMaximalPace(records, duration);
    } else {
      value = calculateMeanMaximalPower(records, duration);
    }
    
    if (value !== null && value > 0) {
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 5 seconds from 65s to 300s (5 minutes)
  for (let duration = 65; duration <= 300; duration += 5) {
    let value: number | null = null;
    
    if (isRunning) {
      value = calculateMeanMaximalPace(records, duration);
    } else {
      value = calculateMeanMaximalPower(records, duration);
    }
    
    if (value !== null && value > 0) {
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 30 seconds from 330s to 1200s (20 minutes)
  for (let duration = 330; duration <= 1200; duration += 30) {
    let value: number | null = null;
    
    if (isRunning) {
      value = calculateMeanMaximalPace(records, duration);
    } else {
      value = calculateMeanMaximalPower(records, duration);
    }
    
    if (value !== null && value > 0) {
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 60 seconds from 1260s to 3600s (1 hour)
  for (let duration = 1260; duration <= 3600; duration += 60) {
    let value: number | null = null;
    
    if (isRunning) {
      value = calculateMeanMaximalPace(records, duration);
    } else {
      value = calculateMeanMaximalPower(records, duration);
    }
    
    if (value !== null && value > 0) {
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 5 minutes beyond 1 hour if activity is that long
  const maxDuration = records.length;
  if (maxDuration > 3600) {
    for (let duration = 3900; duration <= maxDuration; duration += 300) {
      let value: number | null = null;
      
      if (isRunning) {
        value = calculateMeanMaximalPace(records, duration);
      } else {
        value = calculateMeanMaximalPower(records, duration);
      }
      
      if (value !== null && value > 0) {
        powerProfile.push({ durationSeconds: duration, value });
      }
    }
  }

  return powerProfile;
}

// Populate power profile data for an activity
export async function populatePowerProfileForActivity(
  userId: string,
  activityId: string,
  gpsData: any,
  sportMode: string,
  activityDate: string
): Promise<void> {
  if (!gpsData || !gpsData.trackPoints) return;

  const powerProfile = extractPowerProfileFromActivity(gpsData, sportMode);
  const isRunning = sportMode === 'running';

  if (powerProfile.length === 0) {
    console.log(`No power profile data extracted for activity ${activityId}`);
    return;
  }

  // Fetch ALL existing power profile records for this user/sport in ONE query
  const { data: existingRecords, error: fetchError } = await supabase
    .from('power_profile')
    .select('duration_seconds, power_watts, pace_per_km')
    .eq('user_id', userId)
    .eq('sport', sportMode);

  if (fetchError) {
    console.error('Error fetching existing power profile:', fetchError);
    return;
  }

  // Build a map of duration -> best existing value
  const existingMap = new Map<number, number>();
  existingRecords?.forEach(record => {
    const value = isRunning ? record.pace_per_km : record.power_watts;
    if (value) {
      const existing = existingMap.get(record.duration_seconds);
      if (!existing || (isRunning ? value < existing : value > existing)) {
        existingMap.set(record.duration_seconds, value);
      }
    }
  });

  // Filter to only records that are better than existing
  const recordsToInsert = powerProfile.filter(profile => {
    const existing = existingMap.get(profile.durationSeconds);
    return !existing || (isRunning ? profile.value < existing : profile.value > existing);
  });

  if (recordsToInsert.length === 0) {
    console.log(`No new best efforts found for activity ${activityId}`);
    return;
  }

  // Batch insert all records at once
  const insertData = recordsToInsert.map(profile => ({
    user_id: userId,
    activity_id: activityId,
    duration_seconds: profile.durationSeconds,
    sport: sportMode,
    date_achieved: activityDate,
    ...(isRunning 
      ? { pace_per_km: profile.value } 
      : { power_watts: profile.value }
    )
  }));

  const { error: insertError } = await supabase
    .from('power_profile')
    .insert(insertData);

  if (insertError) {
    console.error(`Error inserting power profile for activity ${activityId}:`, insertError);
  } else {
    console.log(`Inserted ${recordsToInsert.length} power profile records for activity ${activityId}`);
  }
}

// Backfill power profile data for existing activities
export async function backfillPowerProfileData(
  userId: string,
  onProgress?: (current: number, total: number, activityName: string) => void
): Promise<void> {
  console.log('🚀 Starting power profile backfill for user:', userId);
  
  // Get all activities with GPS data
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, gps_data, sport_mode, date, name')
    .eq('user_id', userId)
    .not('gps_data', 'is', null)
    .order('date', { ascending: false });

  if (error) {
    console.error('❌ Error fetching activities for backfill:', error);
    throw error;
  }

  if (!activities || activities.length === 0) {
    console.log('ℹ️ No activities with GPS data found for backfill');
    return;
  }

  const totalActivities = activities.length;
  console.log(`📊 Processing ${totalActivities} activities for power profile backfill`);

  let successCount = 0;
  let errorCount = 0;

  // Process each activity
  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    try {
      console.log(`🔄 Processing: ${activity.name} (${i + 1}/${totalActivities})`);
      
      await populatePowerProfileForActivity(
        userId,
        activity.id,
        activity.gps_data,
        activity.sport_mode,
        activity.date
      );
      
      successCount++;
      
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, totalActivities, activity.name);
      }
    } catch (error) {
      console.error(`❌ Error processing activity ${activity.name}:`, error);
      errorCount++;
    }
  }

  console.log(`✅ Power profile backfill completed! Success: ${successCount}, Errors: ${errorCount}`);
}