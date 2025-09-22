import { FitParser, FitActivity, FitSession, FitRecord, FitLap } from '@garmin/fitsdk';

export interface ParsedActivityData {
  name?: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_pace_per_km?: number;
  avg_speed_kmh?: number;
  calories?: number;
  tss?: number;
  intensity_factor?: number;
  variability_index?: number;
  gps_data?: any;
  lap_data?: any;
}

// Sport mapping from FIT to our sport modes
const SPORT_MAPPING: Record<number, string> = {
  0: 'general', // generic
  1: 'running',
  2: 'cycling',
  3: 'transition', // triathlon transition
  4: 'fitness_equipment',
  5: 'swimming',
  6: 'basketball',
  7: 'soccer',
  8: 'tennis',
  9: 'american_football',
  10: 'training',
  11: 'walking',
  12: 'cross_country_skiing',
  13: 'alpine_skiing',
  14: 'snowboarding',
  15: 'rowing',
  16: 'mountaineering',
  17: 'hiking',
  18: 'multisport',
  19: 'paddling',
  // Add more as needed
};

export function parseFitFile(file: File): Promise<ParsedActivityData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error('Failed to read file');
        }

        console.log('Parsing FIT file:', file.name);
        const fitParser = new FitParser();
        const messages = fitParser.parse(new Uint8Array(buffer));
        
        console.log('FIT messages parsed:', messages.length);
        
        // Extract activity data
        const activityData = extractActivityData(messages);
        
        console.log('Extracted activity data:', activityData);
        resolve(activityData);
        
      } catch (error) {
        console.error('Error parsing FIT file:', error);
        reject(new Error(`Failed to parse FIT file: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

function extractActivityData(messages: any[]): ParsedActivityData {
  let sessionData: any = null;
  let activityData: any = null;
  let records: any[] = [];
  let laps: any[] = [];
  
  // Parse different message types
  messages.forEach(message => {
    switch (message.messageType) {
      case 'session':
        sessionData = message;
        break;
      case 'activity':
        activityData = message;
        break;
      case 'record':
        records.push(message);
        break;
      case 'lap':
        laps.push(message);
        break;
    }
  });

  console.log('Session data:', sessionData);
  console.log('Activity data:', activityData);
  console.log('Records count:', records.length);
  console.log('Laps count:', laps.length);

  // Use session data as primary source, fall back to activity data
  const primaryData = sessionData || activityData || {};
  
  // Determine sport mode
  const sport = primaryData.sport || primaryData.subSport || 2; // Default to cycling
  const sportMode = SPORT_MAPPING[sport] || 'cycling';
  
  // Calculate basic metrics
  const duration = primaryData.totalTimerTime || primaryData.totalElapsedTime || 0;
  const distance = primaryData.totalDistance || 0;
  const calories = primaryData.totalCalories || 0;
  
  // Power metrics
  const avgPower = primaryData.avgPower || null;
  const maxPower = primaryData.maxPower || null;
  const normalizedPower = primaryData.normalizedPower || calculateNormalizedPower(records);
  
  // Heart rate metrics
  const avgHeartRate = primaryData.avgHeartRate || null;
  const maxHeartRate = primaryData.maxHeartRate || null;
  
  // Speed and pace calculations
  const avgSpeed = duration > 0 && distance > 0 ? (distance / duration) * 3.6 : null; // km/h
  const avgPace = avgSpeed ? (1000 / (avgSpeed * 1000 / 3600)) : null; // seconds per km
  
  // Elevation gain
  const elevationGain = primaryData.totalAscent || calculateElevationGain(records);
  
  // GPS data
  const gpsData = extractGPSData(records);
  
  // Lap data
  const lapData = laps.length > 0 ? laps : null;
  
  // Calculate training metrics
  const tss = calculateTSS(normalizedPower, duration);
  const intensityFactor = calculateIntensityFactor(normalizedPower);
  const variabilityIndex = calculateVariabilityIndex(avgPower, normalizedPower);
  
  // Get activity timestamp
  const timestamp = primaryData.startTime || activityData?.timestamp || new Date();
  const activityDate = new Date(timestamp).toISOString().split('T')[0];
  
  return {
    sport_mode: sportMode,
    date: activityDate,
    duration_seconds: Math.round(duration),
    distance_meters: distance ? Math.round(distance) : undefined,
    elevation_gain_meters: elevationGain ? Math.round(elevationGain) : undefined,
    avg_power: avgPower ? Math.round(avgPower) : undefined,
    max_power: maxPower ? Math.round(maxPower) : undefined,
    normalized_power: normalizedPower ? Math.round(normalizedPower) : undefined,
    avg_heart_rate: avgHeartRate ? Math.round(avgHeartRate) : undefined,
    max_heart_rate: maxHeartRate ? Math.round(maxHeartRate) : undefined,
    avg_pace_per_km: avgPace ? Math.round(avgPace) : undefined,
    avg_speed_kmh: avgSpeed ? Math.round(avgSpeed * 100) / 100 : undefined,
    calories: calories ? Math.round(calories) : undefined,
    tss: tss ? Math.round(tss) : undefined,
    intensity_factor: intensityFactor ? Math.round(intensityFactor * 100) / 100 : undefined,
    variability_index: variabilityIndex ? Math.round(variabilityIndex * 100) / 100 : undefined,
    gps_data: gpsData,
    lap_data: lapData
  };
}

function extractGPSData(records: any[]): any {
  const coordinates: Array<[number, number]> = [];
  const trackPoints: any[] = [];
  
  records.forEach(record => {
    if (record.positionLat !== undefined && record.positionLong !== undefined) {
      // Convert semicircles to degrees
      const lat = record.positionLat * (180 / Math.pow(2, 31));
      const lng = record.positionLong * (180 / Math.pow(2, 31));
      
      if (lat !== 0 && lng !== 0) {
        coordinates.push([lng, lat]); // GeoJSON format [lng, lat]
        
        trackPoints.push({
          lat,
          lng,
          timestamp: record.timestamp,
          altitude: record.altitude,
          heartRate: record.heartRate,
          power: record.power,
          speed: record.speed,
          cadence: record.cadence
        });
      }
    }
  });
  
  if (coordinates.length === 0) return null;
  
  return {
    type: 'LineString',
    coordinates,
    trackPoints
  };
}

function calculateNormalizedPower(records: any[]): number | null {
  const powerData = records
    .map(r => r.power)
    .filter(p => p !== undefined && p !== null && p > 0);
    
  if (powerData.length === 0) return null;
  
  // Simplified NP calculation (30-second rolling average to 4th power)
  const windowSize = 30;
  const rollingAverages: number[] = [];
  
  for (let i = 0; i < powerData.length - windowSize + 1; i++) {
    const window = powerData.slice(i, i + windowSize);
    const avg = window.reduce((sum, p) => sum + p, 0) / window.length;
    rollingAverages.push(Math.pow(avg, 4));
  }
  
  if (rollingAverages.length === 0) return null;
  
  const avgFourthPower = rollingAverages.reduce((sum, p) => sum + p, 0) / rollingAverages.length;
  return Math.pow(avgFourthPower, 0.25);
}

function calculateElevationGain(records: any[]): number | null {
  const elevationData = records
    .map(r => r.altitude)
    .filter(alt => alt !== undefined && alt !== null);
    
  if (elevationData.length < 2) return null;
  
  let totalGain = 0;
  for (let i = 1; i < elevationData.length; i++) {
    const gain = elevationData[i] - elevationData[i - 1];
    if (gain > 0) {
      totalGain += gain;
    }
  }
  
  return totalGain;
}

function calculateTSS(normalizedPower: number | null, duration: number): number | null {
  if (!normalizedPower || duration <= 0) return null;
  
  // Simplified TSS calculation (assumes FTP of 250W for now)
  // TSS = (seconds * NP * IF) / (FTP * 3600) * 100
  const assumedFTP = 250;
  const intensityFactor = normalizedPower / assumedFTP;
  
  return (duration * normalizedPower * intensityFactor) / (assumedFTP * 3600) * 100;
}

function calculateIntensityFactor(normalizedPower: number | null): number | null {
  if (!normalizedPower) return null;
  
  // Assumes FTP of 250W - in real app, this should come from user profile
  const assumedFTP = 250;
  return normalizedPower / assumedFTP;
}

function calculateVariabilityIndex(avgPower: number | null, normalizedPower: number | null): number | null {
  if (!avgPower || !normalizedPower || avgPower <= 0) return null;
  
  return normalizedPower / avgPower;
}