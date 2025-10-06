import { useState, useEffect } from 'react'
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
        emailRedirectTo: `${window.location.origin}/`,
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

  const savePhysiologyData = async (data: any, sportMode: string) => {
    if (!user) throw new Error('User not authenticated')

    // Split data into lab results and lifestyle tracking
    
    // 1. Save lab results to lab_results table
    const labResultsData = {
      user_id: user.id,
      sport_mode: sportMode,
      body_weight: parseFloat(data.bodyWeight) || null,
      vo2_max: parseFloat(data.vo2max) || null,
      vt1_power: parseFloat(data.vt1) || null,
      vt1_hr: parseInt(data.vt1Hr) || null,
      vt2_power: parseFloat(data.vt2) || null,
      vt2_hr: parseInt(data.vt2Hr) || null,
      lt1_power: parseFloat(data.lt1) || null,
      lt1_hr: parseInt(data.lt1Hr) || null,
      lt2_power: parseFloat(data.lt2) || null,
      lt2_hr: parseInt(data.lt2Hr) || null,
      resting_hr: parseInt(data.restingHr) || null,
      max_hr: parseInt(data.maxHr) || null,
      critical_power: parseFloat(data.criticalPower) || null,
      w_prime: parseFloat(data.wPrime) || null,
      fat_max: parseFloat(data.fatMax) || null,
      fat_max_intensity: parseFloat(data.fatMaxHr) || null,
      crossover_point: parseFloat(data.crossover) || null,
      rmr: parseFloat(data.rmr) || null,
      map_value: parseFloat(data.map) || null,
      test_date: new Date().toISOString(),
      test_type: 'manual_entry',
    }

    const { error: labError } = await supabase
      .from('lab_results')
      .upsert(labResultsData, { 
        onConflict: 'user_id,sport_mode',
        ignoreDuplicates: false 
      })

    if (labError) throw labError

    // 2. Save lifestyle/training data to physiology_data table
    const physiologyData = {
      user_id: user.id,
      sport_mode: sportMode,
      hrv_rmssd: parseFloat(data.recovery?.hrvBaseline) || null,
      anaerobic_capacity: parseFloat(data.anaerobic_capacity) || null,
      neuromuscular_power: parseFloat(data.neuromuscular_power) || null,
      fat_max_intensity: parseFloat(data.fatMaxIntensity) || null,
      fat_max_rate: parseFloat(data.fatMaxRate) || null,
      carb_max_rate: parseFloat(data.carb_max_rate) || null,
      respiratory_exchange_ratio: parseFloat(data.rer) || null,
      metabolic_flexibility: parseFloat(data.metabolic_flexibility) || null,
      sleep_hours: parseFloat(data.recovery?.sleepHours) || null,
      sleep_quality: parseInt(data.recovery?.sleepQuality) || null,
      stress_level: parseInt(data.stress_level) || null,
      hydration_target: parseFloat(data.hydration_target) || null,
      recovery_methods: data.recovery ? Object.keys(data.recovery.availableModalities).filter(key => data.recovery.availableModalities[key]) : null,
      nutrition_strategy: data.nutrition_strategy || null,
      notes: data.notes || null,
      pace_zones: data.pace_zones || null,
      tags: data.tags || null,
      updated_at: new Date().toISOString()
    }

    const { error: physioError } = await supabase
      .from('physiology_data')
      .upsert(physiologyData, { 
        onConflict: 'user_id,sport_mode',
        ignoreDuplicates: false 
      })

    if (physioError) throw physioError
  }

  const getPhysiologyData = async (sportMode?: string) => {
    if (!user) return null

    const { data, error } = await supabase
      .from('physiology_data')
      .select('*')
      .eq('user_id', user.id)
      .eq('sport_mode', sportMode || 'cycling')
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
