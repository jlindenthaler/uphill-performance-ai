import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { TrendingUp, Zap, Clock, Target } from 'lucide-react';

interface ActivityPowerComparisonProps {
  activity: any;
}

export function ActivityPowerComparison({ activity }: ActivityPowerComparisonProps) {
  const { powerProfile, loading } = usePowerProfile(90); // 90-day historical data
  const { sportMode } = useSportMode();
  const isRunning = sportMode === 'running';

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
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

  // Calculate real activity power/pace data from GPS data using mean maximal calculations
  const getActivityEfforts = () => {
    if (!activity?.gps_data?.trackPoints) return [];
    
    const durations = [
      { label: '1min', seconds: 60 },
      { label: '5min', seconds: 300 },
      { label: '20min', seconds: 1200 },
      { label: '60min', seconds: 3600 }
    ];

    return durations.map(duration => {
      let value = 0;
      if (isRunning) {
        const { calculateMeanMaximalPace } = require('@/utils/powerAnalysis');
        value = calculateMeanMaximalPace(activity.gps_data.trackPoints, duration.seconds) || 0;
      } else {
        const { calculateMeanMaximalPower } = require('@/utils/powerAnalysis');
        value = calculateMeanMaximalPower(activity.gps_data.trackPoints, duration.seconds) || 0;
      }
      
      return {
        duration: duration.label,
        value: value,
        unit: isRunning ? 'min/km' : 'W'
      };
    });
  };

  const activityEfforts = getActivityEfforts();
  
  // Combine power profile data with activity data for chart
  const chartData = powerProfile.map(profileItem => {
    const activityItem = activityEfforts.find(ae => ae.duration === profileItem.duration);
    return {
      duration: profileItem.duration,
      durationLabel: profileItem.duration,
      profile90Days: profileItem.best,
      activityBest: activityItem?.value || 0,
    };
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Best Efforts Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activityEfforts.map((effort, index) => {
          const profileItem = powerProfile.find(p => p.duration === effort.duration);
          const isPersonalBest = profileItem && (
            isRunning ? effort.value < profileItem.best : effort.value > profileItem.best
          );
          
          return (
            <Card key={effort.duration} className={`relative overflow-hidden ${isPersonalBest ? 'ring-2 ring-primary' : ''}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${isPersonalBest ? 'bg-primary' : 'bg-gradient-to-r from-zone-1 via-zone-2 to-zone-3'}`}></div>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{effort.duration}</span>
                </div>
                <div className="text-lg font-bold">
                  {effort.value > 0 ? formatValue(effort.value) : '--'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Best: {profileItem ? formatValue(profileItem.best) : '--'}
                </div>
                {isPersonalBest && (
                  <Badge variant="default" className="text-xs mt-1">
                    <Target className="w-2 h-2 mr-1" />
                    PB!
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Power/Pace Curve Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            Activity vs 90-Day {isRunning ? 'Pace' : 'Power'} Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="durationLabel"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={formatValue}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number, name: string) => [
                    formatValue(value),
                    name === 'profile90Days' ? '90-Day Best' : 'This Activity'
                  ]}
                  labelFormatter={(label) => `Duration: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="profile90Days"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="90-Day Best"
                />
                <Line
                  type="monotone"
                  dataKey="activityBest"
                  stroke="hsl(var(--zone-3))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--zone-3))', strokeWidth: 2, r: 3 }}
                  name="This Activity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}