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

export function UserSettings() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, resetPassword, uploadAvatar } = useUserProfile();
  const { labResults, saveLabResults } = useLabResults();
  const { timeAvailability, saveTimeAvailability } = useTimeAvailability();
  const { toast } = useToast();
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
    fat_max_intensity: labResults?.fat_max_intensity?.toString() || ''
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
    await updateProfile(formData);
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

      {/* Lab Test Results */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Lab Test Results
          </CardTitle>
          <CardDescription>
            Input your laboratory test results for accurate metabolic profiling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLabResultsSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lab_vo2max">VO2 Max (ml/kg/min)</Label>
                <Input
                  id="lab_vo2max"
                  placeholder="58.5"
                  type="number"
                  step="0.1"
                  value={labData.vo2_max}
                  onChange={(e) => setLabData(prev => ({ ...prev, vo2_max: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lab_vlamax">VLaMax (mmol/L/s)</Label>
                <Input
                  id="lab_vlamax"
                  placeholder="0.35"
                  type="number"
                  step="0.01"
                  value={labData.vla_max}
                  onChange={(e) => setLabData(prev => ({ ...prev, vla_max: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lab_fat_max">Fat Max (g/min/kg)</Label>
                <Input
                  id="lab_fat_max"
                  placeholder="0.42"
                  type="number"
                  step="0.01"
                  value={labData.fat_max}
                  onChange={(e) => setLabData(prev => ({ ...prev, fat_max: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crossover_point">Crossover Point (Watts)</Label>
                <Input
                  id="crossover_point"
                  placeholder="195"
                  type="number"
                  value={labData.crossover_point}
                  onChange={(e) => setLabData(prev => ({ ...prev, crossover_point: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fat_max_intensity">Fat Max Intensity (%VO2max)</Label>
                <Input
                  id="fat_max_intensity"
                  placeholder="65"
                  type="number"
                  max="100"
                  min="40"
                  value={labData.fat_max_intensity}
                  onChange={(e) => setLabData(prev => ({ ...prev, fat_max_intensity: e.target.value }))}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Lab Results'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Time Constraints */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Time Availability
          </CardTitle>
          <CardDescription>
            Set daily time constraints for AI training and recovery planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleTimeAvailabilitySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="training_hours">Training Hours per Day</Label>
                <Select
                  value={timeData.training_hours_per_day}
                  onValueChange={(value) => setTimeData(prev => ({ ...prev, training_hours_per_day: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="2.5">2.5 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                    <SelectItem value="5">5+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery_hours">Recovery Hours per Day</Label>
                <Select
                  value={timeData.recovery_hours_per_day}
                  onValueChange={(value) => setTimeData(prev => ({ ...prev, recovery_hours_per_day: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.25">15 minutes</SelectItem>
                    <SelectItem value="0.5">30 minutes</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="1.5">1.5 hours</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Time Preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}