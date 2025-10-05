import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GarminBackfillJob {
  id: string;
  user_id: string;
  garmin_user_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  progress_date: string | null;
  activities_synced: number;
  activities_skipped: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useGarminJobs() {
  const [jobs, setJobs] = useState<GarminBackfillJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('garmin_backfill_jobs')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs((data || []) as GarminBackfillJob[]);
    } catch (err) {
      console.error('Error fetching Garmin jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // Poll for job updates every 10 seconds if there are active jobs
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'pending' || job.status === 'running')) {
        fetchJobs();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [jobs]);

  const getActiveJob = () => {
    return jobs.find(job => job.status === 'pending' || job.status === 'running');
  };

  const getLatestCompletedJob = () => {
    return jobs.find(job => job.status === 'completed');
  };

  const calculateProgress = (job: GarminBackfillJob) => {
    if (!job.progress_date) return 0;
    
    const start = new Date(job.start_date).getTime();
    const end = new Date(job.end_date).getTime();
    const current = new Date(job.progress_date).getTime();
    
    const progress = ((current - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const checkDateRangeOverlap = (
    newStart: Date | undefined, 
    newEnd: Date | undefined
  ): GarminBackfillJob | null => {
    if (!newStart || !newEnd) return null;
    
    const activeJob = getActiveJob();
    if (!activeJob) return null;
    
    const existingStart = new Date(activeJob.start_date);
    const existingEnd = new Date(activeJob.end_date);
    
    // Check if date ranges overlap
    if (newStart <= existingEnd && newEnd >= existingStart) {
      return activeJob;
    }
    
    return null;
  };

  return {
    jobs,
    loading,
    activeJob: getActiveJob(),
    latestCompletedJob: getLatestCompletedJob(),
    calculateProgress,
    checkDateRangeOverlap,
    refreshJobs: fetchJobs
  };
}
