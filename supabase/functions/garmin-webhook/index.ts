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
      // Extract key fields from notification
      const { userId: garminUserId, userAccessToken: pullToken, callbackURL, summaryId, type } = notification;
      // Deregistration
      if (type === 'USER_DEREGISTRATION') {
        console.log(`User ${garminUserId} deregistered`);
        await supabase.from('garmin_tokens').delete().eq('garmin_user_id', garminUserId);
        return new Response('ok', {
          status: 200
        });
      }
      // Activity notification
      if (type === 'ACTIVITY' && callbackURL && pullToken) {
        const activityUrl = `${callbackURL}?token=${pullToken}`;
        const res = await fetch(activityUrl, {
          headers: {
            Accept: 'application/json'
          }
        });
        if (!res.ok) {
          console.error('Failed to pull activity summary:', res.status, res.statusText);
          return new Response('ok', {
            status: 200
          });
        }
        const summary = await res.json();
        console.log('Activity summary pulled:', summary.summaryId || summary.activityId);
        // Get our user_id using Garmin user id
        let { data: tokenRow } = await supabase.from('garmin_tokens').select('user_id').eq('garmin_user_id', garminUserId).maybeSingle();
        
        // Fallback: If not found by garmin_user_id, try to find by checking all tokens and update with the garmin_user_id
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
          return new Response('ok', {
            status: 200
          });
        }
        const userId = tokenRow.user_id;
        const garminActivityId = summary.summaryId?.toString() || summary.activityId?.toString();
        // Insert summary into activities if not already there
        const { error: insertError } = await supabase.from('activities').insert({
          user_id: userId,
          garmin_activity_id: garminActivityId,
          name: summary.activityName || 'Garmin Activity',
          date: summary.startTimeGMT || summary.startTime || new Date().toISOString(),
          duration_seconds: Math.round(summary.duration || 0),
          distance_meters: summary.distance || null,
          elevation_gain_meters: summary.elevationGain || null,
          avg_heart_rate: summary.averageHR || null,
          max_heart_rate: summary.maxHR || null,
          calories: summary.calories || null,
          sport_mode: mapGarminSportType(summary.activityType?.typeKey || summary.activityType),
          external_sync_source: 'garmin'
        }).select().maybeSingle();
        if (insertError && insertError.code !== '23505') {
          console.error('Error inserting activity summary:', insertError.message);
        }
        // Enqueue FIT download job
        const { error: jobError } = await supabase.from('garmin_fit_jobs').upsert({
          user_id: userId,
          garmin_activity_id: garminActivityId,
          status: 'pending'
        });
        if (jobError) {
          console.error('Failed to queue FIT job:', jobError.message);
        } else {
          console.log(`Queued FIT job for activity ${garminActivityId}`);
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
