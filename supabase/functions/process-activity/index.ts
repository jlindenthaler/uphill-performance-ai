import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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

      // Basic file processing (simplified for initial implementation)
      const fileContent = await fileData.text();
      const processedData = parseActivityFile(fileContent, filePath);
      
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

function parseActivityFile(content: string, filePath: string): Partial<ActivityData> {
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  
  // Basic parsing logic (simplified for initial implementation)
  const activityData: Partial<ActivityData> = {
    name: 'Uploaded Activity',
    sport_mode: 'cycling',
    date: new Date().toISOString().split('T')[0],
    duration_seconds: 3600, // Default 1 hour
  };

  try {
    if (fileExtension === 'gpx') {
      // Basic GPX parsing
      const nameMatch = content.match(/<name>(.+?)<\/name>/);
      if (nameMatch) activityData.name = nameMatch[1];
      
      // Extract track points for basic analysis
      const trackPoints = content.match(/<trkpt[^>]*>[\s\S]*?<\/trkpt>/g) || [];
      if (trackPoints.length > 0) {
        activityData.distance_meters = trackPoints.length * 50; // Rough estimate
        activityData.avg_speed_kmh = 25; // Default cycling speed
      }
    } else if (fileExtension === 'tcx') {
      // Basic TCX parsing
      const activityMatch = content.match(/<Activity Sport="([^"]+)"/);
      if (activityMatch) {
        activityData.sport_mode = activityMatch[1].toLowerCase();
      }
      
      const distanceMatch = content.match(/<DistanceMeters>([^<]+)<\/DistanceMeters>/);
      if (distanceMatch) {
        activityData.distance_meters = parseFloat(distanceMatch[1]);
      }
      
      const timeMatch = content.match(/<TotalTimeSeconds>([^<]+)<\/TotalTimeSeconds>/);
      if (timeMatch) {
        activityData.duration_seconds = parseInt(timeMatch[1]);
      }
    }
  } catch (parseError) {
    console.error('Error parsing file:', parseError);
  }

  return activityData;
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
    if (activity.max_power && activity.sport_mode === 'cycling') {
      const { error } = await supabaseClient
        .from('power_profile')
        .upsert({
          user_id: userId,
          duration_seconds: 60, // 1 minute power (simplified)
          power_watts: activity.max_power,
          sport: activity.sport_mode,
          date_achieved: activity.date
        }, {
          onConflict: 'user_id,duration_seconds,sport'
        });

      if (error) {
        console.error('Error updating power profile:', error);
      }
    }
  } catch (error) {
    console.error('Error in updatePowerProfile:', error);
  }
}