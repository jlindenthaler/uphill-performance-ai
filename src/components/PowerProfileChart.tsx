import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePowerProfile } from '@/hooks/usePowerProfile';
import { useSportMode } from '@/contexts/SportModeContext';
import { TrendingUp, Zap, Clock } from 'lucide-react';

export function PowerProfileChart() {
  const { powerProfile, loading } = usePowerProfile();
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

  const chartData = powerProfile.map(item => ({
    duration: parseInt(item.duration.toString()),
    durationLabel: formatDuration(parseInt(item.duration.toString())),
    current: item.current,
    best: item.best,
  }));

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

  const bestEfforts = powerProfile.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Best Efforts Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {bestEfforts.map((effort) => (
          <Card key={effort.duration} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zone-1 via-zone-2 to-zone-3"></div>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{formatDuration(parseInt(effort.duration.toString()))}</span>
              </div>
              <div className="text-xl font-bold">{formatValue(effort.best)}</div>
              <Badge variant="outline" className="text-xs mt-1">
                Best {effort.unit}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Power/Pace Curve Chart */}
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
                    name === 'current' ? 'Current Best' : 'All-Time Best'
                  ]}
                  labelFormatter={(label) => `Duration: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="best"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  name="All-Time Best"
                />
                {chartData.some(d => d.current !== d.best) && (
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="hsl(var(--zone-2))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: 'hsl(var(--zone-2))', strokeWidth: 2, r: 3 }}
                    name="Current Best"
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