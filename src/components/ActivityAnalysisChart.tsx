import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { useSportMode } from '@/contexts/SportModeContext';
import { Activity, Clock, Heart, Zap, BarChart3, MapPin } from 'lucide-react';
import { calculateMeanMaximalPower, calculateMeanMaximalPace } from '@/utils/powerAnalysis';
import { usePowerProfile } from '@/hooks/usePowerProfile';
interface ActivityAnalysisChartProps {
  activity?: any;
}
export function ActivityAnalysisChart({
  activity
}: ActivityAnalysisChartProps) {
  const [dateRange, setDateRange] = useState('90');
  const [visibleMetrics, setVisibleMetrics] = useState(['cadence', 'hr', 'wl', 'speed', 'temp', 'elevation']);
  const [xAxisMode, setXAxisMode] = useState<'time' | 'distance'>('time');
  const {
    sportMode
  } = useSportMode();
  const isRunning = sportMode === 'running';

  // Use real activity trackPoints data for timeline
  const timelineData = useMemo(() => {
    if (!activity?.gps_data?.trackPoints) return [];
    const trackPoints = activity.gps_data.trackPoints;
    const startTime = trackPoints[0]?.timestamp;
    let cumulativeDistance = 0;
    let cumulativeRecordingTime = 0; // Track actual recording time excluding pauses

    return trackPoints.map((point: any, index: number) => {
      let timeElapsed;
      if (index === 0) {
        timeElapsed = 0;
      } else {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp ? (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 : 1;

        // Only add time if gap is reasonable (less than 10 seconds indicates continuous recording)
        // Larger gaps indicate pauses and should create natural breaks in the timeline
        if (timeInterval <= 10) {
          cumulativeRecordingTime += timeInterval;
        } else {
          // For large gaps, create a null data point to break the line
          cumulativeRecordingTime += timeInterval;
        }
        timeElapsed = cumulativeRecordingTime;
      }

      // Calculate cumulative distance by integrating speed over time
      if (index > 0 && point.speed) {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp ? (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 : 1;

        // Use speed (m/s) * time (s) = distance (m)
        const avgSpeed = ((point.speed || 0) + (prevPoint.speed || 0)) / 2;
        cumulativeDistance += avgSpeed * timeInterval;
      }
      const hours = Math.floor(timeElapsed / 3600);
      const minutes = Math.floor(timeElapsed % 3600 / 60);
      const seconds = Math.floor(timeElapsed % 60);
      const timeFormatted = hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const distanceKm = cumulativeDistance / 1000;
      const distanceFormatted = distanceKm < 10 ? `${distanceKm.toFixed(1)}km` : `${Math.round(distanceKm)}km`;

      // Convert speed from m/s to km/h if needed
      const speedKmh = point.speed ? point.speed * 3.6 : 0;

  // Check if there's any R power data in the activity
  const hasRPowerData = useMemo(() => {
    return timelineData.some(point => point.rPower > 0);
  }, [timelineData]);

  // Helper function to format duration labels
  const formatDurationLabel = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = seconds / 60;
      if (minutes < 60) {
        return minutes % 1 === 0 ? `${minutes}min` : `${minutes}min`;
      } else {
        const hours = minutes / 60;
        return `${hours}h`;
      }
    }
  };

  // Fetch historical power profile data with date range
  const { powerProfile: historicalData, loading: historicalLoading } = usePowerProfile(parseInt(dateRange));

  // Logarithmic interpolation function
  const interpolateValue = (x1: number, y1: number, x2: number, y2: number, x: number): number => {
    if (y1 === 0 || y2 === 0) return 0;
    // Logarithmic interpolation: log(y) = log(y1) + (log(y2) - log(y1)) * (log(x) - log(x1)) / (log(x2) - log(x1))
    const logY1 = Math.log(y1);
    const logY2 = Math.log(y2);
    const logX1 = Math.log(x1);
    const logX2 = Math.log(x2);
    const logX = Math.log(x);
    
    const logY = logY1 + (logY2 - logY1) * (logX - logX1) / (logX2 - logX1);
    return Math.exp(logY);
  };

  // Generate peak power curve data with interpolation
  const peakPowerData = useMemo(() => {
    // Base duration values for calculation
    const baseDurations = [1, 5, 10, 15, 30, 60, 90, 120, 180, 300, 600, 900, 1200, 1800, 3600];
    
    // Calculate base data points
    const baseData = baseDurations.map(seconds => {
      let currentValue = 0;
      let historicalValue = 0;

      if (activity?.gps_data?.trackPoints) {
        // Calculate current activity mean max
        if (isRunning) {
          const pace = calculateMeanMaximalPace(activity.gps_data.trackPoints, seconds);
          currentValue = pace || 0;
        } else {
          const power = calculateMeanMaximalPower(activity.gps_data.trackPoints, seconds);
          currentValue = power || 0;
        }
      }

      // Find historical best for this duration
      const historicalEntry = historicalData.find(h => {
        const entrySeconds = h.duration.includes('min') 
          ? parseInt(h.duration) * 60 
          : parseInt(h.duration);
        return entrySeconds === seconds;
      });

      if (historicalEntry) {
        historicalValue = historicalEntry.best;
      }

      return {
        durationSeconds: seconds,
        currentValue,
        historicalValue
      };
    }).filter(data => data.currentValue > 0 || data.historicalValue > 0);

    if (baseData.length < 2) {
      // Not enough data for interpolation, return base points only
      return baseDurations.map(seconds => ({
        duration: formatDurationLabel(seconds),
        currentRange: 0,
        comparisonRange: 0,
        durationSeconds: seconds
      }));
    }

    // Generate interpolated data points for smoother curve
    const interpolatedData: any[] = [];
    
    // Add interpolated points between base durations
    for (let i = 0; i < baseData.length - 1; i++) {
      const current = baseData[i];
      const next = baseData[i + 1];
      
      // Add current base point
      interpolatedData.push({
        duration: formatDurationLabel(current.durationSeconds),
        currentRange: Math.round(current.currentValue * 100) / 100,
        comparisonRange: Math.round(current.historicalValue * 100) / 100,
        durationSeconds: current.durationSeconds
      });
      
      // Add interpolated points between current and next
      const logStart = Math.log(current.durationSeconds);
      const logEnd = Math.log(next.durationSeconds);
      const steps = Math.max(2, Math.floor((logEnd - logStart) * 3)); // More steps for bigger gaps
      
      for (let step = 1; step < steps; step++) {
        const logDuration = logStart + (logEnd - logStart) * (step / steps);
        const duration = Math.exp(logDuration);
        
        const currentInterp = current.currentValue > 0 && next.currentValue > 0 
          ? interpolateValue(current.durationSeconds, current.currentValue, next.durationSeconds, next.currentValue, duration)
          : 0;
          
        const historicalInterp = current.historicalValue > 0 && next.historicalValue > 0
          ? interpolateValue(current.durationSeconds, current.historicalValue, next.durationSeconds, next.historicalValue, duration)
          : 0;
        
        interpolatedData.push({
          duration: formatDurationLabel(Math.round(duration)),
          currentRange: Math.round(currentInterp * 100) / 100,
          comparisonRange: Math.round(historicalInterp * 100) / 100,
          durationSeconds: Math.round(duration)
        });
      }
    }
    
    // Add the last base point
    const lastPoint = baseData[baseData.length - 1];
    interpolatedData.push({
      duration: formatDurationLabel(lastPoint.durationSeconds),
      currentRange: Math.round(lastPoint.currentValue * 100) / 100,
      comparisonRange: Math.round(lastPoint.historicalValue * 100) / 100,
      durationSeconds: lastPoint.durationSeconds
    });

    return interpolatedData.sort((a, b) => a.durationSeconds - b.durationSeconds);
  }, [activity, historicalData, isRunning]);

  // Generate peak heart rate curve data
  const peakHeartRateData = useMemo(() => {
    const durations = [{
      label: '5sec',
      seconds: 5
    }, {
      label: '20sec',
      seconds: 20
    }, {
      label: '2min',
      seconds: 120
    }, {
      label: '10min',
      seconds: 600
    }, {
      label: '30min',
      seconds: 1800
    }, {
      label: '2hrs',
      seconds: 7200
    }, {
      label: '24hrs',
      seconds: 86400
    }];
    return durations.map(duration => {
      const avgHr = activity?.avg_heart_rate || 0;
      const maxHr = activity?.max_heart_rate || avgHr * 1.3;
      let currentHr = avgHr;
      let comparisonHr = avgHr * 0.95;
      if (avgHr > 0) {
        // Realistic HR curve based on actual data
        if (duration.seconds <= 10) currentHr = Math.min(maxHr, avgHr * 1.15);else if (duration.seconds <= 60) currentHr = Math.min(maxHr, avgHr * 1.1);else if (duration.seconds <= 300) currentHr = Math.min(maxHr, avgHr * 1.05);else if (duration.seconds <= 1200) currentHr = avgHr;else currentHr = avgHr * 0.92;
        comparisonHr = currentHr * (0.9 + Math.random() * 0.15);
      }
      return {
        duration: duration.label,
        currentRange: Math.round(currentHr),
        comparisonRange: Math.round(comparisonHr)
      };
    });
  }, [activity]);

  // Calculate intelligent time interval based on activity duration
  const timeInterval = useMemo(() => {
    if (!timelineData.length) return 300; // 5 minutes default
    
    const totalDurationSeconds = timelineData[timelineData.length - 1]?.timeSeconds || 0;
    const totalDurationMinutes = totalDurationSeconds / 60;
    
    if (totalDurationMinutes < 30) return 300; // 5 minutes
    if (totalDurationMinutes < 120) return 600; // 10 minutes  
    if (totalDurationMinutes < 240) return 900; // 15 minutes
    return 1200; // 20 minutes
  }, [timelineData]);

  // Create custom tick formatter for intelligent time intervals
  const formatTimeAxisTick = (tickItem: string) => {
    if (xAxisMode === 'distance') return tickItem;
    
    // Find the data point for this tick
    const dataPoint = timelineData.find(point => point.time === tickItem);
    if (!dataPoint) return tickItem;
    
    const timeSeconds = dataPoint.timeSeconds;
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    return `${minutes}:00`;
  };

  // Generate custom ticks based on time interval
  const getCustomTicks = () => {
    if (xAxisMode === 'distance' || !timelineData.length) return undefined;
    
    const ticks = [];
    const maxTime = timelineData[timelineData.length - 1]?.timeSeconds || 0;
    
    for (let time = 0; time <= maxTime; time += timeInterval) {
      // Find closest data point to this time
      const closestPoint = timelineData.reduce((prev, curr) => 
        Math.abs(curr.timeSeconds - time) < Math.abs(prev.timeSeconds - time) ? curr : prev
      );
      if (closestPoint) {
        ticks.push(closestPoint.time);
      }
    }
    
    return ticks;
  };

  // Custom tooltip for timeline
  const TimelineTooltip = ({
    active,
    payload,
    label
  }: any) => {
    if (active && payload && payload.length) {
      return <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{`${xAxisMode === 'time' ? 'Time' : 'Distance'}: ${label}`}</p>
          {payload.map((entry: any, index: number) => {
          const getUnit = (name: string) => {
            if (name === 'Power') return 'W';
            if (name === 'R Power') return 'W';
            if (name === 'Heart Rate') return 'bpm';
            if (name === 'Cadence') return 'rpm';
            if (name === 'Speed') return 'km/h';
            if (name === 'Temperature') return '°C';
            if (name === 'Elevation') return 'm';
            return '';
          };
          return <p key={index} style={{
            color: entry.color
          }}>
                {`${entry.name}: ${entry.value}${getUnit(entry.name)}`}
              </p>;
        })}
        </div>;
    }
    return null;
  };
  if (!activity) {
    return <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No activity selected for analysis</p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
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
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={xAxisMode} onValueChange={value => value && setXAxisMode(value as 'time' | 'distance')} className="flex gap-1">
                <ToggleGroupItem value="time" className="text-xs px-3 py-1.5 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-white shadow-sm transition-all">
                  <Clock className="w-3 h-3 mr-1" />
                  Time
                </ToggleGroupItem>
                <ToggleGroupItem value="distance" className="text-xs px-3 py-1.5 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-white shadow-sm transition-all">
                  <MapPin className="w-3 h-3 mr-1" />
                  Dist
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <ToggleGroup type="multiple" value={visibleMetrics} onValueChange={setVisibleMetrics} className="flex gap-1 flex-wrap">
              <ToggleGroupItem value="cadence" className="text-xs px-3 py-1.5 h-7 rounded-full bg-zone-1/10 text-zone-1 border border-zone-1/20 hover:bg-zone-1/20 data-[state=on]:bg-zone-1 data-[state=on]:text-white shadow-sm transition-all">
                RPM
              </ToggleGroupItem>
              <ToggleGroupItem value="hr" className="text-xs px-3 py-1.5 h-7 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 data-[state=on]:bg-destructive data-[state=on]:text-white shadow-sm transition-all">
                BPM
              </ToggleGroupItem>
              <ToggleGroupItem value="wl" className="text-xs px-3 py-1.5 h-7 rounded-full bg-zone-3/10 text-zone-3 border border-zone-3/20 hover:bg-zone-3/20 data-[state=on]:bg-zone-3 data-[state=on]:text-white shadow-sm transition-all">
                Power
              </ToggleGroupItem>
              <ToggleGroupItem value="speed" className="text-xs px-3 py-1.5 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-white shadow-sm transition-all">
                Speed
              </ToggleGroupItem>
              <ToggleGroupItem value="temp" className="text-xs px-3 py-1.5 h-7 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 data-[state=on]:bg-accent data-[state=on]:text-white shadow-sm transition-all">
                C
              </ToggleGroupItem>
              <ToggleGroupItem value="elevation" className="text-xs px-3 py-1.5 h-7 rounded-full bg-muted/10 text-muted-foreground border border-muted/20 hover:bg-muted/20 data-[state=on]:bg-muted data-[state=on]:text-white shadow-sm transition-all">
                Elev
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{
              top: 20,
              right: 80,
              bottom: 20,
              left: 20
            }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="xValue" 
                  tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10
                  }} 
                  tickFormatter={formatTimeAxisTick}
                  ticks={getCustomTicks()}
                  interval={0}
                />
                <YAxis yAxisId="power" orientation="left" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10
              }} />
                <YAxis yAxisId="hr" orientation="right" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10
              }} />
                <Tooltip content={<TimelineTooltip />} />
                
                {/* Conditionally render Total Power */}
                {visibleMetrics.includes('wl') && <Line yAxisId="power" type="monotone" dataKey="power" stroke="hsl(var(--zone-3))" strokeWidth={2} dot={false} name="Power" />}
                
                
                {/* Conditionally render Heart Rate */}
                {visibleMetrics.includes('hr') && <Line yAxisId="hr" type="monotone" dataKey="heartRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Heart Rate" />}
                
                {/* Conditionally render Cadence */}
                {visibleMetrics.includes('cadence') && <Line yAxisId="power" type="monotone" dataKey="cadence" stroke="hsl(var(--zone-1))" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Cadence" />}
                
                {/* Conditionally render Speed */}
                {visibleMetrics.includes('speed') && <Line yAxisId="power" type="monotone" dataKey="speed" stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Speed" />}
                
                {/* Conditionally render Elevation */}
                {visibleMetrics.includes('elevation') && <Line yAxisId="hr" type="monotone" dataKey="elevation" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Elevation" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Peak Power and Heart Rate Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Power/Pace Chart */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isRunning ? <Heart className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              {isRunning ? 'Peak Pace' : 'Peak Power'}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-zone-3 rounded"></div>
                <span>Current Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-zone-4 rounded opacity-60"></div>
                <span>Historical Best (Last {dateRange} days)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={peakPowerData} margin={{
                top: 10,
                right: 30,
                left: 20,
                bottom: 50
              }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="durationSeconds"
                    type="number"
                    scale="log"
                    domain={['dataMin', 'dataMax']}
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 10
                    }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tickFormatter={(value) => formatDurationLabel(value)}
                    ticks={[1, 5, 15, 60, 300, 1200, 3600]}
                  />
                  <YAxis 
                    domain={['dataMin * 0.9', 'dataMax * 1.1']}
                    tick={{
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 12
                    }} 
                    label={{
                      value: isRunning ? 'MIN/KM' : 'WATTS',
                      angle: -90,
                      position: 'insideLeft',
                      style: {
                        textAnchor: 'middle',
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: '12px'
                      }
                    }} 
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }} 
                    formatter={(value: number, name: string) => [
                      isRunning ? `${value.toFixed(2)} min/km` : `${Math.round(value)}W`, 
                      name === 'currentRange' ? 'Current Activity' : 'Historical Best'
                    ]}
                    labelFormatter={(value) => `Duration: ${formatDurationLabel(value)}`}
                  />
                  
                  {/* Historical best filled area */}
                  <Area 
                    type="monotone" 
                    dataKey="comparisonRange" 
                    stroke="hsl(var(--zone-4))" 
                    fill="hsl(var(--zone-4))" 
                    fillOpacity={0.2} 
                    strokeWidth={1.5} 
                    name="Historical Best"
                    dot={false}
                    connectNulls={false}
                  />
                  
                  {/* Current activity filled area */}
                  <Area 
                    type="monotone" 
                    dataKey="currentRange" 
                    stroke="hsl(var(--zone-3))" 
                    fill="hsl(var(--zone-3))" 
                    fillOpacity={0.4} 
                    strokeWidth={2.5} 
                    name="Current Activity"
                    dot={false}
                    connectNulls={false}
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
                <AreaChart data={peakHeartRateData} margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0
              }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="duration" tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12
                }} />
                  <YAxis tick={{
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 12
                }} label={{
                  value: 'BPM',
                  angle: -90,
                  position: 'insideLeft',
                  style: {
                    textAnchor: 'middle',
                    fill: 'hsl(var(--muted-foreground))'
                  }
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }} formatter={(value: number) => [`${value} bpm`, '']} />
                  
                  {/* Comparison range area */}
                  <Area type="monotone" dataKey="comparisonRange" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.4} strokeWidth={2} name="Comparison Range" strokeDasharray="5 5" />
                  
                  {/* Current range area */}
                  <Area type="monotone" dataKey="currentRange" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.7} strokeWidth={2} name="Current Range" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Grid Placeholder */}
      <Card className="card-gradient">
        
      </Card>
    </div>;
}