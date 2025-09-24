import { Decoder, Stream, Profile, Utils } from '@garmin/fitsdk';
import { fromUserTimezone } from './dateFormat';

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
  avg_cadence?: number;
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

export function parseFitFile(file: File, userTimezone?: string): Promise<ParsedActivityData> {
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
        const activityData = extractActivityData(messages, userTimezone);
        
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

function extractActivityData(messages: any, userTimezone?: string): ParsedActivityData {
  console.log('Available message types:', Object.keys(messages));
  
  // Get messages by type - Garmin SDK uses different property names
  const sessionMessages = messages.sessionMesgs || [];
  const activityMessages = messages.activityMesgs || [];
  const recordMessages = messages.recordMesgs || [];
  const lapMessages = messages.lapMesgs || [];
  
  console.log('Session messages:', sessionMessages.length);
  console.log('Activity messages:', activityMessages.length);
  console.log('Record messages:', recordMessages.length);
  console.log('Lap messages:', lapMessages.length);

  // Use the first session as primary data source
  const sessionData = sessionMessages[0] || {};
  const activityData = activityMessages[0] || {};
  
  console.log('Session data sample:', sessionData);
  console.log('Activity data sample:', activityData);
  
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };

  
  // Determine sport mode
  const sport = unwrapValue(sessionData.sport) || unwrapValue(sessionData.subSport) || unwrapValue(activityData.sport) || 2;
  const sportMode = SPORT_MAPPING[sport] || 'cycling';
  
  console.log('Sport:', sport, 'Sport mode:', sportMode);
  
  // Calculate basic metrics from session data
  const duration = unwrapValue(sessionData.totalTimerTime) || unwrapValue(sessionData.totalElapsedTime) || 0;
  const distance = unwrapValue(sessionData.totalDistance) || 0;
  const calories = unwrapValue(sessionData.totalCalories) || 0;
  
  console.log('Raw values - Duration:', duration, 'Distance:', distance, 'Calories:', calories);
  
  // Power metrics
  const avgPower = unwrapValue(sessionData.avgPower) || null;
  const maxPower = unwrapValue(sessionData.maxPower) || null;
  const normalizedPower = unwrapValue(sessionData.normalizedPower) || calculateNormalizedPower(recordMessages);
  
  // Heart rate metrics  
  const avgHeartRate = unwrapValue(sessionData.avgHeartRate) || null;
  const maxHeartRate = unwrapValue(sessionData.maxHeartRate) || null;
  
  // Cadence metrics
  const avgCadence = unwrapValue(sessionData.avgCadence) || calculateAverageCadence(recordMessages);
  
  // Speed and pace calculations
  const rawAvgSpeed = unwrapValue(sessionData.avgSpeed);
  const avgSpeed = rawAvgSpeed ? rawAvgSpeed * 3.6 : 
                   (duration > 0 && distance > 0 ? (distance / duration) * 3.6 : null);
  const avgPace = avgSpeed ? (1000 / (avgSpeed * 1000 / 3600)) : null;
  
  console.log('Speed calculations - Raw avg speed:', rawAvgSpeed, 'Calculated avg speed:', avgSpeed);
  
  // Elevation gain
  const elevationGain = unwrapValue(sessionData.totalAscent) || calculateElevationGain(recordMessages);
  
  // GPS data from record messages
  const gpsData = extractGPSData(recordMessages);
  
  // Lap data
  const lapData = lapMessages.length > 0 ? lapMessages : null;
  
  // Calculate training metrics
  const tss = calculateTLI(normalizedPower, duration);
  const intensityFactor = calculateIntensityFactor(normalizedPower);
  const variabilityIndex = calculateVariabilityIndex(avgPower, normalizedPower);
  
  // Get activity timestamp and preserve it as full timestamp
  const rawStartTime = unwrapValue(sessionData.startTime);
  const rawTimestamp = unwrapValue(sessionData.timestamp);
  const rawActivityTimestamp = unwrapValue(activityData.timestamp);
  const rawTimeCreated = unwrapValue(activityData.timeCreated);
  
  console.log('FIT timestamp extraction:', {
    rawStartTime,
    rawTimestamp,
    rawActivityTimestamp,
    rawTimeCreated
  });
  
  const timestamp = rawStartTime || rawTimestamp || rawActivityTimestamp || rawTimeCreated || new Date();
  
  // Store the full timestamp, not just the date
  // This allows timezone conversions to be visible when displaying
  const activityDate = new Date(timestamp).toISOString();
  
  console.log('Final extracted timestamp:', {
    original: timestamp,
    converted: activityDate
  });
  
  console.log('Final extracted values:', {
    duration_seconds: Math.round(duration),
    distance_meters: distance ? Math.round(distance) : undefined,
    avg_speed_kmh: avgSpeed ? Math.round(avgSpeed * 100) / 100 : undefined,
    sportMode
  });
  
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
    avg_cadence: avgCadence ? Math.round(avgCadence) : undefined,
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
  
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };
  
  records.forEach(record => {
    const lat = unwrapValue(record.positionLat);
    const lng = unwrapValue(record.positionLong);
    
    if (lat !== undefined && lng !== undefined) {
      // Convert semicircles to degrees
      const latDeg = lat * (180 / Math.pow(2, 31));
      const lngDeg = lng * (180 / Math.pow(2, 31));
      
      if (latDeg !== 0 && lngDeg !== 0) {
        coordinates.push([lngDeg, latDeg]); // GeoJSON format [lng, lat]
        
        trackPoints.push({
          lat: latDeg,
          lng: lngDeg,
          timestamp: unwrapValue(record.timestamp),
          altitude: unwrapValue(record.altitude),
          heartRate: unwrapValue(record.heartRate),
          power: unwrapValue(record.power),
          speed: unwrapValue(record.speed),
          cadence: unwrapValue(record.cadence),
          temperature: unwrapValue(record.temperature),
          leftRightBalance: unwrapValue(record.leftRightBalance),
          leftPowerPhase: unwrapValue(record.leftPowerPhase),
          rightPowerPhase: unwrapValue(record.rightPowerPhase)
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
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };
  
  const powerData = records
    .map(r => unwrapValue(r.power))
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
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };
  
  const elevationData = records
    .map(r => unwrapValue(r.altitude))
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

function calculateTLI(normalizedPower: number | null, duration: number): number | null {
  if (!normalizedPower || duration <= 0) return null;
  
  // Simplified TLI calculation (assumes FTP of 250W for now)
  // TLI = (seconds * NP * IF) / (FTP * 3600) * 100
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

function calculateAverageCadence(records: any[]): number | null {
  // Helper function to unwrap FIT SDK values
  const unwrapValue = (obj: any) => {
    if (obj && typeof obj === 'object' && 'value' in obj) {
      return obj.value !== 'undefined' ? obj.value : undefined;
    }
    return obj;
  };
  
  const cadenceData = records
    .map(r => unwrapValue(r.cadence))
    .filter(c => c !== undefined && c !== null && c > 0);
    
  if (cadenceData.length === 0) return null;
  
  return cadenceData.reduce((sum, c) => sum + c, 0) / cadenceData.length;
}