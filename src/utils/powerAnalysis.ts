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
        filteredLength: dataArray.length,
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
    console.log('⚠️ No power/speed data found in activity');
    return powerProfile;
  }

  console.log(`📊 Analyzing ${dataArray.length} data points for ${sportMode}`);

  // Define duration ranges to analyze (WKO5 style - comprehensive)
  const durations = [
    // Sub-minute: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 30, 40, 50 seconds
    ...Array.from({ length: 10 }, (_, i) => i + 1),
    12, 15, 20, 30, 40, 50,
    // 1-5 minutes: every 5 seconds
    ...Array.from({ length: 49 }, (_, i) => 60 + (i * 5)),
    // 5-20 minutes: every 30 seconds
    ...Array.from({ length: 31 }, (_, i) => 300 + (i * 30)),
    // 20-60 minutes: every 1 minute
    ...Array.from({ length: 41 }, (_, i) => 1200 + (i * 60)),
    // 1-3 hours: every 5 minutes
    ...Array.from({ length: 25 }, (_, i) => 3600 + (i * 300)),
  ];

  console.log('🎯 Analyzing durations:', { 
    count: durations.length,
    shortest: durations[0],
    longest: durations[durations.length - 1],
    samples: durations.slice(0, 10)
  });

  // Calculate mean maximal value for each duration
  for (const duration of durations) {
    if (duration > dataArray.length) {
      console.log(`⏩ Skipping duration ${duration}s (exceeds data length ${dataArray.length})`);
      continue;
    }

    let maxValue = 0;
    
    // Calculate rolling average for this duration
    for (let i = 0; i <= dataArray.length - duration; i++) {
      const window = dataArray.slice(i, i + duration);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      maxValue = Math.max(maxValue, avg);
    }

    if (maxValue > 0) {
      // For running, convert m/s to min/km
      if (isRunning) {
        const kmhSpeed = maxValue * 3.6;
        const minPerKm = 60 / kmhSpeed;
        powerProfile.push({ durationSeconds: duration, value: minPerKm });
      } else {
        powerProfile.push({ durationSeconds: duration, value: maxValue });
      }
    }
  }

  console.log('✅ extractPowerProfileFromActivity COMPLETE', {
    dataPointsFound: powerProfile.length,
    firstFive: powerProfile.slice(0, 5),
    lastFive: powerProfile.slice(-5)
  });

  return powerProfile;
}


// ============================================================================
// POPULATE POWER PROFILE FOR SINGLE ACTIVITY
// ============================================================================
export async function populatePowerProfileForActivity(
  userId: string,
  activityId: string,
  activityData: any,
  sportMode: string,
  activityDate: string
): Promise<void> {
  console.log('🚀 Starting populatePowerProfileForActivity', {
    userId,
    activityId,
    sportMode,
    activityDate
  });

  // Extract the power/pace profile from this activity
  const profileData = extractPowerProfileFromActivity(activityData, sportMode);

  if (profileData.length === 0) {
    console.log('⚠️ No power profile data extracted, skipping population');
    return;
  }

  console.log(`📊 Extracted ${profileData.length} power profile data points`);

  // Fetch existing power profile data for this user and sport
  const { data: existingData, error: fetchError } = await supabase
    .from('power_profile')
    .select('duration_seconds, power_watts, pace_per_km, time_window, date_achieved')
    .eq('user_id', userId)
    .eq('sport', sportMode);

  if (fetchError) {
    console.error('Error fetching existing power profile:', fetchError);
    return;
  }

  console.log(`📥 Fetched ${existingData?.length || 0} existing power profile records`);

  // Build a map of existing best values for each duration and time window
  const existingBests = new Map<string, { value: number; date: Date }>();
  existingData?.forEach(record => {
    const key = `${record.duration_seconds}-${record.time_window}`;
    const value = sportMode === 'running' ? record.pace_per_km : record.power_watts;
    if (value) {
      existingBests.set(key, {
        value,
        date: new Date(record.date_achieved)
      });
    }
  });

  // Prepare records to upsert
  const recordsToUpsert: any[] = [];
  const activityDateObj = new Date(activityDate);

  // Define rolling time windows in days (7, 14, 30, 90, 365)
  const timeWindows = [
    { name: '7-day', days: 7 },
    { name: '14-day', days: 14 },
    { name: '30-day', days: 30 },
    { name: '90-day', days: 90 },
    { name: '365-day', days: 365 }
  ];

  // Check each duration in the extracted profile
  for (const { durationSeconds, value } of profileData) {
    // 1. Check/update all-time best
    const allTimeKey = `${durationSeconds}-all-time`;
    const existingAllTime = existingBests.get(allTimeKey);
    
    const isNewAllTimeBest = !existingAllTime || 
      (sportMode === 'running' ? value < existingAllTime.value : value > existingAllTime.value);

    if (isNewAllTimeBest) {
      recordsToUpsert.push({
        user_id: userId,
        sport: sportMode,
        duration_seconds: durationSeconds,
        time_window: 'all-time',
        [sportMode === 'running' ? 'pace_per_km' : 'power_watts']: value,
        date_achieved: activityDate,
        activity_id: activityId
      });
    }

    // 2. Check/update rolling window bests
    for (const window of timeWindows) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - window.days);
      
      // Check if this activity is within the rolling window
      const isWithinWindow = activityDateObj >= cutoffDate;
      
      if (isWithinWindow) {
        const windowKey = `${durationSeconds}-${window.name}`;
        const existingWindow = existingBests.get(windowKey);
        
        const isNewWindowBest = !existingWindow || 
          (sportMode === 'running' ? value < existingWindow.value : value > existingWindow.value);

        if (isNewWindowBest) {
          recordsToUpsert.push({
            user_id: userId,
            sport: sportMode,
            duration_seconds: durationSeconds,
            time_window: window.name,
            [sportMode === 'running' ? 'pace_per_km' : 'power_watts']: value,
            date_achieved: activityDate,
            activity_id: activityId
          });
        }
      }
    }
  }

  console.log(`💾 Upserting ${recordsToUpsert.length} power profile records`);

  if (recordsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('power_profile')
      .upsert(recordsToUpsert, {
        onConflict: 'user_id,sport,duration_seconds,time_window',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Error upserting power profile:', upsertError);
    } else {
      console.log('✅ Power profile data upserted successfully');
    }
  }
}


// ============================================================================
// BACKFILL POWER PROFILE FOR ALL ACTIVITIES (LEGACY)
// ============================================================================
export async function backfillPowerProfileData(
  userId: string,
  onProgress?: (current: number, total: number, activityName: string) => void
): Promise<void> {
  console.log('🎯 Starting power profile backfill for user:', userId);

  try {
    // Fetch all activities with power or speed data
    const { data: activities, error } = await supabase
      .from('activities')
      .select('id, name, sport_mode, date, power_time_series, speed_time_series, gps_data')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching activities for backfill:', error);
      throw error;
    }

    if (!activities || activities.length === 0) {
      console.log('No activities found for backfill');
      return;
    }

    console.log(`📊 Found ${activities.length} activities to process`);

    // Process in batches of 10 to avoid overwhelming the database
    const BATCH_SIZE = 10;
    const batches = Math.ceil(activities.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, activities.length);
      const batch = activities.slice(startIdx, endIdx);

      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches} (${batch.length} activities)`);

      // Process activities in parallel within each batch
      await Promise.all(
        batch.map(async (activity, idx) => {
          const globalIdx = startIdx + idx;
          
          try {
            onProgress?.(globalIdx + 1, activities.length, activity.name);

            // Check if activity has any power/speed data
            const hasData = activity.power_time_series || 
                          activity.speed_time_series || 
                          activity.gps_data;

            if (!hasData) {
              console.log(`⏩ Skipping activity ${activity.id} (no power/speed data)`);
              return;
            }

            await populatePowerProfileForActivity(
              userId,
              activity.id,
              activity,
              activity.sport_mode,
              activity.date
            );
          } catch (activityError) {
            console.error(`❌ Error processing activity ${activity.id}:`, activityError);
          }
        })
      );

      // Small delay between batches to be gentle on the database
      if (batchIndex < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('✅ Power profile backfill completed successfully');
  } catch (error) {
    console.error('❌ Error in backfillPowerProfileData:', error);
    throw error;
  }
}


// ============================================================================
// BACKFILL ROLLING WINDOW POWER PROFILE (NEW AGGREGATED APPROACH)
// ============================================================================
export async function backfillRollingWindowPowerProfile(
  userId: string,
  sportMode: string,
  onProgress?: (windowName: string, current: number, total: number) => void
): Promise<void> {
  console.log('🎯 Starting rolling window power profile backfill', { userId, sportMode });

  const timeWindows = [
    { name: '7-day', days: 7 },
    { name: '14-day', days: 14 },
    { name: '30-day', days: 30 },
    { name: '90-day', days: 90 },
    { name: '365-day', days: 365 }
  ];

  const results: Array<{ window: string; success: boolean; activities: number; records: number; error?: string }> = [];

  try {
    for (let windowIdx = 0; windowIdx < timeWindows.length; windowIdx++) {
      const window = timeWindows[windowIdx];
      console.log(`\n🔄 Processing ${window.name} window (${windowIdx + 1}/${timeWindows.length})...`);
      onProgress?.(window.name, windowIdx, timeWindows.length);

      try {
        // Calculate date range for this window
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - window.days);

        console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // Fetch activities in batches for large windows (365-day) to avoid timeout
        let activities: any[] = [];
        const fetchBatchSize = window.days > 90 ? 50 : 100; // Smaller batches for large windows
        let currentBatch = 0;
        let hasMore = true;

        while (hasMore) {
          const { data: batchData, error } = await supabase
            .from('activities')
            .select('id, name, date, sport_mode, power_time_series, speed_time_series, gps_data')
            .eq('user_id', userId)
            .eq('sport_mode', sportMode)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .order('date', { ascending: false })
            .range(currentBatch * fetchBatchSize, (currentBatch + 1) * fetchBatchSize - 1);

          if (error) {
            console.error(`❌ Error fetching batch ${currentBatch} for ${window.name}:`, error);
            throw error;
          }

          if (batchData && batchData.length > 0) {
            activities = activities.concat(batchData);
            currentBatch++;
            hasMore = batchData.length === fetchBatchSize;
            console.log(`  📦 Fetched batch ${currentBatch}: ${batchData.length} activities (total: ${activities.length})`);
          } else {
            hasMore = false;
          }
        }

        if (!activities || activities.length === 0) {
          console.log(`⚠️ No activities found in ${window.name} window - skipping`);
          results.push({ window: window.name, success: true, activities: 0, records: 0 });
          continue;
        }

        console.log(`📊 Found ${activities.length} total activities in ${window.name} window`);

        // Map to store best values for each duration: duration -> { value, activityId, date }
        const bestsByDuration = new Map<number, { value: number; activityId: string; date: string }>();
        let activitiesWithData = 0;

        // Extract power profiles from all activities and aggregate
        for (const activity of activities) {
          const hasData = activity.power_time_series || 
                         activity.speed_time_series || 
                         activity.gps_data;

          if (!hasData) continue;
          activitiesWithData++;

          const profileData = extractPowerProfileFromActivity(activity, sportMode);

          for (const { durationSeconds, value } of profileData) {
            const existing = bestsByDuration.get(durationSeconds);
            
            const isBetter = !existing || 
              (sportMode === 'running' ? value < existing.value : value > existing.value);

            if (isBetter) {
              bestsByDuration.set(durationSeconds, {
                value,
                activityId: activity.id,
                date: activity.date
              });
            }
          }
        }

        console.log(`✨ Aggregated ${bestsByDuration.size} unique durations from ${activitiesWithData} activities with power/pace data`);

        if (bestsByDuration.size === 0) {
          console.log(`⚠️ No power/pace data found in ${window.name} activities - skipping`);
          results.push({ window: window.name, success: true, activities: activities.length, records: 0 });
          continue;
        }

        // Prepare records to upsert
        const recordsToUpsert = Array.from(bestsByDuration.entries()).map(([duration, best]) => ({
          user_id: userId,
          sport: sportMode,
          duration_seconds: duration,
          time_window: window.name,
          [sportMode === 'running' ? 'pace_per_km' : 'power_watts']: best.value,
          date_achieved: best.date,
          activity_id: best.activityId
        }));

        console.log(`💾 Upserting ${recordsToUpsert.length} records for ${window.name}`);

        // Batch upsert to avoid timeouts on large datasets
        const upsertBatchSize = window.days > 90 ? 30 : 50; // Smaller batches for 365-day
        let totalUpserted = 0;
        
        for (let i = 0; i < recordsToUpsert.length; i += upsertBatchSize) {
          const batch = recordsToUpsert.slice(i, i + upsertBatchSize);
          
          const { error: upsertError } = await supabase
            .from('power_profile')
            .upsert(batch, {
              onConflict: 'user_id,duration_seconds,sport,time_window'
            });

          if (upsertError) {
            console.error(`❌ Error upserting batch ${Math.floor(i / upsertBatchSize) + 1} for ${window.name}:`, upsertError);
            throw upsertError;
          }
          
          totalUpserted += batch.length;
          console.log(`  ✅ Batch ${Math.floor(i / upsertBatchSize) + 1}/${Math.ceil(recordsToUpsert.length / upsertBatchSize)} upserted (${batch.length} records, ${totalUpserted} total)`);
        }
        
        console.log(`✅ ${window.name} complete: ${activities.length} activities, ${totalUpserted} records upserted`);
        results.push({ window: window.name, success: true, activities: activities.length, records: totalUpserted });

      } catch (windowError) {
        console.error(`❌ Error processing ${window.name} window:`, windowError);
        results.push({ 
          window: window.name, 
          success: false, 
          activities: 0, 
          records: 0, 
          error: windowError instanceof Error ? windowError.message : 'Unknown error'
        });
        // Continue with next window instead of failing completely
      }
    }

    console.log('\n📈 Rolling Window Backfill Summary:');
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      const details = r.success 
        ? `${r.activities} activities → ${r.records} records`
        : `Failed: ${r.error}`;
      console.log(`  ${status} ${r.window}: ${details}`);
    });

    const successCount = results.filter(r => r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + r.records, 0);
    
    console.log(`\n✅ Rolling window backfill completed: ${successCount}/${timeWindows.length} windows successful, ${totalRecords} total records`);
    
    onProgress?.('complete', timeWindows.length, timeWindows.length);

    // If any windows failed, throw error with details
    const failedWindows = results.filter(r => !r.success);
    if (failedWindows.length > 0) {
      const errorMsg = `Failed to process ${failedWindows.length} windows: ${failedWindows.map(w => w.window).join(', ')}`;
      throw new Error(errorMsg);
    }

  } catch (error) {
    console.error('❌ Error in backfillRollingWindowPowerProfile:', error);
    throw error;
  }
}
