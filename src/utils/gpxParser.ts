/**
 * GPX file parsing utilities
 */

export interface GPXTrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
  timestamp?: Date;
  heartRate?: number;
  speed?: number;
  cadence?: number;
}

export interface GPXParseResult {
  sport_mode: string;
  name?: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  avg_speed_kmh?: number;
  max_speed_kmh?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  gps_data?: any;
  trackPoints: GPXTrackPoint[];
}

/**
 * Parse GPX file and extract activity data
 */
export async function parseGPXFile(file: File): Promise<GPXParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        if (!xmlText) {
          throw new Error('Failed to read GPX file');
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error('Invalid GPX file format');
        }

        const result = extractGPXData(xmlDoc);
        resolve(result);
        
      } catch (error) {
        console.error('Error parsing GPX file:', error);
        reject(new Error(`Failed to parse GPX file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read GPX file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extract activity data from GPX XML document
 */
function extractGPXData(xmlDoc: Document): GPXParseResult {
  const trackPoints: GPXTrackPoint[] = [];
  let activityName: string | undefined;
  let activityType = 'cycling'; // default
  
  // Extract metadata
  const metadata = xmlDoc.querySelector('metadata');
  if (metadata) {
    const nameElement = metadata.querySelector('name');
    if (nameElement) {
      activityName = nameElement.textContent?.trim();
    }
  }

  // Extract track name if not found in metadata
  if (!activityName) {
    const trackName = xmlDoc.querySelector('trk > name');
    if (trackName) {
      activityName = trackName.textContent?.trim();
    }
  }

  // Extract activity type
  const typeElement = xmlDoc.querySelector('trk > type') || xmlDoc.querySelector('metadata > type');
  if (typeElement) {
    const type = typeElement.textContent?.trim().toLowerCase() || '';
    activityType = mapGPXTypeToSportMode(type);
  }

  // Extract track points
  const trkpts = xmlDoc.querySelectorAll('trkpt');
  
  trkpts.forEach(trkpt => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lng = parseFloat(trkpt.getAttribute('lon') || '0');
    
    if (lat !== 0 && lng !== 0) {
      const point: GPXTrackPoint = { lat, lng };
      
      // Extract elevation
      const eleElement = trkpt.querySelector('ele');
      if (eleElement) {
        point.elevation = parseFloat(eleElement.textContent || '0');
      }
      
      // Extract timestamp
      const timeElement = trkpt.querySelector('time');
      if (timeElement) {
        point.timestamp = new Date(timeElement.textContent || '');
      }
      
      // Extract heart rate from extensions
      const hrElement = trkpt.querySelector('extensions hr') || 
                       trkpt.querySelector('extensions heartrate') ||
                       trkpt.querySelector('gpxtpx\\:hr') ||
                       trkpt.querySelector('heartrate');
      if (hrElement) {
        point.heartRate = parseInt(hrElement.textContent || '0');
      }

      // Extract speed
      const speedElement = trkpt.querySelector('extensions speed') ||
                          trkpt.querySelector('speed');
      if (speedElement) {
        point.speed = parseFloat(speedElement.textContent || '0');
      }

      // Extract cadence
      const cadenceElement = trkpt.querySelector('extensions cad') ||
                            trkpt.querySelector('extensions cadence') ||
                            trkpt.querySelector('cadence');
      if (cadenceElement) {
        point.cadence = parseInt(cadenceElement.textContent || '0');
      }
      
      trackPoints.push(point);
    }
  });

  if (trackPoints.length === 0) {
    throw new Error('No valid track points found in GPX file');
  }

  // Calculate activity metrics
  const metrics = calculateGPXMetrics(trackPoints);
  
  // Determine activity date from first track point
  const activityDate = trackPoints[0].timestamp || new Date();
  
  // Create GPS data for storage
  const gpsData = {
    type: 'LineString',
    coordinates: trackPoints.map(point => [point.lng, point.lat]),
    trackPoints: trackPoints.map(point => ({
      lat: point.lat,
      lng: point.lng,
      timestamp: point.timestamp,
      altitude: point.elevation,
      heartRate: point.heartRate,
      speed: point.speed,
      cadence: point.cadence
    }))
  };

  return {
    sport_mode: activityType,
    name: activityName,
    date: activityDate.toISOString(),
    duration_seconds: metrics.duration,
    distance_meters: metrics.distance,
    elevation_gain_meters: metrics.elevationGain,
    avg_speed_kmh: metrics.avgSpeed,
    max_speed_kmh: metrics.maxSpeed,
    avg_heart_rate: metrics.avgHeartRate,
    max_heart_rate: metrics.maxHeartRate,
    gps_data: gpsData,
    trackPoints
  };
}

/**
 * Calculate activity metrics from track points
 */
function calculateGPXMetrics(trackPoints: GPXTrackPoint[]) {
  let totalDistance = 0;
  let totalElevationGain = 0;
  let duration = 0;
  const speeds: number[] = [];
  const heartRates: number[] = [];
  
  // Calculate distance, elevation gain, and collect speed/HR data
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];
    
    // Calculate distance using Haversine formula
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    totalDistance += distance;
    
    // Calculate elevation gain
    if (prev.elevation !== undefined && curr.elevation !== undefined) {
      const elevationChange = curr.elevation - prev.elevation;
      if (elevationChange > 0) {
        totalElevationGain += elevationChange;
      }
    }
    
    // Calculate speed from GPS data
    if (prev.timestamp && curr.timestamp) {
      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
      if (timeDiff > 0) {
        const speed = (distance / timeDiff) * 3.6; // Convert to km/h
        if (speed > 0 && speed < 200) { // Filter unrealistic speeds
          speeds.push(speed);
        }
      }
    } else if (curr.speed !== undefined) {
      // Use provided speed if available
      const speedKmh = curr.speed * 3.6;
      if (speedKmh > 0 && speedKmh < 200) {
        speeds.push(speedKmh);
      }
    }
    
    // Collect heart rate data
    if (curr.heartRate && curr.heartRate > 0 && curr.heartRate < 250) {
      heartRates.push(curr.heartRate);
    }
  }
  
  // Calculate duration from timestamps
  if (trackPoints[0].timestamp && trackPoints[trackPoints.length - 1].timestamp) {
    duration = (trackPoints[trackPoints.length - 1].timestamp!.getTime() - 
                trackPoints[0].timestamp!.getTime()) / 1000;
  }
  
  const avgSpeed = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : undefined;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : undefined;
  const avgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length) : undefined;
  const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : undefined;
  
  return {
    distance: Math.round(totalDistance),
    elevationGain: Math.round(totalElevationGain),
    duration: Math.round(duration),
    avgSpeed: avgSpeed ? Math.round(avgSpeed * 100) / 100 : undefined,
    maxSpeed: maxSpeed ? Math.round(maxSpeed * 100) / 100 : undefined,
    avgHeartRate,
    maxHeartRate
  };
}

/**
 * Map GPX activity type to our sport modes
 */
function mapGPXTypeToSportMode(gpxType: string): string {
  const typeMap: Record<string, string> = {
    'cycling': 'cycling',
    'biking': 'cycling',
    'bike': 'cycling',
    'bicycle': 'cycling',
    'running': 'running',
    'run': 'running',
    'jogging': 'running',
    'walking': 'walking',
    'walk': 'walking',
    'hiking': 'walking',
    'swimming': 'swimming',
    'swim': 'swimming'
  };
  
  return typeMap[gpxType] || 'cycling';
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