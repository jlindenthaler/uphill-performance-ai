export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          avg_cadence: number | null
          avg_heart_rate: number | null
          avg_pace_per_km: number | null
          avg_power: number | null
          avg_speed_kmh: number | null
          calories: number | null
          created_at: string
          date: string
          distance_meters: number | null
          duration_seconds: number
          elevation_gain_meters: number | null
          external_sync_source: string | null
          file_path: string | null
          file_type: string | null
          garmin_activity_id: string | null
          gps_data: Json | null
          id: string
          intensity_factor: number | null
          lap_data: Json | null
          max_heart_rate: number | null
          max_power: number | null
          name: string
          normalized_power: number | null
          notes: string | null
          original_filename: string | null
          sport_mode: string
          tss: number | null
          updated_at: string
          user_id: string
          variability_index: number | null
          weather_conditions: Json | null
        }
        Insert: {
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_pace_per_km?: number | null
          avg_power?: number | null
          avg_speed_kmh?: number | null
          calories?: number | null
          created_at?: string
          date: string
          distance_meters?: number | null
          duration_seconds?: number
          elevation_gain_meters?: number | null
          external_sync_source?: string | null
          file_path?: string | null
          file_type?: string | null
          garmin_activity_id?: string | null
          gps_data?: Json | null
          id?: string
          intensity_factor?: number | null
          lap_data?: Json | null
          max_heart_rate?: number | null
          max_power?: number | null
          name: string
          normalized_power?: number | null
          notes?: string | null
          original_filename?: string | null
          sport_mode?: string
          tss?: number | null
          updated_at?: string
          user_id: string
          variability_index?: number | null
          weather_conditions?: Json | null
        }
        Update: {
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_pace_per_km?: number | null
          avg_power?: number | null
          avg_speed_kmh?: number | null
          calories?: number | null
          created_at?: string
          date?: string
          distance_meters?: number | null
          duration_seconds?: number
          elevation_gain_meters?: number | null
          external_sync_source?: string | null
          file_path?: string | null
          file_type?: string | null
          garmin_activity_id?: string | null
          gps_data?: Json | null
          id?: string
          intensity_factor?: number | null
          lap_data?: Json | null
          max_heart_rate?: number | null
          max_power?: number | null
          name?: string
          normalized_power?: number | null
          notes?: string | null
          original_filename?: string | null
          sport_mode?: string
          tss?: number | null
          updated_at?: string
          user_id?: string
          variability_index?: number | null
          weather_conditions?: Json | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          auto_sync: boolean | null
          created_at: string
          data_sharing: boolean | null
          default_sport: string | null
          email_notifications: boolean | null
          id: string
          notifications_enabled: boolean | null
          privacy_mode: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
          workout_reminders: boolean | null
        }
        Insert: {
          auto_sync?: boolean | null
          created_at?: string
          data_sharing?: boolean | null
          default_sport?: string | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          privacy_mode?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
          workout_reminders?: boolean | null
        }
        Update: {
          auto_sync?: boolean | null
          created_at?: string
          data_sharing?: boolean | null
          default_sport?: string | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          privacy_mode?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          workout_reminders?: boolean | null
        }
        Relationships: []
      }
      enhanced_time_availability: {
        Row: {
          activity_type: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          event_date: string
          event_type: string
          id: string
          location: string | null
          name: string
          priority: string
          status: string
          target_performance: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_type: string
          id?: string
          location?: string | null
          name: string
          priority?: string
          status?: string
          target_performance?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          location?: string | null
          name?: string
          priority?: string
          status?: string
          target_performance?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          aet: number | null
          aet_hr: number | null
          body_weight: number | null
          created_at: string
          critical_power: number | null
          crossover_point: number | null
          fat_max: number | null
          fat_max_intensity: number | null
          gt: number | null
          gt_hr: number | null
          id: string
          map_value: number | null
          max_hr: number | null
          metabolic_efficiency: number | null
          resting_hr: number | null
          sport_mode: string
          updated_at: string
          user_id: string
          vla_max: number | null
          vo2_max: number | null
          w_prime: number | null
        }
        Insert: {
          aet?: number | null
          aet_hr?: number | null
          body_weight?: number | null
          created_at?: string
          critical_power?: number | null
          crossover_point?: number | null
          fat_max?: number | null
          fat_max_intensity?: number | null
          gt?: number | null
          gt_hr?: number | null
          id?: string
          map_value?: number | null
          max_hr?: number | null
          metabolic_efficiency?: number | null
          resting_hr?: number | null
          sport_mode?: string
          updated_at?: string
          user_id: string
          vla_max?: number | null
          vo2_max?: number | null
          w_prime?: number | null
        }
        Update: {
          aet?: number | null
          aet_hr?: number | null
          body_weight?: number | null
          created_at?: string
          critical_power?: number | null
          crossover_point?: number | null
          fat_max?: number | null
          fat_max_intensity?: number | null
          gt?: number | null
          gt_hr?: number | null
          id?: string
          map_value?: number | null
          max_hr?: number | null
          metabolic_efficiency?: number | null
          resting_hr?: number | null
          sport_mode?: string
          updated_at?: string
          user_id?: string
          vla_max?: number | null
          vo2_max?: number | null
          w_prime?: number | null
        }
        Relationships: []
      }
      physiology_data: {
        Row: {
          anaerobic_capacity: number | null
          body_weight: number | null
          carb_max_rate: number | null
          created_at: string
          critical_power: number | null
          fat_max_intensity: number | null
          fat_max_rate: number | null
          ftp: number | null
          hrv_rmssd: number | null
          hydration_target: number | null
          id: string
          lactate_threshold: number | null
          lactate_threshold_2: number | null
          max_hr: number | null
          metabolic_flexibility: number | null
          neuromuscular_power: number | null
          notes: string | null
          nutrition_strategy: string | null
          pace_zones: Json | null
          recovery_methods: string[] | null
          respiratory_exchange_ratio: number | null
          resting_hr: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          sport_mode: string | null
          stress_level: number | null
          tags: string[] | null
          updated_at: string
          user_id: string
          vo2_max: number | null
          w_prime: number | null
        }
        Insert: {
          anaerobic_capacity?: number | null
          body_weight?: number | null
          carb_max_rate?: number | null
          created_at?: string
          critical_power?: number | null
          fat_max_intensity?: number | null
          fat_max_rate?: number | null
          ftp?: number | null
          hrv_rmssd?: number | null
          hydration_target?: number | null
          id?: string
          lactate_threshold?: number | null
          lactate_threshold_2?: number | null
          max_hr?: number | null
          metabolic_flexibility?: number | null
          neuromuscular_power?: number | null
          notes?: string | null
          nutrition_strategy?: string | null
          pace_zones?: Json | null
          recovery_methods?: string[] | null
          respiratory_exchange_ratio?: number | null
          resting_hr?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sport_mode?: string | null
          stress_level?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          vo2_max?: number | null
          w_prime?: number | null
        }
        Update: {
          anaerobic_capacity?: number | null
          body_weight?: number | null
          carb_max_rate?: number | null
          created_at?: string
          critical_power?: number | null
          fat_max_intensity?: number | null
          fat_max_rate?: number | null
          ftp?: number | null
          hrv_rmssd?: number | null
          hydration_target?: number | null
          id?: string
          lactate_threshold?: number | null
          lactate_threshold_2?: number | null
          max_hr?: number | null
          metabolic_flexibility?: number | null
          neuromuscular_power?: number | null
          notes?: string | null
          nutrition_strategy?: string | null
          pace_zones?: Json | null
          recovery_methods?: string[] | null
          respiratory_exchange_ratio?: number | null
          resting_hr?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sport_mode?: string | null
          stress_level?: number | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          vo2_max?: number | null
          w_prime?: number | null
        }
        Relationships: []
      }
      power_profile: {
        Row: {
          created_at: string
          date_achieved: string
          duration_seconds: number
          id: string
          pace_per_km: number | null
          power_watts: number | null
          sport: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_achieved: string
          duration_seconds: number
          id?: string
          pace_per_km?: number | null
          power_watts?: number | null
          sport: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_achieved?: string
          duration_seconds?: number
          id?: string
          pace_per_km?: number | null
          power_watts?: number | null
          sport?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          garmin_access_token: string | null
          garmin_connected: boolean | null
          garmin_token_secret: string | null
          id: string
          timezone: string | null
          units: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          garmin_access_token?: string | null
          garmin_connected?: boolean | null
          garmin_token_secret?: string | null
          id?: string
          timezone?: string | null
          units?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          garmin_access_token?: string | null
          garmin_connected?: boolean | null
          garmin_token_secret?: string | null
          id?: string
          timezone?: string | null
          units?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          effectiveness_rating: number
          id: string
          muscle_groups: string[] | null
          notes: string | null
          post_fatigue_level: number
          pre_fatigue_level: number
          recovery_tools_used: string[] | null
          session_date: string
          sport_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          effectiveness_rating: number
          id?: string
          muscle_groups?: string[] | null
          notes?: string | null
          post_fatigue_level: number
          pre_fatigue_level: number
          recovery_tools_used?: string[] | null
          session_date?: string
          sport_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          effectiveness_rating?: number
          id?: string
          muscle_groups?: string[] | null
          notes?: string | null
          post_fatigue_level?: number
          pre_fatigue_level?: number
          recovery_tools_used?: string[] | null
          session_date?: string
          sport_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_tools: {
        Row: {
          available: boolean | null
          created_at: string
          frequency: string | null
          id: string
          notes: string | null
          sport_mode: string | null
          tool_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          sport_mode?: string | null
          tool_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available?: boolean | null
          created_at?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          sport_mode?: string | null
          tool_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      time_availability: {
        Row: {
          created_at: string
          id: string
          recovery_hours_per_day: number
          training_hours_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recovery_hours_per_day?: number
          training_hours_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recovery_hours_per_day?: number
          training_hours_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_history: {
        Row: {
          atl: number | null
          created_at: string
          ctl: number | null
          date: string
          duration_minutes: number | null
          id: string
          sport: string
          tsb: number | null
          tss: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atl?: number | null
          created_at?: string
          ctl?: number | null
          date: string
          duration_minutes?: number | null
          id?: string
          sport: string
          tsb?: number | null
          tss?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atl?: number | null
          created_at?: string
          ctl?: number | null
          date?: string
          duration_minutes?: number | null
          id?: string
          sport?: string
          tsb?: number | null
          tss?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          completed_date: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          name: string
          scheduled_date: string | null
          sport_mode: string
          structure: Json
          tss: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          scheduled_date?: string | null
          sport_mode?: string
          structure: Json
          tss?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          scheduled_date?: string | null
          sport_mode?: string
          structure?: Json
          tss?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
