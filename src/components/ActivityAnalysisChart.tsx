import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { useSportMode } from '@/contexts/SportModeContext';
import { Activity, Clock, Heart, Zap, BarChart3, MapPin } from 'lucide-react';
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

  // Debug activity data structure
  console.log('ActivityAnalysisChart - Full activity object:', activity);
  console.log('ActivityAnalysisChart - GPS data structure:', activity?.gps_data);
  console.log('ActivityAnalysisChart - TrackPoints array:', activity?.gps_data?.trackPoints);
  console.log('ActivityAnalysisChart - TrackPoints length:', activity?.gps_data?.trackPoints?.length);
  
  if (activity?.gps_data?.trackPoints?.length > 0) {
    console.log('ActivityAnalysisChart - First trackPoint:', activity.gps_data.trackPoints[0]);
    console.log('ActivityAnalysisChart - Last trackPoint:', activity.gps_data.trackPoints[activity.gps_data.trackPoints.length - 1]);
  }

  if (!activity) {
    console.log('ActivityAnalysisChart - No activity provided');
    return <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No activity selected for analysis</p>
        </CardContent>
      </Card>;
  }

  // Calculate activity duration for intelligent X-axis intervals
  const activityDuration = useMemo(() => {
    console.log('ActivityAnalysisChart - Calculating duration...');
    if (!activity?.gps_data?.trackPoints?.length) {
      console.log('ActivityAnalysisChart - No trackPoints found, returning 0 duration');
      return 0;
    }
    const trackPoints = activity.gps_data.trackPoints;
    console.log('ActivityAnalysisChart - TrackPoints count:', trackPoints.length);
    
    const firstTimestamp = trackPoints[0]?.timestamp;
    const lastTimestamp = trackPoints[trackPoints.length - 1]?.timestamp;
    console.log('ActivityAnalysisChart - First timestamp:', firstTimestamp);
    console.log('ActivityAnalysisChart - Last timestamp:', lastTimestamp);
    
    const startTime = new Date(firstTimestamp).getTime();
    const endTime = new Date(lastTimestamp).getTime();
    console.log('ActivityAnalysisChart - Start time (ms):', startTime);
    console.log('ActivityAnalysisChart - End time (ms):', endTime);
    
    const duration = (endTime - startTime) / 1000;
    console.log('ActivityAnalysisChart - Calculated duration (seconds):', duration);
    return duration;
  }, [activity]);

  // Determine optimal X-axis interval based on activity duration
  const xAxisInterval = useMemo(() => {
    const durationMinutes = activityDuration / 60;
    if (durationMinutes < 30) return 5 * 60; // 5-minute intervals
    if (durationMinutes < 120) return 10 * 60; // 10-minute intervals  
    if (durationMinutes < 240) return 15 * 60; // 15-minute intervals
    return 20 * 60; // 20-minute intervals for activities > 4hrs
  }, [activityDuration]);

  // Use real activity trackPoints data for timeline with intelligent sampling
  const timelineData = useMemo(() => {
    console.log('ActivityAnalysisChart - Processing timelineData...');
    if (!activity?.gps_data?.trackPoints) {
      console.log('ActivityAnalysisChart - No trackPoints in activity data');
      return [];
    }
    const trackPoints = activity.gps_data.trackPoints;
    if (!trackPoints.length) {
      console.log('ActivityAnalysisChart - TrackPoints array is empty');
      return [];
    }
    
    console.log('ActivityAnalysisChart - Processing trackPoints, count:', trackPoints.length);
    console.log('ActivityAnalysisChart - Sample trackPoint structure:', trackPoints[0]);
    
    const startTime = trackPoints[0]?.timestamp;
    let cumulativeDistance = 0;
    let cumulativeRecordingTime = 0;

    // Process all data points first
    const allDataPoints = trackPoints.map((point: any, index: number) => {
      let timeElapsed;
      if (index === 0) {
        timeElapsed = 0;
      } else {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp ? 
          (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 : 1;

        if (timeInterval <= 10) {
          cumulativeRecordingTime += timeInterval;
        } else {
          cumulativeRecordingTime += timeInterval;
        }
        timeElapsed = cumulativeRecordingTime;
      }

      // Calculate cumulative distance by integrating speed over time
      if (index > 0 && point.speed) {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp ? 
          (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 : 1;
        const avgSpeed = ((point.speed || 0) + (prevPoint.speed || 0)) / 2;
        cumulativeDistance += avgSpeed * timeInterval;
      }

      const hours = Math.floor(timeElapsed / 3600);
      const minutes = Math.floor(timeElapsed % 3600 / 60);
      const seconds = Math.floor(timeElapsed % 60);
      const timeFormatted = hours > 0 ? 
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` : 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const distanceKm = cumulativeDistance / 1000;
      const distanceFormatted = distanceKm < 10 ? `${distanceKm.toFixed(1)}km` : `${Math.round(distanceKm)}km`;

      const speedKmh = point.speed ? point.speed * 3.6 : 0;
      const leftRightBalance = point.leftRightBalance ? point.leftRightBalance / 255 * 100 : 50;
      const totalPower = point.power || 0;
      const rPower = totalPower > 0 && leftRightBalance ? Math.round(totalPower * ((100 - leftRightBalance) / 100)) : 0;

      const processedPoint = {
        time: timeFormatted,
        distance: distanceFormatted,
        xValue: xAxisMode === 'time' ? timeFormatted : distanceFormatted,
        timeSeconds: timeElapsed,
        distanceMeters: cumulativeDistance,
        cadence: point.cadence || 0,
        heartRate: point.heartRate || 0,
        wl: point.power ? Math.round(point.power * (leftRightBalance / 100)) : 0,
        wr: rPower,
        speed: Math.round(speedKmh * 10) / 10,
        temp: point.temperature || 20,
        elevation: Math.round((point.altitude || 0) * 10) / 10,
        power: totalPower,
        balance: leftRightBalance,
        rPower: rPower
      };

      if (index < 5) {
        console.log(`ActivityAnalysisChart - Processed point ${index}:`, processedPoint);
      }

      return processedPoint;
    });

    console.log('ActivityAnalysisChart - Processed data points:', allDataPoints.length);

    // Smart sampling for performance - keep every Nth point based on data density
    if (allDataPoints.length > 1000) {
      const sampleRate = Math.ceil(allDataPoints.length / 1000);
      const sampledPoints = [];
      
      // Always keep first and last points
      sampledPoints.push(allDataPoints[0]);
      
      // Sample intermediate points at regular intervals
      for (let i = sampleRate; i < allDataPoints.length - 1; i += sampleRate) {
        sampledPoints.push(allDataPoints[i]);
      }
      
      // Always keep last point
      if (allDataPoints.length > 1) {
        sampledPoints.push(allDataPoints[allDataPoints.length - 1]);
      }
      
      console.log('ActivityAnalysisChart - Applied sampling, final points:', sampledPoints.length);
      return sampledPoints;
    }

    console.log('ActivityAnalysisChart - No sampling needed, final points:', allDataPoints.length);
    return allDataPoints;
  }, [activity, xAxisMode]);

  // Check data availability for each metric
  const dataAvailability = useMemo(() => {
    return {
      cadence: timelineData.some(point => point.cadence > 0),
      heartRate: timelineData.some(point => point.heartRate > 0),
      power: timelineData.some(point => point.power > 0),
      speed: timelineData.some(point => point.speed > 0),
      temperature: timelineData.some(point => point.temp !== 20), // 20 is default fallback
      elevation: timelineData.some(point => point.elevation > 0),
      rPower: timelineData.some(point => point.rPower > 0)
    };
  }, [timelineData]);

  // Auto-scale Y-axes based on visible metrics and data
  const yAxisScales = useMemo(() => {
    const leftMetrics = ['cadence', 'speed', 'wl'].filter(m => visibleMetrics.includes(m));
    const rightMetrics = ['hr', 'elevation'].filter(m => visibleMetrics.includes(m));
    
    let leftMin = Infinity, leftMax = -Infinity;
    let rightMin = Infinity, rightMax = -Infinity;
    
    timelineData.forEach(point => {
      if (leftMetrics.includes('cadence') && point.cadence > 0) {
        leftMin = Math.min(leftMin, point.cadence);
        leftMax = Math.max(leftMax, point.cadence);
      }
      if (leftMetrics.includes('speed') && point.speed > 0) {
        leftMin = Math.min(leftMin, point.speed);
        leftMax = Math.max(leftMax, point.speed);
      }
      if (leftMetrics.includes('wl') && point.power > 0) {
        leftMin = Math.min(leftMin, point.power);
        leftMax = Math.max(leftMax, point.power);
      }
      if (rightMetrics.includes('hr') && point.heartRate > 0) {
        rightMin = Math.min(rightMin, point.heartRate);
        rightMax = Math.max(rightMax, point.heartRate);
      }
      if (rightMetrics.includes('elevation')) {
        rightMin = Math.min(rightMin, point.elevation);
        rightMax = Math.max(rightMax, point.elevation);
      }
    });
    
    return {
      left: leftMin === Infinity ? undefined : { min: leftMin * 0.95, max: leftMax * 1.05 },
      right: rightMin === Infinity ? undefined : { min: rightMin * 0.95, max: rightMax * 1.05 }
    };
  }, [timelineData, visibleMetrics]);

  // Generate X-axis ticks based on intelligent intervals
  const xAxisTicks = useMemo(() => {
    if (!timelineData.length) return [];
    
    const ticks = [];
    const totalDuration = timelineData[timelineData.length - 1].timeSeconds;
    
    for (let t = 0; t <= totalDuration; t += xAxisInterval) {
      const dataPoint = timelineData.find(point => Math.abs(point.timeSeconds - t) < xAxisInterval / 2);
      if (dataPoint) {
        ticks.push(xAxisMode === 'time' ? dataPoint.time : dataPoint.distance);
      }
    }
    
    return ticks;
  }, [timelineData, xAxisInterval, xAxisMode]);

  // Generate peak power curve data
  const peakPowerData = useMemo(() => {
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
      const avgPower = activity?.avg_power || 0;
      const maxPower = activity?.max_power || avgPower * 1.5;
      const normalizedPower = activity?.normalized_power || avgPower;
      let currentPower = avgPower;
      let comparisonPower = avgPower * 0.9;
      if (avgPower > 0) {
        // Realistic power curve based on actual data
        if (duration.seconds <= 10) currentPower = Math.min(maxPower, normalizedPower * 1.6);else if (duration.seconds <= 60) currentPower = Math.min(maxPower, normalizedPower * 1.3);else if (duration.seconds <= 300) currentPower = normalizedPower * 1.1;else if (duration.seconds <= 1200) currentPower = normalizedPower;else currentPower = normalizedPower * 0.9;

        // Comparison range (simulate historical data)
        comparisonPower = currentPower * (0.85 + Math.random() * 0.2);
      }
      return {
        duration: duration.label,
        currentRange: Math.round(currentPower),
        comparisonRange: Math.round(comparisonPower)
      };
    });
  }, [activity]);

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
              <ToggleGroupItem 
                value="cadence" 
                disabled={!dataAvailability.cadence}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-zone-1/10 text-zone-1 border border-zone-1/20 hover:bg-zone-1/20 data-[state=on]:bg-zone-1 data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                RPM {!dataAvailability.cadence && "⚠"}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="hr" 
                disabled={!dataAvailability.heartRate}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 data-[state=on]:bg-destructive data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                BPM {!dataAvailability.heartRate && "⚠"}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="wl" 
                disabled={!dataAvailability.power}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-zone-3/10 text-zone-3 border border-zone-3/20 hover:bg-zone-3/20 data-[state=on]:bg-zone-3 data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Power {!dataAvailability.power && "⚠"}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="speed" 
                disabled={!dataAvailability.speed}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 data-[state=on]:bg-primary data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Speed {!dataAvailability.speed && "⚠"}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="temp" 
                disabled={!dataAvailability.temperature}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 data-[state=on]:bg-accent data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Temp {!dataAvailability.temperature && "⚠"}
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="elevation" 
                disabled={!dataAvailability.elevation}
                className="text-xs px-3 py-1.5 h-7 rounded-full bg-muted/10 text-muted-foreground border border-muted/20 hover:bg-muted/20 data-[state=on]:bg-muted data-[state=on]:text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Elev {!dataAvailability.elevation && "⚠"}
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="text-xs text-muted-foreground mt-2">
              Interval: {xAxisInterval / 60}min • Points: {timelineData.length} • Duration: {Math.round(activityDuration / 60)}min
            </div>
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
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  ticks={xAxisTicks}
                  interval={0}
                />
                <YAxis 
                  yAxisId="power" 
                  orientation="left" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  domain={yAxisScales.left ? [yAxisScales.left.min, yAxisScales.left.max] : ['auto', 'auto']}
                />
                <YAxis 
                  yAxisId="hr" 
                  orientation="right" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  domain={yAxisScales.right ? [yAxisScales.right.min, yAxisScales.right.max] : ['auto', 'auto']}
                />
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
                <AreaChart data={peakPowerData} margin={{
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
                  value: 'WATTS',
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
                }} formatter={(value: number) => [`${value}W`, '']} />
                  
                  {/* Comparison range area */}
                  <Area type="monotone" dataKey="comparisonRange" stroke="hsl(var(--zone-4))" fill="hsl(var(--zone-4))" fillOpacity={0.4} strokeWidth={2} name="Comparison Range" />
                  
                  {/* Current range area */}
                  <Area type="monotone" dataKey="currentRange" stroke="hsl(var(--zone-3))" fill="hsl(var(--zone-3))" fillOpacity={0.6} strokeWidth={2} name="Current Range" />
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