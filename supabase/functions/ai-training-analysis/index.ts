import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('No user found')

    const { action, data } = await req.json()

    switch (action) {
      case 'calculate_zones':
        return await calculateTrainingZones(supabaseClient, user.id, data)
      case 'analyze_performance':
        return await analyzePerformance(supabaseClient, user.id)
      case 'recommend_workout':
        return await recommendWorkout(supabaseClient, user.id, data)
      case 'fetch_research_updates':
        return await fetchResearchUpdates(supabaseClient, user.id)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

async function calculateTrainingZones(supabaseClient: any, userId: string, physiologyData: any) {
  // AI-powered zone calculation using hierarchy: Lab > Performance > Estimated
  const zones = {
    power: calculatePowerZones(physiologyData),
    heart_rate: calculateHRZones(physiologyData),
    pace: calculatePaceZones(physiologyData)
  }

  // Store calculated zones
  await supabaseClient
    .from('training_zones')
    .upsert({
      user_id: userId,
      ...zones.power,
      zone_type: 'power'
    })

  return new Response(
    JSON.stringify({ zones }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function analyzePerformance(supabaseClient: any, userId: string) {
  // Fetch user's performance data
  const { data: performanceData } = await supabaseClient
    .from('performance_data')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(90)

  const { data: workoutData } = await supabaseClient
    .from('user_workouts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_date', { ascending: false })
    .limit(30)

  // AI analysis of trends, limiters, and recommendations
  const analysis = {
    current_form: calculateCurrentForm(performanceData),
    training_limiters: identifyLimiters(workoutData),
    recommendations: generateRecommendations(performanceData, workoutData),
    recovery_status: assessRecoveryNeed(performanceData)
  }

  return new Response(
    JSON.stringify({ analysis }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function recommendWorkout(supabaseClient: any, userId: string, preferences: any) {
  // AI workout recommendation based on current fitness, goals, and recovery status
  const { data: currentFitness } = await supabaseClient
    .from('performance_data')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)
    .single()

  const { data: goals } = await supabaseClient
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  const { data: availableWorkouts } = await supabaseClient
    .from('workouts')
    .select('*')

  const recommendation = selectOptimalWorkout(currentFitness, goals, availableWorkouts, preferences)

  return new Response(
    JSON.stringify({ recommendation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function adjustTrainingLoad(supabaseClient: any, userId: string, workoutFeedback: any) {
  // Adjust next workout based on completion data and RPE
  const adjustment = calculateLoadAdjustment(workoutFeedback)

  return new Response(
    JSON.stringify({ adjustment }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Helper functions
function calculatePowerZones(data: any) {
  // Use lab data (MAP, LT) if available, otherwise FTP, otherwise estimate
  if (data.map_watts && data.lactate_threshold_watts) {
    return {
      zone_1_min: 0,
      zone_1_max: Math.round(data.lactate_threshold_watts * 0.55),
      zone_2_min: Math.round(data.lactate_threshold_watts * 0.55),
      zone_2_max: Math.round(data.lactate_threshold_watts * 0.75),
      zone_3_min: Math.round(data.lactate_threshold_watts * 0.75),
      zone_3_max: Math.round(data.lactate_threshold_watts * 0.90),
      zone_4_min: Math.round(data.lactate_threshold_watts * 0.90),
      zone_4_max: Math.round(data.lactate_threshold_watts * 1.05),
      zone_5_min: Math.round(data.lactate_threshold_watts * 1.05),
      zone_5_max: Math.round(data.map_watts * 1.20),
      zone_6_min: Math.round(data.map_watts * 1.20),
      zone_6_max: null,
      zone_7_min: null,
      zone_7_max: null
    }
  } else if (data.ftp) {
    // Standard FTP-based zones
    return {
      zone_1_min: 0,
      zone_1_max: Math.round(data.ftp * 0.55),
      zone_2_min: Math.round(data.ftp * 0.55),
      zone_2_max: Math.round(data.ftp * 0.75),
      zone_3_min: Math.round(data.ftp * 0.75),
      zone_3_max: Math.round(data.ftp * 0.90),
      zone_4_min: Math.round(data.ftp * 0.90),
      zone_4_max: Math.round(data.ftp * 1.05),
      zone_5_min: Math.round(data.ftp * 1.05),
      zone_5_max: Math.round(data.ftp * 1.20),
      zone_6_min: Math.round(data.ftp * 1.20),
      zone_6_max: null,
      zone_7_min: null,
      zone_7_max: null
    }
  }
  return null
}

function calculateHRZones(data: any) {
  // Similar logic for HR zones based on lab data hierarchy
  if (data.vo2_max_hr && data.lactate_threshold_hr) {
    const lthr = data.lactate_threshold_hr
    return {
      zone_1_min: Math.round(lthr * 0.68),
      zone_1_max: Math.round(lthr * 0.83),
      zone_2_min: Math.round(lthr * 0.83),
      zone_2_max: Math.round(lthr * 0.94),
      zone_3_min: Math.round(lthr * 0.94),
      zone_3_max: Math.round(lthr * 1.05),
      zone_4_min: Math.round(lthr * 1.05),
      zone_4_max: Math.round(data.vo2_max_hr * 1.0),
      zone_5_min: Math.round(data.vo2_max_hr * 1.0),
      zone_5_max: null
    }
  }
  return null
}

function calculatePaceZones(data: any) {
  // Pace zone calculation for runners
  return null // Implement based on running-specific data
}

function calculateCurrentForm(performanceData: any[]) {
  if (!performanceData?.length) return 'unknown'
  
  const latest = performanceData[0]
  if (latest.tsb > 5) return 'fresh'
  if (latest.tsb >= -10) return 'optimal'
  return 'fatigued'
}

function identifyLimiters(workoutData: any[]) {
  // Analyze workout completion rates by zone/type
  return ['threshold_power', 'vo2max_capacity'] // Example
}

function generateRecommendations(performanceData: any[], workoutData: any[]) {
  return [
    'Focus on threshold work to improve FTP',
    'Increase training volume gradually',
    'Consider adding recovery rides'
  ]
}

function assessRecoveryNeed(performanceData: any[]) {
  const latest = performanceData?.[0]
  return latest?.tsb < -15 ? 'high' : latest?.tsb < -5 ? 'moderate' : 'low'
}

function selectOptimalWorkout(fitness: any, goals: any[], workouts: any[], preferences: any) {
  // AI logic to select best workout based on current state
  return workouts[0] // Simplified for now
}

function calculateLoadAdjustment(feedback: any) {
  // Adjust intensity based on RPE and completion
  const rpeAdjustment = feedback.rpe > 8 ? -0.05 : feedback.rpe < 6 ? 0.03 : 0
  return { intensity_multiplier: 1 + rpeAdjustment }
}

async function fetchResearchUpdates(supabaseClient: any, userId: string) {
  // This would integrate with research databases or web scraping
  // For now, return mock data structure that would be populated by real research API
  const mockUpdates = [
    {
      id: '1',
      title: 'Heat Acclimation and Mitochondrial Adaptations in Endurance Athletes',
      summary: 'Recent research shows that heat acclimation protocols can enhance mitochondrial efficiency and plasma volume expansion beyond traditional altitude training.',
      category: 'training',
      source: 'Journal of Applied Physiology',
      date: '2024-09-15',
      relevanceScore: 9.2,
      keyFindings: [
        'Heat acclimation increases mitochondrial respiratory capacity by 15-20%',
        'Plasma volume expansion occurs within 5-7 days of heat exposure',
        'Combined heat/altitude training shows synergistic effects'
      ],
      practicalApplications: [
        'Incorporate sauna sessions 3-4x/week during base training',
        'Combine with altitude training for enhanced adaptations',
        'Monitor core temperature and hydration status'
      ]
    }
  ];

  // Store research updates for the user
  await supabaseClient
    .from('research_updates')
    .upsert({
      user_id: userId,
      updates: mockUpdates,
      last_updated: new Date().toISOString()
    })

  return new Response(
    JSON.stringify({ updates: mockUpdates }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}