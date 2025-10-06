import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap, Target, Crown, Flame, Calendar } from "lucide-react";
import { useMetabolicData } from "@/hooks/useMetabolicData";
import { usePowerProfile } from "@/hooks/usePowerProfile";
import { useTrainingHistory } from "@/hooks/useTrainingHistory";
import { useCombinedTrainingHistory } from "@/hooks/useCombinedTrainingHistory";
import { usePMCPopulation } from "@/hooks/usePMCPopulation";
import { useSportMode } from "@/contexts/SportModeContext";
import { useUserTimezone } from "@/hooks/useUserTimezone";
import { formatDateInUserTimezone } from "@/utils/dateFormat";

import { useState, useMemo } from "react";

export function AnalysisDashboard() {
  const [dateRange, setDateRange] = useState('30');
  const [combinedSports, setCombinedSports] = useState(false);
  const { metabolicMetrics, loading: metabolicLoading } = useMetabolicData();
  const { trainingHistory: singleSportHistory, loading: historyLoading } = useTrainingHistory(parseInt(dateRange));
  const { trainingHistory: combinedHistory, loading: combinedLoading } = useCombinedTrainingHistory(parseInt(dateRange));
  const { isRunning } = useSportMode();
  const { isPopulating } = usePMCPopulation();
  const { powerProfile, loading: powerLoading } = usePowerProfile(parseInt(dateRange));
  const { timezone } = useUserTimezone();

  // Use appropriate training history based on combined sports setting
  const trainingHistory = combinedSports ? combinedHistory : singleSportHistory;
  const currentHistoryLoading = combinedSports ? combinedLoading : historyLoading;

  const filteredTrainingHistory = useMemo(() => {
    const days = parseInt(dateRange === 'custom' ? '30' : dateRange);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return trainingHistory.filter(entry => 
      new Date(entry.date) >= cutoffDate
    );
  }, [trainingHistory, dateRange]);

  const currentCTL = filteredTrainingHistory[filteredTrainingHistory.length - 1]?.ctl || 0;
  const currentATL = filteredTrainingHistory[filteredTrainingHistory.length - 1]?.atl || 0;
  const currentTSB = filteredTrainingHistory[filteredTrainingHistory.length - 1]?.tsb || 0;

  const getTSBStatus = (tsb: number) => {
    if (tsb > 10) return { status: 'Fresh', color: 'text-green-500', icon: TrendingUp };
    if (tsb > -10) return { status: 'Optimal', color: 'text-blue-500', icon: Target };
    return { status: 'Fatigued', color: 'text-red-500', icon: TrendingDown };
  };

  const tsbStatus = getTSBStatus(currentTSB);

  // Format power profile data for chart
  const chartData = powerProfile.map(item => ({
    duration: item.duration,
    current: item.current,
    best: item.best
  }));

  // Get metabolic metrics with fallback to loading states
  const displayMetrics = metabolicMetrics || {
    vo2max: { value: 0, percentile: 0 },
    vlamax: { value: 0, percentile: 0 },
    fatMax: { value: 0, percentile: 0, unit: 'g/min/kg' }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analysis</h1>
          <p className="text-muted-foreground">
            Advanced performance analytics and training load monitoring 
            {isRunning ? ' - Running Mode' : ' - Cycling Mode'}
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="combined-sports"
              checked={combinedSports}
              onCheckedChange={setCombinedSports}
            />
            <Label htmlFor="combined-sports" className="text-sm">
              Combined Sports
            </Label>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              <Crown className="w-3 h-3 mr-1" />
              Coach Features
            </Badge>
            <Badge className={`${tsbStatus.color} bg-background`}>
              <tsbStatus.icon className="w-3 h-3 mr-1" />
              {tsbStatus.status}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pmc" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pmc">PMC Chart</TabsTrigger>
          <TabsTrigger value="power">{isRunning ? 'Pace Profile' : 'Power Profile'}</TabsTrigger>
          <TabsTrigger value="activity">Activity Analysis</TabsTrigger>
          <TabsTrigger value="metabolic">Metabolic</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="analysis">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="pmc" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-[hsl(var(--ltl-blue))] border-l-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[hsl(var(--ltl-blue))]" />
                  LTL (Fitness)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--ltl-blue))]">{Math.round(currentCTL)}</div>
                <p className="text-xs text-muted-foreground">42-day average</p>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--stl-pink))] border-l-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[hsl(var(--stl-pink))]" />
                  STL (Fatigue)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--stl-pink))]">{Math.round(currentATL)}</div>
                <p className="text-xs text-muted-foreground">7-day average</p>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--fi-yellow))] border-l-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-[hsl(var(--fi-yellow))]" />
                  FI (Form)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--fi-yellow))]">
                  {currentTSB > 0 ? '+' : ''}{Math.round(currentTSB)}
                </div>
                <p className="text-xs text-muted-foreground">{tsbStatus.status}</p>
              </CardContent>
            </Card>
          </div>

          {/* Explanatory section */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <p className="font-semibold text-[hsl(var(--ltl-blue))] mb-2">Long-Term Load (LTL)</p>
                  <p className="text-muted-foreground">
                    Represents your fitness built over 42 days using exponentially weighted moving average. Higher values indicate better endurance capacity.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--stl-pink))] mb-2">Short-Term Load (STL)</p>
                  <p className="text-muted-foreground">
                    Measures recent training stress over 7 days. High values indicate accumulated fatigue from current training.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--fi-yellow))] mb-2">Form Index (FI)</p>
                  <p className="text-muted-foreground">
                    Calculated as LTL - STL. Positive values mean you're fresh and ready to perform. Negative values indicate training fatigue.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Performance Readiness Chart</CardTitle>
              <CardDescription>
                LTL (blue), STL (pink), and FI (yellow) over time
                {combinedSports && " - Combined across all sports"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {currentHistoryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredTrainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => formatDateInUserTimezone(value, timezone)}
                        formatter={(value, name) => [Math.round(Number(value)), String(name).toUpperCase()]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                        labelStyle={{ 
                          color: 'hsl(var(--foreground))',
                          fontWeight: 600
                        }}
                      />
                      <Line type="monotone" dataKey="ctl" stroke="hsl(var(--ltl-blue))" strokeWidth={2} name="LTL" />
                      <Line type="monotone" dataKey="atl" stroke="hsl(var(--stl-pink))" strokeWidth={2} name="STL" />
                      <Line type="monotone" dataKey="tsb" stroke="hsl(var(--fi-yellow))" strokeWidth={2} name="FI" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="power" className="space-y-6">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Mean Maximal {isRunning ? 'Pace' : 'Power'} Profile</CardTitle>
              <CardDescription>
                Current vs all-time best {isRunning ? 'pace' : 'power'} across durations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {powerLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="duration" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}${powerProfile[0]?.unit || 'W'}`, '']} />
                      <Area 
                        type="monotone" 
                        dataKey="best" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))" 
                        fillOpacity={0.2}
                        name="All-time Best"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="current" 
                        stroke="hsl(var(--zone-3))" 
                        fill="hsl(var(--zone-3))" 
                        fillOpacity={0.4}
                        name="Current Best"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {powerProfile.slice(0, 5).map((item) => (
              <Card key={item.duration} className="card-gradient">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.duration} {isRunning ? 'Pace' : 'Power'}
                    </p>
                    <p className="text-xl font-bold">
                      {item.current > 0 ? `${Math.round(item.current)}${item.unit}` : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Best: {item.best > 0 ? `${Math.round(item.best)}${item.unit}` : '--'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card className="card-gradient">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>Activity analysis is available in individual activity details.</p>
                <p className="text-sm mt-2">Go to Activities tab and expand any activity to see detailed analysis charts.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metabolic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">VO2max</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">
                      {metabolicLoading ? '--' : displayMetrics.vo2max.value}
                    </p>
                    <p className="text-sm text-muted-foreground">ml/kg/min</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-zone-1 to-zone-4 h-2 rounded-full" 
                        style={{ width: `${displayMetrics.vo2max.percentile}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {displayMetrics.vo2max.percentile}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">VLaMax</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">
                      {metabolicLoading ? '--' : displayMetrics.vlamax.value.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">mmol/l/s</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-zone-1 to-zone-4 h-2 rounded-full" 
                        style={{ width: `${displayMetrics.vlamax.percentile}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {displayMetrics.vlamax.percentile}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Fat Max
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-bold">
                      {metabolicLoading ? '--' : displayMetrics.fatMax.value.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">g/min/kg</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-zone-1 to-zone-4 h-2 rounded-full" 
                        style={{ width: `${displayMetrics.fatMax.percentile}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {displayMetrics.fatMax.percentile}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Metabolic Efficiency</CardTitle>
              <CardDescription>Fat vs carbohydrate utilization across intensities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { intensity: '50%', fat: 85, cho: 15 },
                    { intensity: '60%', fat: 70, cho: 30 },
                    { intensity: '70%', fat: 50, cho: 50 },
                    { intensity: '80%', fat: 30, cho: 70 },
                    { intensity: '90%', fat: 15, cho: 85 },
                    { intensity: '100%', fat: 5, cho: 95 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="intensity" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}%`, '']} />
                    <Area type="monotone" dataKey="fat" stackId="1" stroke="#f97316" fill="#f97316" />
                    <Area type="monotone" dataKey="cho" stackId="1" stroke="#22c55e" fill="#22c55e" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>{isRunning ? 'Pace' : 'Power'} Trends Analysis</CardTitle>
              <CardDescription>
                AeT (Aerobic Threshold), GT (Glycolytic Threshold), and MAP progression over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={powerProfile.length > 5 ? powerProfile.slice(3, 8).map((item, index) => {
                      const baseDate = new Date();
                      baseDate.setMonth(baseDate.getMonth() - (powerProfile.length - index - 1));
                      return {
                        date: baseDate.toISOString().split('T')[0],
                        aet: item.duration === '300' ? item.best : null, // 5min as VT1/AeT approximation  
                        gt: item.duration === '1200' ? item.best : null, // 20min as VT2/LT2/GT approximation
                        map: item.duration === '300' ? item.best * 1.1 : null // MAP approximation (slightly higher than 5min)
                      };
                    }).filter(item => item.aet || item.gt || item.map) : [
                      { date: '2024-01-01', aet: isRunning ? 4.8 : 220, gt: isRunning ? 4.2 : 280, map: isRunning ? 3.5 : 320 },
                      { date: '2024-02-01', aet: isRunning ? 4.7 : 225, gt: isRunning ? 4.1 : 285, map: isRunning ? 3.4 : 325 },
                      { date: '2024-03-01', aet: isRunning ? 4.6 : 230, gt: isRunning ? 4.0 : 290, map: isRunning ? 3.3 : 330 },
                      { date: '2024-04-01', aet: isRunning ? 4.5 : 235, gt: isRunning ? 3.9 : 295, map: isRunning ? 3.2 : 335 },
                      { date: '2024-05-01', aet: isRunning ? 4.4 : 240, gt: isRunning ? 3.8 : 300, map: isRunning ? 3.1 : 340 },
                      { date: '2024-06-01', aet: isRunning ? 4.3 : 245, gt: isRunning ? 3.7 : 305, map: isRunning ? 3.0 : 345 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => formatDateInUserTimezone(value, timezone, 'MMM')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => formatDateInUserTimezone(value, timezone)}
                        formatter={(value, name) => [
                          `${Math.round(Number(value))}${isRunning ? ' min/km' : 'W'}`, 
                          name === 'aet' ? 'AeT (VT1/LT1)' : name === 'gt' ? 'GT (VT2/LT2/CP/FTP)' : 'MAP (5min Power)'
                        ]}
                      />
                    <Line 
                      type="monotone" 
                      dataKey="aet" 
                      stroke="hsl(var(--zone-2))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--zone-2))', strokeWidth: 2, r: 4 }}
                      name="AeT"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="gt" 
                      stroke="hsl(var(--zone-3))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--zone-3))', strokeWidth: 2, r: 4 }}
                      name="GT"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="map" 
                      stroke="hsl(var(--zone-4))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--zone-4))', strokeWidth: 2, r: 4 }}
                      name="MAP"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-zone-2 to-zone-2"></div>
                    <p className="text-sm font-medium">AeT (Aerobic Threshold)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">
                      {powerProfile.length > 1 && powerProfile[0].best > powerProfile[1].best ? 'Increasing' : 'Stable'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {powerProfile.length > 1 ? 
                      (powerProfile[0].best > powerProfile[1].best ? 
                        `Recent improvement in aerobic threshold power.` : 
                        `Aerobic threshold power maintaining steady levels.`) :
                      `Steady improvement in aerobic power over the last 6 months. ${isRunning ? ' Pace improving by ~2s/km per month.' : ' Power increasing by ~5W per month.'}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-zone-3 to-zone-3"></div>
                    <p className="text-sm font-medium">GT (Glycolytic Threshold)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">
                      {powerProfile.length > 3 && powerProfile[2].best > powerProfile[3].best ? 'Increasing' : 'Stable'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {powerProfile.length > 3 ? 
                      (powerProfile[2].best > powerProfile[3].best ? 
                        `Strong progression in glycolytic threshold power.` : 
                        `Glycolytic threshold power holding steady.`) :
                      `Strong progression in lactate threshold power. ${isRunning ? ' Sustainable pace improving significantly.' : ' FTP equivalent showing consistent gains.'}`}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-zone-4 to-zone-4"></div>
                    <p className="text-sm font-medium">MAP (Maximal Aerobic Power)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">
                      {powerProfile.length > 0 && powerProfile[0].current >= powerProfile[0].best * 0.95 ? 'Increasing' : 'Developing'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {powerProfile.length > 0 ? 
                      (powerProfile[0].current >= powerProfile[0].best * 0.95 ? 
                        `Peak aerobic capacity showing excellent development.` : 
                        `Peak aerobic capacity developing well.`) :
                      `Peak aerobic capacity showing excellent development. ${isRunning ? ' VO2max pace trending upward.' : ' Maximum sustainable power at VO2max improving.'}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Training Load Index Trends</CardTitle>
              <CardDescription>Daily TLI over the selected time period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {currentHistoryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTrainingHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tickFormatter={(value) => formatDateInUserTimezone(value, timezone, 'd')} />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => formatDateInUserTimezone(value, timezone)}
                        formatter={(value) => [`${Math.round(Number(value))} TLI`, '']}
                      />
                      <Bar dataKey="tss" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle>Training Overview</CardTitle>
                <CardDescription>Current training status and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Current Status</h4>
                  <p className="text-sm text-muted-foreground">
                    You are currently in a {tsbStatus.status.toLowerCase()} state with a TSB of {Math.round(currentTSB)}. 
                    Your CTL is {Math.round(currentCTL)}, indicating {currentCTL > 40 ? 'good' : 'developing'} fitness levels.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Recommendations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Continue current training intensity</li>
                    <li>• Consider adding recovery {isRunning ? 'runs' : 'rides'}</li>
                    <li>• Monitor sleep and nutrition</li>
                    <li>• Schedule performance test in 2 weeks</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>Key metrics and trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">7-day average TLI</span>
                  <span className="font-semibold">
                    {Math.round(filteredTrainingHistory.slice(-7).reduce((acc, day) => acc + day.tss, 0) / 7)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">Training impulse trend</span>
                  <span className="font-semibold text-green-500">↗ +12%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">Intensity index</span>
                  <span className="font-semibold">0.85</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">Recovery ratio</span>
                  <span className="font-semibold text-blue-500">Optimal</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}