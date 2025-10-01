import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Mountain } from 'lucide-react';

interface ElevationChartProps {
  gpsData?: any;
  activity?: any;
  onHover?: (index: number | null) => void;
  hoverIndex?: number | null;
  useTerrainData?: boolean;
}

export function ElevationChart({ gpsData, activity, onHover, hoverIndex, useTerrainData = false }: ElevationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Calculate 3D distance including elevation change
  const calculate3DDistance = (lat1: number, lon1: number, ele1: number, lat2: number, lon2: number, ele2: number) => {
    // Haversine formula for horizontal distance
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
             Math.cos(lat1Rad) * Math.cos(lat2Rad) *
             Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const horizontalDistance = R * c;
    
    // Calculate 3D distance including elevation
    const elevationChange = ele2 - ele1;
    const distance3D = Math.sqrt(horizontalDistance * horizontalDistance + elevationChange * elevationChange);
    
    return distance3D; // in meters
  };

  const elevationData = useMemo(() => {
    // Check for trackPoints format first (actual GPS data from activities)
    if (gpsData?.trackPoints && Array.isArray(gpsData.trackPoints)) {
      let cumulativeDistance = 0;
      
      const points = gpsData.trackPoints.map((point: any, index: number) => {
        // Calculate cumulative distance with 3D calculation
        if (index > 0) {
          const prevPoint = gpsData.trackPoints[index - 1];
          if (point.latitude && point.longitude && prevPoint.latitude && prevPoint.longitude) {
            const ele1 = prevPoint.altitude || prevPoint.elevation || 0;
            const ele2 = point.altitude || point.elevation || 0;
            const distance = calculate3DDistance(
              prevPoint.latitude, prevPoint.longitude, ele1,
              point.latitude, point.longitude, ele2
            );
            cumulativeDistance += distance;
          }
        }
        
        const elevation = point.altitude || point.elevation || 0;
        return {
          index,
          distance: cumulativeDistance / 1000,
          elevation: Math.round(elevation),
          distanceKm: cumulativeDistance / 1000,
          distanceMeters: cumulativeDistance,
          formattedDistance: `${(cumulativeDistance / 1000).toFixed(1)} km`
        };
      }).filter(point => point.elevation > 0);

      // Calculate smoothed gradient over segments (reduces noise)
      const segmentLength = 5; // Average over 5 points
      return points.map((point, index) => {
        let gradient = 0;
        if (index >= segmentLength) {
          const startPoint = points[index - segmentLength];
          const elevationDiff = point.elevation - startPoint.elevation;
          const distanceDiff = point.distanceMeters - startPoint.distanceMeters;
          if (distanceDiff > 0) {
            gradient = (elevationDiff / distanceDiff) * 100;
          }
        }
        return {
          ...point,
          gradient: Math.round(gradient * 10) / 10 // Round to 1 decimal
        };
      });
    }
    
    // Fallback to coordinates format for backward compatibility
    if (gpsData?.coordinates && Array.isArray(gpsData.coordinates)) {
      return gpsData.coordinates.map((coord: [number, number, number?], index: number) => {
        const elevation = coord[2] || 0; // Third coordinate is elevation if available
        const distance = index * 0.1; // Approximate distance in km (adjust based on actual data)
        
        return {
          index,
          distance: distance,
          elevation: Math.round(elevation),
          distanceKm: distance,
          formattedDistance: `${distance.toFixed(1)} km`
        };
      }).filter(point => point.elevation > 0);
    }
    
    return [];
  }, [gpsData]);

  // Mock elevation data if no GPS data is available but activity exists
  const mockElevationData = useMemo(() => {
    if (!activity || (gpsData?.trackPoints && gpsData.trackPoints.length > 0) || (gpsData?.coordinates && gpsData.coordinates.length > 0)) return [];

    const points = 100;
    return Array.from({ length: points }, (_, index) => {
      const distance = (index / points) * 20; // 20km mock route
      const elevation = 100 + Math.sin(index * 0.1) * 50 + Math.cos(index * 0.05) * 30; // Mock elevation profile
      
      return {
        index,
        distance: distance,
        elevation: Math.round(elevation),
        distanceKm: distance,
        formattedDistance: `${distance.toFixed(1)} km`
      };
    });
  }, [activity, gpsData]);

  const chartData = elevationData.length > 0 ? elevationData : mockElevationData;

  // Calculate intelligent distance interval based on total distance
  const distanceInterval = useMemo(() => {
    if (!chartData.length) return 1; // 1km default
    
    const totalDistance = chartData[chartData.length - 1]?.distanceKm || 0;
    
    if (totalDistance < 5) return 0.5; // 0.5km intervals
    if (totalDistance < 15) return 1; // 1km intervals
    if (totalDistance < 50) return 2; // 2km intervals
    if (totalDistance < 100) return 5; // 5km intervals
    return 10; // 10km intervals
  }, [chartData]);

  // Generate custom ticks based on distance interval
  const getCustomDistanceTicks = useMemo(() => {
    if (!chartData.length) return [];
    
    const ticks = [];
    const maxDistance = chartData[chartData.length - 1]?.distanceKm || 0;
    
    for (let distance = 0; distance <= maxDistance; distance += distanceInterval) {
      // Find closest data point to this distance
      const closestPoint = chartData.reduce((prev, curr) => 
        Math.abs(curr.distanceKm - distance) < Math.abs(prev.distanceKm - distance) ? curr : prev
      );
      if (closestPoint && closestPoint.formattedDistance) {
        ticks.push(closestPoint.formattedDistance);
      }
    }
    
    return ticks;
  }, [chartData, distanceInterval]);

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
          {useTerrainData && <span className="text-xs opacity-70">(Mapbox Terrain)</span>}
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
                ticks={getCustomDistanceTicks}
                interval={0}
              />
              <YAxis 
                domain={['dataMin - 10', 'dataMax + 10']}
                className="text-xs"
                tick={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'elevation') return [`${value}m`, 'Elevation'];
                  return [value, name];
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]?.payload?.gradient !== undefined) {
                    return [
                      `Distance: ${label}`,
                      `Gradient: ${payload[0].payload.gradient}%`
                    ];
                  }
                  return `Distance: ${label}`;
                }}
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