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
    
  if (powerData.length === 0) return null;
  
  // For very short durations (1-5 seconds), find the absolute peak
  if (targetDurationSeconds <= 5) {
    return Math.max(...powerData);
  }
  
  // For longer durations, need enough data points
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
    
  if (speedData.length === 0) return null;
  
  // For very short durations (1-5 seconds), find the absolute peak speed
  if (targetDurationSeconds <= 5) {
    const maxSpeed = Math.max(...speedData);
    const kmhSpeed = maxSpeed * 3.6;
    const minPerKm = 60 / kmhSpeed;
    return minPerKm;
  }
  
  // For longer durations, need enough data points
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

// Extract power profile data from activity records
export function extractPowerProfileFromActivity(gpsData: any, sportMode: string): Array<{ durationSeconds: number; value: number }> {
  if (!gpsData || !gpsData.trackPoints) return [];

  const records = gpsData.trackPoints;
  const durations = [
    { seconds: 1, label: '1s' },
    { seconds: 5, label: '5s' },
    { seconds: 10, label: '10s' },
    { seconds: 15, label: '15s' },
    { seconds: 30, label: '30s' },
    { seconds: 60, label: '1min' },
    { seconds: 120, label: '2min' },
    { seconds: 300, label: '5min' },
    { seconds: 600, label: '10min' },
    { seconds: 1200, label: '20min' },
    { seconds: 1800, label: '30min' },
    { seconds: 3600, label: '60min' }
  ];

  const powerProfile: Array<{ durationSeconds: number; value: number }> = [];
  const isRunning = sportMode === 'running';

  durations.forEach(duration => {
    let value: number | null = null;
    
    if (isRunning) {
      value = calculateMeanMaximalPace(records, duration.seconds);
    } else {
      value = calculateMeanMaximalPower(records, duration.seconds);
    }
    
    if (value !== null && value > 0) {
      powerProfile.push({
        durationSeconds: duration.seconds,
        value: value
      });
    }
  });

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

  // Insert power profile entries
  const insertPromises = powerProfile.map(async (profile) => {
    const insertData = {
      user_id: userId,
      duration_seconds: profile.durationSeconds,
      sport: sportMode,
      date_achieved: activityDate,
      ...(isRunning 
        ? { pace_per_km: profile.value } 
        : { power_watts: profile.value }
      )
    };

    // Check if we already have a better value for this duration
    const { data: existing } = await supabase
      .from('power_profile')
      .select('*')
      .eq('user_id', userId)
      .eq('duration_seconds', profile.durationSeconds)
      .eq('sport', sportMode)
      .order(isRunning ? 'pace_per_km' : 'power_watts', { ascending: isRunning })
      .limit(1);

    const shouldInsert = !existing || existing.length === 0 || 
      (isRunning ? profile.value < (existing[0].pace_per_km || Infinity) : 
                   profile.value > (existing[0].power_watts || 0));

    if (shouldInsert) {
      const { error } = await supabase
        .from('power_profile')
        .insert(insertData);

      if (error) {
        console.error('Error inserting power profile entry:', error);
      }
    }
  });

  await Promise.all(insertPromises);
}

// Backfill power profile data for existing activities
export async function backfillPowerProfileData(userId: string): Promise<void> {
  console.log('Starting power profile backfill for user:', userId);
  
  // Get all activities with GPS data that don't have power profile entries yet
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, gps_data, sport_mode, date')
    .eq('user_id', userId)
    .not('gps_data', 'is', null);

  if (error) {
    console.error('Error fetching activities for backfill:', error);
    return;
  }

  if (!activities || activities.length === 0) {
    console.log('No activities with GPS data found for backfill');
    return;
  }

  console.log(`Processing ${activities.length} activities for power profile backfill`);

  // Process each activity
  for (const activity of activities) {
    try {
      await populatePowerProfileForActivity(
        userId,
        activity.id,
        activity.gps_data,
        activity.sport_mode,
        activity.date
      );
      console.log(`Processed power profile for activity ${activity.id}`);
    } catch (error) {
      console.error(`Error processing activity ${activity.id}:`, error);
    }
  }

  console.log('Power profile backfill completed');
}