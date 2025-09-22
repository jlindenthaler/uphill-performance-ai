import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { useSportMode } from '@/contexts/SportModeContext';
import { Activity, Clock, Heart, Zap, BarChart3 } from 'lucide-react';

interface ActivityAnalysisChartProps {
  activity?: any;
}

export function ActivityAnalysisChart({ activity }: ActivityAnalysisChartProps) {
  const [dateRange, setDateRange] = useState('90');
  const [visibleMetrics, setVisibleMetrics] = useState(['cadence', 'hr', 'wl', 'wr', 'speed', 'temp', 'elevation']);
  const { sportMode } = useSportMode();
  const isRunning = sportMode === 'running';

  // Generate timeline data based on real activity structure
  const timelineData = useMemo(() => {
    if (!activity) return [];
    
    const duration = activity.duration_seconds || 3600;
    const points = Math.min(Math.floor(duration / 5), 600); // More granular data points every 5 seconds
    
    // Use real activity data as baseline
    const avgPower = activity.avg_power || 0;
    const avgHr = activity.avg_heart_rate || 0;
    const avgCadence = activity.avg_cadence || (isRunning ? 180 : 90);
    const avgSpeed = activity.avg_speed_kmh || (isRunning ? 12 : 35);
    const maxPower = activity.max_power || avgPower * 2;
    const maxHr = activity.max_heart_rate || avgHr * 1.3;
    
    return Array.from({ length: points }, (_, i) => {
      const timeSeconds = (i * duration) / points;
      const hours = Math.floor(timeSeconds / 3600);
      const minutes = Math.floor((timeSeconds % 3600) / 60);
      const seconds = Math.floor(timeSeconds % 60);
      const timeFormatted = hours > 0 
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const progress = timeSeconds / duration;
      
      // Create structured workout patterns
      let power = 0;
      let heartRate = avgHr * 0.6; // Start with warmup HR
      let cadence = avgCadence * 0.8;
      let speed = avgSpeed * 0.7;
      
      if (avgPower > 0) {
        // Simulate structured workout with intervals
        const cycleLength = 600; // 10-minute cycles
        const cyclePosition = (timeSeconds % cycleLength) / cycleLength;
        
        // Warmup phase (first 10% of workout)
        if (progress < 0.1) {
          const warmupProgress = progress / 0.1;
          power = Math.round(avgPower * 0.4 * (1 + warmupProgress));
          heartRate = Math.round((avgHr * 0.6) + (avgHr * 0.2 * warmupProgress));
          cadence = Math.round(avgCadence * (0.7 + warmupProgress * 0.2));
          speed = Math.round(avgSpeed * (0.6 + warmupProgress * 0.3) * 10) / 10;
        }
        // Main workout phase (10% - 85% of workout)
        else if (progress < 0.85) {
          // Create interval structure
          if (cyclePosition < 0.6) { // Work phase (6 minutes)
            const intervalIntensity = 0.8 + Math.sin(cyclePosition * Math.PI * 3) * 0.3; // Varying intensity
            power = Math.round(avgPower * intervalIntensity + (Math.random() - 0.5) * avgPower * 0.1);
            power = Math.max(avgPower * 0.3, Math.min(power, maxPower));
            
            heartRate = Math.round(avgHr * (0.7 + intervalIntensity * 0.25));
            cadence = Math.round(avgCadence * (0.85 + intervalIntensity * 0.2));
            speed = Math.round(avgSpeed * (0.7 + intervalIntensity * 0.4) * 10) / 10;
          } else { // Recovery phase (4 minutes)
            power = Math.round(avgPower * 0.4 + (Math.random() - 0.5) * 20);
            heartRate = Math.round(avgHr * 0.75);
            cadence = Math.round(avgCadence * 0.75);
            speed = Math.round(avgSpeed * 0.6 * 10) / 10;
          }
        }
        // Cooldown phase (last 15% of workout)
        else {
          const cooldownProgress = (progress - 0.85) / 0.15;
          power = Math.round(avgPower * 0.4 * (1 - cooldownProgress * 0.5));
          heartRate = Math.round(avgHr * (0.75 - cooldownProgress * 0.2));
          cadence = Math.round(avgCadence * (0.8 - cooldownProgress * 0.2));
          speed = Math.round(avgSpeed * (0.7 - cooldownProgress * 0.3) * 10) / 10;
        }
        
        // Add some realistic noise to all metrics
        power += Math.round((Math.random() - 0.5) * 15);
        heartRate += Math.round((Math.random() - 0.5) * 5);
        cadence += Math.round((Math.random() - 0.5) * 10);
        
        // Ensure values stay within realistic bounds
        power = Math.max(0, power);
        heartRate = Math.max(60, Math.min(heartRate, maxHr));
        cadence = Math.max(40, Math.min(cadence, avgCadence * 1.4));
        speed = Math.max(0, speed);
      }
      
      // Simulate elevation changes (hills/terrain)
      const elevationBase = 100;
      const elevationVariation = Math.sin(progress * Math.PI * 2) * 50 + Math.sin(progress * Math.PI * 6) * 20;
      const elevation = Math.round(elevationBase + elevationVariation + (Math.random() - 0.5) * 10);
      
      // Temperature gradually increases during workout
      const temperature = Math.round((20 + progress * 5 + Math.random() * 2) * 10) / 10;
      
      // Calculate left/right balance (simulate slight imbalance during high intensity)
      const intensityFactor = power / Math.max(avgPower, 1);
      const balanceBase = 50 + (intensityFactor > 1.2 ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 4);
      const balance = Math.round(Math.max(45, Math.min(55, balanceBase)) * 10) / 10;
      
      return {
        time: timeFormatted,
        timeSeconds,
        power: Math.max(0, power),
        balance,
        heartRate: Math.max(60, heartRate),
        cadence: Math.max(0, cadence),
        speed: Math.max(0, speed),
        temperature,
        elevation,
        zone: power > 0 ? Math.min(5, Math.max(1, Math.floor(power / (avgPower * 0.5)) + 1)) : 1
      };
    });
  }, [activity, isRunning]);

  // Generate peak power curve data
  const peakPowerData = useMemo(() => {
    const durations = [
      { label: '5sec', seconds: 5 },
      { label: '20sec', seconds: 20 },
      { label: '2min', seconds: 120 },
      { label: '10min', seconds: 600 },
      { label: '30min', seconds: 1800 },
      { label: '2hrs', seconds: 7200 },
      { label: '24hrs', seconds: 86400 }
    ];

    return durations.map(duration => {
      const avgPower = activity?.avg_power || 0;
      const maxPower = activity?.max_power || avgPower * 1.5;
      const normalizedPower = activity?.normalized_power || avgPower;
      
      let currentPower = avgPower;
      let comparisonPower = avgPower * 0.9;

      if (avgPower > 0) {
        // Realistic power curve based on actual data
        if (duration.seconds <= 10) currentPower = Math.min(maxPower, normalizedPower * 1.6);
        else if (duration.seconds <= 60) currentPower = Math.min(maxPower, normalizedPower * 1.3);
        else if (duration.seconds <= 300) currentPower = normalizedPower * 1.1;
        else if (duration.seconds <= 1200) currentPower = normalizedPower;
        else currentPower = normalizedPower * 0.9;

        // Comparison range (simulate historical data)
        comparisonPower = currentPower * (0.85 + Math.random() * 0.2);
      }

      return {
        duration: duration.label,
        currentRange: Math.round(currentPower),
        comparisonRange: Math.round(comparisonPower),
      };
    });
  }, [activity]);

  // Generate peak heart rate curve data
  const peakHeartRateData = useMemo(() => {
    const durations = [
      { label: '5sec', seconds: 5 },
      { label: '20sec', seconds: 20 },
      { label: '2min', seconds: 120 },
      { label: '10min', seconds: 600 },
      { label: '30min', seconds: 1800 },
      { label: '2hrs', seconds: 7200 },
      { label: '24hrs', seconds: 86400 }
    ];

    return durations.map(duration => {
      const avgHr = activity?.avg_heart_rate || 0;
      const maxHr = activity?.max_heart_rate || avgHr * 1.3;
      let currentHr = avgHr;
      let comparisonHr = avgHr * 0.95;

      if (avgHr > 0) {
        // Realistic HR curve based on actual data
        if (duration.seconds <= 10) currentHr = Math.min(maxHr, avgHr * 1.15);
        else if (duration.seconds <= 60) currentHr = Math.min(maxHr, avgHr * 1.1);
        else if (duration.seconds <= 300) currentHr = Math.min(maxHr, avgHr * 1.05);
        else if (duration.seconds <= 1200) currentHr = avgHr;
        else currentHr = avgHr * 0.92;

        comparisonHr = currentHr * (0.9 + Math.random() * 0.15);
      }

      return {
        duration: duration.label,
        currentRange: Math.round(currentHr),
        comparisonRange: Math.round(comparisonHr),
      };
    });
  }, [activity]);

  // Custom tooltip for timeline
  const TimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
            const getUnit = (name: string) => {
              if (name === 'Power') return 'W';
              if (name === 'L:R Balance') return '%';
              if (name === 'Heart Rate') return 'bpm';
              if (name === 'Cadence') return 'rpm';
              if (name === 'Speed') return 'km/h';
              if (name === 'Temperature') return '°C';
              if (name === 'Elevation') return 'm';
              return '';
            };
            
            return (
              <p key={index} style={{ color: entry.color }}>
                {`${entry.name}: ${entry.value}${getUnit(entry.name)}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!activity) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No activity selected for analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Activity Analysis
          </h3>
          <p className="text-sm text-muted-foreground">
            Detailed power, heart rate, and performance metrics analysis
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ToggleGroup 
            type="multiple" 
            value={visibleMetrics} 
            onValueChange={setVisibleMetrics}
            className="flex gap-1"
          >
            <ToggleGroupItem value="cadence" className="text-xs px-2 py-1 h-6 bg-zone-1/20 text-zone-1 border-zone-1/30 data-[state=on]:bg-zone-1/40">
              RPM
            </ToggleGroupItem>
            <ToggleGroupItem value="hr" className="text-xs px-2 py-1 h-6 bg-destructive/20 text-destructive border-destructive/30 data-[state=on]:bg-destructive/40">
              BPM
            </ToggleGroupItem>
            <ToggleGroupItem value="wl" className="text-xs px-2 py-1 h-6 bg-zone-3/20 text-zone-3 border-zone-3/30 data-[state=on]:bg-zone-3/40">
              Power
            </ToggleGroupItem>
            <ToggleGroupItem value="wr" className="text-xs px-2 py-1 h-6 bg-zone-4/20 text-zone-4 border-zone-4/30 data-[state=on]:bg-zone-4/40">
              L:R
            </ToggleGroupItem>
            <ToggleGroupItem value="speed" className="text-xs px-2 py-1 h-6 bg-primary/20 text-primary border-primary/30 data-[state=on]:bg-primary/40">
              Speed
            </ToggleGroupItem>
            <ToggleGroupItem value="temp" className="text-xs px-2 py-1 h-6 bg-accent/20 text-accent border-accent/30 data-[state=on]:bg-accent/40">
              C
            </ToggleGroupItem>
            <ToggleGroupItem value="elevation" className="text-xs px-2 py-1 h-6 bg-muted/20 text-muted-foreground border-muted/30 data-[state=on]:bg-muted/40">
              Elev
            </ToggleGroupItem>
          </ToggleGroup>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Timeline Chart */}
      <Card className="card-gradient">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Activity Timeline</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time
              </div>
              <div>Dist</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{ top: 20, right: 80, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="time"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="power"
                  orientation="left"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="hr"
                  orientation="right"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Tooltip content={<TimelineTooltip />} />
                
                {/* Conditionally render Total Power */}
                {visibleMetrics.includes('wl') && (
                  <Line
                    yAxisId="power"
                    type="monotone"
                    dataKey="power"
                    stroke="hsl(var(--zone-3))"
                    strokeWidth={2}
                    dot={false}
                    name="Power"
                  />
                )}
                
                {/* Conditionally render L:R Balance */}
                {visibleMetrics.includes('wr') && (
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="balance"
                    stroke="hsl(var(--zone-4))"
                    strokeWidth={2}
                    dot={false}
                    name="L:R Balance"
                  />
                )}
                
                {/* Conditionally render Heart Rate */}
                {visibleMetrics.includes('hr') && (
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="heartRate"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    name="Heart Rate"
                  />
                )}
                
                {/* Conditionally render Cadence */}
                {visibleMetrics.includes('cadence') && (
                  <Line
                    yAxisId="power"
                    type="monotone"
                    dataKey="cadence"
                    stroke="hsl(var(--zone-1))"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    dot={false}
                    name="Cadence"
                  />
                )}
                
                {/* Conditionally render Speed */}
                {visibleMetrics.includes('speed') && (
                  <Line
                    yAxisId="power"
                    type="monotone"
                    dataKey="speed"
                    stroke="hsl(var(--primary))"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    dot={false}
                    name="Speed"
                  />
                )}
                
                {/* Conditionally render Elevation */}
                {visibleMetrics.includes('elevation') && (
                  <Line
                    yAxisId="hr"
                    type="monotone"
                    dataKey="elevation"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    dot={false}
                    name="Elevation"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Peak Power and Heart Rate Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Power Chart */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Peak Power
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-zone-3 rounded"></div>
                <span>25/6/2025 - 22/9/2025</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-zone-4 rounded opacity-60"></div>
                <span>22/9/2025</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakPowerData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="duration"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'WATTS', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`${value}W`, '']}
                  />
                  
                  {/* Comparison range area */}
                  <Area
                    type="monotone"
                    dataKey="comparisonRange"
                    stroke="hsl(var(--zone-4))"
                    fill="hsl(var(--zone-4))"
                    fillOpacity={0.4}
                    strokeWidth={2}
                    name="Comparison Range"
                  />
                  
                  {/* Current range area */}
                  <Area
                    type="monotone"
                    dataKey="currentRange"
                    stroke="hsl(var(--zone-3))"
                    fill="hsl(var(--zone-3))"
                    fillOpacity={0.6}
                    strokeWidth={2}
                    name="Current Range"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Peak Heart Rate Chart */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Peak Heart Rate
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive rounded"></div>
                <span>25/6/2025 - 22/9/2025</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-destructive/60 rounded"></div>
                <span>22/9/2025</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakHeartRateData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="duration"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'BPM', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => [`${value} bpm`, '']}
                  />
                  
                  {/* Comparison range area */}
                  <Area
                    type="monotone"
                    dataKey="comparisonRange"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.4}
                    strokeWidth={2}
                    name="Comparison Range"
                    strokeDasharray="5 5"
                  />
                  
                  {/* Current range area */}
                  <Area
                    type="monotone"
                    dataKey="currentRange"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.7}
                    strokeWidth={2}
                    name="Current Range"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid Placeholder */}
      <Card className="card-gradient">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <BarChart3 className="w-5 h-5 mr-2" />
            Data Grid
          </div>
        </CardContent>
      </Card>
    </div>
  );
}