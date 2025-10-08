import scienceWorkoutsData from '@/data/science_workouts.json';

export * from './types';
export { makeIntensityResolver, type Thresholds } from './resolver';
export * from './exporters';

export const scienceWorkouts = scienceWorkoutsData;
