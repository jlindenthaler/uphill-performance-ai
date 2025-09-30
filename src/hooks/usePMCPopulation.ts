import { useEffect, useState } from 'react';
import { useAuth } from './useSupabase';
import { populateTrainingHistory } from '@/utils/pmcCalculator';

export function usePMCPopulation() {
  const { user } = useAuth();
  const [isPopulated, setIsPopulated] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);

  const populatePMCData = async () => {
    if (!user || isPopulating) return;

    setIsPopulating(true);
    try {
      console.log('Populating PMC data for user...');
      await populateTrainingHistory(user.id);
      setIsPopulated(true);
      console.log('PMC data population completed');
    } catch (error) {
      console.error('Failed to populate PMC data:', error);
    } finally {
      setIsPopulating(false);
    }
  };

  useEffect(() => {
    if (user && !isPopulating) {
      // Trigger PMC population immediately to ensure we have the latest calculations
      populatePMCData();
    }
  }, [user]);

  return {
    isPopulated,
    isPopulating,
    populatePMCData
  };
}