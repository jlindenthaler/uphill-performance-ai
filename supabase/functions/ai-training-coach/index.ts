import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// 🌐 Your ngrok tunnel (update if it changes)
const LLM_URL = "https://exactingly-brookless-krysta.ngrok-free.dev/v1/chat/completions";

// 🔐 Optional API key if you secure your local server
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || "placeholder_key";

// 🧠 Model assignments
const MODELS = {
  MIXTRAL: "mixtral-8x7b-instruct-v0.1",
  LLAMA: "meta-llama-3.1-8b-instruct",
  GEMMA: "gemma-3-4b-it",
  DEEPSEEK: "deepseek-math-7b-instruct"
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Authentication failed');

    const { task, context } = await req.json();

    const trainingContext = await getTrainingContext(
      supabaseClient,
      context.user_id,
      context.sport_mode
    );

    let aiResponse;
    switch (task) {
      case 'daily_recommendations':
        aiResponse = await getDailyRecommendations(trainingContext, context);
        break;
      case 'chat_assistant':
        aiResponse = await getChatResponse(trainingContext, context);
        break;
      case 'activity_analysis':
        aiResponse = await getActivityAnalysis(trainingContext, context);
        break;
      case 'workout_generation':
        aiResponse = await generateWorkout(trainingContext, context);
        break;
      case 'math_analysis':
        aiResponse = await runMathAnalysis(trainingContext, context);
        break;
      case 'historical_analysis':
        aiResponse = await runHistoricalAnalysis(trainingContext, context);
        break;
      default:
        throw new Error(`Invalid task type: ${task}`);
    }

    return new Response(JSON.stringify({
      success: true,
      data: aiResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('AI Training Coach Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      fallback: getFallbackResponse(req.url.includes('daily_recommendations'))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }
});

// ==============
// 🔸 LLM Helper
// ==============
async function callLocalLLM(systemPrompt: string, userPrompt: string, model: string) {
  const response = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM Error: ${response.status} ${text}`);
  }

  const result = await response.json();
  return result?.choices?.[0]?.message?.content ?? "[No response]";
}

// ==============
// 🧠 Task Handlers
// ==============
async function getDailyRecommendations(context, requestContext) {
  const { ftp, ftp_source, lab_results, cp_results, physiology_data, sport_mode } = context;
  
  const systemPrompt = `You are an elite endurance sports coach with deep expertise in exercise physiology and training science.

ATHLETE PROFILE:
- Sport: ${sport_mode}
- Current TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
${ftp ? `- FTP: ${ftp}W (source: ${ftp_source})` : ''}

${lab_results ? `
PHYSIOLOGICAL DATA (Lab Test: ${lab_results.test_date ? new Date(lab_results.test_date).toLocaleDateString() : 'N/A'}):
- VO2max: ${lab_results.vo2_max || 'N/A'} ml/kg/min
- VLamax: ${lab_results.vla_max || 'N/A'} mmol/L/s
- Aerobic Threshold (AeT): ${lab_results.aet || 'N/A'}W @ ${lab_results.aet_hr || 'N/A'} bpm
- Anaerobic Threshold (AnT/GT): ${lab_results.gt || 'N/A'}W @ ${lab_results.gt_hr || 'N/A'} bpm
- VT1: ${lab_results.vt1_power || 'N/A'}W @ ${lab_results.vt1_hr || 'N/A'} bpm
- VT2: ${lab_results.vt2_power || 'N/A'}W @ ${lab_results.vt2_hr || 'N/A'} bpm
- Max HR: ${lab_results.max_hr || 'N/A'} bpm
- Resting HR: ${lab_results.resting_hr || 'N/A'} bpm
- Fat Oxidation: ${lab_results.fat_max || 'N/A'} g/min at ${lab_results.fat_max_intensity || 'N/A'}% intensity
` : ''}

${cp_results ? `
CRITICAL POWER DATA (Test: ${cp_results.test_date ? new Date(cp_results.test_date).toLocaleDateString() : 'N/A'}):
- CP: ${cp_results.cp_watts}W
- W': ${Math.round(cp_results.w_prime_joules / 1000)}kJ
- Protocol: ${cp_results.protocol_used}
` : ''}

${physiology_data ? `
RECENT PHYSIOLOGY & RECOVERY:
- HRV (RMSSD): ${physiology_data.hrv_rmssd || 'N/A'}ms
- Sleep: ${physiology_data.sleep_hours || 'N/A'}hrs (Quality: ${physiology_data.sleep_quality || 'N/A'}/10)
- Stress Level: ${physiology_data.stress_level || 'N/A'}/10
- Metabolic Flexibility: ${physiology_data.metabolic_flexibility || 'N/A'}
` : ''}

TRAINING CONTEXT:
- Weekly Progress: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli} TLI
- Sessions This Week: ${context.weekly_progress.current_sessions}/${context.weekly_progress.target_sessions}
- Recent Activities: ${context.recent_activities.length} in last 7 days
- Active Goals: ${context.active_goals.length} upcoming
${context.active_goals.length > 0 ? `- Next Priority Goal: ${context.active_goals[0]?.name} on ${context.active_goals[0]?.event_date}` : ''}

Provide specific, actionable training recommendations based on this athlete's physiological profile, current training status, and recovery markers.`;

  const userPrompt = `Based on the athlete's comprehensive data above, provide today's training recommendation. Be specific and reference their thresholds, FTP, and current training load.`;

  return await callLocalLLM(systemPrompt, userPrompt, MODELS.GEMMA);
}

async function getChatResponse(context, requestContext) {
  const { ftp, ftp_source, lab_results, cp_results, sport_mode } = context;
  
  const systemPrompt = `You are an AI training coach assistant with access to comprehensive athlete data.

ATHLETE PROFILE:
- Sport: ${sport_mode}
- Current TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
${ftp ? `- FTP: ${ftp}W (${ftp_source})` : ''}
${lab_results ? `- Lab Tested: VO2max ${lab_results.vo2_max}, Thresholds: ${lab_results.aet}W/${lab_results.gt}W` : ''}
${cp_results ? `- CP: ${cp_results.cp_watts}W, W': ${Math.round(cp_results.w_prime_joules / 1000)}kJ` : ''}

CURRENT TRAINING:
- Weekly TLI: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli}
- Recent Activities: ${context.recent_activities.length} in last 7 days

Use this context to provide specific, personalized coaching advice.`;

  return await callLocalLLM(
    systemPrompt,
    requestContext.message,
    MODELS.MIXTRAL
  );
}

async function getActivityAnalysis(context, requestContext) {
  const { ftp, ftp_source, lab_results, sport_mode } = context;
  
  const systemPrompt = `You are an expert at analyzing athletic performance data with deep physiological knowledge.

ATHLETE PROFILE:
- Sport: ${sport_mode}
- Current TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
${ftp ? `- FTP: ${ftp}W (${ftp_source})` : ''}
${lab_results ? `
- Thresholds: AeT ${lab_results.aet}W @ ${lab_results.aet_hr}bpm, AnT ${lab_results.gt}W @ ${lab_results.gt_hr}bpm
- VO2max: ${lab_results.vo2_max} ml/kg/min
` : ''}

Analyze the activity in context of the athlete's physiological profile and current training status.`;

  return await callLocalLLM(
    systemPrompt,
    `Analyze this activity: ${JSON.stringify(requestContext.activity_data)}. Provide insights on intensity distribution, threshold adherence, and training adaptation.`,
    MODELS.MIXTRAL
  );
}

async function generateWorkout(context, requestContext) {
  const { ftp, ftp_source, lab_results, sport_mode } = context;
  
  const systemPrompt = `You are an expert workout designer for endurance athletes with deep understanding of training zones and physiology.

ATHLETE PROFILE:
- Sport: ${sport_mode}
- Current TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
${ftp ? `- FTP: ${ftp}W (${ftp_source})` : ''}
${lab_results ? `
TRAINING ZONES (from lab):
- Zone 1 (Recovery): < ${lab_results.aet}W (< ${lab_results.aet_hr}bpm)
- Zone 2 (Aerobic): ${lab_results.aet}-${lab_results.vt1_power}W (${lab_results.aet_hr}-${lab_results.vt1_hr}bpm)
- Zone 3 (Tempo): ${lab_results.vt1_power}-${lab_results.vt2_power}W (${lab_results.vt1_hr}-${lab_results.vt2_hr}bpm)
- Zone 4 (Threshold): ${lab_results.vt2_power}-${lab_results.gt}W (${lab_results.vt2_hr}-${lab_results.gt_hr}bpm)
- Zone 5 (VO2max): > ${lab_results.gt}W (> ${lab_results.gt_hr}bpm)
` : ''}

TRAINING STATUS:
- Weekly Progress: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli} TLI
- Recent Load: ${context.recent_activities.length} sessions in 7 days

Design workouts using the athlete's specific zones and current training status.`;

  return await callLocalLLM(
    systemPrompt,
    `Generate a workout with these requirements: ${JSON.stringify(requestContext.requirements)}. Use the athlete's specific zones and provide power/HR targets.`,
    MODELS.MIXTRAL
  );
}

// 🧮 DeepSeek → Math
async function runMathAnalysis(context, requestContext) {
  return await callLocalLLM(
    "You are a mathematical and physiological analysis engine. Perform calculations precisely and explain briefly.",
    JSON.stringify(requestContext.math_payload, null, 2),
    MODELS.DEEPSEEK
  );
}

// 📊 Gemma → Historical Training Model Classification
async function runHistoricalAnalysis(context, requestContext) {
  const prompt = `Analyse this athlete's historical training data to determine their predominant training intensity distribution (e.g. polarized, pyramidal, threshold-based) and what has worked best for improving performance. Respond concisely.

History Data:
${JSON.stringify(requestContext.history_payload, null, 2)}`;

  return await callLocalLLM(
    "You are an endurance training data analyst.",
    prompt,
    MODELS.GEMMA
  );
}

// ==============
// 🧠 Context & Helpers
// ==============

// Helper function to calculate FTP from multiple data sources
function calculateFTP(labResults: any, cpResults: any, powerProfile90Day: any, sportMode: string) {
  let ftp = null;
  let ftpSource = 'none';
  
  // Priority hierarchy for FTP calculation:
  // 1. Lab-based thresholds (most accurate)
  if (labResults?.lt2_power && labResults.lt2_power > 0) {
    ftp = Math.round(labResults.lt2_power);
    ftpSource = 'lab_lt2';
  } else if (labResults?.vt2_power && labResults.vt2_power > 0) {
    ftp = Math.round(labResults.vt2_power);
    ftpSource = 'lab_vt2';
  } 
  // 2. Critical Power from CP tests
  else if (cpResults?.cp_watts && cpResults.cp_watts > 0) {
    ftp = Math.round(cpResults.cp_watts);
    ftpSource = 'cp_test';
  } 
  // 3. 90-day mean max at 1 hour
  else if (powerProfile90Day && powerProfile90Day.length > 0) {
    const oneHourRecord = powerProfile90Day.find((p: any) => p.duration_seconds === 3600);
    if (oneHourRecord?.power_watts && oneHourRecord.power_watts > 0) {
      ftp = Math.round(oneHourRecord.power_watts);
      ftpSource = '90day_1hr_mmp';
    } else {
      // Fallback: 95% of 20-minute power
      const twentyMinRecord = powerProfile90Day.find((p: any) => p.duration_seconds === 1200);
      if (twentyMinRecord?.power_watts && twentyMinRecord.power_watts > 0) {
        ftp = Math.round(twentyMinRecord.power_watts * 0.95);
        ftpSource = '90day_20min_estimated';
      } else {
        // Last resort: 90% of 5-minute power
        const fiveMinRecord = powerProfile90Day.find((p: any) => p.duration_seconds === 300);
        if (fiveMinRecord?.power_watts && fiveMinRecord.power_watts > 0) {
          ftp = Math.round(fiveMinRecord.power_watts * 0.90);
          ftpSource = '90day_5min_estimated';
        }
      }
    }
  }
  // 4. MAP from lab results as last resort
  else if (labResults?.map_value && labResults.map_value > 0) {
    ftp = Math.round(labResults.map_value * 0.85);
    ftpSource = 'lab_map_estimated';
  }
  
  console.log(`FTP calculated: ${ftp}W from ${ftpSource}`);
  return { ftp, ftpSource };
}

async function getTrainingContext(supabase, userId, sportMode) {
  console.log('Fetching comprehensive training context for:', { userId, sportMode });
  
  // Fetch training history (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { data: trainingHistory, error: historyError } = await supabase
    .from('training_history')
    .select('*')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });
  
  console.log('Training history:', {
    recordCount: trainingHistory?.length || 0,
    error: historyError
  });

  // Fetch recent activities (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: recentActivities } = await supabase
    .from('activities')
    .select('name, date, duration_seconds, tss, avg_power, avg_heart_rate')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .gte('date', sevenDaysAgo.toISOString())
    .order('date', { ascending: false });

  // Fetch active goals
  const { data: goals } = await supabase
    .from('goals')
    .select('name, event_date, event_type, priority, target_performance')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })
    .limit(3);

  // Fetch weekly targets
  const { data: weeklyTargets } = await supabase
    .from('weekly_targets')
    .select('weekly_tli_target, weekly_sessions_target')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .maybeSingle();

  // Calculate current week's progress
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  const { data: weekActivities } = await supabase
    .from('activities')
    .select('tss')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .gte('date', startOfWeek.toISOString());
  
  const currentTLI = weekActivities?.reduce((sum, a) => sum + (a.tss || 0), 0) || 0;
  const currentSessions = weekActivities?.length || 0;

  // Get current TSB from most recent training history
  const currentTSB = trainingHistory?.[0]?.tsb || 0;

  // NEW: Fetch lab results
  const { data: labResults } = await supabase
    .from('lab_results')
    .select(`
      vo2_max, vla_max, aet, aet_hr, gt, gt_hr, map_value,
      critical_power, w_prime, vt1_hr, vt1_power, vt2_hr, vt2_power,
      lt1_hr, lt1_power, lt2_hr, lt2_power, max_hr, resting_hr,
      fat_max, fat_max_intensity, fat_oxidation_rate, carb_oxidation_rate,
      metabolic_efficiency, body_weight, test_date, test_type
    `)
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Lab results fetched:', labResults ? 'Yes' : 'No');

  // NEW: Fetch CP results
  const { data: cpResults } = await supabase
    .from('cp_results')
    .select('cp_watts, w_prime_joules, test_date, protocol_used, efforts_used')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('test_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('CP results fetched:', cpResults ? 'Yes' : 'No');

  // NEW: Fetch 90-day mean max power profile
  // Note: power_profile table uses 'sport' column, not 'sport_mode'
  const { data: powerProfile90Day } = await supabase
    .from('power_profile')
    .select('power_watts, pace_per_km, duration_seconds, date_achieved')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .eq('time_window', '90-day')
    .order('duration_seconds', { ascending: true });

  console.log('90-day power profile entries:', powerProfile90Day?.length || 0);

  // NEW: Fetch physiology data
  const { data: physiologyData } = await supabase
    .from('physiology_data')
    .select(`
      metabolic_flexibility, hrv_rmssd, sleep_hours, sleep_quality,
      stress_level, fat_max_rate, fat_max_intensity, carb_max_rate,
      hydration_target, notes, nutrition_strategy
    `)
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('Physiology data fetched:', physiologyData ? 'Yes' : 'No');

  // Calculate FTP from available data sources
  const { ftp, ftpSource } = calculateFTP(labResults, cpResults, powerProfile90Day, sportMode);

  // Comprehensive logging
  console.log('Training Context Summary:', {
    user_id: userId,
    sport_mode: sportMode,
    current_tsb: currentTSB,
    ftp: ftp,
    ftp_source: ftpSource,
    data_availability: {
      training_history: trainingHistory?.length || 0,
      recent_activities: recentActivities?.length || 0,
      goals: goals?.length || 0,
      lab_results: !!labResults,
      cp_results: !!cpResults,
      power_profile_90day: powerProfile90Day?.length || 0,
      physiology_data: !!physiologyData
    }
  });

  return {
    current_tsb: currentTSB,
    recent_activities: recentActivities || [],
    active_goals: goals || [],
    weekly_progress: {
      current_tli: currentTLI,
      target_tli: weeklyTargets?.weekly_tli_target || 400,
      current_sessions: currentSessions,
      target_sessions: weeklyTargets?.weekly_sessions_target || 12
    },
    // Enhanced physiological context
    lab_results: labResults,
    cp_results: cpResults,
    power_profile_90day: powerProfile90Day,
    physiology_data: physiologyData,
    ftp: ftp,
    ftp_source: ftpSource,
    sport_mode: sportMode,
    data_completeness: {
      has_lab_results: !!labResults,
      has_cp_results: !!cpResults,
      has_power_profile: !!(powerProfile90Day && powerProfile90Day.length > 0),
      has_physiology_data: !!physiologyData,
      has_ftp: !!ftp
    }
  };
}

function getTSBStatus(tsb: number) {
  if (tsb > 15) return "Fresh";
  if (tsb > 5) return "Rested";
  if (tsb > -10) return "Neutral";
  if (tsb > -20) return "Tired";
  return "Very Tired";
}

function getFallbackResponse(isDailyRecommendation: boolean) {
  if (isDailyRecommendation) {
    return "Focus on consistent training and proper recovery. Listen to your body and adjust intensity based on how you feel today.";
  }
  return "I'm currently unavailable, but keep up the great training!";
}
