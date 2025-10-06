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
export function extractPowerProfileFromActivity(activityData: any, sportMode: string): Array<{ durationSeconds: number; value: number }> {
  const isRunning = sportMode === 'running';
  const powerProfile: Array<{ durationSeconds: number; value: number }> = [];

  console.log('🔍 extractPowerProfileFromActivity START', {
    sportMode,
    hasPowerTimeSeries: !!activityData.power_time_series,
    powerTimeSeriesIsArray: Array.isArray(activityData.power_time_series),
    powerTimeSeriesLength: activityData.power_time_series?.length,
    hasSpeedTimeSeries: !!activityData.speed_time_series,
    speedTimeSeriesIsArray: Array.isArray(activityData.speed_time_series),
    hasGpsData: !!activityData.gps_data?.trackPoints
  });

  // Get power/speed data - check multiple possible locations
  let dataArray: number[] = [];
  
  if (!isRunning) {
    // For cycling/power sports - check power_time_series first, then gps_data
    if (activityData.power_time_series && Array.isArray(activityData.power_time_series)) {
      dataArray = activityData.power_time_series.filter((p: any) => p !== null && p !== undefined);
      console.log('📊 Using power_time_series', { 
        originalLength: activityData.power_time_series.length,
        filteredLength: dataArray.length,
        nonZeroCount: dataArray.filter(p => p > 0).length,
        firstTenValues: dataArray.slice(0, 10),
        hasZeros: dataArray.some(p => p === 0)
      });
    } else if (activityData.gps_data?.trackPoints) {
      dataArray = activityData.gps_data.trackPoints
        .map((r: any) => unwrapValue(r.power))
        .filter((p: any) => p !== null && p !== undefined);
      console.log('📊 Using gps_data.trackPoints for power', { filteredLength: dataArray.length });
    }
  } else {
    // For running - get speed data to calculate pace
    if (activityData.speed_time_series && Array.isArray(activityData.speed_time_series)) {
      dataArray = activityData.speed_time_series.filter((s: any) => s !== null && s !== undefined);
      console.log('📊 Using speed_time_series', { 
        originalLength: activityData.speed_time_series.length,
        filteredLength: dataArray.length,
        nonZeroCount: dataArray.filter(s => s > 0).length,
        firstTenValues: dataArray.slice(0, 10)
      });
    } else if (activityData.gps_data?.trackPoints) {
      dataArray = activityData.gps_data.trackPoints
        .map((r: any) => unwrapValue(r.speed))
        .filter((s: any) => s !== null && s !== undefined);
      console.log('📊 Using gps_data.trackPoints for speed', { filteredLength: dataArray.length });
    }
  }

  if (dataArray.length === 0) {
    console.log(`❌ No ${isRunning ? 'speed' : 'power'} data found for activity`);
    return [];
  }

  console.log(`✅ Found ${dataArray.length} ${isRunning ? 'speed' : 'power'} data points`);

  // Helper to calculate rolling maximum average
  const calculateMaxAvg = (data: number[], duration: number): number | null => {
    if (data.length < duration) return null;
    
    let maxAvg = 0;
    for (let i = 0; i <= data.length - duration; i++) {
      const window = data.slice(i, i + duration);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      maxAvg = Math.max(maxAvg, avg);
    }
    
    return maxAvg > 0 ? maxAvg : null;
  };

  // Convert speed to pace for running (min/km)
  const convertToPace = (speedMps: number): number => {
    if (speedMps <= 0) return 0;
    return 1000 / (speedMps * 60); // Convert m/s to min/km
  };

  // Calculate mean max for every second up to 60s
  for (let duration = 1; duration <= 60; duration++) {
    const avgValue = calculateMaxAvg(dataArray, duration);
    if (avgValue !== null && avgValue > 0) {
      const value = isRunning ? convertToPace(avgValue) : avgValue;
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 5 seconds from 65s to 300s (5 minutes)
  for (let duration = 65; duration <= 300; duration += 5) {
    const avgValue = calculateMaxAvg(dataArray, duration);
    if (avgValue !== null && avgValue > 0) {
      const value = isRunning ? convertToPace(avgValue) : avgValue;
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 30 seconds from 330s to 1200s (20 minutes)
  for (let duration = 330; duration <= 1200; duration += 30) {
    const avgValue = calculateMaxAvg(dataArray, duration);
    if (avgValue !== null && avgValue > 0) {
      const value = isRunning ? convertToPace(avgValue) : avgValue;
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 60 seconds from 1260s to 3600s (1 hour)
  for (let duration = 1260; duration <= 3600; duration += 60) {
    const avgValue = calculateMaxAvg(dataArray, duration);
    if (avgValue !== null && avgValue > 0) {
      const value = isRunning ? convertToPace(avgValue) : avgValue;
      powerProfile.push({ durationSeconds: duration, value });
    }
  }

  // Then every 5 minutes beyond 1 hour if activity is that long
  const maxDuration = dataArray.length;
  if (maxDuration > 3600) {
    for (let duration = 3900; duration <= maxDuration; duration += 300) {
      const avgValue = calculateMaxAvg(dataArray, duration);
      if (avgValue !== null && avgValue > 0) {
        const value = isRunning ? convertToPace(avgValue) : avgValue;
        powerProfile.push({ durationSeconds: duration, value });
      }
    }
  }

  console.log('📈 Power profile extraction COMPLETE', {
    totalEntries: powerProfile.length,
    firstDuration: powerProfile[0]?.durationSeconds,
    lastDuration: powerProfile[powerProfile.length-1]?.durationSeconds,
    sampleValues: powerProfile.slice(0, 5).map(p => ({ dur: p.durationSeconds, val: p.value }))
  });
  
  return powerProfile;
}

// Populate power profile data for an activity
export async function populatePowerProfileForActivity(
  userId: string,
  activityId: string,
  activityData: any,
  sportMode: string,
  activityDate: string
): Promise<void> {
  console.log('🚀 populatePowerProfileForActivity START', { activityId, sportMode });
  
  const powerProfile = extractPowerProfileFromActivity(activityData, sportMode);
  const isRunning = sportMode === 'running';

  if (powerProfile.length === 0) {
    console.log(`⚠️ No power profile data extracted for activity ${activityId}`);
    console.log('Activity data keys:', Object.keys(activityData));
    console.log('Has power_time_series:', !!activityData.power_time_series, 
                'Length:', activityData.power_time_series?.length,
                'IsArray:', Array.isArray(activityData.power_time_series));
    console.log('Has speed_time_series:', !!activityData.speed_time_series,
                'Length:', activityData.speed_time_series?.length,
                'IsArray:', Array.isArray(activityData.speed_time_series));
    if (activityData.power_time_series && activityData.power_time_series.length > 0) {
      console.log('Sample power values:', activityData.power_time_series.slice(0, 20));
    }
    return;
  }
  
  console.log(`✅ Extracted ${powerProfile.length} entries for activity ${activityId}`);

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

  console.log(`💾 Attempting to insert ${insertData.length} records...`);
  
  const { error: insertError } = await supabase
    .from('power_profile')
    .insert(insertData);

  if (insertError) {
    console.error(`❌ Error inserting power profile for activity ${activityId}:`, insertError);
    console.error('Failed insert data sample:', insertData.slice(0, 2));
  } else {
    console.log(`✅ Successfully inserted ${recordsToInsert.length} power profile records for activity ${activityId}`);
  }
}

// Backfill power profile data for existing activities
export async function backfillPowerProfileData(
  userId: string,
  onProgress?: (current: number, total: number, activityName: string) => void
): Promise<void> {
  console.log('🚀 Starting power profile backfill for user:', userId);
  
  // Get all activities - not requiring GPS data since power_time_series is independent
  const { data: activities, error } = await supabase
    .from('activities')
    .select('id, gps_data, power_time_series, speed_time_series, sport_mode, date, name, duration_seconds')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  
  console.log('📦 Query result:', { activitiesCount: activities?.length, error });

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
    
    // Skip activities without any data
    if (!activity.power_time_series && !activity.speed_time_series && !activity.gps_data) {
      console.log(`⏭️ Skipping ${activity.name} - no power/speed data`);
      continue;
    }
    
    try {
      console.log(`🔄 [${i + 1}/${totalActivities}] Processing: ${activity.name}`);
      const powerPoints = Array.isArray(activity.power_time_series) ? activity.power_time_series.length : 0;
      console.log(`   Power points: ${powerPoints}`);
      
      // Pass the full activity object with power_time_series
      await populatePowerProfileForActivity(
        userId,
        activity.id,
        activity, // Pass full activity object, not just gps_data
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