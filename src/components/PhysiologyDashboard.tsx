import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Heart, Zap, Flame, Target, Gauge } from "lucide-react";
import { useSportMode } from "@/contexts/SportModeContext";
import { useLabResults } from "@/hooks/useLabResults";
import { useMetabolicData } from "@/hooks/useMetabolicData";

export function PhysiologyDashboard() {
  const { sportMode, isCycling, isRunning, isSwimming } = useSportMode();
  const { labResults } = useLabResults();
  const { physiologyData } = useMetabolicData();

  // Mock data for demonstration - replace with actual data from hooks
  const performanceData = {
    vo2max: labResults?.vo2_max || physiologyData?.vo2_max || 58.5,
    aet: physiologyData?.lactate_threshold || 195, // Aerobic Threshold 
    aetHr: physiologyData?.resting_hr ? physiologyData.resting_hr + 50 : 150,
    gt: physiologyData?.lactate_threshold_2 || 280, // Gas Exchange Threshold
    gtHr: physiologyData?.max_hr ? physiologyData.max_hr * 0.88 : 175,
    map: isCycling ? 320 : isRunning ? '3:45' : '1:20', // Maximal Aerobic Power
    maxHr: physiologyData?.max_hr || 188,
    restingHr: physiologyData?.resting_hr || 48,
    bodyWeight: physiologyData?.body_weight || 72,
    metabolicEfficiency: 85, // Calculated from fat/carb utilization
    criticalPower: physiologyData?.critical_power || (isCycling ? 290 : isRunning ? '4:10' : '1:22'),
    wPrime: physiologyData?.w_prime || (isCycling ? 18500 : isRunning ? 320 : 200)
  };

  const formatValue = (value: any, unit: string, sport?: string) => {
    if (typeof value === 'string') return `${value} ${unit}`;
    if (typeof value === 'number') return `${Math.round(value)} ${unit}`;
    return `-- ${unit}`;
  };

  const formatPace = (seconds: number) => {
    if (!seconds) return '--:-- /km';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} /km`;
  };

  const formatRunningValue = (value: any) => {
    // Convert watts to approximate pace (this is a rough conversion for demo)
    if (typeof value === 'number') {
      // Rough conversion: higher watts = faster pace (lower time)
      const paceInSeconds = 300 - (value - 150) * 0.5; // Example conversion
      return formatPace(Math.max(180, paceInSeconds)); // Min 3:00 /km
    }
    return formatPace(300); // Default 5:00 /km
  };

  const getPerformanceLevel = (value: number, thresholds: number[]) => {
    if (value >= thresholds[3]) return { level: 'Elite', color: 'text-green-500', progress: 95 };
    if (value >= thresholds[2]) return { level: 'Excellent', color: 'text-blue-500', progress: 80 };
    if (value >= thresholds[1]) return { level: 'Good', color: 'text-yellow-500', progress: 60 };
    if (value >= thresholds[0]) return { level: 'Fair', color: 'text-orange-500', progress: 40 };
    return { level: 'Poor', color: 'text-red-500', progress: 20 };
  };

  const vo2maxLevel = getPerformanceLevel(performanceData.vo2max, [35, 45, 55, 65]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Performance Markers</h1>
        <p className="text-muted-foreground">
          Your current physiological profile for {sportMode}
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">VO2 Max</p>
                <p className="text-2xl font-bold">{formatValue(performanceData.vo2max, 'ml/kg/min')}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Progress value={vo2maxLevel.progress} className="flex-1 h-1" />
                  <Badge variant="secondary" className={vo2maxLevel.color}>
                    {vo2maxLevel.level}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-zone-2/20 rounded-lg">
                <Target className="w-6 h-6 text-zone-2" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {isCycling ? 'Critical Power' : isRunning ? 'Critical Speed' : 'Critical Speed'}
                </p>
                <p className="text-2xl font-bold">
                  {formatValue(performanceData.criticalPower, isCycling ? 'W' : '/km')}
                </p>
                <p className="text-sm text-muted-foreground">
                  W': {formatValue(performanceData.wPrime, isCycling ? 'kJ' : 'm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-zone-3/20 rounded-lg">
                <Gauge className="w-6 h-6 text-zone-3" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {isCycling ? 'MAP' : isRunning ? 'vVO2max' : 'vVO2max'}
                </p>
                <p className="text-2xl font-bold">
                  {formatValue(performanceData.map, isCycling ? 'W' : '/km')}
                </p>
                <p className="text-sm text-muted-foreground">
                  @ {formatValue(performanceData.maxHr, 'bpm')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aerobic Markers */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-zone-2" />
              Aerobic Markers
            </CardTitle>
            <CardDescription>
              Thresholds and aerobic capacity metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Aerobic Threshold (AeT)</Label>
                <p className="text-lg font-semibold">
                  {isRunning ? formatRunningValue(performanceData.aet) : formatValue(performanceData.aet, isCycling ? 'W' : '/km')}
                </p>
                <p className="text-sm text-muted-foreground">
                  @ {formatValue(performanceData.aetHr, 'bpm')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Glycolitic Threshold (GT)</Label>
                <p className="text-lg font-semibold">
                  {formatValue(performanceData.gt, isCycling ? 'W' : '/km')}
                </p>
                <p className="text-sm text-muted-foreground">
                  @ {formatValue(performanceData.gtHr, 'bpm')}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Max HR</Label>
                <p className="text-lg font-semibold">{formatValue(performanceData.maxHr, 'bpm')}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Resting HR</Label>
                <p className="text-lg font-semibold">{formatValue(performanceData.restingHr, 'bpm')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metabolic Efficiency */}
        <Card className="card-gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Metabolic Efficiency
            </CardTitle>
            <CardDescription>
              Substrate utilization and efficiency markers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Fat Max</Label>
                <p className="font-semibold">
                  {formatValue(labResults?.fat_max || 0.42, 'g/min/kg')}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Crossover Point</Label>
                <p className="font-semibold">
                  {formatValue(labResults?.crossover_point || performanceData.aet, isCycling ? 'W' : '/km')}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Body Weight</Label>
                <p className="font-semibold">{formatValue(performanceData.bodyWeight, 'kg')}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Metabolic Efficiency</Label>
              <Progress value={performanceData.metabolicEfficiency} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {performanceData.metabolicEfficiency}% - Excellent fat adaptation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}