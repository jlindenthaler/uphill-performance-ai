/**
 * Auto activity type detection utilities
 */

export interface ActivityDetectionResult {
  sport_mode: string;
  confidence: number; // 0-1 scale
  source: 'fit' | 'gpx' | 'tcx' | 'inference';
}

export interface GPSTrackAnalysis {
  avgSpeed: number; // km/h
  maxSpeed: number; // km/h
  totalDistance: number; // meters
  duration: number; // seconds
  speedVariability: number; // coefficient of variation
  roadFollowing: number; // 0-1 how much track follows roads
}

/**
 * Analyze GPS track characteristics to infer activity type
 */
export function analyzeGPSTrack(trackPoints: Array<{
  lat: number;
  lng: number;
  timestamp?: Date | string;
  speed?: number;
}>): GPSTrackAnalysis {
  if (trackPoints.length < 2) {
    return {
      avgSpeed: 0,
      maxSpeed: 0,
      totalDistance: 0,
      duration: 0,
      speedVariability: 0,
      roadFollowing: 0
    };
  }

  const speeds: number[] = [];
  let totalDistance = 0;
  let duration = 0;

  // Calculate speeds and distances between points
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];

    // Calculate distance using Haversine formula
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += distance;

    // Calculate time difference and speed
    if (prev.timestamp && curr.timestamp) {
      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 3.6; // Convert m/s to km/h
        if (speed > 0 && speed < 200) { // Filter out unrealistic speeds
          speeds.push(speed);
        }
      }
    } else if (curr.speed !== undefined) {
      // Use provided speed data
      const speedKmh = curr.speed * 3.6;
      if (speedKmh > 0 && speedKmh < 200) {
        speeds.push(speedKmh);
      }
    }
  }

  // Calculate duration from timestamps
  if (trackPoints[0].timestamp && trackPoints[trackPoints.length - 1].timestamp) {
    duration = (new Date(trackPoints[trackPoints.length - 1].timestamp!).getTime() - 
                new Date(trackPoints[0].timestamp!).getTime()) / 1000;
  }

  const avgSpeed = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
  
  // Calculate speed variability (coefficient of variation)
  let speedVariability = 0;
  if (speeds.length > 1 && avgSpeed > 0) {
    const variance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;
    const stdDev = Math.sqrt(variance);
    speedVariability = stdDev / avgSpeed;
  }

  // Simple road following analysis (high correlation between consecutive points suggests road following)
  let roadFollowing = 0;
  if (trackPoints.length > 10) {
    // Calculate bearing changes - smoother tracks (roads) have less dramatic bearing changes
    const bearingChanges: number[] = [];
    for (let i = 2; i < trackPoints.length; i++) {
      const bearing1 = calculateBearing(trackPoints[i-2], trackPoints[i-1]);
      const bearing2 = calculateBearing(trackPoints[i-1], trackPoints[i]);
      let change = Math.abs(bearing2 - bearing1);
      if (change > 180) change = 360 - change;
      bearingChanges.push(change);
    }
    
    const avgBearingChange = bearingChanges.reduce((sum, c) => sum + c, 0) / bearingChanges.length;
    // Lower bearing changes suggest road following (cycling), higher suggest trail running
    roadFollowing = Math.max(0, 1 - (avgBearingChange / 90));
  }

  return {
    avgSpeed,
    maxSpeed,
    totalDistance,
    duration,
    speedVariability,
    roadFollowing
  };
}

/**
 * Infer activity type from GPS track analysis
 */
export function inferActivityTypeFromGPS(analysis: GPSTrackAnalysis): ActivityDetectionResult {
  const { avgSpeed, maxSpeed, speedVariability, roadFollowing } = analysis;

  // Swimming detection (very low speeds, often indoor)
  if (avgSpeed < 3 && maxSpeed < 8) {
    return {
      sport_mode: 'swimming',
      confidence: 0.8,
      source: 'inference'
    };
  }

  // Walking detection
  if (avgSpeed < 8 && maxSpeed < 12) {
    return {
      sport_mode: 'walking',
      confidence: 0.7,
      source: 'inference'
    };
  }

  // Running vs Cycling detection
  if (avgSpeed >= 8 && avgSpeed <= 25) {
    // This range could be either running or cycling
    // Use additional factors to decide
    
    if (maxSpeed > 40) {
      // Unlikely to be running at 40+ km/h
      return {
        sport_mode: 'cycling',
        confidence: 0.9,
        source: 'inference'
      };
    }

    if (avgSpeed <= 15 && roadFollowing < 0.7) {
      // Lower speeds with less road following suggests trail running
      return {
        sport_mode: 'running',
        confidence: 0.8,
        source: 'inference'
      };
    }

    if (avgSpeed > 15 || roadFollowing > 0.8) {
      // Higher speeds or strong road following suggests cycling
      return {
        sport_mode: 'cycling',
        confidence: 0.8,
        source: 'inference'
      };
    }

    // Default to running for ambiguous cases in this range
    return {
      sport_mode: 'running',
      confidence: 0.6,
      source: 'inference'
    };
  }

  // High speed cycling
  if (avgSpeed > 25) {
    return {
      sport_mode: 'cycling',
      confidence: 0.9,
      source: 'inference'
    };
  }

  // Default fallback
  return {
    sport_mode: 'cycling',
    confidence: 0.3,
    source: 'inference'
  };
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two GPS points
 */
function calculateBearing(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

/**
 * Normalize sport mode to supported values
 */
export function normalizeSportMode(detectedSport: string): string {
  const sportMap: Record<string, string> = {
    'bike': 'cycling',
    'biking': 'cycling',
    'cycle': 'cycling',
    'bicycle': 'cycling',
    'run': 'running',
    'jog': 'running',
    'jogging': 'running',
    'walk': 'walking',
    'walking': 'walking',
    'hike': 'walking',
    'hiking': 'walking',
    'swim': 'swimming',
    'swimming': 'swimming',
    'pool': 'swimming',
    'openwater': 'swimming'
  };

  const normalized = sportMap[detectedSport.toLowerCase()] || detectedSport.toLowerCase();
  
  // Ensure we return one of our supported sports
  const supportedSports = ['cycling', 'running', 'swimming'];
  return supportedSports.includes(normalized) ? normalized : 'cycling';
}