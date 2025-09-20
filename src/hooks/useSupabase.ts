import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut
  }
}

export function usePhysiologyData() {
  const { user } = useAuth()

  const savePhysiologyData = async (data: any) => {
    if (!user) throw new Error('User not authenticated')

    // Transform the physiology form data to match database schema
    const physiologyData = {
      user_id: user.id,
      body_weight: parseFloat(data.bodyWeight) || null,
      vo2_max: parseFloat(data.vo2max) || null,
      lactate_threshold: parseFloat(data.lt1) || null,
      lactate_threshold_2: parseFloat(data.lt2) || null,
      resting_hr: parseInt(data.restingHr) || null,
      max_hr: parseInt(data.maxHr) || null,
      ftp: parseFloat(data.ftp) || null,
      critical_power: parseFloat(data.criticalPower) || null,
      w_prime: parseFloat(data.wPrime) || null,
      fat_max_rate: parseFloat(data.fatMax) || null,
      fat_max_intensity: parseFloat(data.fatMaxHr) || null,
      carb_max_rate: parseFloat(data.carb_max_rate) || null,
      anaerobic_capacity: parseFloat(data.anaerobic_capacity) || null,
      neuromuscular_power: parseFloat(data.neuromuscular_power) || null,
      metabolic_flexibility: parseFloat(data.metabolic_flexibility) || null,
      sleep_hours: parseFloat(data.recovery?.sleepHours) || null,
      sleep_quality: parseInt(data.recovery?.sleepQuality) || null,
      stress_level: parseInt(data.stress_level) || null,
      hydration_target: parseFloat(data.hydration_target) || null,
      recovery_methods: data.recovery ? Object.keys(data.recovery.availableModalities).filter(key => data.recovery.availableModalities[key]) : null,
      nutrition_strategy: data.nutrition_strategy || null,
      notes: data.notes || null,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('physiology_data')
      .upsert(physiologyData)

    if (error) throw error
  }

  const getPhysiologyData = async () => {
    if (!user) return null

    const { data, error } = await supabase
      .from('physiology_data')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  return {
    savePhysiologyData,
    getPhysiologyData
  }
}

export function useAIAnalysis() {
  const callAIFunction = async (action: string, data?: any) => {
    const { data: result, error } = await supabase.functions.invoke(
      'ai-training-analysis',
      {
        body: { action, data }
      }
    )

    if (error) throw error
    return result
  }

  return {
    calculateZones: (physiologyData: any) => 
      callAIFunction('calculate_zones', physiologyData),
    analyzePerformance: () => 
      callAIFunction('analyze_performance'),
    recommendWorkout: (preferences: any) => 
      callAIFunction('recommend_workout', preferences),
    adjustTrainingLoad: (feedback: any) => 
      callAIFunction('adjust_training_load', feedback),
    fetchResearchUpdates: () =>
      callAIFunction('fetch_research_updates'),
    calculateMetabolicMetrics: (data?: any) =>
      callAIFunction('calculate_metabolic_metrics', data)
  }
}