import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the user's threshold power/pace for a specific activity date.
 * Uses date-based threshold selection with proper hierarchy:
 * 1. VT2 (Ventilatory Threshold 2) from lab_results (most recent before/on activity date)
 * 2. LT2 (Lactate Threshold 2) from lab_results (most recent before/on activity date)
 * 3. CP (Critical Power) from cp_results (most recent before/on activity date, if more recent than VT2/LT2)
 * 4. Critical Power from lab_results
 * 5. AI-placed FTP from activities (if no other values for extended period)
 * 6. Fallback: 95% of 20-minute mean max power (if available)
 */
export async function getUserThresholdPower(
  userId: string,
  activityDate: Date,
  sportMode: string = 'cycling'
): Promise<{ value: number; source: string } | null> {
  
  // 1. Check lab_results for VT2, LT2, or CP (most recent before or on activity date)
  const { data: labResults } = await supabase
    .from('lab_results')
    .select('vt2_power, lt2_power, critical_power, test_date')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .lte('test_date', activityDate.toISOString())
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const labTestDate = labResults?.test_date ? new Date(labResults.test_date) : null;

  // 2. Check cp_results for most recent CP test before or on activity date
  const { data: cpResults } = await supabase
    .from('cp_results')
    .select('cp_watts, test_date')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .lte('test_date', activityDate.toISOString())
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const cpTestDate = cpResults?.test_date ? new Date(cpResults.test_date) : null;

  // Determine which threshold to use based on hierarchy and dates
  // Prioritize LT2 over VT2 since blood lactate measurement is more definitive
  if (labResults?.lt2_power) {
    // Check if CP is more recent than LT2
    if (cpResults?.cp_watts && cpTestDate && labTestDate && cpTestDate > labTestDate) {
      return { value: Number(cpResults.cp_watts), source: 'CP (test)' };
    }
    return { value: Number(labResults.lt2_power), source: 'LT2' };
  }

  if (labResults?.vt2_power) {
    // Check if CP is more recent than VT2
    if (cpResults?.cp_watts && cpTestDate && labTestDate && cpTestDate > labTestDate) {
      return { value: Number(cpResults.cp_watts), source: 'CP (test)' };
    }
    return { value: Number(labResults.vt2_power), source: 'VT2' };
  }

  // 3. Use CP from cp_results if available
  if (cpResults?.cp_watts) {
    return { value: Number(cpResults.cp_watts), source: 'CP (test)' };
  }

  // 4. Check lab_results for Critical Power
  if (labResults?.critical_power) {
    return { value: Number(labResults.critical_power), source: 'CP (lab)' };
  }

  // 5. Check for AI-placed FTP in activities (stored in summary_metrics)
  const { data: aiActivity } = await supabase
    .from('activities')
    .select('summary_metrics')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .lte('date', activityDate.toISOString())
    .not('summary_metrics->ai_ftp', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (aiActivity?.summary_metrics && typeof aiActivity.summary_metrics === 'object' && 'ai_ftp' in aiActivity.summary_metrics) {
    const metrics = aiActivity.summary_metrics as { ai_ftp?: number };
    if (metrics.ai_ftp) {
      return { value: Number(metrics.ai_ftp), source: 'AI FTP' };
    }
  }

  // 6. Fallback: Calculate from 20min mean max power if available
  const { data: powerProfile } = await supabase
    .from('power_profile')
    .select('power_watts')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .eq('duration_seconds', 1200) // 20 minutes
    .eq('time_window', 'all-time')
    .maybeSingle();

  if (powerProfile?.power_watts) {
    const calculatedFTP = Number(powerProfile.power_watts) * 0.95;
    return { value: calculatedFTP, source: '95% of 20min power' };
  }

  return null;
}

/**
 * Calculates TSS using the proper threshold hierarchy
 */
export function calculateTSSWithThreshold(
  normalizedPower: number | null,
  durationSeconds: number,
  thresholdPower: number
): number | null {
  if (!normalizedPower || !thresholdPower || thresholdPower <= 0) return null;

  const intensityFactor = normalizedPower / thresholdPower;
  const durationHours = durationSeconds / 3600;
  const tss = (durationHours * normalizedPower * intensityFactor * 100) / thresholdPower;

  return Math.round(tss * 10) / 10;
}
