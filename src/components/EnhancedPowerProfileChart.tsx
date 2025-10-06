import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { calculateMeanMaximalPower, calculateMeanMaximalPace } from '@/utils/powerAnalysis';
import { TrendingUp, Zap, Clock, Calendar } from 'lucide-react';
interface EnhancedPowerProfileChartProps {
  activity?: any;
}
export function EnhancedPowerProfileChart({
  activity
}: EnhancedPowerProfileChartProps) {
  const [dateRange, setDateRange] = useState('90');
  const {
    powerProfile,
    loading
  } = usePowerProfile(parseInt(dateRange));
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

  // Use the already filtered power profile from the hook
  const filteredPowerProfile = powerProfile;
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
        activityMeanMax: activityItem?.activityMeanMax || 0
      };
    });
  }, [filteredPowerProfile, activityMeanMax]);
  if (loading) {
    return <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>;
  }
  if (powerProfile.length === 0) {
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

  // Get date range label
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7':
        return 'Last 7 days';
      case '14':
        return 'Last 14 days';
      case '30':
        return 'Last 30 days';
      case '90':
        return 'Last 90 days';
      case '180':
        return 'Last 6 months';
      case '365':
        return 'Last year';
      default:
        return 'Last 90 days';
    }
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
          Mean maximal {isRunning ? 'pace' : 'power'} across different durations
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
        </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {activityBestPowers.map(power => <div key={power.duration} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{power.duration}</span>
                  </div>
                  <div className="text-lg font-bold">{formatValue(power.value)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Best: {formatValue(getBestPowerForDuration(power.duration))}
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>}

      {/* Best Efforts Cards */}
      

      {/* Enhanced Power/Pace Curve Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mean Maximal {isRunning ? 'Pace' : 'Power'} Profile
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="durationLabel" 
                  label={{ value: 'Duration', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ 
                    value: isRunning ? 'Pace (min/km)' : 'Power (W)', 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                />
                <Tooltip 
                  formatter={(value: number) => [formatValue(value), '']}
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
                  dataKey="allTimeBest"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="All-Time Best"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="rangeFiltered"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  name={getDateRangeLabel()}
                  dot={{ fill: 'hsl(var(--chart-2))' }}
                />
                {activity && (
                  <Line
                    type="monotone"
                    dataKey="activityMeanMax"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    name="This Activity"
                    dot={{ fill: 'hsl(var(--chart-3))' }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>;
}