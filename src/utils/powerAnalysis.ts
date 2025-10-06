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
  console.log('🚀 populatePowerProfileForActivity START', { 
    activityId, 
    sportMode,
    hasPowerTimeSeries: !!activityData.power_time_series,
    powerLength: Array.isArray(activityData.power_time_series) ? activityData.power_time_series.length : 0
  });
  
  const powerProfile = extractPowerProfileFromActivity(activityData, sportMode);
  const isRunning = sportMode === 'running';

  if (powerProfile.length === 0) {
    console.log(`⚠️ No power profile data extracted for activity ${activityId}`);
    console.log('Activity data keys:', Object.keys(activityData));
    console.log('Has power_time_series:', !!activityData.power_time_series, 
                'Length:', Array.isArray(activityData.power_time_series) ? activityData.power_time_series.length : 'N/A',
                'Type:', typeof activityData.power_time_series);
    console.log('Has speed_time_series:', !!activityData.speed_time_series,
                'Length:', Array.isArray(activityData.speed_time_series) ? activityData.speed_time_series.length : 'N/A');
    if (activityData.power_time_series && Array.isArray(activityData.power_time_series) && activityData.power_time_series.length > 0) {
      console.log('Sample power values:', activityData.power_time_series.slice(0, 20));
      console.log('Sample power values (end):', activityData.power_time_series.slice(-20));
    }
    return;
  }
  
  console.log(`✅ Extracted ${powerProfile.length} entries for activity ${activityId}`, {
    maxDuration: Math.max(...powerProfile.map(p => p.durationSeconds)),
    minDuration: Math.min(...powerProfile.map(p => p.durationSeconds))
  });

  // Calculate 90-day cutoff date
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffDate = ninetyDaysAgo.toISOString();
  const isWithin90Days = new Date(activityDate) >= ninetyDaysAgo;

  // Fetch existing records for BOTH time windows in ONE query
  const { data: existingRecords, error: fetchError } = await supabase
    .from('power_profile')
    .select('duration_seconds, power_watts, pace_per_km, time_window')
    .eq('user_id', userId)
    .eq('sport', sportMode);

  if (fetchError) {
    console.error('Error fetching existing power profile:', fetchError);
    return;
  }

  // Build maps for both time windows: duration -> best existing value
  const allTimeMap = new Map<number, number>();
  const ninetyDayMap = new Map<number, number>();
  
  existingRecords?.forEach(record => {
    const value = isRunning ? record.pace_per_km : record.power_watts;
    if (!value) return;
    
    const targetMap = record.time_window === '90-day' ? ninetyDayMap : allTimeMap;
    const existing = targetMap.get(record.duration_seconds);
    
    if (!existing || (isRunning ? value < existing : value > existing)) {
      targetMap.set(record.duration_seconds, value);
    }
  });

  // Helper to check if new value is better
  const isNewBetter = (newValue: number, existingValue: number | undefined): boolean => {
    if (!existingValue) return true;
    return isRunning ? newValue < existingValue : newValue > existingValue;
  };

  // Prepare records for insertion/update
  const recordsToInsert: any[] = [];

  powerProfile.forEach(profile => {
    const baseData = {
      user_id: userId,
      activity_id: activityId,
      duration_seconds: profile.durationSeconds,
      sport: sportMode,
      date_achieved: activityDate,
      ...(isRunning 
        ? { pace_per_km: profile.value } 
        : { power_watts: profile.value }
      )
    };

    // Check if this is a new all-time best
    const allTimeBest = allTimeMap.get(profile.durationSeconds);
    if (isNewBetter(profile.value, allTimeBest)) {
      recordsToInsert.push({
        ...baseData,
        time_window: 'all-time'
      });
    }

    // Check if this is a new 90-day best (only if activity is within 90 days)
    if (isWithin90Days) {
      const ninetyDayBest = ninetyDayMap.get(profile.durationSeconds);
      if (isNewBetter(profile.value, ninetyDayBest)) {
        recordsToInsert.push({
          ...baseData,
          time_window: '90-day'
        });
      }
    }
  });

  if (recordsToInsert.length === 0) {
    console.log(`No new best efforts found for activity ${activityId}`);
    return;
  }

  console.log(`💾 Attempting to upsert ${recordsToInsert.length} records (all-time + 90-day)...`);
  
  const { error: insertError } = await supabase
    .from('power_profile')
    .upsert(recordsToInsert, {
      onConflict: 'user_id,duration_seconds,sport,time_window',
      ignoreDuplicates: false // Update existing records with new values
    });

  if (insertError) {
    console.error(`❌ Error inserting power profile for activity ${activityId}:`, insertError);
    console.error('Failed insert data sample:', recordsToInsert.slice(0, 2));
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
  
  const BATCH_SIZE = 10; // Process 10 activities at a time to avoid performance issues
  let offset = 0;
  let successCount = 0;
  let errorCount = 0;
  let totalProcessed = 0;

  console.log(`📅 Processing ALL activities for dual time-window power profile (all-time + 90-day)`);

  // First, get the total count (ALL activities)
  const { count: totalCount, error: countError } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    console.error('❌ Error counting activities:', countError);
    throw countError;
  }

  const totalActivities = totalCount || 0;
  console.log(`📊 Found ${totalActivities} total activities to process`);

  if (totalActivities === 0) {
    console.log('ℹ️ No activities found for backfill');
    return;
  }

  // Process in batches to avoid timeout
  while (totalProcessed < totalActivities) {
    console.log(`📦 Fetching batch: offset ${offset}, limit ${BATCH_SIZE}`);
    
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, gps_data, power_time_series, speed_time_series, sport_mode, date, name, duration_seconds')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('❌ Error fetching activities batch:', error);
      throw error;
    }

    if (!activities || activities.length === 0) {
      break;
    }

    console.log(`🔄 Processing batch of ${activities.length} activities`);

    // Process each activity in this batch
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      
      // Skip activities without any data - properly check for empty arrays
      const hasPowerData = Array.isArray(activity.power_time_series) && activity.power_time_series.length > 0;
      const hasSpeedData = Array.isArray(activity.speed_time_series) && activity.speed_time_series.length > 0;
      const hasGpsData = activity.gps_data && 
        typeof activity.gps_data === 'object' && 
        'trackPoints' in activity.gps_data && 
        Array.isArray((activity.gps_data as any).trackPoints) &&
        (activity.gps_data as any).trackPoints.length > 0;
      
      if (!hasPowerData && !hasSpeedData && !hasGpsData) {
        console.log(`⏭️ Skipping ${activity.name} - no power/speed data`);
        totalProcessed++;
        continue;
      }
      
      try {
        console.log(`🔄 [${totalProcessed + 1}/${totalActivities}] Processing: ${activity.name}`);
        const powerPoints = Array.isArray(activity.power_time_series) ? activity.power_time_series.length : 0;
        console.log(`   Power points: ${powerPoints}, Duration: ${activity.duration_seconds}s`);
        
        // Pass the full activity object with power_time_series
        await populatePowerProfileForActivity(
          userId,
          activity.id,
          activity,
          activity.sport_mode,
          activity.date
        );
        
        successCount++;
        
        // Call progress callback
        if (onProgress) {
          onProgress(totalProcessed + 1, totalActivities, activity.name);
        }
      } catch (error) {
        console.error(`❌ Error processing activity ${activity.name}:`, error);
        errorCount++;
      }
      
      totalProcessed++;
      
      // Add small delay between activities to prevent "getting too hot" performance issues
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    offset += BATCH_SIZE;
  }

  console.log(`✅ Power profile backfill completed! Success: ${successCount}, Errors: ${errorCount}, Total: ${totalProcessed}`);
}