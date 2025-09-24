import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Scatter, ScatterChart, Legend, ReferenceLine } from 'recharts';
import { useSportMode } from '@/contexts/SportModeContext';
import { useCPResults, type CPResult } from '@/hooks/useCPResults';

interface CPChartProps {
  cpResult?: CPResult;
}

const CPChart: React.FC<CPChartProps> = ({ cpResult }) => {
  const { sportMode } = useSportMode();
  const { latestCPResult } = useCPResults();

  const result = cpResult || latestCPResult;

  if (!result) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No CP test results available for {sportMode}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const formatValue = (value: number) => {
    if (sportMode === 'running') {
      const minutes = Math.floor(value / 60);
      const seconds = Math.round(value % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${Math.round(value)}W`;
  };

  // Generate curve data for CP model: P = W'/t + CP
  const generateCurveData = () => {
    const data = [];
    const cp = result.cp_watts || 0;
    const wPrime = result.w_prime_joules || 0;
    
    // Generate points from 30s to 3600s (1 hour)
    for (let t = 30; t <= 3600; t += 30) {
      const power = (wPrime / t) + cp;
      data.push({
        duration: t,
        durationLabel: formatDuration(t),
        modelPower: power
      });
    }
    return data;
  };

  // Prepare effort data points
  const effortData = [
    ...(result.efforts_used || []).map((effort) => ({
      duration: effort.durationSec,
      durationLabel: formatDuration(effort.durationSec),
      power: effort.avgPower,
      type: 'used',
      status: 'Used in calculation'
    })),
    ...(result.efforts_rejected || []).map((effort) => ({
      duration: effort.durationSec,
      durationLabel: formatDuration(effort.durationSec),
      power: 0, // We don't have power for rejected efforts
      type: 'rejected',
      status: `Rejected: ${effort.reason}`
    }))
  ].filter(effort => effort.power > 0); // Filter out rejected efforts without power data

  const curveData = generateCurveData();

  const chartConfig = {
    modelPower: {
      label: 'CP Model',
      color: 'hsl(var(--primary))'
    },
    used: {
      label: 'Test Efforts (Used)',
      color: 'hsl(var(--success))'
    },
    rejected: {
      label: 'Test Efforts (Rejected)',
      color: 'hsl(var(--destructive))'
    }
  };

  return (
    <div className="space-y-6">
      {/* CP Results Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {result.cp_watts ? `${Math.round(result.cp_watts)}W` : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Critical Power (CP)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              {result.w_prime_joules ? `${Math.round(result.w_prime_joules / 1000)}kJ` : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">W' (W Prime)</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">Protocol</div>
            <Badge variant="secondary" className="text-xs">
              {result.protocol_used || 'Unknown'}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {result.test_date ? new Date(result.test_date).toLocaleDateString() : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CP Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Critical Power Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData}>
                <XAxis 
                  dataKey="duration"
                  type="number"
                  scale="log"
                  domain={[30, 3600]}
                  tickFormatter={formatDuration}
                />
                <YAxis 
                  domain={['dataMin - 20', 'dataMax + 20']}
                  tickFormatter={(value) => `${Math.round(value)}W`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: any, name: string) => [
                    `${Math.round(value)}W`,
                    name === 'modelPower' ? 'CP Model' : name
                  ]}
                  labelFormatter={(value: any) => `Duration: ${formatDuration(value)}`}
                />
                <Line
                  type="monotone"
                  dataKey="modelPower"
                  stroke="var(--color-modelPower)"
                  strokeWidth={2}
                  dot={false}
                  name="CP Model"
                />
                
                {/* Overlay effort points */}
                {effortData.map((effort, index) => (
                  <ReferenceLine
                    key={`effort-${index}`}
                    x={effort.duration}
                    stroke={effort.type === 'used' ? 'var(--color-used)' : 'var(--color-rejected)'}
                    strokeDasharray="2 2"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Effort Points Legend */}
          {effortData.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium">Test Efforts:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {effortData.map((effort, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ 
                        backgroundColor: effort.type === 'used' 
                          ? 'hsl(var(--success))' 
                          : 'hsl(var(--destructive))' 
                      }}
                    />
                    <span>{formatDuration(effort.duration)}: {formatValue(effort.power)}</span>
                    <Badge variant={effort.type === 'used' ? 'default' : 'destructive'} className="text-xs">
                      {effort.type === 'used' ? 'Used' : 'Rejected'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CPChart;