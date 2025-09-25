import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSportMode } from '@/contexts/SportModeContext';

interface LazyPowerProfileChartProps {
  activity?: any;
}

export function LazyPowerProfileChart({ activity }: LazyPowerProfileChartProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const { sportMode } = useSportMode();
  const isRunning = sportMode === 'running';

  const loadChartComponent = useCallback(async () => {
    if (!ChartComponent && !isLoaded) {
      setIsLoaded(true);
      try {
        const { EnhancedPowerProfileChart } = await import('./EnhancedPowerProfileChart');
        setChartComponent(() => EnhancedPowerProfileChart);
      } catch (error) {
        console.error('Error loading power profile chart:', error);
        setIsLoaded(false);
      }
    }
  }, [ChartComponent, isLoaded]);

  // Auto-load for activities with cached power curve data
  React.useEffect(() => {
    if (activity?.power_curve_cache && Object.keys(activity.power_curve_cache).length > 0) {
      loadChartComponent();
    }
  }, [activity, loadChartComponent]);

  if (!isLoaded || !ChartComponent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isRunning ? <TrendingUp className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            {isRunning ? 'Pace Profile' : 'Power Profile'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              {isRunning ? 'Pace' : 'Power'} analysis ready to load
            </p>
            {activity?.power_curve_cache && (
              <p className="text-sm text-muted-foreground text-green-600">
                ✓ Pre-calculated data available
              </p>
            )}
          </div>
          <Button onClick={loadChartComponent} variant="outline" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Load {isRunning ? 'Pace' : 'Power'} Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <ChartComponent activity={activity} />;
}