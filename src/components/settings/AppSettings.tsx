import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/hooks/useSettings";
import { 
  Settings, 
  Bell, 
  Mail, 
  Palette, 
  Shield, 
  RefreshCw, 
  Bike,
  Moon,
  Sun,
  Monitor,
  Link,
  Wifi,
  Smartphone,
  Link as LinkIcon,
  Plus
} from "lucide-react";
import { GarminConnection } from "@/components/GarminConnection";

export function AppSettings() {
  const { settings, loading, updateSettings } = useAppSettings();

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
                  updateSettings({ theme: value })
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

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  <Bike className="w-4 h-4" />
                  Default Sport
                </Label>
                <p className="text-sm text-muted-foreground">
                  Your preferred sport for new workouts
                </p>
              </div>
              <Select
                value={settings.default_sport}
                onValueChange={(value: 'cycling' | 'running') => 
                  updateSettings({ default_sport: value })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cycling">Cycling</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
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

      {/* Connections */}
      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-blue-500" />
            Connections
          </CardTitle>
          <CardDescription>
            Connect and manage integrations with external services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GarminConnection />
        </CardContent>
      </Card>
    </div>
  );
}