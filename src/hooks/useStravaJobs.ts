import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StravaBackfillJob {
  id: string;
  user_id: string;
  strava_athlete_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  current_page: number | null;
  activities_synced: number;
  activities_skipped: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useStravaJobs() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['strava-backfill-jobs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('strava_backfill_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StravaBackfillJob[];
    },
    refetchInterval: (query) => {
      const jobs = query.state.data;
      const hasActiveJob = jobs?.some(job => 
        job.status === 'pending' || job.status === 'running'
      );
      return hasActiveJob ? 10000 : false; // Poll every 10s if there's an active job
    },
  });

  const activeJob = jobs?.find(job => 
    job.status === 'pending' || job.status === 'running'
  );

  const latestCompletedJob = jobs?.find(job => job.status === 'completed');

  const calculateProgress = (job: StravaBackfillJob | undefined) => {
    if (!job) return 0;
    if (job.status === 'completed') return 100;
    if (job.status === 'pending') return 0;
    
    // Estimate progress based on activities synced
    // Average user might have ~500-1000 activities over 2 years
    const estimatedTotal = 1000;
    const progress = Math.min((job.activities_synced / estimatedTotal) * 100, 95);
    return Math.round(progress);
  };

  return {
    jobs,
    isLoading,
    activeJob,
    latestCompletedJob,
    calculateProgress,
  };
}
