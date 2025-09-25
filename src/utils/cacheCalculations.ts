import { calculateMeanMaximalPower, calculateMeanMaximalPace } from './powerAnalysis';

export interface CachedPowerCurve {
  [durationSeconds: string]: {
    value: number;
    calculatedAt: string;
    source: 'gps_data' | 'mapbox_elevation' | 'cached';
  };
}

export interface CachedElevationProfile {
  coordinates: number[][];
  elevationData: Array<{
    distance: number;
    elevation: number;
    index: number;
  }>;
  calculatedAt: string;
  source: 'gps_fallback' | 'mapbox_api';
  minElevation: number;
  maxElevation: number;
  totalElevationGain: number;
}

export interface CachedSummaryMetrics {
  duration: number;
  distance: number;
  avgPower?: number;
  maxPower?: number;
  avgPace?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  tss?: number;
  calculatedAt: string;
}

/**
 * Calculate and cache power curve for an activity
 */
export function calculatePowerCurveCache(
  gpsData: any, 
  sportMode: string
): CachedPowerCurve {
  if (!gpsData?.trackPoints || !Array.isArray(gpsData.trackPoints)) {
    return {};
  }

  const records = gpsData.trackPoints;
  const activityDurationSeconds = records.length; // Assuming 1 record per second
  const isRunning = sportMode === 'running';
  
  // Standard durations to cache
  const durations = [1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
  
  // Add activity duration if it's longer than our max duration
  if (activityDurationSeconds > 3600 && activityDurationSeconds < 7200) {
    durations.push(activityDurationSeconds);
  }
  
  const cache: CachedPowerCurve = {};
  
  for (const duration of durations) {
    // Skip if duration is longer than the activity
    if (duration > activityDurationSeconds) continue;
    
    let value = 0;
    
    if (isRunning) {
      const meanMaxPace = calculateMeanMaximalPace(records, duration);
      value = meanMaxPace || 0;
    } else {
      const meanMaxPower = calculateMeanMaximalPower(records, duration);
      value = meanMaxPower || 0;
    }
    
    if (value > 0) {
      cache[duration.toString()] = {
        value,
        calculatedAt: new Date().toISOString(),
        source: 'gps_data'
      };
    }
  }
  
  return cache;
}

/**
 * Calculate elevation profile from GPS coordinates
 */
export function calculateElevationProfileCache(gpsData: any): CachedElevationProfile | null {
  if (!gpsData?.coordinates || !Array.isArray(gpsData.coordinates)) {
    return null;
  }
  
  let cumulativeDistance = 0;
  const elevationData = gpsData.coordinates.map((coord: number[], index: number) => {
    if (index > 0) {
      const prevCoord = gpsData.coordinates[index - 1];
      // Simple distance calculation (Haversine would be more accurate)
      const deltaLat = coord[1] - prevCoord[1];
      const deltaLng = coord[0] - prevCoord[0];
      const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111000; // Rough conversion to meters
      cumulativeDistance += distance;
    }
    
    return {
      distance: cumulativeDistance / 1000, // Convert to km
      elevation: coord[2] || 0, // Altitude if available, otherwise 0
      index
    };
  });
  
  const elevations = elevationData.map(d => d.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  
  // Calculate total elevation gain
  let totalElevationGain = 0;
  for (let i = 1; i < elevationData.length; i++) {
    const gain = elevationData[i].elevation - elevationData[i - 1].elevation;
    if (gain > 0) {
      totalElevationGain += gain;
    }
  }
  
  return {
    coordinates: gpsData.coordinates,
    elevationData,
    calculatedAt: new Date().toISOString(),
    source: 'gps_fallback',
    minElevation,
    maxElevation,
    totalElevationGain
  };
}

/**
 * Calculate summary metrics for quick display
 */
export function calculateSummaryMetricsCache(
  activity: any, 
  powerCurve: CachedPowerCurve,
  elevationProfile: CachedElevationProfile | null
): CachedSummaryMetrics {
  return {
    duration: activity.duration_seconds || 0,
    distance: activity.distance_meters || 0,
    avgPower: activity.avg_power,
    maxPower: activity.max_power,
    avgPace: activity.avg_pace_per_km,
    avgHeartRate: activity.avg_heart_rate,
    maxHeartRate: activity.max_heart_rate,
    elevationGain: elevationProfile?.totalElevationGain || activity.elevation_gain_meters,
    tss: activity.tss,
    calculatedAt: new Date().toISOString()
  };
}