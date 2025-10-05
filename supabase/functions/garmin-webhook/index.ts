import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // ✅ Garmin handshake verification
  if (req.method === 'GET' || req.method === 'HEAD') {
    console.log('Garmin handshake verification request');
    return new Response('ok', {
      status: 200
    });
  }
  // ✅ CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // ✅ Handle notifications
  if (req.method === 'POST') {
    try {
      const notification = await req.json();
      console.log('Garmin webhook notification (RAW):', JSON.stringify(notification, null, 2));
      console.log('Garmin webhook received:', JSON.stringify(notification, null, 2));
      const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
      
      // Handle deregistration notifications
      const { userId: garminUserId, type } = notification;
      if (type === 'USER_DEREGISTRATION') {
        console.log(`User ${garminUserId} deregistered`);
        await supabase.from('garmin_tokens').delete().eq('garmin_user_id', garminUserId);
        return new Response('ok', { status: 200 });
      }

      // Handle activities array (backfill response format)
      if (notification.activities && Array.isArray(notification.activities)) {
        console.log(`Processing ${notification.activities.length} activities from backfill`);
        
        for (const activity of notification.activities) {
          const garminUserId = activity.userId;
          const garminActivityId = activity.summaryId?.toString() || activity.activityId?.toString();
          
          if (!garminUserId || !garminActivityId) {
            console.warn('Missing userId or activityId:', activity);
            continue;
          }

          // Get our user_id using Garmin user id
          let { data: tokenRow } = await supabase
            .from('garmin_tokens')
            .select('user_id')
            .eq('garmin_user_id', garminUserId)
            .maybeSingle();
          
          // Fallback: If not found by garmin_user_id, try to find by checking all tokens
          if (!tokenRow) {
            console.log(`No token found with garmin_user_id ${garminUserId}, checking for tokens without garmin_user_id...`);
            const { data: tokensWithoutGarminId } = await supabase
              .from('garmin_tokens')
              .select('user_id')
              .is('garmin_user_id', null)
              .limit(1)
              .maybeSingle();
            
            if (tokensWithoutGarminId) {
              console.log(`Updating token for user ${tokensWithoutGarminId.user_id} with garmin_user_id ${garminUserId}`);
              const { error: updateError } = await supabase
                .from('garmin_tokens')
                .update({ garmin_user_id: garminUserId })
                .eq('user_id', tokensWithoutGarminId.user_id);
              
              if (!updateError) {
                tokenRow = tokensWithoutGarminId;
              } else {
                console.error('Failed to update garmin_user_id:', updateError);
              }
            }
          }
          
          if (!tokenRow) {
            console.error(`No user found for Garmin ID: ${garminUserId}`);
            continue;
          }

          const userId = tokenRow.user_id;

          // Convert Unix timestamp to ISO string
          const activityDate = activity.startTimeInSeconds 
            ? new Date(activity.startTimeInSeconds * 1000).toISOString()
            : new Date().toISOString();

          // Insert activity into database
          const { error: insertError } = await supabase.from('activities').insert({
            user_id: userId,
            garmin_activity_id: garminActivityId,
            name: activity.activityName || 'Garmin Activity',
            date: activityDate,
            duration_seconds: activity.durationInSeconds || 0,
            distance_meters: activity.distanceInMeters || null,
            elevation_gain_meters: activity.totalElevationGainInMeters || null,
            avg_heart_rate: activity.averageHeartRateInBeatsPerMinute || null,
            max_heart_rate: activity.maxHeartRateInBeatsPerMinute || null,
            calories: activity.activeKilocalories || null,
            avg_cadence: activity.averageBikeCadenceInRoundsPerMinute || null,
            avg_speed_kmh: activity.averageSpeedInMetersPerSecond ? activity.averageSpeedInMetersPerSecond * 3.6 : null,
            sport_mode: mapGarminSportType(activity.activityType),
            external_sync_source: 'garmin'
          });

          if (insertError && insertError.code !== '23505') {
            console.error(`Error inserting activity ${garminActivityId}:`, insertError.message);
          } else {
            console.log(`✅ Inserted activity ${garminActivityId}`);
          }

          // Enqueue FIT download job for detailed data
          const { error: jobError } = await supabase.from('garmin_fit_jobs').upsert({
            user_id: userId,
            garmin_activity_id: garminActivityId,
            status: 'pending'
          });

          if (jobError) {
            console.error(`Failed to queue FIT job for ${garminActivityId}:`, jobError.message);
          } else {
            console.log(`Queued FIT job for activity ${garminActivityId}`);
          }
        }
      }

      // Handle activityFiles array (FIT file notifications)
      if (notification.activityFiles && Array.isArray(notification.activityFiles)) {
        console.log(`Processing ${notification.activityFiles.length} FIT files`);
        
        for (const file of notification.activityFiles) {
          const garminUserId = file.userId;
          const garminActivityId = file.summaryId?.replace('-file', '') || file.activityId?.toString();
          
          if (!garminUserId || !garminActivityId) continue;

          // Get user_id
          const { data: tokenRow } = await supabase
            .from('garmin_tokens')
            .select('user_id')
            .eq('garmin_user_id', garminUserId)
            .maybeSingle();
          
          if (!tokenRow) {
            console.error(`No user found for Garmin ID: ${garminUserId}`);
            continue;
          }

          // Queue FIT download job
          const { error: jobError } = await supabase.from('garmin_fit_jobs').upsert({
            user_id: tokenRow.user_id,
            garmin_activity_id: garminActivityId,
            status: 'pending'
          });

          if (jobError) {
            console.error(`Failed to queue FIT job:`, jobError.message);
          } else {
            console.log(`Queued FIT job for activity ${garminActivityId}`);
          }
        }
      }
      return new Response('ok', {
        status: 200
      });
    } catch (err) {
      console.error('Webhook error:', err);
      return new Response('ok', {
        status: 200
      });
    }
  }
  return new Response('Method not allowed', {
    status: 405
  });
});
function mapGarminSportType(activityType) {
  if (!activityType) return null;
  const t = activityType.toLowerCase();
  if (t.includes('bike') || t.includes('cycling')) return 'cycling';
  if (t.includes('run')) return 'running';
  if (t.includes('swim')) return 'swimming';
  return null;
}
