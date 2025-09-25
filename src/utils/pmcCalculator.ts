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
 * Fill gaps in training data with zero TSS days
 */
function fillTrainingDataGaps(trainingData: TrainingData[]): TrainingData[] {
  if (trainingData.length === 0) return [];

  // Sort by date to ensure chronological order
  const sortedData = [...trainingData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Get date range from first activity to today (or 7 days ago to allow for recent decay)
  const startDate = new Date(sortedData[0].date);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Include yesterday
  
  // Create a map of existing activities by date-sport combination
  const activityMap = new Map<string, TrainingData>();
  sortedData.forEach(activity => {
    const key = `${activity.date}-${activity.sport}`;
    activityMap.set(key, activity);
  });
  
  // Get all unique sports from the data
  const sports = [...new Set(sortedData.map(d => d.sport))];
  
  // Fill gaps for each sport
  const filledData: TrainingData[] = [];
  
  for (const sport of sports) {
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const key = `${dateStr}-${sport}`;
      
      if (activityMap.has(key)) {
        // Use existing activity data
        filledData.push(activityMap.get(key)!);
      } else {
        // Fill gap with zero TSS
        filledData.push({
          date: dateStr,
          tss: 0,
          duration_minutes: 0,
          sport: sport
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  return filledData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Calculate PMC metrics for a series of training data with proper decay handling
 */
export function calculatePMCMetrics(trainingData: TrainingData[]): PMCData[] {
  if (trainingData.length === 0) return [];

  // Fill gaps in training data to ensure proper decay calculation
  const filledData = fillTrainingDataGaps(trainingData);
  
  // Group by sport and calculate PMC for each sport separately
  const sportGroups = new Map<string, TrainingData[]>();
  filledData.forEach(data => {
    if (!sportGroups.has(data.sport)) {
      sportGroups.set(data.sport, []);
    }
    sportGroups.get(data.sport)!.push(data);
  });
  
  const allPmcData: PMCData[] = [];
  
  // Calculate PMC for each sport
  sportGroups.forEach((sportData, sport) => {
    let previousCTL = 0;
    let previousATL = 0;
    
    for (const training of sportData) {
      const ctl = calculateCTL(previousCTL, training.tss);
      const atl = calculateATL(previousATL, training.tss);
      const tsb = calculateTSB(ctl, atl);

      // Only include records that have actual data or significant PMC values
      if (training.tss > 0 || ctl > 1 || atl > 1) {
        allPmcData.push({
          date: training.date,
          tss: training.tss,
          ctl,
          atl,
          tsb,
          duration_minutes: training.duration_minutes,
          sport: training.sport
        });
      }

      previousCTL = ctl;
      previousATL = atl;
    }
  });

  return allPmcData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

    // Convert activities to training data format
    const trainingData: TrainingData[] = activities.map(activity => ({
      date: activity.date,
      tss: activity.tss || 0,
      duration_minutes: Math.round(activity.duration_seconds / 60),
      sport: activity.sport_mode
    }));

    // Calculate PMC metrics
    const pmcData = calculatePMCMetrics(trainingData);

    // Clear existing training history for this user
    const { error: deleteError } = await supabase
      .from('training_history')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Insert new PMC data
    const insertData = pmcData.map(data => ({
      user_id: userId,
      date: data.date,
      tss: data.tss,
      ctl: data.ctl,
      atl: data.atl,
      tsb: data.tsb,
      duration_minutes: data.duration_minutes,
      sport: data.sport
    }));

    const { error: insertError } = await supabase
      .from('training_history')
      .insert(insertData);

    if (insertError) throw insertError;

    console.log(`Successfully populated ${pmcData.length} training history records`);
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

    // Convert to training data format
    const trainingData: TrainingData[] = activities.map(activity => ({
      date: activity.date,
      tss: activity.tss || 0,
      duration_minutes: Math.round(activity.duration_seconds / 60),
      sport: activity.sport_mode
    }));

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