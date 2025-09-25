import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Mountain } from 'lucide-react';

interface ElevationChartProps {
  gpsData?: any;
  activity?: any;
  onHover?: (index: number | null) => void;
  hoverIndex?: number | null;
}

export function ElevationChart({ gpsData, activity, onHover, hoverIndex }: ElevationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const elevationData = useMemo(() => {
    if (!gpsData?.coordinates) return [];

    return gpsData.coordinates.map((coord: [number, number, number?], index: number) => {
      const elevation = coord[2] || 0; // Third coordinate is elevation if available
      const distance = index * 0.1; // Approximate distance in km (adjust based on actual data)
      
      return {
        index,
        distance: distance.toFixed(2),
        elevation: Math.round(elevation),
        formattedDistance: `${distance.toFixed(1)} km`
      };
    });
  }, [gpsData]);

  // Mock elevation data if no GPS data is available but activity exists
  const mockElevationData = useMemo(() => {
    if (!activity || gpsData?.coordinates) return [];

    const points = 100;
    return Array.from({ length: points }, (_, index) => {
      const distance = (index / points) * 20; // 20km mock route
      const elevation = 100 + Math.sin(index * 0.1) * 50 + Math.cos(index * 0.05) * 30; // Mock elevation profile
      
      return {
        index,
        distance: distance.toFixed(2),
        elevation: Math.round(elevation),
        formattedDistance: `${distance.toFixed(1)} km`
      };
    });
  }, [activity, gpsData]);

  const chartData = elevationData.length > 0 ? elevationData : mockElevationData;

  const handleMouseMove = (data: any) => {
    if (data && data.activePayload?.[0]) {
      const index = data.activePayload[0].payload.index;
      setActiveIndex(index);
      onHover?.(index);
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    onHover?.(null);
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mountain className="w-5 h-5" />
            Elevation Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No elevation data available</p>
        </CardContent>
      </Card>
    );
  }

  const minElevation = Math.min(...chartData.map(d => d.elevation));
  const maxElevation = Math.max(...chartData.map(d => d.elevation));
  const totalGain = chartData.reduce((gain, current, index) => {
    if (index === 0) return 0;
    const diff = current.elevation - chartData[index - 1].elevation;
    return gain + (diff > 0 ? diff : 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mountain className="w-5 h-5" />
          Elevation Profile
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Min: {minElevation}m</span>
          <span>Max: {maxElevation}m</span>
          <span>Gain: {Math.round(totalGain)}m</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="formattedDistance"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => `${value}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number) => [`${value}m`, 'Elevation']}
                labelFormatter={(label) => `Distance: ${label}`}
              />
              
              {/* Floating indicator line */}
              {(hoverIndex !== null || activeIndex !== null) && (
                <ReferenceLine 
                  x={chartData[hoverIndex ?? activeIndex ?? 0]?.formattedDistance} 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}

              <Line
                type="monotone"
                dataKey="elevation"
                stroke="hsl(var(--zone-3))"
                strokeWidth={2}
                dot={false}
                fill="hsl(var(--zone-3))"
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}