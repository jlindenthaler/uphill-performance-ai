import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Heart, Zap, Activity, Flame } from "lucide-react";

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
}

export function PhysiologyForm() {
  const [data, setData] = useState<PhysiologyData>({
    vo2max: '58',
    map: '320',
    mapHr: '188',
    vt1: '200',
    vt1Hr: '150',
    vt2: '285',
    vt2Hr: '175',
    lt1: '195',
    lt1Hr: '148',
    lt2: '280',
    lt2Hr: '172',
    rmr: '1850',
    ftp: '285',
    ftpHr: '172',
    maxHr: '188',
    restingHr: '48',
    bodyWeight: '72',
    fatPercentage: '12',
    criticalPower: '290',
    wPrime: '18500',
    fatMax: '180',
    fatMaxHr: '142',
    crossover: '195',
    crossoverHr: '148',
    choPercentages: { '180': '45', '220': '65', '260': '85', '300': '95' },
    fatPercentages: { '180': '55', '220': '35', '260': '15', '300': '5' },
    runnerMode: false,
    criticalSpeed: '4.2',
    dPrime: '320'
  });

  const handleInputChange = (field: keyof PhysiologyData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Save physiology data
    console.log('Saving physiology data:', data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Physiological Data</h1>
          <p className="text-muted-foreground">Laboratory and performance markers for optimal training zones</p>
        </div>
        <Badge variant="secondary" className="bg-primary/20 text-primary">
          Data Priority: Lab &gt; Performance &gt; Estimated
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Laboratory Data */}
        <Card className="card-gradient shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-zone-4" />
              Laboratory Results
            </CardTitle>
            <CardDescription>
              Gold standard physiological markers from laboratory testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vo2max">VO2 Max (ml/kg/min)</Label>
                <Input
                  id="vo2max"
                  value={data.vo2max}
                  onChange={(e) => handleInputChange('vo2max', e.target.value)}
                  placeholder="58"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="map">MAP (Watts)</Label>
                <Input
                  id="map"
                  value={data.map}
                  onChange={(e) => handleInputChange('map', e.target.value)}
                  placeholder="320"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapHr">MAP/VO2max HR (bpm)</Label>
                <Input
                  id="mapHr"
                  value={data.mapHr}
                  onChange={(e) => handleInputChange('mapHr', e.target.value)}
                  placeholder="188"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vt1Hr">VT1 HR (bpm)</Label>
                <Input
                  id="vt1Hr"
                  value={data.vt1Hr}
                  onChange={(e) => handleInputChange('vt1Hr', e.target.value)}
                  placeholder="150"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vt2">VT2 (Watts)</Label>
                <Input
                  id="vt2"
                  value={data.vt2}
                  onChange={(e) => handleInputChange('vt2', e.target.value)}
                  placeholder="285"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vt2Hr">VT2 HR (bpm)</Label>
                <Input
                  id="vt2Hr"
                  value={data.vt2Hr}
                  onChange={(e) => handleInputChange('vt2Hr', e.target.value)}
                  placeholder="175"
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt1Hr">LT1 HR (bpm)</Label>
                <Input
                  id="lt1Hr"
                  value={data.lt1Hr}
                  onChange={(e) => handleInputChange('lt1Hr', e.target.value)}
                  placeholder="148"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt2">LT2 (Watts)</Label>
                <Input
                  id="lt2"
                  value={data.lt2}
                  onChange={(e) => handleInputChange('lt2', e.target.value)}
                  placeholder="280"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt2Hr">LT2 HR (bpm)</Label>
                <Input
                  id="lt2Hr"
                  value={data.lt2Hr}
                  onChange={(e) => handleInputChange('lt2Hr', e.target.value)}
                  placeholder="172"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Data */}
        <Card className="card-gradient shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-zone-3" />
              Performance Markers
            </CardTitle>
            <CardDescription>
              Field-tested and calculated performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ftp">FTP (Watts)</Label>
                <Input
                  id="ftp"
                  value={data.ftp}
                  onChange={(e) => handleInputChange('ftp', e.target.value)}
                  placeholder="285"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ftpHr">FTP HR (bpm)</Label>
                <Input
                  id="ftpHr"
                  value={data.ftpHr}
                  onChange={(e) => handleInputChange('ftpHr', e.target.value)}
                  placeholder="172"
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
                <Label htmlFor="fatMax">Fat Max (Watts)</Label>
                <Input
                  id="fatMax"
                  value={data.fatMax}
                  onChange={(e) => handleInputChange('fatMax', e.target.value)}
                  placeholder="180"
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
                <Label htmlFor="crossover">Crossover (Watts)</Label>
                <Input
                  id="crossover"
                  value={data.crossover}
                  onChange={(e) => handleInputChange('crossover', e.target.value)}
                  placeholder="195"
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
                    <Label className="text-xs">@ {intensity}W</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <Input
                        value={data.choPercentages[intensity]}
                        onChange={(e) => {
                          const newCho = { ...data.choPercentages };
                          newCho[intensity] = e.target.value;
                          setData(prev => ({ ...prev, choPercentages: newCho }));
                        }}
                        placeholder="CHO%"
                        className="text-xs"
                      />
                      <Input
                        value={data.fatPercentages[intensity]}
                        onChange={(e) => {
                          const newFat = { ...data.fatPercentages };
                          newFat[intensity] = e.target.value;
                          setData(prev => ({ ...prev, fatPercentages: newFat }));
                        }}
                        placeholder="Fat%"
                        className="text-xs"
                      />
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
                  onClick={() => setData(prev => ({ ...prev, runnerMode: !prev.runnerMode }))}
                >
                  {data.runnerMode ? 'Speed/Pace' : 'Power'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} className="primary-gradient">
          <Heart className="w-4 h-4 mr-2" />
          Save Physiology Data
        </Button>
      </div>
    </div>
  );
}