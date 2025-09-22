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

  // Generate mock timeline data based on activity
  const timelineData = useMemo(() => {
    if (!activity) return [];
    
    const duration = activity.elapsed_time || 3600; // 1 hour default
    const points = Math.min(Math.floor(duration / 10), 300); // Max 300 points
    
    return Array.from({ length: points }, (_, i) => {
      const timeSeconds = (i * duration) / points;
      const timeFormatted = `${Math.floor(timeSeconds / 60)}:${(timeSeconds % 60).toString().padStart(2, '0')}`;
      
      // Simulate realistic data with some randomness
      const basePower = activity.avg_power || 200;
      const baseHr = activity.avg_heartrate || 150;
      const baseCadence = isRunning ? 180 : 90;
      const baseSpeed = activity.avg_speed || (isRunning ? 12 : 35);
      const baseTemp = 22; // Base temperature in Celsius
      const baseElevation = 100; // Base elevation in meters
      
      // Add some variation to make it realistic
      const powerVariation = 0.8 + Math.random() * 0.4;
      const hrVariation = 0.9 + Math.random() * 0.2;
      const cadenceVariation = 0.85 + Math.random() * 0.3;
      const speedVariation = 0.9 + Math.random() * 0.2;
      const tempVariation = 0.95 + Math.random() * 0.1;
      const elevationVariation = 0.7 + Math.random() * 0.6; // More variation for elevation
      
      const leftPower = basePower * powerVariation * 0.52; // Slightly more left
      const rightPower = basePower * powerVariation * 0.48; // Slightly less right
      const balance = (leftPower / (leftPower + rightPower)) * 100; // Left/Right balance as percentage
      
      return {
        time: timeFormatted,
        timeSeconds,
        power: Math.round(basePower * powerVariation),
        balance: Math.round(balance * 10) / 10, // Left/Right balance percentage
        heartRate: Math.round(baseHr * hrVariation),
        cadence: Math.round(baseCadence * cadenceVariation),
        speed: Math.round(baseSpeed * speedVariation * 10) / 10,
        temperature: Math.round(baseTemp * tempVariation * 10) / 10,
        elevation: Math.round(baseElevation * elevationVariation),
        // Add zone coloring based on power/HR
        zone: Math.min(4, Math.max(1, Math.floor((basePower * powerVariation) / (basePower * 0.25)) + 1))
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
      const basePower = activity?.avg_power || 200;
      let currentPower = basePower;
      let comparisonPower = basePower * 0.9;

      // Power curve - shorter durations have higher power
      if (duration.seconds <= 10) currentPower = basePower * 1.8;
      else if (duration.seconds <= 60) currentPower = basePower * 1.5;
      else if (duration.seconds <= 300) currentPower = basePower * 1.2;
      else if (duration.seconds <= 1200) currentPower = basePower * 1.0;
      else currentPower = basePower * 0.85;

      // Comparison range (e.g., 3 months ago)
      comparisonPower = currentPower * (0.85 + Math.random() * 0.2);

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
      const baseHr = activity?.avg_heartrate || 150;
      const maxHr = activity?.max_heartrate || 190;
      let currentHr = baseHr;
      let comparisonHr = baseHr * 0.95;

      // HR curve - shorter durations approach max HR
      if (duration.seconds <= 10) currentHr = maxHr * 0.98;
      else if (duration.seconds <= 60) currentHr = maxHr * 0.95;
      else if (duration.seconds <= 300) currentHr = maxHr * 0.90;
      else if (duration.seconds <= 1200) currentHr = maxHr * 0.85;
      else currentHr = maxHr * 0.75;

      comparisonHr = currentHr * (0.9 + Math.random() * 0.15);

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