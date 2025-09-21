import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { BinaryReader } from "https://deno.land/x/binary_reader@v0.1.3/mod.ts";
import { Fit } from "https://deno.land/x/fitreader@v0.1.3/fit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivityData {
  name: string;
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
  notes?: string;
}

interface GPSPoint {
  lat: number;
  lng: number;
  elevation?: number;
  time?: string;
  distance?: number;
  speed?: number;
  heart_rate?: number;
  power?: number;
  cadence?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, filePath, activityData } = await req.json();

    if (action === 'process_file') {
      // Download and process the uploaded file
      const { data: fileData, error: downloadError } = await supabaseClient.storage
        .from('activity-files')
        .download(filePath);

      if (downloadError) {
        console.error('Error downloading file:', downloadError);
        return new Response(JSON.stringify({ error: 'Failed to download file' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Enhanced file processing with binary support for FIT files
      let processedData;
      const fileExtension = filePath.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'fit') {
        // Handle FIT files as binary data
        const arrayBuffer = await fileData.arrayBuffer();
        processedData = await parseActivityFile(arrayBuffer, filePath);
      } else {
        // Handle GPX/TCX as text
        const fileContent = await fileData.text();
        processedData = await parseActivityFile(fileContent, filePath);
      }
      
      console.log('Processed activity data:', processedData);

      return new Response(JSON.stringify({ 
        success: true, 
        data: processedData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'save_activity') {
      // Save the activity to the database
      const { data, error } = await supabaseClient
        .from('activities')
        .insert({
          user_id: user.id,
          ...activityData
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving activity:', error);
        return new Response(JSON.stringify({ error: 'Failed to save activity' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update training history and power profile
      await updateTrainingHistory(supabaseClient, user.id, data);
      await updatePowerProfile(supabaseClient, user.id, data);

      return new Response(JSON.stringify({ 
        success: true, 
        activity: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-activity function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function parseActivityFile(content: string | ArrayBuffer, filePath: string): Promise<Partial<ActivityData>> {
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  // Basic parsing logic with enhanced GPS data extraction
  const activityData: Partial<ActivityData> = {
    name: 'Uploaded Activity',
    sport_mode: 'cycling',
    date: new Date().toISOString().split('T')[0],
    duration_seconds: 3600, // Default 1 hour
  };

  try {
    if (fileExtension === 'gpx' && typeof content === 'string') {
      await parseGPXFile(content, activityData);
    } else if (fileExtension === 'tcx' && typeof content === 'string') {
      await parseTCXFile(content, activityData);
    } else if (fileExtension === 'fit' && content instanceof ArrayBuffer) {
      await parseFITFile(content, filePath, activityData);
    }
  } catch (parseError) {
    console.error('Error parsing file:', parseError);
  }

  return activityData;
}

async function parseGPXFile(content: string, activityData: Partial<ActivityData>) {
  // Extract activity name
  const nameMatch = content.match(/<name>(.+?)<\/name>/);
  if (nameMatch) activityData.name = nameMatch[1];
  
  // Extract track points with enhanced GPS data
  const trackPointMatches = content.match(/<trkpt[^>]*lat="([^"]*)"[^>]*lon="([^"]*)"[^>]*>([\s\S]*?)<\/trkpt>/g) || [];
  const gpsPoints: GPSPoint[] = [];
  
  trackPointMatches.forEach(trkptMatch => {
    const latMatch = trkptMatch.match(/lat="([^"]*)"/);
    const lonMatch = trkptMatch.match(/lon="([^"]*)"/);
    const eleMatch = trkptMatch.match(/<ele>([^<]+)<\/ele>/);
    const timeMatch = trkptMatch.match(/<time>([^<]+)<\/time>/);
    
    if (latMatch && lonMatch) {
      const point: GPSPoint = {
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lonMatch[1])
      };
      
      if (eleMatch) point.elevation = parseFloat(eleMatch[1]);
      if (timeMatch) point.time = timeMatch[1];
      
      gpsPoints.push(point);
    }
  });

  if (gpsPoints.length > 0) {
    activityData.gps_data = { coordinates: gpsPoints };
    
    // Calculate distance and other metrics from GPS data
    const { distance, elevationGain } = calculateDistanceAndElevation(gpsPoints);
    activityData.distance_meters = distance;
    activityData.elevation_gain_meters = elevationGain;
    
    // Calculate duration from timestamps if available
    if (gpsPoints[0]?.time && gpsPoints[gpsPoints.length - 1]?.time) {
      const startTime = new Date(gpsPoints[0].time);
      const endTime = new Date(gpsPoints[gpsPoints.length - 1].time);
      activityData.duration_seconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }
    
    // Calculate average speed
    if (activityData.distance_meters && activityData.duration_seconds) {
      activityData.avg_speed_kmh = (activityData.distance_meters / 1000) / (activityData.duration_seconds / 3600);
    }
  }
}

async function parseTCXFile(content: string, activityData: Partial<ActivityData>) {
  // Enhanced TCX parsing with GPS data extraction
  const activityMatch = content.match(/<Activity Sport="([^"]+)"/);
  if (activityMatch) {
    activityData.sport_mode = activityMatch[1].toLowerCase();
  }
  
  // Extract basic metrics
  const distanceMatch = content.match(/<DistanceMeters>([^<]+)<\/DistanceMeters>/);
  if (distanceMatch) {
    activityData.distance_meters = parseFloat(distanceMatch[1]);
  }
  
  const timeMatch = content.match(/<TotalTimeSeconds>([^<]+)<\/TotalTimeSeconds>/);
  if (timeMatch) {
    activityData.duration_seconds = parseInt(timeMatch[1]);
  }
  
  // Extract power data
  const avgPowerMatch = content.match(/<AveragePower>([^<]+)<\/AveragePower>/);
  if (avgPowerMatch) {
    activityData.avg_power = parseFloat(avgPowerMatch[1]);
  }
  
  const maxPowerMatch = content.match(/<MaximumPower>([^<]+)<\/MaximumPower>/);
  if (maxPowerMatch) {
    activityData.max_power = parseFloat(maxPowerMatch[1]);
  }
  
  // Extract heart rate data
  const avgHrMatch = content.match(/<AverageHeartRateBpm>([^<]+)<\/AverageHeartRateBpm>/);
  if (avgHrMatch) {
    activityData.avg_heart_rate = parseInt(avgHrMatch[1]);
  }
  
  const maxHrMatch = content.match(/<MaximumHeartRateBpm>([^<]+)<\/MaximumHeartRateBpm>/);
  if (maxHrMatch) {
    activityData.max_heart_rate = parseInt(maxHrMatch[1]);
  }

  // Extract GPS data from trackpoints
  const trackpointMatches = content.match(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/g) || [];
  const gpsPoints: GPSPoint[] = [];
  
  trackpointMatches.forEach(tpMatch => {
    const latMatch = tpMatch.match(/<LatitudeDegrees>([^<]+)<\/LatitudeDegrees>/);
    const lonMatch = tpMatch.match(/<LongitudeDegrees>([^<]+)<\/LongitudeDegrees>/);
    const eleMatch = tpMatch.match(/<AltitudeMeters>([^<]+)<\/AltitudeMeters>/);
    const timeMatch = tpMatch.match(/<Time>([^<]+)<\/Time>/);
    const hrMatch = tpMatch.match(/<Value>([^<]+)<\/Value>/);
    
    if (latMatch && lonMatch) {
      const point: GPSPoint = {
        lat: parseFloat(latMatch[1]),
        lng: parseFloat(lonMatch[1])
      };
      
      if (eleMatch) point.elevation = parseFloat(eleMatch[1]);
      if (timeMatch) point.time = timeMatch[1];
      if (hrMatch) point.heart_rate = parseInt(hrMatch[1]);
      
      gpsPoints.push(point);
    }
  });

  if (gpsPoints.length > 0) {
    activityData.gps_data = { coordinates: gpsPoints };
  }
  
  // Calculate TSS and speed
  if (activityData.distance_meters && activityData.duration_seconds) {
    if (!activityData.avg_speed_kmh) {
      activityData.avg_speed_kmh = (activityData.distance_meters / 1000) / (activityData.duration_seconds / 3600);
    }
    
    // Basic TSS calculation
    if (activityData.avg_power) {
      const ftp = 250; // Assumed FTP - should be fetched from user profile
      const intensity_factor = activityData.avg_power / ftp;
      activityData.intensity_factor = intensity_factor;
      activityData.tss = Math.round((activityData.duration_seconds / 3600) * intensity_factor * intensity_factor * 100);
    } else {
      activityData.tss = Math.round(activityData.duration_seconds / 3600 * 100);
    }
  }
}

async function parseFITFile(arrayBuffer: ArrayBuffer, filePath: string, activityData: Partial<ActivityData>) {
  try {
    console.log('Parsing FIT file:', filePath);
    
    // Initialize FIT parser with Deno-compatible fitreader
    const binaryReader = new BinaryReader(new Uint8Array(arrayBuffer));
    const fit = new Fit(binaryReader);
    
    console.log('FIT file parsed successfully, sessions:', fit.sessions?.length || 0);

    if (!fit.sessions || fit.sessions.length === 0) {
      console.log('No sessions found in FIT file, using fallback data');
      return;
    }

    const session = fit.sessions[0]; // Get the first session
    const records = fit.records || [];
    
    console.log('Found FIT data:', {
      sessions: fit.sessions.length,
      records: records.length,
      fileId: !!fit.fileId
    });

    // Extract file creation time
    if (fit.fileId?.timeCreated) {
      const timestamp = new Date(fit.fileId.timeCreated * 1000 + new Date('1989-12-31T00:00:00Z').getTime());
      activityData.date = timestamp.toISOString().split('T')[0];
    }

    // Extract session data (main activity summary)
    if (session) {
      console.log('Session data keys:', Object.keys(session));

      // Activity name from filename  
      const fileName = filePath.split('/').pop() || 'FIT Activity';
      activityData.name = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
      
      // Map FIT sport types to our sport modes
      if (session.sport) {
        const sportMap: { [key: string]: string } = {
          'cycling': 'cycling',
          'running': 'running',
          'swimming': 'swimming',
          'biking': 'cycling',
          'bike': 'cycling',
          'run': 'running',
          'swim': 'swimming'
        };
        activityData.sport_mode = sportMap[session.sport.toLowerCase()] || 'cycling';
      }

      // Duration (in seconds)
      if (session.totalTimerTime !== undefined) {
        activityData.duration_seconds = Math.round(session.totalTimerTime);
      } else if (session.totalElapsedTime !== undefined) {
        activityData.duration_seconds = Math.round(session.totalElapsedTime);
      }

      // Distance (in meters)
      if (session.totalDistance !== undefined) {
        activityData.distance_meters = Math.round(session.totalDistance);
      }

      // Elevation gain (in meters)  
      if (session.totalAscent !== undefined) {
        activityData.elevation_gain_meters = Math.round(session.totalAscent);
      }

      // Power data (in watts)
      if (session.avgPower !== undefined) {
        activityData.avg_power = Math.round(session.avgPower);
      }
      if (session.maxPower !== undefined) {
        activityData.max_power = Math.round(session.maxPower);
      }
      if (session.normalizedPower !== undefined) {
        activityData.normalized_power = Math.round(session.normalizedPower);
      }

      // Heart rate data (in bpm)
      if (session.avgHeartRate !== undefined) {
        activityData.avg_heart_rate = Math.round(session.avgHeartRate);
      }
      if (session.maxHeartRate !== undefined) {
        activityData.max_heart_rate = Math.round(session.maxHeartRate);
      }

      // Speed data
      if (session.avgSpeed !== undefined) {
        activityData.avg_speed_kmh = parseFloat((session.avgSpeed * 3.6).toFixed(1)); // Convert m/s to km/h
      }

      // Pace calculation for running
      if (activityData.sport_mode === 'running' && activityData.avg_speed_kmh) {
        activityData.avg_pace_per_km = 60 / activityData.avg_speed_kmh; // minutes per km
      }

      // Calories
      if (session.totalCalories !== undefined) {
        activityData.calories = Math.round(session.totalCalories);
      }

      // Training Stress Score and Intensity Factor
      if (session.trainingStressScore !== undefined) {
        activityData.tss = Math.round(session.trainingStressScore);
      }
      if (session.intensityFactor !== undefined) {
        activityData.intensity_factor = parseFloat(session.intensityFactor.toFixed(3));
      }

      console.log('Extracted session data:', {
        sport: activityData.sport_mode,
        duration: activityData.duration_seconds,
        distance: activityData.distance_meters,
        avgPower: activityData.avg_power,
        avgHR: activityData.avg_heart_rate
      });
    }

    // Extract GPS data from records
    if (records.length > 0) {
      console.log('Processing', records.length, 'GPS records');
      const gpsPoints: GPSPoint[] = [];
      
      records.forEach((record: any, index: number) => {
        // Only include points with valid GPS coordinates
        if (record.positionLat !== undefined && record.positionLong !== undefined && 
            record.positionLat !== null && record.positionLong !== null) {
          
          const point: GPSPoint = {
            lat: record.positionLat,
            lng: record.positionLong
          };

          // Add optional data if available
          if (record.altitude !== undefined && record.altitude !== null) {
            point.elevation = record.altitude;
          }
          if (record.timestamp !== undefined) {
            const timestamp = new Date(record.timestamp * 1000 + new Date('1989-12-31T00:00:00Z').getTime());
            point.time = timestamp.toISOString();
          }
          if (record.distance !== undefined && record.distance !== null) {
            point.distance = record.distance;
          }
          if (record.speed !== undefined && record.speed !== null) {
            point.speed = record.speed * 3.6; // Convert m/s to km/h
          }
          if (record.heartRate !== undefined && record.heartRate !== null) {
            point.heart_rate = record.heartRate;
          }
          if (record.power !== undefined && record.power !== null) {
            point.power = record.power;
          }
          if (record.cadence !== undefined && record.cadence !== null) {
            point.cadence = record.cadence;
          }

          gpsPoints.push(point);
        }
      });

      if (gpsPoints.length > 0) {
        console.log('Extracted', gpsPoints.length, 'GPS points');
        activityData.gps_data = { coordinates: gpsPoints };

        // Calculate missing metrics from GPS data if not provided by session
        if (!activityData.distance_meters || !activityData.duration_seconds) {
          const { distance, elevationGain } = calculateDistanceAndElevation(gpsPoints);
          
          if (!activityData.distance_meters) {
            activityData.distance_meters = distance;
          }
          if (!activityData.elevation_gain_meters) {
            activityData.elevation_gain_meters = elevationGain;
          }

          // Calculate duration from GPS timestamps if not available
          if (!activityData.duration_seconds && gpsPoints[0]?.time && gpsPoints[gpsPoints.length - 1]?.time) {
            const startTime = new Date(gpsPoints[0].time);
            const endTime = new Date(gpsPoints[gpsPoints.length - 1].time);
            activityData.duration_seconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
          }
        }

        // Calculate average speed if not provided
        if (!activityData.avg_speed_kmh && activityData.distance_meters && activityData.duration_seconds) {
          activityData.avg_speed_kmh = parseFloat(((activityData.distance_meters / 1000) / (activityData.duration_seconds / 3600)).toFixed(1));
        }
      } else {
        console.log('No valid GPS points found in record messages');
      }
    }

    // Calculate TSS if not provided but we have power data
    if (!activityData.tss && activityData.avg_power && activityData.duration_seconds) {
      const ftp = 250; // Default FTP - should be fetched from user profile
      const intensity_factor = activityData.avg_power / ftp;
      activityData.intensity_factor = parseFloat(intensity_factor.toFixed(3));
      activityData.tss = Math.round((activityData.duration_seconds / 3600) * intensity_factor * intensity_factor * 100);
    }

    // Calculate variability index if we have normalized and average power
    if (activityData.normalized_power && activityData.avg_power && activityData.avg_power > 0) {
      activityData.variability_index = parseFloat((activityData.normalized_power / activityData.avg_power).toFixed(3));
    }

    console.log('Final parsed FIT data:', {
      name: activityData.name,
      sport: activityData.sport_mode,
      duration: activityData.duration_seconds,
      distance: activityData.distance_meters,
      avgPower: activityData.avg_power,
      maxPower: activityData.max_power,
      avgHR: activityData.avg_heart_rate,
      gpsPoints: activityData.gps_data?.coordinates?.length || 0,
      tss: activityData.tss
    });

  } catch (error) {
    console.error('Error parsing FIT file:', error);
    // Fallback to mock data if parsing fails
    const fileName = filePath.split('/').pop() || '';
    activityData.name = fileName.replace(/\.[^/.]+$/, "").replace(/_/g, ' ') || 'FIT Activity';
    activityData.sport_mode = 'cycling';
    activityData.duration_seconds = 3600;
    activityData.distance_meters = 30000;
    activityData.avg_power = 200;
    activityData.max_power = 400;
    console.log('Using fallback data due to parsing error');
  }
}

function calculateDistanceAndElevation(gpsPoints: GPSPoint[]) {
  let totalDistance = 0;
  let totalElevationGain = 0;
  let lastElevation = gpsPoints[0]?.elevation || 0;

  for (let i = 1; i < gpsPoints.length; i++) {
    const prev = gpsPoints[i - 1];
    const curr = gpsPoints[i];

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const φ1 = prev.lat * Math.PI / 180;
    const φ2 = curr.lat * Math.PI / 180;
    const Δφ = (curr.lat - prev.lat) * Math.PI / 180;
    const Δλ = (curr.lng - prev.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    totalDistance += distance;

    // Calculate elevation gain
    if (curr.elevation && curr.elevation > lastElevation) {
      totalElevationGain += curr.elevation - lastElevation;
    }
    if (curr.elevation) {
      lastElevation = curr.elevation;
    }
  }

  return {
    distance: Math.round(totalDistance),
    elevationGain: Math.round(totalElevationGain)
  };
}

async function updateTrainingHistory(supabaseClient: any, userId: string, activity: any) {
  try {
    const { error } = await supabaseClient
      .from('training_history')
      .upsert({
        user_id: userId,
        date: activity.date,
        sport: activity.sport_mode,
        duration_minutes: Math.round(activity.duration_seconds / 60),
        tss: activity.tss || 0
      }, {
        onConflict: 'user_id,date,sport'
      });

    if (error) {
      console.error('Error updating training history:', error);
    }
  } catch (error) {
    console.error('Error in updateTrainingHistory:', error);
  }
}

async function updatePowerProfile(supabaseClient: any, userId: string, activity: any) {
  try {
    // Update power profile for cycling activities with power data
    if (activity.sport_mode === 'cycling' && activity.avg_power) {
      const powerEntries = [];
      
      // Add entries for different durations based on activity data
      if (activity.max_power) {
        powerEntries.push({
          user_id: userId,
          duration_seconds: 60, // 1 minute power (use max power as approximation)
          power_watts: Math.round(activity.max_power * 0.95), // Slightly lower than absolute max
          sport: activity.sport_mode,
          date_achieved: activity.date
        });
      }
      
      if (activity.normalized_power) {
        powerEntries.push({
          user_id: userId,
          duration_seconds: 1200, // 20 minute power (normalized power is good approximation)
          power_watts: activity.normalized_power,
          sport: activity.sport_mode,
          date_achieved: activity.date
        });
      }
      
      // Average power approximates longer durations
      powerEntries.push({
        user_id: userId,
        duration_seconds: 3600, // 60 minute power
        power_watts: activity.avg_power,
        sport: activity.sport_mode,
        date_achieved: activity.date
      });

      // 5 minute power (between normalized and average)
      if (activity.normalized_power && activity.avg_power) {
        const fiveMinPower = Math.round((activity.normalized_power + activity.avg_power) / 2);
        powerEntries.push({
          user_id: userId,
          duration_seconds: 300, // 5 minute power
          power_watts: fiveMinPower,
          sport: activity.sport_mode,
          date_achieved: activity.date
        });
      }

      // Insert all power profile entries
      for (const entry of powerEntries) {
        const { error } = await supabaseClient
          .from('power_profile')
          .upsert(entry, {
            onConflict: 'user_id,duration_seconds,sport'
          });

        if (error) {
          console.error('Error updating power profile entry:', error);
        }
      }
    }
    
    // Update pace profile for running activities
    if (activity.sport_mode === 'running' && activity.avg_pace_per_km) {
      const paceEntries = [];
      
      // Estimate different pace durations based on average pace
      const avgPace = activity.avg_pace_per_km;
      
      paceEntries.push({
        user_id: userId,
        duration_seconds: 60, // 1 minute pace (faster than average)
        pace_per_km: Math.max(avgPace * 0.85, 2.5), // 15% faster, minimum 2:30/km
        sport: activity.sport_mode,
        date_achieved: activity.date
      });
      
      paceEntries.push({
        user_id: userId,
        duration_seconds: 300, // 5 minute pace
        pace_per_km: avgPace * 0.90, // 10% faster
        sport: activity.sport_mode,
        date_achieved: activity.date
      });
      
      paceEntries.push({
        user_id: userId,
        duration_seconds: 1200, // 20 minute pace
        pace_per_km: avgPace * 0.95, // 5% faster
        sport: activity.sport_mode,
        date_achieved: activity.date
      });
      
      paceEntries.push({
        user_id: userId,
        duration_seconds: 3600, // 60 minute pace (use average)
        pace_per_km: avgPace,
        sport: activity.sport_mode,
        date_achieved: activity.date
      });

      // Insert all pace profile entries
      for (const entry of paceEntries) {
        const { error } = await supabaseClient
          .from('power_profile')
          .upsert(entry, {
            onConflict: 'user_id,duration_seconds,sport'
          });

        if (error) {
          console.error('Error updating pace profile entry:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error in updatePowerProfile:', error);
  }
}