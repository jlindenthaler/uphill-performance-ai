/**
 * TCX file parsing utilities
 */

export interface TCXTrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
  timestamp?: Date;
  heartRate?: number;
  speed?: number;
  cadence?: number;
  distance?: number;
}

export interface TCXParseResult {
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
  avg_cadence?: number;
  calories?: number;
  gps_data?: any;
  trackPoints: TCXTrackPoint[];
}

/**
 * Parse TCX file and extract activity data
 */
export async function parseTCXFile(file: File): Promise<TCXParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const xmlText = event.target?.result as string;
        if (!xmlText) {
          throw new Error('Failed to read TCX file');
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error('Invalid TCX file format');
        }

        const result = extractTCXData(xmlDoc);
        resolve(result);
        
      } catch (error) {
        console.error('Error parsing TCX file:', error);
        reject(new Error(`Failed to parse TCX file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read TCX file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Extract activity data from TCX XML document
 */
function extractTCXData(xmlDoc: Document): TCXParseResult {
  const trackPoints: TCXTrackPoint[] = [];
  
  // Extract activity element
  const activity = xmlDoc.querySelector('Activity');
  if (!activity) {
    throw new Error('No Activity element found in TCX file');
  }
  
  // Extract sport type
  const sport = activity.getAttribute('Sport') || 'Biking';
  const sportMode = mapTCXSportToSportMode(sport);
  
  // Extract activity ID (timestamp)
  const activityId = xmlDoc.querySelector('Activity Id');
  const activityDate = activityId ? new Date(activityId.textContent || '') : new Date();
  
  // Extract activity name
  const nameElement = xmlDoc.querySelector('Activity > Name');
  const activityName = nameElement?.textContent?.trim();
  
  // Extract total time and distance from summary
  const totalTimeElement = xmlDoc.querySelector('Activity > Lap > TotalTimeSeconds');
  const totalDistanceElement = xmlDoc.querySelector('Activity > Lap > DistanceMeters');
  const caloriesElement = xmlDoc.querySelector('Activity > Lap > Calories');
  
  const totalTime = totalTimeElement ? parseFloat(totalTimeElement.textContent || '0') : 0;
  const totalDistance = totalDistanceElement ? parseFloat(totalDistanceElement.textContent || '0') : undefined;
  const calories = caloriesElement ? parseInt(caloriesElement.textContent || '0') : undefined;
  
  // Extract track points
  const trackpoints = xmlDoc.querySelectorAll('Trackpoint');
  
  trackpoints.forEach(trackpoint => {
    const timeElement = trackpoint.querySelector('Time');
    const positionElement = trackpoint.querySelector('Position');
    
    if (positionElement) {
      const latElement = positionElement.querySelector('LatitudeDegrees');
      const lngElement = positionElement.querySelector('LongitudeDegrees');
      
      if (latElement && lngElement) {
        const lat = parseFloat(latElement.textContent || '0');
        const lng = parseFloat(lngElement.textContent || '0');
        
        if (lat !== 0 && lng !== 0) {
          const point: TCXTrackPoint = { lat, lng };
          
          // Extract timestamp
          if (timeElement) {
            point.timestamp = new Date(timeElement.textContent || '');
          }
          
          // Extract altitude
          const altitudeElement = trackpoint.querySelector('AltitudeMeters');
          if (altitudeElement) {
            point.elevation = parseFloat(altitudeElement.textContent || '0');
          }
          
          // Extract heart rate
          const heartRateElement = trackpoint.querySelector('HeartRateBpm > Value');
          if (heartRateElement) {
            point.heartRate = parseInt(heartRateElement.textContent || '0');
          }
          
          // Extract speed
          const speedElement = trackpoint.querySelector('Extensions > Speed') ||
                              trackpoint.querySelector('Extensions TPX\\:Speed') ||  
                              trackpoint.querySelector('Speed');
          if (speedElement) {
            point.speed = parseFloat(speedElement.textContent || '0');
          }
          
          // Extract cadence
          const cadenceElement = trackpoint.querySelector('Cadence') ||
                                trackpoint.querySelector('Extensions > Cadence') ||
                                trackpoint.querySelector('Extensions TPX\\:Cadence');
          if (cadenceElement) {
            point.cadence = parseInt(cadenceElement.textContent || '0');
          }
          
          // Extract distance
          const distanceElement = trackpoint.querySelector('DistanceMeters');
          if (distanceElement) {
            point.distance = parseFloat(distanceElement.textContent || '0');
          }
          
          trackPoints.push(point);
        }
      }
    }
  });

  if (trackPoints.length === 0) {
    throw new Error('No valid track points found in TCX file');
  }

  // Calculate activity metrics
  const metrics = calculateTCXMetrics(trackPoints, totalTime, totalDistance);
  
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
      cadence: point.cadence,
      distance: point.distance
    }))
  };

  return {
    sport_mode: sportMode,
    name: activityName,
    date: activityDate.toISOString(),
    duration_seconds: Math.round(metrics.duration),
    distance_meters: metrics.distance,
    elevation_gain_meters: metrics.elevationGain,
    avg_speed_kmh: metrics.avgSpeed,
    max_speed_kmh: metrics.maxSpeed,
    avg_heart_rate: metrics.avgHeartRate,
    max_heart_rate: metrics.maxHeartRate,
    avg_cadence: metrics.avgCadence,
    calories,
    gps_data: gpsData,
    trackPoints
  };
}

/**
 * Calculate activity metrics from track points
 */
function calculateTCXMetrics(trackPoints: TCXTrackPoint[], totalTime: number, totalDistance?: number) {
  let calculatedDistance = 0;
  let totalElevationGain = 0;
  let duration = totalTime;
  const speeds: number[] = [];
  const heartRates: number[] = [];
  const cadences: number[] = [];
  
  // Use provided total distance if available, otherwise calculate
  if (totalDistance) {
    calculatedDistance = totalDistance;
  } else {
    // Calculate distance from GPS points
    for (let i = 1; i < trackPoints.length; i++) {
      const prev = trackPoints[i - 1];
      const curr = trackPoints[i];
      
      const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      calculatedDistance += distance;
    }
  }
  
  // Process each point for metrics
  for (let i = 0; i < trackPoints.length; i++) {
    const point = trackPoints[i];
    const prevPoint = i > 0 ? trackPoints[i - 1] : null;
    
    // Calculate elevation gain
    if (prevPoint && prevPoint.elevation !== undefined && point.elevation !== undefined) {
      const elevationChange = point.elevation - prevPoint.elevation;
      if (elevationChange > 0) {
        totalElevationGain += elevationChange;
      }
    }
    
    // Calculate speed from GPS if not provided
    if (!point.speed && prevPoint && point.timestamp && prevPoint.timestamp) {
      const timeDiff = (point.timestamp.getTime() - prevPoint.timestamp.getTime()) / 1000;
      if (timeDiff > 0) {
        const distance = calculateDistance(prevPoint.lat, prevPoint.lng, point.lat, point.lng);
        const speed = (distance / timeDiff) * 3.6; // Convert to km/h
        if (speed > 0 && speed < 200) {
          speeds.push(speed);
        }
      }
    } else if (point.speed !== undefined) {
      // Use provided speed
      const speedKmh = point.speed * 3.6;
      if (speedKmh > 0 && speedKmh < 200) {
        speeds.push(speedKmh);
      }
    }
    
    // Collect heart rate data
    if (point.heartRate && point.heartRate > 0 && point.heartRate < 250) {
      heartRates.push(point.heartRate);
    }
    
    // Collect cadence data
    if (point.cadence && point.cadence > 0 && point.cadence < 300) {
      cadences.push(point.cadence);
    }
  }
  
  // Calculate duration from timestamps if not provided
  if (!duration && trackPoints.length >= 2) {
    const first = trackPoints[0];
    const last = trackPoints[trackPoints.length - 1];
    if (first.timestamp && last.timestamp) {
      duration = (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;
    }
  }
  
  const avgSpeed = speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : undefined;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : undefined;
  const avgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length) : undefined;
  const maxHeartRate = heartRates.length > 0 ? Math.max(...heartRates) : undefined;
  const avgCadence = cadences.length > 0 ? Math.round(cadences.reduce((sum, c) => sum + c, 0) / cadences.length) : undefined;
  
  return {
    distance: Math.round(calculatedDistance),
    elevationGain: Math.round(totalElevationGain),
    duration,
    avgSpeed: avgSpeed ? Math.round(avgSpeed * 100) / 100 : undefined,
    maxSpeed: maxSpeed ? Math.round(maxSpeed * 100) / 100 : undefined,
    avgHeartRate,
    maxHeartRate,
    avgCadence
  };
}

/**
 * Map TCX sport type to our sport modes
 */
function mapTCXSportToSportMode(tcxSport: string): string {
  const sportMap: Record<string, string> = {
    'Biking': 'cycling',
    'Cycling': 'cycling',
    'Running': 'running',
    'Walking': 'walking',
    'Swimming': 'swimming',
    'Other': 'cycling' // Default fallback
  };
  
  return sportMap[tcxSport] || 'cycling';
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