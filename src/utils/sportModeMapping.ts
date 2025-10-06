/**
 * Sport Mode Mapping Utility
 * 
 * Maps all activity type variations to three primary sport groups:
 * - running (includes walking, hiking, trail running, treadmill, etc.)
 * - cycling (includes all bike types, virtual rides, gravel, mountain, etc.)
 * - swimming (includes pool, open water, lap swimming, etc.)
 */

export type PrimarySportMode = 'running' | 'cycling' | 'swimming';

// Comprehensive mapping of all sport types to their primary group
const SPORT_MODE_MAP: Record<string, PrimarySportMode> = {
  // Running group
  'running': 'running',
  'run': 'running',
  'walk': 'running',
  'walking': 'running',
  'hike': 'running',
  'hiking': 'running',
  'trail_run': 'running',
  'trailrun': 'running',
  'virtual_run': 'running',
  'virtualrun': 'running',
  'treadmill': 'running',
  'treadmill_running': 'running',
  'train_running': 'running',
  
  // Cycling group
  'cycling': 'cycling',
  'ride': 'cycling',
  'virtual_ride': 'cycling',
  'virtualride': 'cycling',
  'e_bike_ride': 'cycling',
  'ebikeride': 'cycling',
  'e_mountain_bike_ride': 'cycling',
  'mountain_bike_ride': 'cycling',
  'mountainbikeride': 'cycling',
  'gravel_ride': 'cycling',
  'gravelride': 'cycling',
  'handcycle': 'cycling',
  
  // Swimming group
  'swimming': 'swimming',
  'swim': 'swimming',
  'pool_swim': 'swimming',
  'open_water_swim': 'swimming',
  'lap_swimming': 'swimming',
};

// Sport variations by primary group
const SPORT_GROUPS: Record<PrimarySportMode, string[]> = {
  running: [
    'running', 'run', 'walk', 'walking', 'hike', 'hiking',
    'trail_run', 'trailrun', 'virtual_run', 'virtualrun',
    'treadmill', 'treadmill_running', 'train_running'
  ],
  cycling: [
    'cycling', 'ride', 'virtual_ride', 'virtualride',
    'e_bike_ride', 'ebikeride', 'e_mountain_bike_ride',
    'mountain_bike_ride', 'mountainbikeride', 'gravel_ride',
    'gravelride', 'handcycle'
  ],
  swimming: [
    'swimming', 'swim', 'pool_swim', 'open_water_swim', 'lap_swimming'
  ]
};

/**
 * Normalizes any sport type to its primary sport mode group
 * @param sport - The sport type to normalize (e.g., 'walk', 'virtualride')
 * @returns The primary sport mode ('running', 'cycling', or 'swimming')
 */
export function normalizeSportMode(sport: string | null | undefined): PrimarySportMode {
  if (!sport) return 'cycling'; // Default fallback
  
  const normalized = sport.toLowerCase().trim();
  return SPORT_MODE_MAP[normalized] || 'cycling'; // Default to cycling if unknown
}

/**
 * Gets all sport type variations for a given primary sport mode
 * @param primaryMode - The primary sport mode ('running', 'cycling', or 'swimming')
 * @returns Array of all sport type strings that belong to this group
 */
export function getSportVariations(primaryMode: PrimarySportMode): string[] {
  return SPORT_GROUPS[primaryMode] || [];
}

/**
 * Checks if a sport type belongs to a specific primary sport mode group
 * @param sport - The sport type to check
 * @param primaryMode - The primary sport mode to check against
 * @returns True if the sport belongs to the primary mode group
 */
export function belongsToSportGroup(sport: string | null | undefined, primaryMode: PrimarySportMode): boolean {
  if (!sport) return false;
  return normalizeSportMode(sport) === primaryMode;
}

/**
 * Gets a SQL IN clause array for filtering by sport mode group
 * Useful for Supabase queries
 * @param primaryMode - The primary sport mode
 * @returns Array of sport types for use in SQL IN clause
 */
export function getSportFilterArray(primaryMode: PrimarySportMode): string[] {
  return getSportVariations(primaryMode);
}
