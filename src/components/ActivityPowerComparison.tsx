import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { calculateMeanMaximalPower, calculateMeanMaximalPace } from '@/utils/powerAnalysis';
import { TrendingUp, Zap, Clock } from 'lucide-react';

interface ActivityPowerComparisonProps {
  activity: any;
}

export function ActivityPowerComparison({ activity }: ActivityPowerComparisonProps) {
  const { powerProfile, recalculatedProfile, loading } = usePowerProfile('90-day');
  const { sportMode } = useSportMode();
  const isRunning = sportMode === 'running';

  const formatValue = (value: number) => {
    if (isRunning) {
      const minutes = Math.floor(value);
      const seconds = Math.round((value - minutes) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
    }
    return `${Math.round(value)}W`;
  };

  // Calculate activity mean max power/pace
  const activityMeanMax = useMemo(() => {
    if (!activity?.gps_data?.trackPoints) return [];
    
    const durations = [1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
    const trackPoints = activity.gps_data.trackPoints;
    
    return durations.map(duration => {
      let value = 0;
      
      if (isRunning) {
        value = calculateMeanMaximalPace(trackPoints, duration) || 0;
      } else {
        value = calculateMeanMaximalPower(trackPoints, duration) || 0;
      }
      
      return {
        durationSeconds: duration,
        activityValue: value > 0 ? value : null
      };
    });
  }, [activity, isRunning]);

  // Calculate activity best powers for key durations
  const activityBestPowers = useMemo(() => {
    if (!activity?.gps_data?.trackPoints) return [];
    
    const targetDurations = [5, 60, 300, 1200, 3600]; // 5s, 1min, 5min, 20min, 60min
    const targetLabels = ['5s', '1min', '5min', '20min', '60min'];
    const trackPoints = activity.gps_data.trackPoints;
    
    return targetDurations.map((duration, index) => {
      let value = 0;
      
      if (isRunning) {
        value = calculateMeanMaximalPace(trackPoints, duration) || 0;
      } else {
        value = calculateMeanMaximalPower(trackPoints, duration) || 0;
      }
      
      return {
        duration: targetLabels[index],
        durationSeconds: duration,
        value: Math.round(value)
      };
    });
  }, [activity, isRunning]);

  // Combine activity data with 90-day profile and all-time bests
  const chartData = useMemo(() => {
    const allDurations = new Set([
      ...activityMeanMax.map(p => p.durationSeconds),
      ...recalculatedProfile.map(p => p.durationSeconds),
      ...powerProfile.map(p => p.durationSeconds)
    ]);
    
    return Array.from(allDurations).map(durationSeconds => {
      const activityData = activityMeanMax.find(p => p.durationSeconds === durationSeconds);
      const rangeData = recalculatedProfile.find(p => p.durationSeconds === durationSeconds);
      const allTimeData = powerProfile.find(p => p.durationSeconds === durationSeconds);
      
      return {
        durationSeconds,
        activityPower: activityData?.activityValue || null,
        meanMax90Day: rangeData?.current || null,
        allTimeBest: allTimeData?.best || null
      };
    }).sort((a, b) => a.durationSeconds - b.durationSeconds);
  }, [activityMeanMax, recalculatedProfile, powerProfile]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {isRunning ? 'Pace Profile & Comparison' : 'Power Profile & Comparison'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            No comparison data available for this activity.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Best Power Block */}
      {!isRunning && activityBestPowers.length > 0 && (
        <Card>
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
        </Card>
      )}

      {/* Combined Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              {isRunning ? 'Pace Profile & Comparison' : 'Power Profile & Comparison'}
            </CardTitle>
            <Badge variant="secondary">Last 90 days</Badge>
          </div>
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
                  ticks={[1, 5, 10, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600, 5400, 7200, 10800]}
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
                    if (value === 5400) return '1h30m';
                    if (value === 7200) return '2h';
                    if (value === 10800) return '3h';
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
                    if (name === 'activityPower') {
                      return [formatValue(value), 'This Activity'];
                    }
                    if (name === 'meanMax90Day') {
                      return [formatValue(value), '90-Day Mean Max'];
                    }
                    if (name === 'allTimeBest') {
                      return [formatValue(value), 'All-Time Best'];
                    }
                    return [formatValue(value), name];
                  }}
                  labelFormatter={(value: number) => {
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
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => {
                    if (value === 'activityPower') return 'This Activity';
                    if (value === 'meanMax90Day') return '90-Day Mean Max';
                    if (value === 'allTimeBest') return 'All-Time Best';
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="activityPower"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="activityPower"
                  dot={{ fill: '#ef4444', r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="meanMax90Day"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="meanMax90Day"
                  dot={{ fill: '#3b82f6', r: 2 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="allTimeBest"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="allTimeBest"
                  dot={{ fill: '#22c55e', r: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
