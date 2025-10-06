import { useMemo } from 'react';
import { 
  areActivitiesDuplicates, 
  calculateDataCompleteness,
  ActivityWithData,
  DEFAULT_TOLERANCES 
} from '@/utils/activityDeduplication';

interface Activity extends ActivityWithData {
  id: string;
  date: string;
  duration_seconds: number;
  distance_meters?: number | null;
  sport_mode: string;
  external_sync_source?: string | null;
  created_at: string;
  name: string;
  [key: string]: any;
}

interface DeduplicatedActivity extends Activity {
  duplicate_sources?: string[];
  is_deduplicated?: boolean;
  data_completeness_score?: number;
}

/**
 * Hook to deduplicate activities for display purposes
 * Groups duplicate activities and selects the best one to show
 */
export function useDeduplicatedActivities(
  activities: Activity[],
  showDuplicates: boolean = false
): {
  displayActivities: DeduplicatedActivity[];
  duplicateGroups: Map<string, Activity[]>;
} {
  const result = useMemo(() => {
    if (showDuplicates || activities.length === 0) {
      return {
        displayActivities: activities,
        duplicateGroups: new Map<string, Activity[]>()
      };
    }

    // Group activities by potential duplicates
    const groups: Activity[][] = [];
    const processed = new Set<string>();

    activities.forEach((activity) => {
      if (processed.has(activity.id)) return;

      // Find all duplicates for this activity
      const duplicates = activities.filter((other) => {
        if (activity.id === other.id) return true;
        if (processed.has(other.id)) return false;
        
        return areActivitiesDuplicates(
          {
            date: activity.date,
            duration_seconds: activity.duration_seconds,
            distance_meters: activity.distance_meters,
            sport_mode: activity.sport_mode,
            external_sync_source: activity.external_sync_source
          },
          {
            date: other.date,
            duration_seconds: other.duration_seconds,
            distance_meters: other.distance_meters,
            sport_mode: other.sport_mode,
            external_sync_source: other.external_sync_source
          },
          DEFAULT_TOLERANCES
        );
      });

      if (duplicates.length > 0) {
        groups.push(duplicates);
        duplicates.forEach(dup => processed.add(dup.id));
      }
    });

    // Select best activity from each group
    const duplicateGroupsMap = new Map<string, Activity[]>();
    const displayActivities: DeduplicatedActivity[] = groups.map((group) => {
      if (group.length === 1) {
        return group[0];
      }

      // Sort by priority: data completeness first, then sync source, then most recent
      const sorted = [...group].sort((a, b) => {
        // Priority 1: Data completeness (highest priority - keep the activity with most data)
        const aScore = calculateDataCompleteness(a);
        const bScore = calculateDataCompleteness(b);
        if (aScore !== bScore) {
          return bScore - aScore; // Higher score first
        }

        // Priority 2: External sync source preference (Strava/Garmin over manual)
        const aIsExternal = a.external_sync_source !== null;
        const bIsExternal = b.external_sync_source !== null;
        if (aIsExternal && !bIsExternal) return -1;
        if (!aIsExternal && bIsExternal) return 1;

        // Priority 3: Most recent creation time (tiebreaker)
        const aCreatedTime = new Date(a.created_at).getTime();
        const bCreatedTime = new Date(b.created_at).getTime();
        return bCreatedTime - aCreatedTime; // More recent first
      });

      const selected = sorted[0];
      
      // Add metadata about duplicates
      const sources = Array.from(
        new Set(
          group
            .map(a => a.external_sync_source || 'manual')
            .filter(s => s !== null)
        )
      );

      duplicateGroupsMap.set(selected.id, group);

      return {
        ...selected,
        duplicate_sources: sources,
        is_deduplicated: true,
        data_completeness_score: calculateDataCompleteness(selected)
      };
    });

    return { displayActivities, duplicateGroups: duplicateGroupsMap };
  }, [activities, showDuplicates]);

  return result;
}
