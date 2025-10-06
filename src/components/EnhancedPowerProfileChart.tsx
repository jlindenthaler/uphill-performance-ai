import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { calculateMeanMaximalPower, calculateMeanMaximalPace } from '@/utils/powerAnalysis';
import { TrendingUp, Zap, Clock } from 'lucide-react';
interface EnhancedPowerProfileChartProps {
  activity?: any;
}
export function EnhancedPowerProfileChart({
  activity
}: EnhancedPowerProfileChartProps) {
  // Always use last 90 days - rolling window
  const {
    powerProfile,
    recalculatedProfile,
    loading
  } = usePowerProfile(90);
  const {
    sportMode
  } = useSportMode();
  const isRunning = sportMode === 'running';
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${(seconds / 60).toFixed(2)}m`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };
  const formatValue = (value: number) => {
    if (isRunning) {
      const minutes = Math.floor(value);
      const seconds = Math.round((value - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
    }
    return `${Math.round(value)}W`;
  };

  // Calculate activity mean max power/pace using real GPS data
  const calculateActivityMeanMax = () => {
    if (!activity?.gps_data?.trackPoints) return [];
    
    const durations = [1, 5, 10, 20, 60, 300, 600, 1200, 3600];
    return durations.map(duration => {
      const durationLabel = formatDuration(duration);
      let value = 0;
      
      if (isRunning) {
        value = calculateMeanMaximalPace(activity.gps_data.trackPoints, duration) || 0;
      } else {
        value = calculateMeanMaximalPower(activity.gps_data.trackPoints, duration) || 0;
      }
      
      return {
        duration: durationLabel,
        activityMeanMax: value
      };
    });
  };
  const activityMeanMax = useMemo(() => calculateActivityMeanMax(), [activity, isRunning]);

  // Calculate activity best power/pace for specific durations using real GPS data
  const calculateActivityBestPowers = () => {
    if (!activity?.gps_data?.trackPoints) return [];
    
    const targetDurations = [5, 60, 300, 1200, 3600]; // 5s, 1min, 5min, 20min, 60min
    const targetLabels = ['5s', '1min', '5min', '20min', '60min'];
    
    return targetDurations.map((duration, index) => {
      let value = 0;
      
      if (isRunning) {
        value = calculateMeanMaximalPace(activity.gps_data.trackPoints, duration) || 0;
      } else {
        value = calculateMeanMaximalPower(activity.gps_data.trackPoints, duration) || 0;
      }
      
      return {
        duration: targetLabels[index],
        durationSeconds: duration,
        value: Math.round(value)
      };
    });
  };
  const activityBestPowers = useMemo(() => calculateActivityBestPowers(), [activity, isRunning]);

  // Use recalculated profile data for the selected timeframe
  const chartData = useMemo(() => {
    // Always use recalculated profile for date-filtered data, 
    // and powerProfile for all-time bests as reference
    if (recalculatedProfile.length === 0 && powerProfile.length === 0) return [];
    
    // Get all unique durations from both datasets
    const allDurations = new Set([
      ...recalculatedProfile.map(p => p.durationSeconds),
      ...powerProfile.map(p => p.durationSeconds)
    ]);
    
    return Array.from(allDurations).map(durationSeconds => {
      const rangeData = recalculatedProfile.find(p => p.durationSeconds === durationSeconds);
      const allTimeData = powerProfile.find(p => p.durationSeconds === durationSeconds);
      
      return {
        duration: rangeData?.duration || allTimeData?.duration || `${durationSeconds}s`,
        durationSeconds,
        allTimeBest: allTimeData?.best || 0,
        rangeFiltered: rangeData?.current || 0,
      };
    }).sort((a, b) => a.durationSeconds - b.durationSeconds);
  }, [recalculatedProfile, powerProfile]);
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>;
  }
  if (recalculatedProfile.length === 0 && powerProfile.length === 0) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {isRunning ? 'Pace Profile' : 'Power Profile'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            No {isRunning ? 'pace' : 'power'} profile data available yet.
            Complete some activities to see your {isRunning ? 'pace' : 'power'} curve.
          </p>
        </CardContent>
      </Card>;
  }

  // Get best power for duration from filtered data
  const getBestPowerForDuration = (duration: string) => {
    const chartItem = chartData.find(item => item.duration === duration);
    return chartItem?.rangeFiltered || chartItem?.allTimeBest || 0;
  };

  const bestEfforts = [{
    duration: '5s',
    best: activityBestPowers.find(p => p.duration === '5s')?.value || 0,
    unit: 'W'
  }, {
    duration: '1min',
    best: activityBestPowers.find(p => p.duration === '1min')?.value || 0,
    unit: 'W'
  }, {
    duration: '5min',
    best: activityBestPowers.find(p => p.duration === '5min')?.value || 0,
    unit: 'W'
  }, {
    duration: '20min',
    best: activityBestPowers.find(p => p.duration === '20min')?.value || 0,
    unit: 'W'
  }, {
    duration: '60min',
    best: activityBestPowers.find(p => p.duration === '60min')?.value || 0,
    unit: 'W'
  }];
  return <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          {isRunning ? 'Pace Profile' : 'Power Profile'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Mean maximal {isRunning ? 'pace' : 'power'} over the last 90 days
        </p>
      </div>

      {/* Activity Best Power Block */}
      {activity && !isRunning && <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Activity Best Power
            </CardTitle>
          </div>
        </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {activityBestPowers.map(power => {
                const bestFromProfile = powerProfile.find(p => p.durationSeconds === power.durationSeconds);
                return (
                  <div key={power.duration} className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{power.duration}</span>
                    </div>
                    <div className="text-lg font-bold">{formatValue(power.value)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Best: {formatValue(bestFromProfile?.best || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>}

      {/* Best Efforts Cards */}
      

      {/* Enhanced Power/Pace Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Mean Maximal {isRunning ? 'Pace' : 'Power'} Profile
            <Badge variant="secondary" className="ml-2">Last 90 days</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-15" />
                <XAxis 
                  dataKey="durationSeconds"
                  type="number"
                  scale="log"
                  domain={['auto', 'auto']}
                  ticks={[1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600]}
                  tickFormatter={(value) => {
                    if (value === 1) return '1s';
                    if (value === 5) return '5s';
                    if (value === 10) return '10s';
                    if (value === 15) return '15s';
                    if (value === 30) return '30s';
                    if (value === 60) return '1m';
                    if (value === 120) return '2m';
                    if (value === 300) return '5m';
                    if (value === 600) return '10m';
                    if (value === 1200) return '20m';
                    if (value === 1800) return '30m';
                    if (value === 3600) return '1h';
                    return `${value}s`;
                  }}
                  label={{ value: 'Duration (log scale)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 'auto']}
                  label={{ 
                    value: isRunning ? 'Pace (min/km)' : 'Power (W)', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    // Only show the rangeFiltered line value in blue
                    if (name === 'rangeFiltered') {
                      return [
                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                          {formatValue(value)}
                        </span>,
                        ''
                      ];
                    }
                    return null;
                  }}
                  labelFormatter={(value: number) => {
                    // Show duration without any prefix
                    if (value < 60) return `${value}s`;
                    if (value < 3600) {
                      const minutes = Math.floor(value / 60);
                      const seconds = value % 60;
                      return seconds > 0 ? `${minutes}m${seconds}s` : `${minutes}m`;
                    }
                    const hours = Math.floor(value / 3600);
                    const minutes = Math.floor((value % 3600) / 60);
                    return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
                  }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  labelStyle={{ 
                    color: 'hsl(var(--foreground))',
                    fontWeight: 600
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rangeFiltered"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="rangeFiltered"
                  dot={{ fill: '#3b82f6', r: 2 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>;
}