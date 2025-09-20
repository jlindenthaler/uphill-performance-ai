import { useState, useEffect } from 'react';
import { useAuth, usePhysiologyData, useAIAnalysis } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

interface MetabolicMetrics {
  vo2max: { value: number; percentile: number };
  vlamax: { value: number; percentile: number };
  fatMax: { value: number; percentile: number; unit: string };
}

export function useMetabolicData() {
  const { user } = useAuth();
  const { getPhysiologyData } = usePhysiologyData();
  const { calculateZones } = useAIAnalysis();
  const { sportMode } = useSportMode();
  const [metabolicMetrics, setMetabolicMetrics] = useState<MetabolicMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const calculateMetabolicMetrics = async () => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const physiologyData = await getPhysiologyData();
      if (!physiologyData) return null;

      // Call AI function to calculate metabolic metrics
      const result = await calculateZones({
        ...physiologyData,
        sport_mode: sportMode
      });

      if (result?.metabolic_metrics) {
        setMetabolicMetrics(result.metabolic_metrics);
      }

      return result?.metabolic_metrics;
    } catch (error) {
      console.error('Error calculating metabolic metrics:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      calculateMetabolicMetrics();
    }
  }, [user, sportMode]);

  return {
    metabolicMetrics,
    loading,
    calculateMetabolicMetrics
  };
}