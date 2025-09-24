export interface CPEffort {
  duration: number;
  power: number;
  startTime: number;
  endTime: number;
  isValid: boolean;
  rejectionReason?: string;
}

interface CPProtocol {
  name: string;
  efforts: number[]; // Duration in seconds
  maxGap: number; // Maximum days between efforts
}

export const CP_PROTOCOLS: Record<string, CPProtocol> = {
  '3min-12min': {
    name: '3min + 12min Protocol',
    efforts: [180, 720], // 3min, 12min
    maxGap: 3
  },
  '5min-20min': {
    name: '5min + 20min Protocol', 
    efforts: [300, 1200], // 5min, 20min
    maxGap: 3
  },
  '8min-30min': {
    name: '8min + 30min Protocol',
    efforts: [480, 1800], // 8min, 30min
    maxGap: 3
  },
  'ramp-test': {
    name: 'Ramp Test',
    efforts: [1200], // 20min ramp
    maxGap: 1
  }
};

export interface CPResult {
  protocol: string;
  cp_watts: number;
  w_prime_joules: number;
  efforts_used: CPEffort[];
  efforts_rejected: CPEffort[];
  test_date: string;
  r_squared?: number;
}

/**
 * Extract mean maximal power for a given duration from power data
 */
export function calculateMeanMaximalPower(
  powerData: number[], 
  targetDurationSeconds: number,
  sampleRate: number = 1
): number | null {
  if (!powerData || powerData.length === 0) return null;
  
  const windowSize = Math.round(targetDurationSeconds / sampleRate);
  if (windowSize > powerData.length) return null;
  
  let maxAvgPower = 0;
  
  for (let i = 0; i <= powerData.length - windowSize; i++) {
    const window = powerData.slice(i, i + windowSize);
    const avgPower = window.reduce((sum, p) => sum + (p || 0), 0) / window.length;
    maxAvgPower = Math.max(maxAvgPower, avgPower);
  }
  
  return maxAvgPower;
}

/**
 * Detect CP test efforts in an activity
 */
export function detectCPEfforts(
  powerData: number[],
  protocol: string,
  targetDuration?: number,
  sampleRate: number = 1
): CPEffort[] {
  const protocolConfig = CP_PROTOCOLS[protocol];
  if (!protocolConfig) return [];
  
  const efforts: CPEffort[] = [];
  const durationsToTest = targetDuration ? [targetDuration] : protocolConfig.efforts;
  
  for (const duration of durationsToTest) {
    const maxPower = calculateMeanMaximalPower(powerData, duration, sampleRate);
    
    if (maxPower && maxPower > 0) {
      const effort: CPEffort = {
        duration,
        power: Math.round(maxPower),
        startTime: 0, // Simplified - would need actual time tracking
        endTime: duration,
        isValid: validateEffort(maxPower, duration, protocol)
      };
      
      if (!effort.isValid) {
        effort.rejectionReason = getEffortRejectionReason(maxPower, duration, protocol);
      }
      
      efforts.push(effort);
    }
  }
  
  return efforts;
}

/**
 * Validate if an effort meets protocol requirements
 */
function validateEffort(power: number, duration: number, protocol: string): boolean {
  // Basic validation rules
  if (power < 50) return false; // Minimum power threshold
  if (duration < 60) return false; // Minimum duration
  
  // Protocol-specific validation
  switch (protocol) {
    case 'ramp-test':
      return power > 100 && duration >= 1200; // At least 20min ramp
    case '3min-12min':
      return power > 150; // Reasonable power for structured efforts
    case '5min-20min':
      return power > 150;
    case '8min-30min':
      return power > 120;
    default:
      return true;
  }
}

/**
 * Get reason why effort was rejected
 */
function getEffortRejectionReason(power: number, duration: number, protocol: string): string {
  if (power < 50) return 'Power too low (< 50W)';
  if (duration < 60) return 'Duration too short (< 1min)';
  
  switch (protocol) {
    case 'ramp-test':
      if (power < 100) return 'Insufficient power for ramp test';
      if (duration < 1200) return 'Ramp test too short (< 20min)';
      break;
    default:
      if (power < 150) return 'Power insufficient for protocol';
  }
  
  return 'Unknown validation failure';
}

/**
 * Calculate CP and W' from two-point model
 */
export function calculateCPFromEfforts(efforts: CPEffort[]): CPResult | null {
  const validEfforts = efforts.filter(e => e.isValid);
  
  if (validEfforts.length < 2) {
    return null;
  }
  
  // Two-point CP model: P = W'/t + CP
  // Using linear regression on 1/t vs P
  const points = validEfforts.map(e => ({
    x: 1 / e.duration, // 1/time
    y: e.power // power
  }));
  
  if (points.length < 2) return null;
  
  // Linear regression
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const rSquared = 1 - (ssRes / ssTot);
  
  return {
    protocol: 'two-point',
    cp_watts: Math.round(intercept),
    w_prime_joules: Math.round(slope * 1000), // Convert to Joules
    efforts_used: validEfforts,
    efforts_rejected: efforts.filter(e => !e.isValid),
    test_date: new Date().toISOString(),
    r_squared: rSquared
  };
}

/**
 * Process CP test activity
 */
export function processCPTestActivity(
  powerData: number[],
  protocol: string,
  targetDuration?: number,
  sampleRate: number = 1
): {
  efforts: CPEffort[];
  cpResult: CPResult | null;
} {
  const efforts = detectCPEfforts(powerData, protocol, targetDuration, sampleRate);
  
  // For multi-effort protocols, try to calculate CP immediately
  let cpResult: CPResult | null = null;
  if (efforts.filter(e => e.isValid).length >= 2) {
    cpResult = calculateCPFromEfforts(efforts);
  }
  
  return { efforts, cpResult };
}

/**
 * Check if activities contain complete protocol set within time window
 */
export function findCompleteProtocolSets(
  activities: Array<{
    id: string;
    date: string;
    cp_test_protocol: string;
    cp_test_target_duration?: number;
    efforts?: CPEffort[];
  }>,
  maxGapDays: number = 3
): Array<{
  protocol: string;
  activities: string[];
  efforts: CPEffort[];
  canCalculateCP: boolean;
}> {
  const protocolSets: Map<string, {
    protocol: string;
    activities: Array<{
      id: string;
      date: string;
      efforts: CPEffort[];
    }>;
  }> = new Map();
  
  // Group activities by protocol
  activities.forEach(activity => {
    if (!activity.cp_test_protocol || !activity.efforts) return;
    
    const key = activity.cp_test_protocol;
    if (!protocolSets.has(key)) {
      protocolSets.set(key, {
        protocol: key,
        activities: []
      });
    }
    
    protocolSets.get(key)!.activities.push({
      id: activity.id,
      date: activity.date,
      efforts: activity.efforts
    });
  });
  
  const completeSets: Array<{
    protocol: string;
    activities: string[];
    efforts: CPEffort[];
    canCalculateCP: boolean;
  }> = [];
  
  // Check each protocol set for completeness
  protocolSets.forEach((set, protocol) => {
    const protocolConfig = CP_PROTOCOLS[protocol];
    if (!protocolConfig) return;
    
    // Sort activities by date
    set.activities.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Check time window constraint
    const firstDate = new Date(set.activities[0].date);
    const lastDate = new Date(set.activities[set.activities.length - 1].date);
    const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= maxGapDays) {
      // Collect all valid efforts
      const allEfforts = set.activities.flatMap(a => a.efforts.filter(e => e.isValid));
      
      // Check if we have the required durations
      const requiredDurations = new Set(protocolConfig.efforts);
      const availableDurations = new Set(allEfforts.map(e => e.duration));
      const hasAllDurations = [...requiredDurations].every(d => availableDurations.has(d));
      
      completeSets.push({
        protocol,
        activities: set.activities.map(a => a.id),
        efforts: allEfforts,
        canCalculateCP: hasAllDurations && allEfforts.length >= 2
      });
    }
  });
  
  return completeSets;
}