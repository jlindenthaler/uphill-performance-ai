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

  const forceRepopulate = async () => {
    setIsPopulated(false);
    await populatePMCData();
  };

  useEffect(() => {
    if (user && !isPopulated && !isPopulating) {
      // Force re-population on every user login for now to ensure data is fresh
      setTimeout(() => {
        populatePMCData();
      }, 1000);
    }
  }, [user, isPopulated, isPopulating]);

  return {
    isPopulated,
    isPopulating,
    populatePMCData,
    forceRepopulate
  };
}