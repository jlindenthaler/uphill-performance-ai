import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { TrendingUp, Zap, Clock, Calendar } from 'lucide-react';

interface EnhancedPowerProfileChartProps {
  activity?: any;
}

export function EnhancedPowerProfileChart({ activity }: EnhancedPowerProfileChartProps) {
  const [dateRange, setDateRange] = useState('90');
  const { powerProfile, loading } = usePowerProfile(parseInt(dateRange));
  const { sportMode } = useSportMode();
  const isRunning = sportMode === 'running';

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${(seconds / 60).toFixed(2)}m`;
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

  // Calculate activity mean max power (mock implementation for now)
  const calculateActivityMeanMax = () => {
    if (!activity) return [];
    
    const durations = [1, 5, 10, 20, 60, 300, 600, 1200, 3600];
    return durations.map(duration => {
      const durationLabel = formatDuration(duration);
      
      // Calculate mean max power/pace based on activity data
      let value = 0;
      if (isRunning && activity.avg_pace_per_km) {
        // For running, estimate pace at different durations
        const basePace = activity.avg_pace_per_km;
        // Shorter durations = faster pace (lower time per km)
        const factor = duration <= 20 ? 0.85 : duration <= 300 ? 0.9 : duration <= 1200 ? 1.0 : 1.1;
        value = basePace * factor;
      } else if (!isRunning && activity.avg_power) {
        // For cycling, estimate power at different durations using power curve
        const basePower = activity.avg_power;
        let factor = 1.0;
        
        // Power curve approximation - shorter durations have higher power
        if (duration <= 10) factor = 1.8; // Neuromuscular power
        else if (duration <= 60) factor = 1.5; // VO2max power
        else if (duration <= 300) factor = 1.2; // 5min power
        else if (duration <= 1200) factor = 1.0; // Threshold power
        else factor = 0.85; // Endurance power
        
        // Use max power if available for very short durations
        if (duration <= 20 && activity.max_power) {
          value = activity.max_power * (duration <= 10 ? 1.0 : 0.9);
        } else {
          value = basePower * factor;
        }
      }
      
      return {
        duration: durationLabel,
        activityMeanMax: value
      };
    });
  };

  const activityMeanMax = useMemo(() => calculateActivityMeanMax(), [activity, isRunning]);

  // Calculate activity best power for specific durations
  const calculateActivityBestPowers = () => {
    if (!activity) return [];
    
    const targetDurations = [5, 60, 300, 1200, 3600]; // 5s, 1min, 5min, 20min, 60min
    const targetLabels = ['5s', '1min', '5min', '20min', '60min'];
    
    return targetDurations.map((duration, index) => {
      let value = 0;
      
      if (!isRunning && activity.avg_power) {
        const basePower = activity.avg_power;
        let factor = 1.0;
        
        // Power curve approximation - shorter durations have higher power
        if (duration <= 10) factor = 1.8; // Neuromuscular power
        else if (duration <= 60) factor = 1.5; // VO2max power
        else if (duration <= 300) factor = 1.2; // 5min power
        else if (duration <= 1200) factor = 1.0; // Threshold power
        else factor = 0.85; // Endurance power
        
        // Use max power if available for very short durations
        if (duration <= 20 && activity.max_power) {
          value = activity.max_power * (duration <= 10 ? 1.0 : 0.9);
        } else {
          value = basePower * factor;
        }
      }
      
      return {
        duration: targetLabels[index],
        durationSeconds: duration,
        value: Math.round(value)
      };
    });
  };

  const activityBestPowers = useMemo(() => calculateActivityBestPowers(), [activity, isRunning]);

  // Filter power profile by date range (mock implementation)
  const filteredPowerProfile = useMemo(() => {
    // In a real implementation, this would filter by date
    return powerProfile;
  }, [powerProfile, dateRange]);

  const chartData = useMemo(() => {
    const durations = ['1s', '5s', '10s', '20s', '1min', '5min', '10min', '20min', '60min'];
    return durations.map((duration, index) => {
      const profileItem = filteredPowerProfile.find(item => item.duration === duration);
      const activityItem = activityMeanMax.find(item => item.duration === duration);
      
      return {
        duration,
        durationLabel: formatDuration([1, 5, 10, 20, 60, 300, 600, 1200, 3600][index]),
        allTimeBest: profileItem?.best || 0,
        rangeFiltered: profileItem?.current || 0,
        activityMeanMax: activityItem?.activityMeanMax || 0,
      };
    });
  }, [filteredPowerProfile, activityMeanMax]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (powerProfile.length === 0) {
    return (
      <Card>
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
      </Card>
    );
  }

  const bestEfforts = [
    { duration: '5s', best: activityBestPowers.find(p => p.duration === '5s')?.value || 0, unit: 'W' },
    { duration: '1min', best: activityBestPowers.find(p => p.duration === '1min')?.value || 0, unit: 'W' },
    { duration: '5min', best: activityBestPowers.find(p => p.duration === '5min')?.value || 0, unit: 'W' },
    { duration: '20min', best: activityBestPowers.find(p => p.duration === '20min')?.value || 0, unit: 'W' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {isRunning ? 'Pace Profile' : 'Power Profile'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Mean maximal {isRunning ? 'pace' : 'power'} across different durations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Best Power Block */}
      {activity && !isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Activity Best Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {activityBestPowers.map((power) => (
                <div key={power.duration} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{power.duration}</span>
                  </div>
                  <div className="text-lg font-bold">{power.value}W</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Best Efforts Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bestEfforts.map((effort) => (
          <Card key={effort.duration} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-1 via-zone-2 to-zone-3"></div>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{effort.duration}</span>
              </div>
              <div className="text-xl font-bold">{formatValue(effort.best)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                Best {effort.unit}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Power/Pace Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {isRunning ? 'Pace Profile Curve' : 'Power Profile Curve'}
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
                    name === 'allTimeBest' ? 'All-Time Best' :
                    name === 'rangeFiltered' ? `${dateRange}-Day Best` :
                    'Activity Mean Max'
                  ]}
                  labelFormatter={(label) => `Duration: ${label}`}
                />
                
                {/* All-time best line */}
                <Line
                  type="monotone"
                  dataKey="allTimeBest"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="All-Time Best"
                />
                
                {/* Date range filtered line */}
                <Line
                  type="monotone"
                  dataKey="rangeFiltered"
                  stroke="hsl(var(--zone-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--zone-2))', strokeWidth: 2, r: 3 }}
                  name="Range Filtered"
                />
                
                {/* Activity mean max line (if activity provided) */}
                {activity && (
                  <Line
                    type="monotone"
                    dataKey="activityMeanMax"
                    stroke="hsl(var(--zone-3))"
                    strokeWidth={2}
                    strokeDasharray="2 2"
                    dot={{ fill: 'hsl(var(--zone-3))', strokeWidth: 2, r: 3 }}
                    name="Activity Mean Max"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}