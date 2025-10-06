import { supabase } from '@/integrations/supabase/client';
import { normalizeSportMode } from './sportModeMapping';

interface TrainingData {
  date: string;
  tss: number;
  duration_minutes: number;
  sport: string;
}

interface PMCData {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  duration_minutes: number;
  sport: string;
}

/**
 * Calculate CTL (Chronic Training Load) - 42-day exponentially weighted moving average
 */
function calculateCTL(previousCTL: number, todayTSS: number): number {
  const ctlTimeConstant = 42;
  return previousCTL + (todayTSS - previousCTL) * (1 / ctlTimeConstant);
}

/**
 * Calculate ATL (Acute Training Load) - 7-day exponentially weighted moving average
 */
function calculateATL(previousATL: number, todayTSS: number): number {
  const atlTimeConstant = 7;
  return previousATL + (todayTSS - previousATL) * (1 / atlTimeConstant);
}

/**
 * Calculate TSB (Training Stress Balance) - CTL minus ATL
 */
function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl;
}

/**
 * Fill gaps in training data with zero TSS entries for proper PMC decay
 */
function fillTrainingDataGaps(trainingData: TrainingData[], endDate?: string): TrainingData[] {
  if (trainingData.length === 0) return [];

  const sortedData = [...trainingData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const startDate = new Date(sortedData[0].date);
  const finalDate = endDate ? new Date(endDate) : new Date();
  
  // Create a map of existing training days by date and sport
  const trainingMap = new Map<string, TrainingData>();
  sortedData.forEach(data => {
    const key = `${data.date}-${data.sport}`;
    trainingMap.set(key, data);
  });

  // Get all unique sports
  const sports = [...new Set(sortedData.map(data => data.sport))];
  
  const filledData: TrainingData[] = [];
  
  // For each sport, fill the complete timeline
  sports.forEach(sport => {
    const currentDate = new Date(startDate);
    
    while (currentDate <= finalDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const key = `${dateStr}-${sport}`;
      
      if (trainingMap.has(key)) {
        // Use existing training data
        filledData.push(trainingMap.get(key)!);
      } else {
        // Add zero TSS entry for this day
        filledData.push({
          date: dateStr,
          tss: 0,
          duration_minutes: 0,
          sport: sport
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return filledData.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare === 0) {
      return a.sport.localeCompare(b.sport);
    }
    return dateCompare;
  });
}

/**
 * Calculate PMC metrics for a series of training data with proper daily decay
 */
export function calculatePMCMetrics(trainingData: TrainingData[], endDate?: string): PMCData[] {
  if (trainingData.length === 0) return [];

  // Normalize sport modes to primary groups (walking -> running, etc.)
  const normalizedData = trainingData.map(data => ({
    ...data,
    sport: normalizeSportMode(data.sport)
  }));

  // Fill gaps to ensure we have data for every day
  const completeData = fillTrainingDataGaps(normalizedData, endDate);
  
  // Group by normalized sport for PMC calculations
  const sportGroups = new Map<string, TrainingData[]>();
  completeData.forEach(data => {
    if (!sportGroups.has(data.sport)) {
      sportGroups.set(data.sport, []);
    }
    sportGroups.get(data.sport)!.push(data);
  });

  const allPMCData: PMCData[] = [];

  // Calculate PMC for each sport separately
  sportGroups.forEach((sportData, sport) => {
    const sortedData = sportData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let previousCTL = 0;
    let previousATL = 0;

    for (const training of sortedData) {
      const tss = training.tss || 0; // Handle null/undefined TSS
      const ctl = calculateCTL(previousCTL, tss);
      const atl = calculateATL(previousATL, tss);
      const tsb = calculateTSB(ctl, atl);

      allPMCData.push({
        date: training.date,
        tss: tss,
        ctl,
        atl,
        tsb,
        duration_minutes: training.duration_minutes || 0,
        sport: training.sport
      });

      previousCTL = ctl;
      previousATL = atl;
    }
  });

  return allPMCData.sort((a, b) => {
    const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (dateCompare === 0) {
      return a.sport.localeCompare(b.sport);
    }
    return dateCompare;
  });
}

/**
 * Populate training_history table with PMC calculations from activities
 */
export async function populateTrainingHistory(userId: string): Promise<void> {
  try {
    console.log('Populating training history for user:', userId);

    // Fetch all activities for the user
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('date, tss, duration_seconds, sport_mode')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (activitiesError) throw activitiesError;

    if (!activities || activities.length === 0) {
      console.log('No activities found for PMC calculation');
      return;
    }

    // Aggregate activities by date and normalized sport (sum TSS for multiple activities on same day)
    const aggregatedMap = new Map<string, TrainingData>();
    
    activities.forEach(activity => {
      const dateStr = new Date(activity.date).toISOString().split('T')[0];
      // Normalize sport mode (walking -> running, etc.)
      const normalizedSport = normalizeSportMode(activity.sport_mode);
      const key = `${dateStr}-${normalizedSport}`;
      
      if (aggregatedMap.has(key)) {
        const existing = aggregatedMap.get(key)!;
        existing.tss += (activity.tss || 0);
        existing.duration_minutes += Math.round((activity.duration_seconds || 0) / 60);
      } else {
        aggregatedMap.set(key, {
          date: dateStr,
          tss: activity.tss || 0,
          duration_minutes: Math.round((activity.duration_seconds || 0) / 60),
          sport: normalizedSport
        });
      }
    });

    const trainingData: TrainingData[] = Array.from(aggregatedMap.values());
    console.log('Aggregated training data sample:', trainingData.slice(0, 3));

    // Calculate PMC metrics with extended timeline to today for proper decay
    const pmcData = calculatePMCMetrics(trainingData, new Date().toISOString().split('T')[0]);

    // Upsert PMC data (insert or update if exists)
    const upsertData = pmcData.map(data => ({
      user_id: userId,
      date: data.date,
      tss: data.tss,
      ctl: data.ctl,
      atl: data.atl,
      tsb: data.tsb,
      duration_minutes: data.duration_minutes,
      sport: data.sport
    }));

    const { error: upsertError } = await supabase
      .from('training_history')
      .upsert(upsertData, {
        onConflict: 'user_id,date,sport',
        ignoreDuplicates: false
      });

    if (upsertError) throw upsertError;

    console.log(`Successfully populated ${pmcData.length} training history records`);
    console.log('PMC data sample:', pmcData.slice(-3));
  } catch (error) {
    console.error('Error populating training history:', error);
    throw error;
  }
}

/**
 * Update training history for a specific date (when a new activity is added)
 */
export async function updateTrainingHistoryForDate(userId: string, date: string): Promise<void> {
  try {
    // Get all activities for this user up to and including the specified date
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('date, tss, duration_seconds, sport_mode')
      .eq('user_id', userId)
      .lte('date', date)
      .order('date', { ascending: true });

    if (activitiesError) throw activitiesError;

    if (!activities || activities.length === 0) return;

    // Aggregate activities by date and normalized sport
    const aggregatedMap = new Map<string, TrainingData>();
    
    activities.forEach(activity => {
      const dateStr = new Date(activity.date).toISOString().split('T')[0];
      // Normalize sport mode (walking -> running, etc.)
      const normalizedSport = normalizeSportMode(activity.sport_mode);
      const key = `${dateStr}-${normalizedSport}`;
      
      if (aggregatedMap.has(key)) {
        const existing = aggregatedMap.get(key)!;
        existing.tss += (activity.tss || 0);
        existing.duration_minutes += Math.round((activity.duration_seconds || 0) / 60);
      } else {
        aggregatedMap.set(key, {
          date: dateStr,
          tss: activity.tss || 0,
          duration_minutes: Math.round((activity.duration_seconds || 0) / 60),
          sport: normalizedSport
        });
      }
    });

    const trainingData: TrainingData[] = Array.from(aggregatedMap.values());

    // Calculate PMC metrics from the beginning with extended timeline
    const pmcData = calculatePMCMetrics(trainingData, new Date().toISOString().split('T')[0]);

    // Update or insert training history records from the specified date onwards
    for (const data of pmcData.filter(d => d.date >= date)) {
      const { error: upsertError } = await supabase
        .from('training_history')
        .upsert({
          user_id: userId,
          date: data.date,
          tss: data.tss,
          ctl: data.ctl,
          atl: data.atl,
          tsb: data.tsb,
          duration_minutes: data.duration_minutes,
          sport: data.sport
        }, {
          onConflict: 'user_id,date,sport'
        });

      if (upsertError) throw upsertError;
    }

    console.log(`Updated training history from ${date} onwards`);
  } catch (error) {
    console.error('Error updating training history:', error);
    throw error;
  }
}