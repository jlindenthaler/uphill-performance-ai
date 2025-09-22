import { useEffect, useState } from 'react';
import { useAuth } from './useSupabase';
import { populateTrainingHistory } from '@/utils/pmcCalculator';

export function usePMCPopulation() {
  const { user } = useAuth();
  const [isPopulated, setIsPopulated] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);

  const populatePMCData = async () => {
    if (!user || isPopulated || isPopulating) return;

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
    if (user && !isPopulated && !isPopulating) {
      // Small delay to ensure activities are loaded first
      setTimeout(() => {
        populatePMCData();
      }, 1000);
    }
  }, [user]);

  return {
    isPopulated,
    isPopulating,
    populatePMCData
  };
}