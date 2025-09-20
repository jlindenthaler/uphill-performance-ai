import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Heart, Zap, Activity, Flame, Settings, ToggleLeft, ToggleRight, Wheat } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSportMode } from "@/contexts/SportModeContext";
import { RecoverySection } from "@/components/RecoverySection";
import { usePhysiologyData } from "@/hooks/useSupabase";

interface PhysiologyData {
  vo2max: string;
  map: string; // Maximal Aerobic Power
  mapHr: string; // Heart rate at MAP/VO2max
  vt1: string; // Ventilatory Threshold 1
  vt1Hr: string; // Heart rate at VT1
  vt2: string; // Ventilatory Threshold 2
  vt2Hr: string; // Heart rate at VT2
  lt1: string; // Lactate Threshold 1
  lt1Hr: string; // Heart rate at LT1
  lt2: string; // Lactate Threshold 2
  lt2Hr: string; // Heart rate at LT2
  rmr: string; // Resting Metabolic Rate
  ftp: string; // Functional Threshold Power
  ftpHr: string; // Heart rate at FTP
  maxHr: string;
  restingHr: string;
  bodyWeight: string;
  fatPercentage: string;
  criticalPower: string;
  wPrime: string; // W' - work capacity above CP
  // Metabolic efficiency data
  fatMax: string;
  fatMaxHr: string;
  crossover: string;
  crossoverHr: string;
  choPercentages: { [intensity: string]: string };
  fatPercentages: { [intensity: string]: string };
  // Runner data
  runnerMode: boolean;
  criticalSpeed: string;
  dPrime: string; // D' - distance capacity above CS
  // Recovery data
  recovery: {
    availableModalities: {
      infraredSauna: boolean;
      dryTrueSauna: boolean;
      steamRoom: boolean;
      iceBath: boolean;
      coldPlunge: boolean;
      pool: boolean;
      hotTub: boolean;
      pneumaticCompression: boolean;
      massageGun: boolean;
      estim: boolean;
      massage: boolean;
      stretching: boolean;
      yoga: boolean;
      meditation: boolean;
      sleepTracking: boolean;
      hrv: boolean;
      redLightTherapy: boolean;
      cryotherapy: boolean;
      hyperbaricChamber: boolean;
      floatTank: boolean;
    };
    frequency: { [key: string]: string };
    sleepHours: string;
    sleepQuality: string;
    hrvBaseline: string;
    restingHRBaseline: string;
  };
}

export function PhysiologyForm() {
  const { savePhysiologyData } = usePhysiologyData();
  const { sportMode, isCycling, isRunning, isSwimming } = useSportMode();
  const [useLabResults, setUseLabResults] = useState<{[key: string]: boolean}>({
    cycling: false,
    running: false,
    swimming: false
  });
  const [sportData, setSportData] = useState<{[key: string]: PhysiologyData}>({
    cycling: {
      vo2max: '58', map: '320', mapHr: '188', vt1: '200', vt1Hr: '150', vt2: '285', vt2Hr: '175',
      lt1: '195', lt1Hr: '148', lt2: '280', lt2Hr: '172', rmr: '1850', ftp: '285', ftpHr: '172',
      maxHr: '188', restingHr: '48', bodyWeight: '72', fatPercentage: '12', criticalPower: '290',
      wPrime: '18500', fatMax: '180', fatMaxHr: '142', crossover: '195', crossoverHr: '148',
      choPercentages: { '180': '45', '220': '65', '260': '85', '300': '95' },
      fatPercentages: { '180': '55', '220': '35', '260': '15', '300': '5' },
      runnerMode: false, criticalSpeed: '4.2', dPrime: '320',
      recovery: {
        availableModalities: {
          infraredSauna: false, dryTrueSauna: false, steamRoom: false, iceBath: false,
          coldPlunge: false, pool: false, hotTub: false, pneumaticCompression: false,
          massageGun: false, estim: false, massage: false, stretching: true, yoga: false,
          meditation: false, sleepTracking: false, hrv: false, redLightTherapy: false,
          cryotherapy: false, hyperbaricChamber: false, floatTank: false,
        },
        frequency: {}, sleepHours: '7.5',
        sleepQuality: '8', hrvBaseline: '', restingHRBaseline: '48',
      }
    },
    running: {
      vo2max: '62', map: '18', mapHr: '188', vt1: '20', vt1Hr: '150', vt2: '17', vt2Hr: '175',
      lt1: '21', lt1Hr: '148', lt2: '18', lt2Hr: '172', rmr: '1850', ftp: '4:15', ftpHr: '172',
      maxHr: '188', restingHr: '48', bodyWeight: '70', fatPercentage: '10', criticalPower: '4:10',
      wPrime: '320', fatMax: '5:30', fatMaxHr: '142', crossover: '4:45', crossoverHr: '148',
      choPercentages: { '180': '45', '220': '65', '260': '85', '300': '95' },
      fatPercentages: { '180': '55', '220': '35', '260': '15', '300': '5' },
      runnerMode: true, criticalSpeed: '4.2', dPrime: '320',
      recovery: {
        availableModalities: {
          infraredSauna: false, dryTrueSauna: false, steamRoom: false, iceBath: false,
          coldPlunge: false, pool: false, hotTub: false, pneumaticCompression: false,
          massageGun: false, estim: false, massage: false, stretching: true, yoga: false,
          meditation: false, sleepTracking: false, hrv: false, redLightTherapy: false,
          cryotherapy: false, hyperbaricChamber: false, floatTank: false,
        },
        frequency: {}, sleepHours: '7.5',
        sleepQuality: '8', hrvBaseline: '', restingHRBaseline: '48',
      }
    },
    swimming: {
      vo2max: '55', map: '1:20', mapHr: '188', vt1: '1:35', vt1Hr: '150', vt2: '1:25', vt2Hr: '175',
      lt1: '1:38', lt1Hr: '148', lt2: '1:28', lt2Hr: '172', rmr: '1850', ftp: '1:25', ftpHr: '172',
      maxHr: '188', restingHr: '48', bodyWeight: '72', fatPercentage: '12', criticalPower: '1:22',
      wPrime: '200', fatMax: '1:45', fatMaxHr: '142', crossover: '1:30', crossoverHr: '148',
      choPercentages: { '180': '45', '220': '65', '260': '85', '300': '95' },
      fatPercentages: { '180': '55', '220': '35', '260': '15', '300': '5' },
      runnerMode: false, criticalSpeed: '1:25', dPrime: '200',
      recovery: {
        availableModalities: {
          infraredSauna: false, dryTrueSauna: false, steamRoom: false, iceBath: false,
          coldPlunge: false, pool: false, hotTub: false, pneumaticCompression: false,
          massageGun: false, estim: false, massage: false, stretching: true, yoga: false,
          meditation: false, sleepTracking: false, hrv: false, redLightTherapy: false,
          cryotherapy: false, hyperbaricChamber: false, floatTank: false,
        },
        frequency: {}, sleepHours: '7.5',
        sleepQuality: '8', hrvBaseline: '', restingHRBaseline: '48',
      }
    }
  });

  // Get current sport data
  const data = sportData[sportMode] || sportData.cycling;

  const handleInputChange = (field: keyof PhysiologyData, value: string) => {
    setSportData(prev => ({
      ...prev,
      [sportMode]: {
        ...prev[sportMode],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      // Include recovery data in the save
      const dataWithRecovery = {
        ...data,
        recovery: data.recovery
      };
      await savePhysiologyData(dataWithRecovery, sportMode);
      console.log(`${sportMode.charAt(0).toUpperCase() + sportMode.slice(1)} physiology data saved successfully`);
    } catch (error) {
      console.error('Error saving physiology data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Physiological Data & Recovery</h1>
          <p className="text-muted-foreground">Complete athlete profiling for AI-powered training optimization</p>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          Data Priority: Lab &gt; Performance &gt; Estimated
        </Badge>
      </div>

      <Tabs defaultValue="physiology" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-16">
          <TabsTrigger value="physiology" className="flex items-center gap-2 h-12">
            <Activity className="w-4 h-4" />
            Physiology
          </TabsTrigger>
          <TabsTrigger value="recovery" className="flex items-center gap-2 h-12">
            <Settings className="w-4 h-4" />
            Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="physiology" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Laboratory Data */}
            <Card className="card-gradient shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-zone-4" />
                      Laboratory Results - {isCycling ? 'Cycling' : isRunning ? 'Running' : 'Swimming'}
                    </CardTitle>
                    <CardDescription>
                      Gold standard physiological markers from laboratory testing
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Use Lab Data</span>
                    <Switch
                      checked={useLabResults[sportMode]}
                      onCheckedChange={(checked) => 
                        setUseLabResults(prev => ({ ...prev, [sportMode]: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${!useLabResults[sportMode] ? 'opacity-40' : ''}`}>
                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="vo2max">VO2 Max (ml/kg/min)</Label>
                     <Input
                       id="vo2max"
                       value={data.vo2max}
                       onChange={(e) => handleInputChange('vo2max', e.target.value)}
                       placeholder="58"
                       disabled={!useLabResults[sportMode]}
                     />
                   </div>
                  <div className="space-y-2">
                    <Label htmlFor="map">MAP (Watts)</Label>
                    <Input
                      id="map"
                      value={data.map}
                      onChange={(e) => handleInputChange('map', e.target.value)}
                      placeholder="320"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mapHr">MAP/VO2max HR (bpm)</Label>
                    <Input
                      id="mapHr"
                      value={data.mapHr}
                      onChange={(e) => handleInputChange('mapHr', e.target.value)}
                      placeholder="188"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vt1">VT1 (Watts)</Label>
                    <Input
                      id="vt1"
                      value={data.vt1}
                      onChange={(e) => handleInputChange('vt1', e.target.value)}
                      placeholder="200"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vt1Hr">VT1 HR (bpm)</Label>
                    <Input
                      id="vt1Hr"
                      value={data.vt1Hr}
                      onChange={(e) => handleInputChange('vt1Hr', e.target.value)}
                      placeholder="150"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vt2">VT2 (Watts)</Label>
                    <Input
                      id="vt2"
                      value={data.vt2}
                      onChange={(e) => handleInputChange('vt2', e.target.value)}
                      placeholder="285"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vt2Hr">VT2 HR (bpm)</Label>
                    <Input
                      id="vt2Hr"
                      value={data.vt2Hr}
                      onChange={(e) => handleInputChange('vt2Hr', e.target.value)}
                      placeholder="175"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lt1">LT1 (Watts)</Label>
                    <Input
                      id="lt1"
                      value={data.lt1}
                      onChange={(e) => handleInputChange('lt1', e.target.value)}
                      placeholder="195"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lt1Hr">LT1 HR (bpm)</Label>
                    <Input
                      id="lt1Hr"
                      value={data.lt1Hr}
                      onChange={(e) => handleInputChange('lt1Hr', e.target.value)}
                      placeholder="148"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lt2">LT2 (Watts)</Label>
                    <Input
                      id="lt2"
                      value={data.lt2}
                      onChange={(e) => handleInputChange('lt2', e.target.value)}
                      placeholder="280"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lt2Hr">LT2 HR (bpm)</Label>
                    <Input
                      id="lt2Hr"
                      value={data.lt2Hr}
                      onChange={(e) => handleInputChange('lt2Hr', e.target.value)}
                      placeholder="172"
                      disabled={!useLabResults[sportMode]}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Data */}
            <Card className="card-gradient shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-zone-3" />
                      Performance Markers - {isCycling ? 'Cycling' : isRunning ? 'Running' : 'Swimming'}
                    </CardTitle>
                    <CardDescription>
                      Field-tested and calculated performance metrics
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Lab Data</span>
                    <Switch
                      checked={useLabResults[sportMode]}
                      onCheckedChange={(checked) => 
                        setUseLabResults(prev => ({ ...prev, [sportMode]: checked }))
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ftp">
                      {isCycling ? 'FTP (Watts)' : isRunning ? 'Threshold Pace (/km)' : 'CSS Pace (/100m)'}
                    </Label>
                     <Input
                       id="ftp"
                       value={data.ftp}
                       onChange={(e) => handleInputChange('ftp', e.target.value)}
                       placeholder={isCycling ? "285" : isRunning ? "4:15" : "1:25"}
                        disabled={useLabResults[sportMode]}
                        className={useLabResults[sportMode] ? "opacity-60" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ftpHr">
                      {isCycling ? 'FTP HR (bpm)' : isRunning ? 'Threshold HR (bpm)' : 'CSS HR (bpm)'}
                    </Label>
                     <Input
                       id="ftpHr"
                       value={data.ftpHr}
                       onChange={(e) => handleInputChange('ftpHr', e.target.value)}
                       placeholder="172"
                        disabled={useLabResults[sportMode]}
                        className={useLabResults[sportMode] ? "opacity-60" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxHr">Max HR (bpm)</Label>
                    <Input
                      id="maxHr"
                      value={data.maxHr}
                      onChange={(e) => handleInputChange('maxHr', e.target.value)}
                      placeholder="188"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="restingHr">Resting HR (bpm)</Label>
                    <Input
                      id="restingHr"
                      value={data.restingHr}
                      onChange={(e) => handleInputChange('restingHr', e.target.value)}
                      placeholder="48"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyWeight">Body Weight (kg)</Label>
                    <Input
                      id="bodyWeight"
                      value={data.bodyWeight}
                      onChange={(e) => handleInputChange('bodyWeight', e.target.value)}
                      placeholder="72"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="fatPercentage">Body Fat (%)</Label>
                  <Input
                    id="fatPercentage"
                    value={data.fatPercentage}
                    onChange={(e) => handleInputChange('fatPercentage', e.target.value)}
                    placeholder="12"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metabolic Data */}
            <Card className="card-gradient shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-zone-2" />
                  Metabolic Efficiency
                </CardTitle>
                <CardDescription>
                  Substrate utilization and metabolic efficiency test results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rmr">RMR (kcal/day)</Label>
                    <Input
                      id="rmr"
                      value={data.rmr}
                      onChange={(e) => handleInputChange('rmr', e.target.value)}
                      placeholder="1850"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatMax" className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      Fat Max {isCycling ? '(Watts)' : isRunning ? '(Pace /km)' : '(Pace /100m)'}
                    </Label>
                    <Input
                      id="fatMax"
                      value={data.fatMax}
                      onChange={(e) => handleInputChange('fatMax', e.target.value)}
                      placeholder={isCycling ? "180" : isRunning ? "5:30" : "1:45"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatMaxHr">Fat Max HR (bpm)</Label>
                    <Input
                      id="fatMaxHr"
                      value={data.fatMaxHr}
                      onChange={(e) => handleInputChange('fatMaxHr', e.target.value)}
                      placeholder="142"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crossover" className="flex items-center gap-1">
                      <Wheat className="w-3 h-3 text-amber-500" />
                      Crossover {isCycling ? '(Watts)' : isRunning ? '(Pace /km)' : '(Pace /100m)'}
                    </Label>
                    <Input
                      id="crossover"
                      value={data.crossover}
                      onChange={(e) => handleInputChange('crossover', e.target.value)}
                      placeholder={isCycling ? "195" : isRunning ? "4:45" : "1:35"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="crossoverHr">Crossover HR (bpm)</Label>
                    <Input
                      id="crossoverHr"
                      value={data.crossoverHr}
                      onChange={(e) => handleInputChange('crossoverHr', e.target.value)}
                      placeholder="148"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold">Substrate Utilization</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {Object.keys(data.choPercentages).map((intensity) => (
                      <div key={intensity} className="space-y-2">
                        <Label className="text-xs">
                          @ {isCycling ? intensity + 'W' : isRunning ? Math.floor(parseInt(intensity) * 0.015).toString() + ':' + String(Math.floor((parseInt(intensity) * 0.015 % 1) * 60)).padStart(2, '0') + '/km' : Math.floor(parseInt(intensity) * 0.004).toString() + ':' + String(Math.floor((parseInt(intensity) * 0.004 % 1) * 60)).padStart(2, '0') + '/100m'}
                        </Label>
                        <div className="grid grid-cols-2 gap-1">
                          <div className="relative">
                            <Wheat className="absolute left-2 top-2 w-3 h-3 text-orange-500" />
                            <Input
                              value={data.choPercentages[intensity]}
                              onChange={(e) => {
                                const newCho = { ...data.choPercentages };
                                newCho[intensity] = e.target.value;
                                setSportData(prev => ({ 
                                  ...prev, 
                                  [sportMode]: { 
                                    ...prev[sportMode], 
                                    choPercentages: newCho 
                                  } 
                                }));
                              }}
                              placeholder="CHO%"
                              className="text-xs pl-8"
                            />
                          </div>
                          <div className="relative">
                            <Flame className="absolute left-2 top-2 w-3 h-3 text-orange-500" />
                            <Input
                              value={data.fatPercentages[intensity]}
                              onChange={(e) => {
                                const newFat = { ...data.fatPercentages };
                                newFat[intensity] = e.target.value;
                                setSportData(prev => ({ 
                                  ...prev, 
                                  [sportMode]: { 
                                    ...prev[sportMode], 
                                    fatPercentages: newFat 
                                  } 
                                }));
                              }}
                            placeholder="Fat%"
                            className="text-xs pl-8"
                          />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Critical Power & W' */}
            <Card className="card-gradient shadow-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-zone-1" />
                  Critical Power & W' Analysis
                </CardTitle>
                <CardDescription>
                  Power-duration relationship and anaerobic work capacity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="criticalPower">{data.runnerMode ? 'Critical Speed (m/s)' : 'Critical Power (Watts)'}</Label>
                    <Input
                      id="criticalPower"
                      value={data.runnerMode ? data.criticalSpeed : data.criticalPower}
                      onChange={(e) => handleInputChange(data.runnerMode ? 'criticalSpeed' : 'criticalPower', e.target.value)}
                      placeholder={data.runnerMode ? "4.2" : "290"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wPrime">{data.runnerMode ? "D' (meters)" : "W' (Joules)"}</Label>
                    <Input
                      id="wPrime"
                      value={data.runnerMode ? data.dPrime : data.wPrime}
                      onChange={(e) => handleInputChange(data.runnerMode ? 'dPrime' : 'wPrime', e.target.value)}
                      placeholder={data.runnerMode ? "320" : "18500"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Source</Label>
                    <select className="w-full px-3 py-2 border rounded-md bg-background">
                      <option>Manual Input</option>
                      <option>Mean Max Power (90 days)</option>
                      <option>Mean Max Power (30 days)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Runner Mode</Label>
                    <Button
                      type="button"
                      variant={data.runnerMode ? "default" : "outline"}
                      className="w-full"
                      onClick={() => setSportData(prev => ({ 
                        ...prev, 
                        [sportMode]: { 
                          ...prev[sportMode], 
                          runnerMode: !prev[sportMode].runnerMode 
                        } 
                      }))}
                    >
                      {data.runnerMode ? 'Speed/Pace' : 'Power'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-6">
          <RecoverySection 
            data={data.recovery} 
            onChange={(recoveryData) => setSportData(prev => ({ 
              ...prev, 
              [sportMode]: { 
                ...prev[sportMode], 
                recovery: recoveryData 
              } 
            }))}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} className="primary-gradient">
          <Heart className="w-4 h-4 mr-2" />
          Save Complete Profile
        </Button>
      </div>
    </div>
  );
}