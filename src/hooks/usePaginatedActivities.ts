import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useSupabase';
import { supabase } from '@/integrations/supabase/client';
import { useSportMode } from '@/contexts/SportModeContext';

interface Activity {
  id: string;
  user_id: string;
  name: string;
  sport_mode: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number;
  elevation_gain_meters?: number;
  avg_power?: number;
  max_power?: number;
  normalized_power?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_pace_per_km?: number;
  avg_speed_kmh?: number;
  avg_cadence?: number;
  calories?: number;
  tss?: number;
  intensity_factor?: number;
  variability_index?: number;
  file_path?: string;
  file_type?: string;
  original_filename?: string;
  gps_data?: any;
  lap_data?: any;
  notes?: string;
  weather_conditions?: any;
  created_at: string;
  updated_at: string;
  // Performance optimization fields
  elevation_profile?: any;
  summary_metrics?: any;
  power_curve_cache?: any;
}

interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  totalCount?: number;
}

export function usePaginatedActivities(pageSize: number = 10) {
  const { user } = useAuth();
  const { sportMode } = useSportMode();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    limit: pageSize,
    hasMore: true,
    isLoading: false
  });

  const fetchActivitiesPage = useCallback(async (
    page: number, 
    limit: number, 
    append: boolean = false
  ) => {
    if (!user) return;
    
    setPagination(prev => ({ ...prev, isLoading: true }));
    
    try {
      const offset = page * limit;
      
      // First, get total count for pagination info
      const { count, error: countError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) throw countError;

      // Then fetch the actual data with optimized query
      let query = supabase
        .from('activities')
        .select(`
          id,
          user_id,
          name,
          sport_mode,
          date,
          duration_seconds,
          distance_meters,
          elevation_gain_meters,
          avg_power,
          max_power,
          avg_heart_rate,
          max_heart_rate,
          avg_pace_per_km,
          avg_speed_kmh,
          calories,
          tss,
          notes,
          summary_metrics,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;
      
      const newActivities = data as Activity[] || [];
      const hasMore = (count || 0) > offset + newActivities.length;
      
      setActivities(prev => append ? [...prev, ...newActivities] : newActivities);
      setPagination(prev => ({
        ...prev,
        page,
        hasMore,
        totalCount: count || 0,
        isLoading: false
      }));

      console.log(`Loaded page ${page + 1}, ${newActivities.length} activities, hasMore: ${hasMore}`);
      
    } catch (error) {
      console.error('Error fetching activities page:', error);
      setPagination(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  const loadInitialActivities = useCallback(() => {
    fetchActivitiesPage(0, pagination.limit, false);
  }, [fetchActivitiesPage, pagination.limit]);

  const loadNextPage = useCallback(() => {
    if (pagination.hasMore && !pagination.isLoading) {
      const nextPage = pagination.page + 1;
      fetchActivitiesPage(nextPage, pagination.limit, true);
    }
  }, [fetchActivitiesPage, pagination]);

  const loadActivityDetails = useCallback(async (activityId: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      // Update the activity in the list with full details
      setActivities(prev => prev.map(activity => 
        activity.id === activityId ? { ...activity, ...data } as Activity : activity
      ));
      
      return data;
    } catch (error) {
      console.error('Error loading activity details:', error);
      return null;
    }
  }, [user]);

  const refreshActivities = useCallback(() => {
    setActivities([]);
    setPagination(prev => ({ 
      ...prev, 
      page: 0, 
      hasMore: true 
    }));
    loadInitialActivities();
  }, [loadInitialActivities]);

  // Auto-load initial activities when user changes
  useEffect(() => {
    if (user) {
      loadInitialActivities();
    } else {
      setActivities([]);
      setPagination(prev => ({ 
        ...prev, 
        page: 0, 
        hasMore: true,
        totalCount: 0
      }));
    }
  }, [user, loadInitialActivities]);

  return {
    activities,
    pagination,
    loadNextPage,
    loadActivityDetails,
    refreshActivities,
    isLoading: pagination.isLoading
  };
}