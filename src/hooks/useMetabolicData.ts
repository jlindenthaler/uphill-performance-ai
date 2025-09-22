import { useState, useEffect } from 'react';
import { useAuth, usePhysiologyData } from './useSupabase';
import { useSportMode } from '@/contexts/SportModeContext';

interface MetabolicMetrics {
  vo2max: { value: number; percentile: number };
  vlamax: { value: number; percentile: number };
  fatMax: { value: number; percentile: number; unit: string };
}

export function useMetabolicData() {
  const { user } = useAuth();
  const { getPhysiologyData } = usePhysiologyData();
  const { sportMode } = useSportMode();
  const [physiologyData, setPhysiologyData] = useState<any>(null);
  const [metabolicMetrics, setMetabolicMetrics] = useState<MetabolicMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPhysiologyData = async () => {
    if (!user) return null;
    
    setLoading(true);
    try {
      const data = await getPhysiologyData(sportMode);
      setPhysiologyData(data);
      
      // Mock metabolic metrics calculation
      if (data) {
        setMetabolicMetrics({
          vo2max: { value: data.vo2_max || 58, percentile: 75 },
          vlamax: { value: 0.35, percentile: 65 },
          fatMax: { value: 0.42, percentile: 80, unit: 'g/min/kg' }
        });
      }

      return data;
    } catch (error) {
      console.error('Error fetching physiology data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPhysiologyData();
    }
  }, [user, sportMode]);

  return {
    physiologyData,
    metabolicMetrics,
    loading,
    fetchPhysiologyData
  };
}