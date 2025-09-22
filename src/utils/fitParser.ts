import { Decoder, Stream, Profile, Utils } from '@garmin/fitsdk';

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
        
        // Create stream from buffer
        const stream = Stream.fromByteArray(new Uint8Array(buffer));
        
        // Create decoder and check if valid FIT file
        const decoder = new Decoder(stream);
        if (!decoder.isFIT()) {
          throw new Error('File is not a valid FIT file');
        }
        
        // Read messages from the FIT file
        const { messages, errors } = decoder.read();
        
        if (errors.length > 0) {
          console.warn('FIT parsing errors:', errors);
        }
        
        console.log('FIT messages parsed:', Object.keys(messages));
        
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

function extractActivityData(messages: any): ParsedActivityData {
  console.log('Available message types:', Object.keys(messages));
  
  // Get messages by type - Garmin SDK groups messages by type
  const sessionMessages = messages.session || [];
  const activityMessages = messages.activity || [];
  const recordMessages = messages.record || [];
  const lapMessages = messages.lap || [];
  
  console.log('Session messages:', sessionMessages.length);
  console.log('Activity messages:', activityMessages.length);
  console.log('Record messages:', recordMessages.length);
  console.log('Lap messages:', lapMessages.length);

  // Use the first session as primary data source
  const sessionData = sessionMessages[0] || {};
  const activityData = activityMessages[0] || {};
  
  console.log('Session data sample:', sessionData);
  console.log('Activity data sample:', activityData);

  // Determine sport mode
  const sport = sessionData.sport || sessionData.subSport || activityData.sport || 2;
  const sportMode = SPORT_MAPPING[sport] || 'cycling';
  
  // Calculate basic metrics from session data
  const duration = sessionData.totalTimerTime || sessionData.totalElapsedTime || 0;
  const distance = sessionData.totalDistance || 0;
  const calories = sessionData.totalCalories || 0;
  
  // Power metrics
  const avgPower = sessionData.avgPower || null;
  const maxPower = sessionData.maxPower || null;
  const normalizedPower = sessionData.normalizedPower || calculateNormalizedPower(recordMessages);
  
  // Heart rate metrics  
  const avgHeartRate = sessionData.avgHeartRate || null;
  const maxHeartRate = sessionData.maxHeartRate || null;
  
  // Speed and pace calculations
  const avgSpeed = sessionData.avgSpeed ? sessionData.avgSpeed * 3.6 : 
                   (duration > 0 && distance > 0 ? (distance / duration) * 3.6 : null);
  const avgPace = avgSpeed ? (1000 / (avgSpeed * 1000 / 3600)) : null;
  
  // Elevation gain
  const elevationGain = sessionData.totalAscent || calculateElevationGain(recordMessages);
  
  // GPS data from record messages
  const gpsData = extractGPSData(recordMessages);
  
  // Lap data
  const lapData = lapMessages.length > 0 ? lapMessages : null;
  
  // Calculate training metrics
  const tss = calculateTSS(normalizedPower, duration);
  const intensityFactor = calculateIntensityFactor(normalizedPower);
  const variabilityIndex = calculateVariabilityIndex(avgPower, normalizedPower);
  
  // Get activity timestamp
  const timestamp = sessionData.startTime || sessionData.timestamp || 
                   activityData.timestamp || activityData.timeCreated || new Date();
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