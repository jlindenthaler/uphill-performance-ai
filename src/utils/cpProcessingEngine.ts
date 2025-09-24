import { supabase } from '@/integrations/supabase/client';
import { findCompleteProtocolSets, calculateCPFromEfforts, CPEffort } from './cp-detection';

interface Activity {
  id: string;
  user_id: string;
  date: string;
  activity_type: string;
  cp_test_protocol: string | null;
  cp_test_target_duration: number | null;
  power_time_series?: number[];
}

/**
 * Multi-day CP processing engine
 * Checks for complete protocol sets and calculates CP when ready
 */
export class CPProcessingEngine {
  
  /**
   * Process all CP test activities for a user and find complete sets
   */
  static async processUserCPTests(userId: string): Promise<void> {
    try {
      // Fetch all CP test activities from the last 30 days
      const { data: activities, error } = await supabase
        .from('activities')
        .select('id, user_id, date, activity_type, cp_test_protocol, cp_test_target_duration')
        .eq('user_id', userId)
        .eq('activity_type', 'cp_test')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching CP test activities:', error);
        return;
      }

      if (!activities || activities.length === 0) {
        console.log('No CP test activities found for user:', userId);
        return;
      }

      // Load efforts for each activity (from database or calculate from power data)
      const activitiesWithEfforts = await Promise.all(
        activities.map(async (activity) => {
          const efforts = await this.getOrCalculateEfforts(activity);
          return {
            ...activity,
            efforts
          };
        })
      );

      // Find complete protocol sets
      const completeSets = findCompleteProtocolSets(activitiesWithEfforts, 3);

      // Process each complete set
      for (const set of completeSets) {
        if (set.canCalculateCP) {
          await this.calculateAndStoreCPResult(userId, set);
        }
      }

    } catch (error) {
      console.error('Error processing CP tests:', error);
    }
  }

  /**
   * Get stored efforts or calculate from power data
   */
  private static async getOrCalculateEfforts(activity: Activity): Promise<CPEffort[]> {
    // First check if we have stored CP results for this activity
    const { data: cpResults } = await supabase
      .from('cp_results')
      .select('efforts_used, efforts_rejected')
      .eq('user_id', activity.user_id)
      .contains('efforts_used', [{ activityId: activity.id }])
      .maybeSingle();

    if (cpResults) {
      // Return stored efforts
      const storedEfforts = [
        ...((cpResults.efforts_used as any[]) || []),
        ...((cpResults.efforts_rejected as any[]) || [])
      ];
      return storedEfforts;
    }

    // Calculate efforts from power data if available
    if (activity.power_time_series && activity.cp_test_protocol) {
      const { processCPTestActivity } = await import('./cp-detection');
      const { efforts } = processCPTestActivity(
        activity.power_time_series,
        activity.cp_test_protocol,
        activity.cp_test_target_duration || undefined
      );
      return efforts;
    }

    return [];
  }

  /**
   * Calculate CP from complete protocol set and store result
   */
  private static async calculateAndStoreCPResult(
    userId: string,
    protocolSet: {
      protocol: string;
      activities: string[];
      efforts: CPEffort[];
      canCalculateCP: boolean;
    }
  ): Promise<void> {
    try {
      const { calculateCPFromEfforts } = await import('./cp-detection');
      const cpResult = calculateCPFromEfforts(protocolSet.efforts);

      if (!cpResult) {
        console.log('Could not calculate CP from efforts:', protocolSet.efforts);
        return;
      }

      // Check if we already have a recent CP result for this protocol
      const { data: existingResult } = await supabase
        .from('cp_results')
        .select('id, test_date')
        .eq('user_id', userId)
        .eq('protocol_used', protocolSet.protocol)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only create new result if it's significantly different or more recent
      const shouldCreateNew = !existingResult || 
        new Date(cpResult.test_date) > new Date(existingResult.test_date);

      if (shouldCreateNew) {
        // Store CP result
        const { error } = await supabase
          .from('cp_results')
          .insert({
            user_id: userId,
            sport_mode: 'cycling', // TODO: Get from activity sport mode
            test_date: cpResult.test_date,
            protocol_used: protocolSet.protocol,
            cp_watts: cpResult.cp_watts,
            w_prime_joules: cpResult.w_prime_joules,
            efforts_used: cpResult.efforts_used.map(effort => ({
              ...effort,
              activities: protocolSet.activities
            })) as any,
            efforts_rejected: cpResult.efforts_rejected as any
          });

        if (error) {
          console.error('Error storing CP result:', error);
        } else {
          console.log('Successfully calculated and stored CP result:', {
            protocol: protocolSet.protocol,
            cp_watts: cpResult.cp_watts,
            w_prime_joules: cpResult.w_prime_joules,
            activities: protocolSet.activities
          });

          // Trigger background power profile update
          this.updatePowerProfile(userId, cpResult);
        }
      }

    } catch (error) {
      console.error('Error calculating CP result:', error);
    }
  }

  /**
   * Update power profile with new CP values
   */
  private static async updatePowerProfile(userId: string, cpResult: any): Promise<void> {
    try {
      // Update power profile entries based on CP test results
      const { populatePowerProfileForActivity } = await import('./powerAnalysis');
      
      // This would typically update the power profile with the new CP and W' values
      // For now, just log the update
      console.log('Would update power profile with new CP values:', cpResult);
      
    } catch (error) {
      console.error('Error updating power profile:', error);
    }
  }

  /**
   * Trigger CP processing for a user (called after activity upload)
   */
  static async triggerProcessing(userId: string): Promise<void> {
    // Use setTimeout to run processing in background
    setTimeout(() => {
      this.processUserCPTests(userId).catch(console.error);
    }, 1000);
  }
}