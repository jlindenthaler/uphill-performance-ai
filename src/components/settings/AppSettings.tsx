import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useActivities } from "@/hooks/useActivities";
import { useAuth } from "@/hooks/useSupabase";
import { 
  Settings, 
  Bell, 
  Mail, 
  Palette, 
  Shield, 
  RefreshCw, 
  Moon,
  Sun,
  Monitor,
  Wifi,
  Smartphone,
  Link as LinkIcon,
  Plus,
  Database,
  RotateCcw,
  Calculator,
  LogOut,
  User
} from "lucide-react";
import { PowerProfileBackfill } from "@/components/PowerProfileBackfill";

export function AppSettings() {
  const { settings, loading, updateSettings } = useAppSettings();
  const { reprocessActivityTimestamps, recalculateTSSForAllActivities, loading: activitiesLoading } = useActivities();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculateTSS = async () => {
    setIsRecalculating(true);
    try {
      await recalculateTSSForAllActivities();
    } catch (error) {
      // Error already handled in the hook
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* General Preferences */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            General Preferences
          </CardTitle>
          <CardDescription>
            Customize your app experience and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Theme
                </Label>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') => 
                  setTheme(value)
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control when and how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications in your browser
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) => 
                updateSettings({ notifications_enabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive updates and summaries via email
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) => 
                updateSettings({ email_notifications: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Workout Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded about scheduled workouts
              </p>
            </div>
            <Switch
              checked={settings.workout_reminders}
              onCheckedChange={(checked) => 
                updateSettings({ workout_reminders: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Data */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Privacy & Data
          </CardTitle>
          <CardDescription>
            Control your privacy and data sharing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Auto-Sync Data
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync with connected services
              </p>
            </div>
            <Switch
              checked={settings.auto_sync}
              onCheckedChange={(checked) => 
                updateSettings({ auto_sync: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Data Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Share anonymized data for research purposes
              </p>
            </div>
            <Switch
              checked={settings.data_sharing}
              onCheckedChange={(checked) => 
                updateSettings({ data_sharing: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Privacy Mode</Label>
              <p className="text-sm text-muted-foreground">
                Hide personal data from shared screens
              </p>
            </div>
            <Switch
              checked={settings.privacy_mode}
              onCheckedChange={(checked) => 
                updateSettings({ privacy_mode: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-500" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage and analyze your training data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PowerProfileBackfill />
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Fix Timestamps
              </Label>
              <p className="text-sm text-muted-foreground">
                Reprocess activity timestamps based on your current timezone
              </p>
            </div>
            <Button
              onClick={reprocessActivityTimestamps}
              variant="outline"
              size="sm"
              disabled={activitiesLoading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Fix Timestamps
            </Button>
          </div>

          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Recalculate TSS
              </Label>
              <p className="text-sm text-muted-foreground">
                Uses VT2/LT2 from lab results as priority, then CP, then FTP
              </p>
            </div>
            <Button
              onClick={handleRecalculateTSS}
              disabled={isRecalculating}
              variant="outline"
              size="sm"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {isRecalculating ? 'Recalculating...' : 'Recalculate TSS'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            Account
          </CardTitle>
          <CardDescription>
            Manage your account and authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Label>
              <p className="text-sm text-muted-foreground">
                Sign out of your account
              </p>
            </div>
            <Button
              onClick={() => signOut()}
              variant="destructive"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}