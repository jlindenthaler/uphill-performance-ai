import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "@/components/settings/UserSettings";
import { AppSettings } from "@/components/settings/AppSettings";
import { EnhancedTimeSettingsWithSliders } from "@/components/settings/EnhancedTimeSettingsWithSliders";

import { User, Settings as SettingsIcon } from "lucide-react";

export function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      <Tabs defaultValue="user" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            User Settings
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Time & Schedule
          </TabsTrigger>
          <TabsTrigger value="app" className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            App Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user">
          <UserSettings />
        </TabsContent>

        <TabsContent value="time">
          <EnhancedTimeSettingsWithSliders />
        </TabsContent>

        <TabsContent value="app">
          <AppSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}