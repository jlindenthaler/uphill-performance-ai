import { format } from 'date-fns';

export interface ActivityNamingData {
  date: string;
  sportMode: string;
}

const SPORT_NAME_MAPPING: Record<string, string> = {
  cycling: 'Ride',
  running: 'Run',
  swimming: 'Swim',
  walking: 'Walk',
  rowing: 'Row',
  triathlon: 'Triathlon',
  generic: 'Workout'
};

const TIME_PERIODS = [
  { start: 5, end: 8, label: 'Early Morning' },
  { start: 8, end: 11, label: 'Morning' },
  { start: 11, end: 14, label: 'Midday' },
  { start: 14, end: 18, label: 'Afternoon' },
  { start: 18, end: 21, label: 'Evening' },
  { start: 21, end: 24, label: 'Night' },
  { start: 0, end: 5, label: 'Night' }
];

function getTimeOfDayLabel(date: Date): string {
  const hour = date.getHours();
  
  const period = TIME_PERIODS.find(p => {
    if (p.start <= p.end) {
      return hour >= p.start && hour < p.end;
    } else {
      // Handle overnight period (e.g., 21-24 or 0-5)
      return hour >= p.start || hour < p.end;
    }
  });
  
  return period?.label || 'Morning';
}

function getSportDisplayName(sportMode: string): string {
  const normalized = sportMode.toLowerCase();
  return SPORT_NAME_MAPPING[normalized] || 
         sportMode.charAt(0).toUpperCase() + sportMode.slice(1);
}

export function generateActivityName(data: ActivityNamingData): string {
  const activityDate = new Date(data.date);
  const timeOfDay = getTimeOfDayLabel(activityDate);
  const sportName = getSportDisplayName(data.sportMode);
  
  return `${timeOfDay} ${sportName}`;
}

export function shouldUseAutoName(userProvidedName?: string): boolean {
  return !userProvidedName || userProvidedName.trim() === '';
}