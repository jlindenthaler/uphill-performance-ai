/**
 * Auto activity naming utilities
 */

export interface ActivityNamingContext {
  sport_mode: string;
  timestamp: Date;
  duration?: number; // seconds
  distance?: number; // meters
  isWeekend?: boolean;
}

/**
 * Generate automatic activity name based on context
 */
export function generateActivityName(context: ActivityNamingContext): string {
  const { sport_mode, timestamp } = context;
  
  // Get time period
  const timePeriod = getTimePeriod(timestamp);
  
  // Get sport display name
  const sportName = getSportDisplayName(sport_mode);
  
  // Get day context
  const dayContext = getDayContext(timestamp);
  
  // Generate base name
  let baseName = `${timePeriod} ${sportName}`;
  
  // Add day context for special cases
  if (dayContext) {
    baseName = `${dayContext} ${baseName}`;
  }
  
  return baseName;
}

/**
 * Get time period based on hour of day
 */
function getTimePeriod(timestamp: Date): string {
  const hour = timestamp.getHours();
  
  if (hour >= 5 && hour < 11) {
    return 'Morning';
  } else if (hour >= 11 && hour < 17) {
    return 'Afternoon';
  } else if (hour >= 17 && hour < 21) {
    return 'Evening';
  } else {
    return 'Night';
  }
}

/**
 * Get sport display name for naming
 */
function getSportDisplayName(sport_mode: string): string {
  const sportNames: Record<string, string> = {
    'cycling': 'Ride',
    'running': 'Run',
    'swimming': 'Swim',
    'walking': 'Walk'
  };
  
  return sportNames[sport_mode] || 'Training';
}

/**
 * Get day context for special naming
 */
function getDayContext(timestamp: Date): string | null {
  const day = timestamp.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;
  
  // For now, we don't add day context, but this could be extended
  // to add "Weekend" prefix or specific day names for special cases
  return null;
}

/**
 * Generate activity name with additional context
 */
export function generateEnhancedActivityName(context: ActivityNamingContext): string {
  const baseName = generateActivityName(context);
  const { duration, distance, sport_mode } = context;
  
  // Add descriptive context based on activity characteristics
  let enhancedName = baseName;
  
  // Add duration context for longer activities
  if (duration && duration > 7200) { // More than 2 hours
    enhancedName = `Long ${baseName}`;
  } else if (duration && duration < 1800) { // Less than 30 minutes
    enhancedName = `Quick ${baseName}`;
  }
  
  // Add distance context for cycling/running
  if (distance && (sport_mode === 'cycling' || sport_mode === 'running')) {
    const km = Math.round(distance / 1000);
    
    if (sport_mode === 'cycling') {
      if (km > 100) {
        enhancedName = `Century ${baseName}`;
      } else if (km > 50) {
        enhancedName = `Long ${baseName}`;
      }
    } else if (sport_mode === 'running') {
      if (km >= 42) {
        enhancedName = `Marathon ${baseName}`;
      } else if (km >= 21) {
        enhancedName = `Half Marathon ${baseName}`;
      } else if (km >= 10) {
        enhancedName = `10K ${baseName}`;
      } else if (km >= 5) {
        enhancedName = `5K ${baseName}`;
      }
    }
  }
  
  return enhancedName;
}

/**
 * Suggest multiple name options for user to choose from
 */
export function suggestActivityNames(context: ActivityNamingContext): string[] {
  const suggestions: string[] = [];
  
  // Basic time-based name
  suggestions.push(generateActivityName(context));
  
  // Enhanced name with context
  const enhancedName = generateEnhancedActivityName(context);
  if (enhancedName !== suggestions[0]) {
    suggestions.push(enhancedName);
  }
  
  // Alternative time periods
  const timestamp = context.timestamp;
  const hour = timestamp.getHours();
  
  // Suggest alternative time descriptors
  if (hour >= 5 && hour < 11) {
    suggestions.push(`Early ${getSportDisplayName(context.sport_mode)}`);
  } else if (hour >= 17 && hour < 21) {
    suggestions.push(`After Work ${getSportDisplayName(context.sport_mode)}`);
  }
  
  // Weekend specific suggestions
  const isWeekend = timestamp.getDay() === 0 || timestamp.getDay() === 6;
  if (isWeekend) {
    suggestions.push(`Weekend ${getSportDisplayName(context.sport_mode)}`);
  }
  
  // Training specific suggestions
  suggestions.push(`Training ${getSportDisplayName(context.sport_mode)}`);
  
  // Remove duplicates and limit to 4 suggestions
  return [...new Set(suggestions)].slice(0, 4);
}