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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    });

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
  const systemPrompt = "You are an expert endurance sports training coach.";
  const userPrompt = `Provide a concise daily training recommendation based on the athlete's data:

TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
Weekly Progress: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli} TLI, ${context.weekly_progress.current_sessions}/${context.weekly_progress.target_sessions} sessions
Sport: ${requestContext.sport_mode}
Recent Activities: ${context.recent_activities.length} in last 7 days
Active Goals: ${context.active_goals.length} upcoming
${context.active_goals.length > 0 ? `Next Priority Goal: ${context.active_goals[0]?.name} on ${context.active_goals[0]?.event_date}` : ''}

Recommendation:`;

  return await callLocalLLM(systemPrompt, userPrompt, MODELS.GEMMA);
}

async function getChatResponse(context, requestContext) {
  const systemPrompt = `You are a world-class endurance coach and sports scientist with access to the athlete's current training data.

Current Athlete Context:
- TSB: ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
- Weekly Progress: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli} TLI, ${context.weekly_progress.current_sessions}/${context.weekly_progress.target_sessions} sessions
- Sport: ${requestContext.sport_mode}
- Recent Activities: ${context.recent_activities.length} in last 7 days
- Active Goals: ${context.active_goals.length} upcoming
${context.active_goals.length > 0 ? `- Next Priority Goal: ${context.active_goals[0]?.name} on ${context.active_goals[0]?.event_date}` : ''}

Use this context to provide personalized, data-driven coaching advice.`;

  return await callLocalLLM(
    systemPrompt,
    requestContext.message,
    MODELS.MIXTRAL
  );
}

async function getActivityAnalysis(context, requestContext) {
  return await callLocalLLM(
    "You are an expert cycling performance analyst. Provide concise insights.",
    `Analyse this activity data:\n${JSON.stringify(requestContext.activity_data, null, 2)}`,
    MODELS.MIXTRAL
  );
}

async function generateWorkout(context, requestContext) {
  return await callLocalLLM(
    "You are a professional cycling coach.",
    `Generate a workout based on these requirements:\n${JSON.stringify(requestContext.requirements, null, 2)}`,
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
async function getTrainingContext(supabase, userId, sportMode) {
  const { data: trainingHistory } = await supabase
    .from('training_history')
    .select('*')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .gte('date', new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false });

  const { data: recentActivities } = await supabase
    .from('activities')
    .select('id, name, date, duration_seconds, tss, avg_power, avg_heart_rate')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false });

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true });

  const { data: weeklyTargets } = await supabase
    .from('weekly_targets')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .single();

  const currentTSB = trainingHistory?.[0]?.tsb || 0;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { data: weeklyProgress } = await supabase
    .from('training_history')
    .select('tss')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .gte('date', weekStartStr);

  const currentTLI = weeklyProgress?.reduce((sum, day) => sum + (day.tss || 0), 0) || 0;
  const currentSessions = recentActivities?.filter(a => new Date(a.date) >= weekStart).length || 0;

  return {
    current_tsb: currentTSB,
    recent_activities: recentActivities || [],
    active_goals: goals || [],
    weekly_progress: {
      current_tli: currentTLI,
      target_tli: weeklyTargets?.weekly_tli_target || 400,
      current_sessions: currentSessions,
      target_sessions: weeklyTargets?.weekly_sessions_target || 12
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
