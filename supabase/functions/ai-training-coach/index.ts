import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIRequest {
  task: 'daily_recommendations' | 'chat_assistant' | 'activity_analysis' | 'workout_generation'
  context: {
    user_id: string
    sport_mode: string
    training_data?: any
    message?: string
    activity_data?: any
  }
}

interface TrainingContext {
  current_tsb: number
  recent_activities: any[]
  active_goals: any[]
  weekly_progress: {
    current_tli: number
    target_tli: number
    current_sessions: number
    target_sessions: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Set the auth context for RLS
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: '',
    })

    const { task, context }: AIRequest = await req.json()

    // Get training context for the user
    const trainingContext = await getTrainingContext(supabaseClient, context.user_id, context.sport_mode)

    // Route to appropriate AI model based on task
    let aiResponse
    switch (task) {
      case 'daily_recommendations':
        aiResponse = await getDailyRecommendations(trainingContext, context)
        break
      case 'chat_assistant':
        aiResponse = await getChatResponse(trainingContext, context)
        break
      case 'activity_analysis':
        aiResponse = await getActivityAnalysis(trainingContext, context)
        break
      case 'workout_generation':
        aiResponse = await generateWorkout(trainingContext, context)
        break
      default:
        throw new Error('Invalid task type')
    }

    return new Response(
      JSON.stringify({ success: true, data: aiResponse }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('AI Training Coach Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        fallback: getFallbackResponse(req.url.includes('daily_recommendations'))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 with fallback instead of error
      }
    )
  }
})

async function getTrainingContext(supabase: any, userId: string, sportMode: string): Promise<TrainingContext> {
  // Get recent training history (last 42 days for PMC calculation)
  const { data: trainingHistory } = await supabase
    .from('training_history')
    .select('*')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .gte('date', new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Get recent activities (last 7 days)
  const { data: recentActivities } = await supabase
    .from('activities')
    .select('id, name, date, duration_seconds, tss, avg_power, avg_heart_rate')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: false })

  // Get active goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('event_date', new Date().toISOString().split('T')[0])
    .order('event_date', { ascending: true })

  // Get weekly targets
  const { data: weeklyTargets } = await supabase
    .from('weekly_targets')
    .select('*')
    .eq('user_id', userId)
    .eq('sport_mode', sportMode)
    .single()

  // Calculate current TSB from most recent training history entry
  const currentTSB = trainingHistory?.[0]?.tsb || 0

  // Calculate weekly progress
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekStartStr = weekStart.toISOString().split('T')[0]

  const { data: weeklyProgress } = await supabase
    .from('training_history')
    .select('tss')
    .eq('user_id', userId)
    .eq('sport', sportMode)
    .gte('date', weekStartStr)

  const currentTLI = weeklyProgress?.reduce((sum: number, day: any) => sum + (day.tss || 0), 0) || 0
  const currentSessions = recentActivities?.filter((activity: any) => 
    new Date(activity.date) >= weekStart
  ).length || 0

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
  }
}

async function getDailyRecommendations(context: TrainingContext, requestContext: any): Promise<string> {
  const LLM_URL = Deno.env.get('LLM_SERVER_URL') || 'https://exactingly-brookless-krysta.ngrok-free.dev'
  const API_KEY = Deno.env.get('LLM_API_KEY') || 'placeholder_key'

  // Prepare context for AI
  const prompt = `You are an expert AI training coach. Based on the athlete's current data, provide a concise daily training recommendation.

Current Status:
- TSB (Training Stress Balance): ${context.current_tsb} (${getTSBStatus(context.current_tsb)})
- Weekly Progress: ${context.weekly_progress.current_tli}/${context.weekly_progress.target_tli} TLI, ${context.weekly_progress.current_sessions}/${context.weekly_progress.target_sessions} sessions
- Sport: ${requestContext.sport_mode}
- Recent Activities: ${context.recent_activities.length} in last 7 days
- Active Goals: ${context.active_goals.length} upcoming

${context.active_goals.length > 0 ? `Next Priority Goal: ${context.active_goals[0]?.name} on ${context.active_goals[0]?.event_date}` : ''}

Provide a brief, actionable recommendation for today's training (2-3 sentences max). Consider recovery needs, weekly progress, and upcoming goals.`

  try {
    const response = await fetch(`${LLM_URL}/api/v1/daily_recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        prompt,
        context: context
      })
    })

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.status}`)
    }

    const result = await response.json()
    return result.recommendation || result.response || result.text || "Focus on your current training plan and listen to your body."
  } catch (error) {
    console.error('LLM API Error:', error)
    throw error
  }
}

async function getChatResponse(context: TrainingContext, requestContext: any): Promise<string> {
  const LLM_URL = Deno.env.get('LLM_SERVER_URL') || 'https://exactingly-brookless-krysta.ngrok-free.dev'
  const API_KEY = Deno.env.get('LLM_API_KEY') || 'placeholder_key'

  const response = await fetch(`${LLM_URL}/api/v1/chat_assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      message: requestContext.message,
      context: context
    })
  })

  const result = await response.json()
  return result.response || "I'm here to help with your training questions."
}

async function getActivityAnalysis(context: TrainingContext, requestContext: any): Promise<string> {
  const LLM_URL = Deno.env.get('LLM_SERVER_URL') || 'https://exactingly-brookless-krysta.ngrok-free.dev'
  const API_KEY = Deno.env.get('LLM_API_KEY') || 'placeholder_key'

  const response = await fetch(`${LLM_URL}/api/v1/activity_analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      activity_data: requestContext.activity_data,
      context: context
    })
  })

  const result = await response.json()
  return result.analysis || "Great workout! Keep up the good work."
}

async function generateWorkout(context: TrainingContext, requestContext: any): Promise<any> {
  const LLM_URL = Deno.env.get('LLM_SERVER_URL') || 'https://exactingly-brookless-krysta.ngrok-free.dev'
  const API_KEY = Deno.env.get('LLM_API_KEY') || 'placeholder_key'

  const response = await fetch(`${LLM_URL}/api/v1/workout_generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      requirements: requestContext.requirements,
      context: context
    })
  })

  const result = await response.json()
  return result.workout || { name: "Recovery Ride", duration: 60, structure: [] }
}

function getTSBStatus(tsb: number): string {
  if (tsb > 15) return "Fresh"
  if (tsb > 5) return "Rested" 
  if (tsb > -10) return "Neutral"
  if (tsb > -20) return "Tired"
  return "Very Tired"
}

function getFallbackResponse(isDailyRecommendation: boolean): string {
  if (isDailyRecommendation) {
    return "Focus on consistent training and proper recovery. Listen to your body and adjust intensity based on how you feel today."
  }
  return "I'm currently unavailable, but keep up the great training!"
}