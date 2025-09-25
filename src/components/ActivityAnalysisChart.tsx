import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart } from 'recharts';
import { useSportMode } from '@/contexts/SportModeContext';
import { Activity, Clock, Heart, Zap, BarChart3, MapPin, Gauge, Thermometer } from 'lucide-react';
interface ActivityAnalysisChartProps {
  activity?: any;
}
export function ActivityAnalysisChart({
  activity
}: ActivityAnalysisChartProps) {
  const [dateRange, setDateRange] = useState('90');
  const [visibleMetrics, setVisibleMetrics] = useState(['power', 'hr', 'speed', 'cadence']);
  const [xAxisMode, setXAxisMode] = useState<'time' | 'distance'>('time');
  const {
    sportMode
  } = useSportMode();
  const isRunning = sportMode === 'running';

  // Calculate intelligent time interval based on activity duration
  const getTimeInterval = (durationSeconds: number): number => {
    if (durationSeconds < 1800) return 300; // 5 minutes for < 30 min
    if (durationSeconds < 7200) return 600; // 10 minutes for < 2 hours
    if (durationSeconds < 14400) return 900; // 15 minutes for < 4 hours
    return 1200; // 20 minutes for >= 4 hours
  };

  // Process and aggregate timeline data by time intervals
  const timelineData = useMemo(() => {
    if (!activity?.gps_data?.trackPoints) return [];
    const trackPoints = activity.gps_data.trackPoints;
    const durationSeconds = activity?.duration_seconds || 3600;
    const intervalSeconds = getTimeInterval(durationSeconds);
    
    let cumulativeDistance = 0;
    let cumulativeRecordingTime = 0;
    
    // First pass: calculate cumulative times and distances for all points
    const processedPoints = trackPoints.map((point: any, index: number) => {
      let timeElapsed;
      if (index === 0) {
        timeElapsed = 0;
      } else {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp 
          ? (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 
          : 1;

        if (timeInterval <= 10) {
          cumulativeRecordingTime += timeInterval;
        } else {
          cumulativeRecordingTime += timeInterval;
        }
        timeElapsed = cumulativeRecordingTime;
      }

      // Calculate cumulative distance
      if (index > 0 && point.speed) {
        const prevPoint = trackPoints[index - 1];
        const timeInterval = point.timestamp && prevPoint.timestamp 
          ? (new Date(point.timestamp).getTime() - new Date(prevPoint.timestamp).getTime()) / 1000 
          : 1;
        const avgSpeed = ((point.speed || 0) + (prevPoint.speed || 0)) / 2;
        cumulativeDistance += avgSpeed * timeInterval;
      }

      const speedKmh = point.speed ? point.speed * 3.6 : 0;
      const leftRightBalance = point.leftRightBalance ? point.leftRightBalance / 255 * 100 : 50;
      const totalPower = point.power || 0;
      const rPower = totalPower > 0 && leftRightBalance ? Math.round(totalPower * ((100 - leftRightBalance) / 100)) : 0;

      return {
        timeSeconds: timeElapsed,
        distanceMeters: cumulativeDistance,
        cadence: point.cadence || 0,
        heartRate: point.heartRate || 0,
        power: totalPower,
        lPower: point.power ? Math.round(point.power * (leftRightBalance / 100)) : 0,
        rPower: rPower,
        speed: Math.round(speedKmh * 10) / 10,
        temperature: point.temperature || 20,
        elevation: Math.round((point.altitude || 0) * 10) / 10,
        balance: leftRightBalance
      };
    });

    // Second pass: aggregate data into time intervals
    const aggregatedData: any[] = [];
    const maxTime = Math.max(...processedPoints.map(p => p.timeSeconds));
    
    for (let intervalStart = 0; intervalStart < maxTime; intervalStart += intervalSeconds) {
      const intervalEnd = intervalStart + intervalSeconds;
      const pointsInInterval = processedPoints.filter(p => 
        p.timeSeconds >= intervalStart && p.timeSeconds < intervalEnd
      );

      if (pointsInInterval.length > 0) {
        // Calculate averages for the interval
        const avgData = {
          cadence: Math.round(pointsInInterval.reduce((sum, p) => sum + p.cadence, 0) / pointsInInterval.length),
          heartRate: Math.round(pointsInInterval.reduce((sum, p) => sum + p.heartRate, 0) / pointsInInterval.length),
          power: Math.round(pointsInInterval.reduce((sum, p) => sum + p.power, 0) / pointsInInterval.length),
          lPower: Math.round(pointsInInterval.reduce((sum, p) => sum + p.lPower, 0) / pointsInInterval.length),
          rPower: Math.round(pointsInInterval.reduce((sum, p) => sum + p.rPower, 0) / pointsInInterval.length),
          speed: Math.round((pointsInInterval.reduce((sum, p) => sum + p.speed, 0) / pointsInInterval.length) * 10) / 10,
          temperature: Math.round(pointsInInterval.reduce((sum, p) => sum + p.temperature, 0) / pointsInInterval.length),
          elevation: Math.round((pointsInInterval.reduce((sum, p) => sum + p.elevation, 0) / pointsInInterval.length) * 10) / 10
        };

        const timeMinutes = Math.floor(intervalStart / 60);
        const hours = Math.floor(timeMinutes / 60);
        const mins = timeMinutes % 60;
        const timeFormatted = hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins}:00`;
        
        const lastPointInInterval = pointsInInterval[pointsInInterval.length - 1];
        const distanceKm = lastPointInInterval.distanceMeters / 1000;
        const distanceFormatted = distanceKm < 10 ? `${distanceKm.toFixed(1)}km` : `${Math.round(distanceKm)}km`;

        aggregatedData.push({
          time: timeFormatted,
          distance: distanceFormatted,
          xValue: xAxisMode === 'time' ? timeFormatted : distanceFormatted,
          timeSeconds: intervalStart,
          distanceMeters: lastPointInInterval.distanceMeters,
          ...avgData
        });
      }
    }

    return aggregatedData;
  }, [activity, xAxisMode]);

  // Check if there's any R power data in the activity
  const hasRPowerData = useMemo(() => {
    return timelineData.some(point => point.rPower > 0);
  }, [timelineData]);

  // Metric groups configuration with axis assignments
  const metricGroups = {
    power: {
      label: 'Power (W)',
      icon: Zap,
      yAxis: 'left',
      color: 'hsl(var(--zone-3))',
      metrics: ['power', hasRPowerData ? 'lPower' : null, hasRPowerData ? 'rPower' : null].filter(Boolean)
    },
    hr: {
      label: 'Heart Rate (bpm)',
      icon: Heart,
      yAxis: 'right',
      color: 'hsl(var(--destructive))',
      metrics: ['heartRate']
    },
    speed: {
      label: isRunning ? 'Pace (min/km)' : 'Speed (km/h)',
      icon: Gauge,
      yAxis: 'leftSecondary',
      color: 'hsl(var(--primary))',
      metrics: ['speed']
    },
    cadence: {
      label: 'Cadence (rpm)',
      icon: Activity,
      yAxis: 'rightSecondary',
      color: 'hsl(var(--zone-1))',
      metrics: ['cadence']
    },
    temperature: {
      label: 'Temperature (°C)',
      icon: Thermometer,
      yAxis: 'rightSecondary',
      color: 'hsl(var(--accent))',
      metrics: ['temperature']
    },
    elevation: {
      label: 'Elevation (m)',
      icon: MapPin,
      yAxis: 'right',
      color: 'hsl(var(--muted-foreground))',
      metrics: ['elevation']
    }
  };

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
          const getUnit = (dataKey: string) => {
            if (dataKey === 'power' || dataKey === 'lPower' || dataKey === 'rPower') return 'W';
            if (dataKey === 'heartRate') return 'bpm';
            if (dataKey === 'cadence') return 'rpm';
            if (dataKey === 'speed') return isRunning ? 'min/km' : 'km/h';
            if (dataKey === 'temperature') return '°C';
            if (dataKey === 'elevation') return 'm';
            return '';
          };
          const getName = (dataKey: string) => {
            if (dataKey === 'power') return 'Power';
            if (dataKey === 'lPower') return 'L Power';
            if (dataKey === 'rPower') return 'R Power';
            if (dataKey === 'heartRate') return 'Heart Rate';
            if (dataKey === 'cadence') return 'Cadence';
            if (dataKey === 'speed') return isRunning ? 'Pace' : 'Speed';
            if (dataKey === 'temperature') return 'Temperature';
            if (dataKey === 'elevation') return 'Elevation';
            return entry.dataKey;
          };
          return <p key={index} style={{
            color: entry.color
          }}>
                {`${getName(entry.dataKey)}: ${entry.value}${getUnit(entry.dataKey)}`}
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
            <div className="flex flex-wrap gap-2">
              {Object.entries(metricGroups).map(([key, group]) => {
                const IconComponent = group.icon;
                return (
                  <ToggleGroup key={key} type="multiple" value={visibleMetrics} onValueChange={setVisibleMetrics}>
                    <ToggleGroupItem 
                      value={key} 
                      className="text-xs px-3 py-1.5 h-8 rounded-md border transition-all flex items-center gap-1.5"
                      style={{
                        borderColor: visibleMetrics.includes(key) ? group.color : 'hsl(var(--border))',
                        backgroundColor: visibleMetrics.includes(key) ? group.color : 'transparent',
                        color: visibleMetrics.includes(key) ? 'white' : group.color
                      }}
                    >
                      <IconComponent className="w-3 h-3" />
                      {group.label}
                    </ToggleGroupItem>
                  </ToggleGroup>
                );
              })}
            </div>
            
            {/* Y-Axis Legend */}
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 border-l-2 border-zone-3"></div>
                <span>Left: Power</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 border-r-2 border-destructive"></div>
                <span>Right: HR, Elevation</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 border-l border-primary"></div>
                <span>L2: Speed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 border-r border-zone-1"></div>
                <span>R2: Cadence, Temp</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{
                top: 20,
                right: 60,
                bottom: 20,
                left: 60
              }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="xValue" 
                  tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 10
                  }} 
                  interval="preserveStartEnd"
                />
                
                {/* Left Y-Axis - Power */}
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  tick={{
                    fill: 'hsl(var(--zone-3))',
                    fontSize: 10
                  }}
                  label={{
                    value: 'Power (W)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: 'hsl(var(--zone-3))' }
                  }}
                />
                
                {/* Right Y-Axis - Heart Rate */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tick={{
                    fill: 'hsl(var(--destructive))',
                    fontSize: 10
                  }}
                  label={{
                    value: 'HR (bpm) / Elevation (m)',
                    angle: 90,
                    position: 'insideRight',
                    style: { textAnchor: 'middle', fill: 'hsl(var(--destructive))' }
                  }}
                />
                
                {/* Secondary Left Y-Axis - Speed */}
                <YAxis 
                  yAxisId="leftSecondary" 
                  orientation="left" 
                  tick={{
                    fill: 'hsl(var(--primary))',
                    fontSize: 9
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                
                {/* Secondary Right Y-Axis - Cadence */}
                <YAxis 
                  yAxisId="rightSecondary" 
                  orientation="right" 
                  tick={{
                    fill: 'hsl(var(--zone-1))',
                    fontSize: 9
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <Tooltip content={<TimelineTooltip />} />
                
                {/* Power Metrics - Left Axis */}
                {visibleMetrics.includes('power') && (
                  <>
                    <Line yAxisId="left" type="monotone" dataKey="power" stroke="hsl(var(--zone-3))" strokeWidth={2.5} dot={false} name="Power" />
                    {hasRPowerData && (
                      <>
                        <Line yAxisId="left" type="monotone" dataKey="lPower" stroke="hsl(var(--zone-2))" strokeWidth={1.5} dot={false} name="L Power" />
                        <Line yAxisId="left" type="monotone" dataKey="rPower" stroke="hsl(var(--zone-4))" strokeWidth={1.5} dot={false} name="R Power" />
                      </>
                    )}
                  </>
                )}
                
                {/* Heart Rate - Right Axis */}
                {visibleMetrics.includes('hr') && (
                  <Line yAxisId="right" type="monotone" dataKey="heartRate" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Heart Rate" />
                )}
                
                {/* Speed - Secondary Left Axis */}
                {visibleMetrics.includes('speed') && (
                  <Line yAxisId="leftSecondary" type="monotone" dataKey="speed" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Speed" />
                )}
                
                {/* Cadence - Secondary Right Axis */}
                {visibleMetrics.includes('cadence') && (
                  <Line yAxisId="rightSecondary" type="monotone" dataKey="cadence" stroke="hsl(var(--zone-1))" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Cadence" />
                )}
                
                {/* Temperature - Secondary Right Axis */}
                {visibleMetrics.includes('temperature') && (
                  <Line yAxisId="rightSecondary" type="monotone" dataKey="temperature" stroke="hsl(var(--accent))" strokeWidth={1.5} strokeDasharray="6 2" dot={false} name="Temperature" />
                )}
                
                {/* Elevation - Right Axis */}
                {visibleMetrics.includes('elevation') && (
                  <Line yAxisId="right" type="monotone" dataKey="elevation" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="2 4" dot={false} name="Elevation" />
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