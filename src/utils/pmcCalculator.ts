import { supabase } from '@/integrations/supabase/client';

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
 * Calculate PMC metrics for a series of training data with proper daily decay
 */
export function calculatePMCMetrics(trainingData: TrainingData[]): PMCData[] {
  if (trainingData.length === 0) return [];

  // Sort by date to ensure chronological order
  const sortedData = [...trainingData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fill gaps in data to ensure daily calculations for proper decay
  const filledData = fillMissingDays(sortedData);

  const pmcData: PMCData[] = [];
  let previousCTL = 0;
  let previousATL = 0;

  for (const training of filledData) {
    const ctl = calculateCTL(previousCTL, training.tss);
    const atl = calculateATL(previousATL, training.tss);
    const tsb = calculateTSB(ctl, atl);

    pmcData.push({
      date: training.date,
      tss: training.tss,
      ctl,
      atl,
      tsb,
      duration_minutes: training.duration_minutes,
      sport: training.sport
    });

    previousCTL = ctl;
    previousATL = atl;
  }

  return pmcData;
}

/**
 * Fill missing days between training activities with zero TSS to ensure proper PMC decay
 */
function fillMissingDays(trainingData: TrainingData[]): TrainingData[] {
  if (trainingData.length === 0) return [];

  const result: TrainingData[] = [];
  const startDate = new Date(trainingData[0].date);
  const endDate = new Date(trainingData[trainingData.length - 1].date);

  // Extend to today if the last activity is not today
  const today = new Date();
  if (endDate < today) {
    endDate.setTime(today.getTime());
  }

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Find if there's training data for this date
    const existingData = trainingData.find(data => data.date === dateString);
    
    if (existingData) {
      result.push(existingData);
    } else {
      // Add zero TSS day for proper decay calculation
      result.push({
        date: dateString,
        tss: 0,
        duration_minutes: 0,
        sport: trainingData[0].sport // Use the sport from the first activity
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Populate training_history table with PMC calculations from activities
 */
export async function populateTrainingHistory(userId: string): Promise<void> {
  try {
    console.log('Populating training history for user:', userId);

    // Clear existing training history to ensure clean calculation
    const { error: deleteError } = await supabase
      .from('training_history')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;
    console.log('Cleared existing training history');

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

    // Convert activities to training data format and aggregate by date/sport
    const activityMap = new Map<string, { tss: number; duration_minutes: number; sport: string }>();
    
    activities.forEach(activity => {
      // Convert timestamp to date-only format
      const dateOnly = new Date(activity.date).toISOString().split('T')[0];
      const key = `${dateOnly}_${activity.sport_mode}`;
      
      const existing = activityMap.get(key);
      if (existing) {
        // Aggregate TSS and duration for multiple activities on same day
        existing.tss += activity.tss || 0;
        existing.duration_minutes += Math.round(activity.duration_seconds / 60);
      } else {
        activityMap.set(key, {
          tss: activity.tss || 0,
          duration_minutes: Math.round(activity.duration_seconds / 60),
          sport: activity.sport_mode
        });
      }
    });
    
    // Convert map to training data array
    const trainingData: TrainingData[] = Array.from(activityMap.entries()).map(([key, data]) => {
      const [date, sport] = key.split('_');
      return {
        date,
        tss: data.tss,
        duration_minutes: data.duration_minutes,
        sport
      };
    });

    // Group by sport for separate PMC calculations
    const sportGroups = new Map<string, TrainingData[]>();
    
    Array.from(activityMap.entries()).forEach(([key, data]) => {
      const [date, sport] = key.split('_');
      if (!sportGroups.has(sport)) {
        sportGroups.set(sport, []);
      }
      sportGroups.get(sport)!.push({
        date,
        tss: data.tss,
        duration_minutes: data.duration_minutes,
        sport
      });
    });

    // Calculate PMC metrics for each sport separately
    const allPmcData: any[] = [];
    
    for (const [sport, trainingData] of sportGroups) {
      const pmcData = calculatePMCMetrics(trainingData);
      allPmcData.push(...pmcData.map(data => ({
        user_id: userId,
        date: data.date,
        tss: data.tss,
        ctl: data.ctl,
        atl: data.atl,
        tsb: data.tsb,
        duration_minutes: data.duration_minutes,
        sport: data.sport
      })));
    }

    // Upsert PMC data to handle existing records
    if (allPmcData.length > 0) {
      const { error: upsertError } = await supabase
        .from('training_history')
        .upsert(allPmcData, {
          onConflict: 'user_id,date,sport'
        });

      if (upsertError) throw upsertError;
    }

    console.log(`Successfully populated ${allPmcData.length} training history records across ${sportGroups.size} sports`);
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

    // Convert to training data format and aggregate by date/sport
    const activityMap = new Map<string, { tss: number; duration_minutes: number; sport: string }>();
    
    activities.forEach(activity => {
      // Convert timestamp to date-only format
      const dateOnly = new Date(activity.date).toISOString().split('T')[0];
      const key = `${dateOnly}_${activity.sport_mode}`;
      
      const existing = activityMap.get(key);
      if (existing) {
        // Aggregate TSS and duration for multiple activities on same day
        existing.tss += activity.tss || 0;
        existing.duration_minutes += Math.round(activity.duration_seconds / 60);
      } else {
        activityMap.set(key, {
          tss: activity.tss || 0,
          duration_minutes: Math.round(activity.duration_seconds / 60),
          sport: activity.sport_mode
        });
      }
    });
    
    // Convert map to training data array
    const trainingData: TrainingData[] = Array.from(activityMap.entries()).map(([key, data]) => {
      const [date, sport] = key.split('_');
      return {
        date,
        tss: data.tss,
        duration_minutes: data.duration_minutes,
        sport
      };
    });

    // Calculate PMC metrics from the beginning
    const pmcData = calculatePMCMetrics(trainingData);

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