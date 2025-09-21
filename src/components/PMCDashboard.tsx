import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap, Target, Calendar, Crown } from "lucide-react";

// Sample PMC data
const pmcData = [
  { date: '2024-01-01', ctlStart: 45, atlStart: 30, tsbStart: 15, ctl: 47, atl: 35, tsb: 12, tss: 65 },
  { date: '2024-01-02', ctlStart: 47, atlStart: 35, tsbStart: 12, ctl: 48, atl: 40, tsb: 8, tss: 78 },
  { date: '2024-01-03', ctlStart: 48, atlStart: 40, tsbStart: 8, ctl: 49, atl: 45, tsb: 4, tss: 92 },
  { date: '2024-01-04', ctlStart: 49, atlStart: 45, tsbStart: 4, ctl: 51, atl: 50, tsb: 1, tss: 105 },
  { date: '2024-01-05', ctlStart: 51, atlStart: 50, tsbStart: 1, ctl: 52, atl: 48, tsb: 4, tss: 45 },
  { date: '2024-01-06', ctlStart: 52, atlStart: 48, tsbStart: 4, ctl: 53, atl: 46, tsb: 7, tss: 0 },
  { date: '2024-01-07', ctlStart: 53, atlStart: 46, tsbStart: 7, ctl: 54, atl: 44, tsb: 10, tss: 0 },
];

// WKO5-style advanced metrics
const powerData = [
  { duration: '5s', current: 1250, best: 1280, date: '2024-01-15' },
  { duration: '15s', current: 950, best: 980, date: '2024-01-12' },
  { duration: '30s', current: 750, best: 780, date: '2024-01-10' },
  { duration: '1m', current: 580, best: 600, date: '2024-01-08' },
  { duration: '5m', current: 420, best: 435, date: '2024-01-05' },
  { duration: '20m', current: 325, best: 340, date: '2024-01-03' },
  { duration: '60m', current: 290, best: 305, date: '2024-01-01' },
];

const metabolicMetrics = [
  { metric: 'VO2max', value: 68.5, unit: 'ml/kg/min', percentile: 95 },
  { metric: 'VLaMax', value: 0.35, unit: 'mmol/l/s', percentile: 78 },
  { metric: 'Efficiency', value: 22.1, unit: '%', percentile: 85 },
  { metric: 'Fat Max', value: 0.42, unit: 'g/min/kg', percentile: 72 },
];

export function PMCDashboard() {
  const currentCTL = pmcData[pmcData.length - 1]?.ctl || 0;
  const currentATL = pmcData[pmcData.length - 1]?.atl || 0;
  const currentTSB = pmcData[pmcData.length - 1]?.tsb || 0;

  const getTSBStatus = (tsb: number) => {
    if (tsb > 10) return { status: 'Fresh', color: 'text-green-500', icon: TrendingUp };
    if (tsb > -10) return { status: 'Optimal', color: 'text-blue-500', icon: Target };
    return { status: 'Fatigued', color: 'text-red-500', icon: TrendingDown };
  };

  const tsbStatus = getTSBStatus(currentTSB);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Management Chart</h1>
          <p className="text-muted-foreground">Advanced performance analytics and training load monitoring</p>
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

      <Tabs defaultValue="pmc" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pmc">PMC Chart</TabsTrigger>
          <TabsTrigger value="power">Power Profile</TabsTrigger>
          <TabsTrigger value="metabolic">Metabolic</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="pmc" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-zone-3" />
                  Chronic Training Load (CTL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zone-3">{currentCTL}</div>
                <p className="text-xs text-muted-foreground">Fitness level</p>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-zone-4" />
                  Acute Training Load (ATL)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-zone-4">{currentATL}</div>
                <p className="text-xs text-muted-foreground">Fatigue level</p>
              </CardContent>
            </Card>

            <Card className="card-gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <tsbStatus.icon className={`w-4 h-4 ${tsbStatus.color}`} />
                  Training Stress Balance (TSB)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${tsbStatus.color}`}>{currentTSB}</div>
                <p className="text-xs text-muted-foreground">{tsbStatus.status}</p>
              </CardContent>
            </Card>
          </div>

          {/* PMC Chart */}
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Performance Management Chart</CardTitle>
              <CardDescription>CTL (blue), ATL (red), and TSB (yellow) over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pmcData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value, name) => [value, String(name).toUpperCase()]}
                    />
                    <Line type="monotone" dataKey="ctl" stroke="hsl(var(--zone-3))" strokeWidth={2} name="CTL" />
                    <Line type="monotone" dataKey="atl" stroke="hsl(var(--zone-4))" strokeWidth={2} name="ATL" />
                    <Line type="monotone" dataKey="tsb" stroke="hsl(var(--chart-5))" strokeWidth={2} name="TSB" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="power" className="space-y-6">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Mean Maximal Power Profile</CardTitle>
              <CardDescription>Current vs all-time best power across durations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={powerData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="duration" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}W`, '']} />
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
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {powerData.slice(0, 4).map((item) => (
              <Card key={item.duration} className="card-gradient">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{item.duration} Power</p>
                      <p className="text-2xl font-bold">{item.current}W</p>
                      <p className="text-xs text-muted-foreground">Best: {item.best}W</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Set on</p>
                      <p className="text-xs">{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="metabolic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metabolicMetrics.map((metric) => (
              <Card key={metric.metric} className="card-gradient">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{metric.metric}</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-bold">{metric.value}</p>
                      <p className="text-sm text-muted-foreground">{metric.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-zone-1 to-zone-4 h-2 rounded-full" 
                          style={{ width: `${metric.percentile}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{metric.percentile}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                    <Area type="monotone" dataKey="fat" stackId="1" stroke="hsl(var(--zone-2))" fill="hsl(var(--zone-2))" />
                    <Area type="monotone" dataKey="cho" stackId="1" stroke="hsl(var(--zone-4))" fill="hsl(var(--zone-4))" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="card-gradient">
            <CardHeader>
              <CardTitle>Training Stress Score Trends</CardTitle>
              <CardDescription>Daily TSS over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pmcData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tickFormatter={(value) => new Date(value).getDate().toString()} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value) => [`${value} TSS`, '']}
                    />
                    <Bar dataKey="tss" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-gradient">
              <CardHeader>
                <CardTitle>Training Analysis</CardTitle>
                <CardDescription>Current training status and recommendations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Current Status</h4>
                  <p className="text-sm text-muted-foreground">
                    You are currently in a {tsbStatus.status.toLowerCase()} state with a TSB of {currentTSB}. 
                    Your CTL is {currentCTL}, indicating good fitness levels.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Recommendations</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Continue current training intensity</li>
                    <li>• Consider adding recovery rides</li>
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
                  <span className="text-sm">7-day average TSS</span>
                  <span className="font-semibold">78</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">Training impulse trend</span>
                  <span className="font-semibold text-green-500">↗ +12%</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/20">
                  <span className="text-sm">Intensity factor</span>
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