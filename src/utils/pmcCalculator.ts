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
function calculateCTL(previousCTL: number, todayTLI: number): number {
  const ctlTimeConstant = 42;
  return previousCTL + (todayTLI - previousCTL) * (1 / ctlTimeConstant);
}

/**
 * Calculate ATL (Acute Training Load) - 7-day exponentially weighted moving average
 */
function calculateATL(previousATL: number, todayTLI: number): number {
  const atlTimeConstant = 7;
  return previousATL + (todayTLI - previousATL) * (1 / atlTimeConstant);
}

/**
 * Calculate TSB (Training Stress Balance) - CTL minus ATL
 */
function calculateTSB(ctl: number, atl: number): number {
  return ctl - atl;
}

/**
 * Calculate PMC metrics for a series of training data
 */
export function calculatePMCMetrics(trainingData: TrainingData[]): PMCData[] {
  if (trainingData.length === 0) return [];

  // Sort by date to ensure chronological order
  const sortedData = [...trainingData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pmcData: PMCData[] = [];
  let previousCTL = 0;
  let previousATL = 0;

  for (const training of sortedData) {
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