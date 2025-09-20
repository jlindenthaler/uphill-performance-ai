import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserProfile } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useSupabase";
import { User, Mail, Lock, Globe, Ruler, Clock, Activity } from "lucide-react";

export function UserSettings() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, resetPassword } = useUserProfile();
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    timezone: profile?.timezone || 'UTC',
    units: profile?.units || 'metric'
  });
  const [timeConstraints, setTimeConstraints] = useState({
    training_hours_per_day: '2',
    recovery_hours_per_day: '1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await resetPassword(user.email);
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
              <Button variant="outline" size="sm">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lab_vo2max">VO2 Max (ml/kg/min)</Label>
              <Input
                id="lab_vo2max"
                placeholder="58.5"
                type="number"
                step="0.1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lab_vlamax">VLaMax (mmol/L/s)</Label>
              <Input
                id="lab_vlamax"
                placeholder="0.35"
                type="number"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lab_fat_max">Fat Max (g/min/kg)</Label>
              <Input
                id="lab_fat_max"
                placeholder="0.42"
                type="number"
                step="0.01"
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
              />
            </div>
          </div>

          <Button className="w-full">
            Save Lab Results
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="training_hours">Training Hours per Day</Label>
              <Select
                value={timeConstraints.training_hours_per_day}
                onValueChange={(value) => setTimeConstraints(prev => ({ ...prev, training_hours_per_day: value }))}
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
                value={timeConstraints.recovery_hours_per_day}
                onValueChange={(value) => setTimeConstraints(prev => ({ ...prev, recovery_hours_per_day: value }))}
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

          <Button className="w-full">
            Save Time Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}