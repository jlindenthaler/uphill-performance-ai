import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the user's threshold power/pace in the correct priority order:
 * 1. VT2 (Ventilatory Threshold 2) from lab_results
 * 2. LT2 (Lactate Threshold 2) from lab_results
 * 3. CP (Critical Power) from cp_results (most recent test)
 * 4. Critical Power from lab_results
 * 5. Critical Power from physiology_data
 * 6. FTP from physiology_data
 * 7. Fallback: 95% of 20-minute mean max power (if available)
 */
export async function getUserThresholdPower(
  userId: string,
  sportMode: string = 'cycling'
): Promise<{ value: number; source: string } | null> {
  
  // 1. Check lab_results for VT2 or LT2
  const { data: labResults } = await supabase
    .from('lab_results')
    .select('vt2_power, lt2_power, critical_power')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .maybeSingle();

  if (labResults?.vt2_power) {
    return { value: Number(labResults.vt2_power), source: 'VT2 (lab)' };
  }

  if (labResults?.lt2_power) {
    return { value: Number(labResults.lt2_power), source: 'LT2 (lab)' };
  }

  // 2. Check cp_results for most recent CP test
  const { data: cpResults } = await supabase
    .from('cp_results')
    .select('cp_watts')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cpResults?.cp_watts) {
    return { value: Number(cpResults.cp_watts), source: 'CP (test)' };
  }

  // 3. Check lab_results for Critical Power
  if (labResults?.critical_power) {
    return { value: Number(labResults.critical_power), source: 'CP (lab)' };
  }

  // 4. Fallback: Calculate from 20min mean max power if available
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
