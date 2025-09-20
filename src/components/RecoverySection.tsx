import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Snowflake, Waves, Zap, Flame, Heart, Settings } from "lucide-react";

interface RecoveryData {
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
  frequency: {
    [key: string]: string;
  };
  sleepHours: string;
  sleepQuality: string;
  hrvBaseline: string;
  restingHRBaseline: string;
}

interface RecoverySectionProps {
  data: RecoveryData;
  onChange: (data: RecoveryData) => void;
}

export function RecoverySection({ data, onChange }: RecoverySectionProps) {
  const handleModalityChange = (modality: keyof RecoveryData['availableModalities'], checked: boolean) => {
    onChange({
      ...data,
      availableModalities: {
        ...data.availableModalities,
        [modality]: checked
      }
    });
  };

  const handleFrequencyChange = (modality: string, frequency: string) => {
    onChange({
      ...data,
      frequency: {
        ...data.frequency,
        [modality]: frequency
      }
    });
  };

  const handleBasicDataChange = (field: keyof RecoveryData, value: string) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  const recoveryModalities = [
    { key: 'infraredSauna', label: 'Infrared Sauna', icon: Flame, category: 'heat' },
    { key: 'dryTrueSauna', label: 'Dry/True Sauna', icon: Flame, category: 'heat' },
    { key: 'steamRoom', label: 'Steam Room', icon: Waves, category: 'heat' },
    { key: 'hotTub', label: 'Hot Tub/Jacuzzi', icon: Waves, category: 'heat' },
    { key: 'iceBath', label: 'Ice Bath', icon: Snowflake, category: 'cold' },
    { key: 'coldPlunge', label: 'Cold Plunge', icon: Snowflake, category: 'cold' },
    { key: 'cryotherapy', label: 'Cryotherapy', icon: Snowflake, category: 'cold' },
    { key: 'pool', label: 'Swimming Pool', icon: Waves, category: 'water' },
    { key: 'floatTank', label: 'Float Tank', icon: Waves, category: 'water' },
    { key: 'pneumaticCompression', label: 'Pneumatic Leg Compression', icon: Heart, category: 'mechanical' },
    { key: 'massageGun', label: 'Massage Gun/Percussion', icon: Zap, category: 'mechanical' },
    { key: 'massage', label: 'Professional Massage', icon: Heart, category: 'manual' },
    { key: 'estim', label: 'Electrical Stimulation (E-Stim)', icon: Zap, category: 'electrical' },
    { key: 'redLightTherapy', label: 'Red Light Therapy', icon: Flame, category: 'light' },
    { key: 'hyperbaricChamber', label: 'Hyperbaric Chamber', icon: Settings, category: 'advanced' },
    { key: 'stretching', label: 'Stretching/Mobility', icon: Heart, category: 'movement' },
    { key: 'yoga', label: 'Yoga/Pilates', icon: Heart, category: 'movement' },
    { key: 'meditation', label: 'Meditation/Mindfulness', icon: Heart, category: 'mental' },
    { key: 'sleepTracking', label: 'Sleep Tracking Device', icon: Settings, category: 'monitoring' },
    { key: 'hrv', label: 'HRV Monitoring', icon: Heart, category: 'monitoring' },
  ];

  const categories = {
    heat: { name: 'Heat Therapy', icon: Flame, color: 'text-red-500' },
    cold: { name: 'Cold Therapy', icon: Snowflake, color: 'text-blue-500' },
    water: { name: 'Water Therapy', icon: Waves, color: 'text-cyan-500' },
    mechanical: { name: 'Mechanical Recovery', icon: Settings, color: 'text-purple-500' },
    electrical: { name: 'Electrical Therapy', icon: Zap, color: 'text-yellow-500' },
    light: { name: 'Light Therapy', icon: Flame, color: 'text-orange-500' },
    manual: { name: 'Manual Therapy', icon: Heart, color: 'text-pink-500' },
    movement: { name: 'Active Recovery', icon: Heart, color: 'text-green-500' },
    mental: { name: 'Mental Recovery', icon: Heart, color: 'text-indigo-500' },
    monitoring: { name: 'Recovery Monitoring', icon: Settings, color: 'text-gray-500' },
    advanced: { name: 'Advanced Therapies', icon: Settings, color: 'text-violet-500' }
  };

  const groupedModalities = recoveryModalities.reduce((acc, modality) => {
    if (!acc[modality.category]) {
      acc[modality.category] = [];
    }
    acc[modality.category].push(modality);
    return acc;
  }, {} as Record<string, typeof recoveryModalities>);

  return (
    <div className="space-y-6">
      {/* Recovery Baselines */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-zone-1" />
            Recovery Baselines
          </CardTitle>
          <CardDescription>
            Baseline metrics for recovery monitoring and AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sleepHours">Avg Sleep Hours</Label>
              <Input
                id="sleepHours"
                value={data.sleepHours}
                onChange={(e) => handleBasicDataChange('sleepHours', e.target.value)}
                placeholder="7.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sleepQuality">Sleep Quality (1-10)</Label>
              <Input
                id="sleepQuality"
                value={data.sleepQuality}
                onChange={(e) => handleBasicDataChange('sleepQuality', e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrvBaseline">HRV Baseline (ms)</Label>
              <Input
                id="hrvBaseline"
                value={data.hrvBaseline}
                onChange={(e) => handleBasicDataChange('hrvBaseline', e.target.value)}
                placeholder="45"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restingHRBaseline">Resting HR Baseline</Label>
              <Input
                id="restingHRBaseline"
                value={data.restingHRBaseline}
                onChange={(e) => handleBasicDataChange('restingHRBaseline', e.target.value)}
                placeholder="48"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Recovery Modalities */}
      <Card className="card-gradient shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-zone-2" />
            Available Recovery Methods
          </CardTitle>
          <CardDescription>
            Select recovery methods you have access to and their frequency - AI will recommend when to use them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedModalities).map(([categoryKey, modalities]) => {
            const category = categories[categoryKey];
            const CategoryIcon = category.icon;
            
            return (
              <div key={categoryKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon className={`w-4 h-4 ${category.color}`} />
                  <h4 className="font-semibold text-sm">{category.name}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6">
                  {modalities.map((modality) => (
                    <div key={modality.key} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={modality.key}
                          checked={data.availableModalities[modality.key as keyof RecoveryData['availableModalities']]}
                          onCheckedChange={(checked) => 
                            handleModalityChange(modality.key as keyof RecoveryData['availableModalities'], checked as boolean)
                          }
                        />
                        <Label htmlFor={modality.key} className="text-sm">
                          {modality.label}
                        </Label>
                      </div>
                      {data.availableModalities[modality.key as keyof RecoveryData['availableModalities']] && (
                        <Input
                          placeholder="Max frequency (e.g., 3x/week)"
                          value={data.frequency[modality.key] || ''}
                          onChange={(e) => handleFrequencyChange(modality.key, e.target.value)}
                          className="text-xs ml-6"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}