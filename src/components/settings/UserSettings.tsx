import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useSupabase";
import { useLabResults } from "@/hooks/useLabResults";
import { useTimeAvailability } from "@/hooks/useTimeAvailability";
import { User, Mail, Lock, Globe, Ruler, Clock, Activity, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSportMode } from "@/contexts/SportModeContext";

export function UserSettings() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, resetPassword, uploadAvatar } = useUserProfile();
  const { labResults, saveLabResults } = useLabResults();
  const { timeAvailability, saveTimeAvailability } = useTimeAvailability();
  const { toast } = useToast();
  const { sportMode, isCycling, isRunning, isSwimming } = useSportMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    timezone: profile?.timezone || 'UTC',
    units: profile?.units || 'metric'
  });
  
  const [labData, setLabData] = useState({
    vo2_max: labResults?.vo2_max?.toString() || '',
    vla_max: labResults?.vla_max?.toString() || '',
    fat_max: labResults?.fat_max?.toString() || '',
    crossover_point: labResults?.crossover_point?.toString() || '',
    fat_max_intensity: labResults?.fat_max_intensity?.toString() || '',
    aerobic_threshold: '',
    aet_hr: '',
    glycolytic_threshold: '',
    gt_hr: '',
    map: '',
    max_hr: '',
    resting_hr: '',
    body_weight: '',
    critical_power: '',
    w_prime: ''
  });
  
  const [timeData, setTimeData] = useState({
    training_hours_per_day: timeAvailability?.training_hours_per_day?.toString() || '2',
    recovery_hours_per_day: timeAvailability?.recovery_hours_per_day?.toString() || '1'
  });

  // Handle file upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadAvatar(file);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await resetPassword(user.email);
    }
  };

  const handleLabResultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveLabResults({
        vo2_max: parseFloat(labData.vo2_max) || undefined,
        vla_max: parseFloat(labData.vla_max) || undefined,
        fat_max: parseFloat(labData.fat_max) || undefined,
        crossover_point: parseFloat(labData.crossover_point) || undefined,
        fat_max_intensity: parseFloat(labData.fat_max_intensity) || undefined,
      });
      toast({
        title: "Lab results saved",
        description: "Your laboratory test results have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving lab results",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTimeAvailabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveTimeAvailability({
        training_hours_per_day: parseFloat(timeData.training_hours_per_day),
        recovery_hours_per_day: parseFloat(timeData.recovery_hours_per_day),
      });
    } catch (error: any) {
      toast({
        title: "Error saving time preferences",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Australia/Sydney'
  ];

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-lg">
                {formData.full_name ? formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG up to 2MB
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timezone" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Timezone
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="units" className="flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Units
                </Label>
                <Select
                  value={formData.units}
                  onValueChange={(value: 'metric' | 'imperial') => setFormData(prev => ({ ...prev, units: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metric">Metric (kg, km, °C)</SelectItem>
                    <SelectItem value="imperial">Imperial (lbs, miles, °F)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            Security
          </CardTitle>
          <CardDescription>
            Manage your account security and password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
            <div>
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">
                Reset your password to keep your account secure
              </p>
            </div>
            <Button variant="outline" onClick={handlePasswordReset}>
              Reset Password
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sport-Specific Lab Test Results */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Lab Test Results - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}
          </CardTitle>
          <CardDescription>
            Enter your laboratory test results for {sportMode} for more accurate training zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLabResultsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vo2_max">VO2 Max (ml/kg/min)</Label>
                <Input
                  id="vo2_max"
                  type="number"
                  step="0.1"
                  value={labData.vo2_max || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    vo2_max: e.target.value
                  }))}
                  placeholder="58.5"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vla_max">VLaMax (mmol/L/s)</Label>
                <Input
                  id="vla_max"
                  type="number"
                  step="0.01"
                  value={labData.vla_max || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    vla_max: e.target.value
                  }))}
                  placeholder="0.35"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fat_max">Fat Max (g/min/kg)</Label>
                <Input
                  id="fat_max"
                  type="number"
                  step="0.01"
                  value={labData.fat_max || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    fat_max: e.target.value
                  }))}
                  placeholder="0.42"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="crossover_point">
                  Crossover Point ({isCycling ? 'Watts' : isRunning ? 'min:sec /km' : 'min:sec /100m'})
                </Label>
                <Input
                  id="crossover_point"
                  type={isCycling ? "number" : "text"}
                  value={labData.crossover_point || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    crossover_point: e.target.value
                  }))}
                  placeholder={isCycling ? "195" : isRunning ? "4:30" : "1:35"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fat_max_intensity">Fat Max Intensity (%)</Label>
                <Input
                  id="fat_max_intensity"
                  type="number"
                  step="0.1"
                  value={labData.fat_max_intensity || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    fat_max_intensity: e.target.value
                  }))}
                  placeholder="65.5"
                />
              </div>

              {/* Additional sport-specific metrics */}
              <div className="space-y-2">
                <Label htmlFor="aerobic_threshold">
                  Aerobic Threshold (AeT) ({isCycling ? 'Watts' : isRunning ? 'min:sec /km' : 'min:sec /100m'})
                </Label>
                <Input
                  id="aerobic_threshold"
                  type={isCycling ? "number" : "text"}
                  value={labData.aerobic_threshold || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    aerobic_threshold: e.target.value
                  }))}
                  placeholder={isCycling ? "195" : isRunning ? "5:00" : "1:45"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aet_hr">AeT Heart Rate (bpm)</Label>
                <Input
                  id="aet_hr"
                  type="number"
                  value={labData.aet_hr || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    aet_hr: e.target.value
                  }))}
                  placeholder="150"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="glycolytic_threshold">
                  Glycolytic Threshold (GT) ({isCycling ? 'Watts' : isRunning ? 'min:sec /km' : 'min:sec /100m'})
                </Label>
                <Input
                  id="glycolytic_threshold"
                  type={isCycling ? "number" : "text"}
                  value={labData.glycolytic_threshold || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    glycolytic_threshold: e.target.value
                  }))}
                  placeholder={isCycling ? "280" : isRunning ? "4:15" : "1:25"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gt_hr">GT Heart Rate (bpm)</Label>
                <Input
                  id="gt_hr"
                  type="number"
                  value={labData.gt_hr || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    gt_hr: e.target.value
                  }))}
                  placeholder="175"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="map">
                  MAP ({isCycling ? 'Watts' : isRunning ? 'min:sec /km' : 'min:sec /100m'})
                </Label>
                <Input
                  id="map"
                  type={isCycling ? "number" : "text"}
                  value={labData.map || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    map: e.target.value
                  }))}
                  placeholder={isCycling ? "320" : isRunning ? "3:45" : "1:20"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_hr">Max Heart Rate (bpm)</Label>
                <Input
                  id="max_hr"
                  type="number"
                  value={labData.max_hr || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    max_hr: e.target.value
                  }))}
                  placeholder="188"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resting_hr">Resting Heart Rate (bpm)</Label>
                <Input
                  id="resting_hr"
                  type="number"
                  value={labData.resting_hr || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    resting_hr: e.target.value
                  }))}
                  placeholder="48"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_weight">Body Weight (kg)</Label>
                <Input
                  id="body_weight"
                  type="number"
                  step="0.1"
                  value={labData.body_weight || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    body_weight: e.target.value
                  }))}
                  placeholder="72.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="critical_power">
                  {isCycling ? 'Critical Power (W)' : isRunning ? 'Critical Speed (min:sec /km)' : 'Critical Speed (min:sec /100m)'}
                </Label>
                <Input
                  id="critical_power"
                  type={isCycling ? "number" : "text"}
                  value={labData.critical_power || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    critical_power: e.target.value
                  }))}
                  placeholder={isCycling ? "290" : isRunning ? "4:10" : "1:22"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="w_prime">
                  {isCycling ? "W' (kJ)" : isRunning ? "D' (m)" : "D' (m)"}
                </Label>
                <Input
                  id="w_prime"
                  type="number"
                  value={labData.w_prime || ''}
                  onChange={(e) => setLabData(prev => ({ 
                    ...prev, 
                    w_prime: e.target.value
                  }))}
                  placeholder={isCycling ? "18.5" : "320"}
                />
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : `Save ${sportMode.charAt(0).toUpperCase() + sportMode.slice(1)} Lab Results`}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recovery Tools & Services */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Recovery Tools & Services - {sportMode.charAt(0).toUpperCase() + sportMode.slice(1)}
          </CardTitle>
          <CardDescription>
            Track your recovery methods and services for {sportMode}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="massage_sessions">Massage Sessions / Week</Label>
              <Input
                id="massage_sessions"
                type="number"
                placeholder="2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ice_baths">Ice Baths / Week</Label>
              <Input
                id="ice_baths"
                type="number"
                placeholder="3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sauna_sessions">Sauna Sessions / Week</Label>
              <Input
                id="sauna_sessions"
                type="number"
                placeholder="2"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="compression_therapy">Compression Therapy</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stretching_time">Stretching (minutes/day)</Label>
              <Input
                id="stretching_time"
                type="number"
                placeholder="20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="foam_rolling">Foam Rolling (minutes/day)</Label>
              <Input
                id="foam_rolling"
                type="number"
                placeholder="15"
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full">
            Save Recovery Settings
          </Button>
        </CardContent>
      </Card>

      {/* Lab Test Results - REMOVED - Now in Settings/User Settings */}

      {/* Time Constraints - REMOVED - Now in Settings/Time & Schedule */}
    </div>
  );
}