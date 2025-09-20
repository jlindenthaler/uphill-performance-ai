import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Debug logging to understand the integration state
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing')

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Supabase environment variables are missing. Please ensure the Supabase integration is properly connected.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    const { error } = await supabase
      .from('physiology_data')
      .upsert({
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString()
      })

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
      .single()

    if (error && error.code !== 'PGRST116') throw error
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
      callAIFunction('fetch_research_updates')
  }
}