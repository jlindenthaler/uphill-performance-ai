import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettings } from "@/components/settings/UserSettings";
import { AppSettings } from "@/components/settings/AppSettings";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { SimpleTimeSettings } from "@/components/SimpleTimeSettings";

import { User, Settings as SettingsIcon, Plug } from "lucide-react";

interface SettingsProps {
  defaultTab?: string;
}

export function Settings({ defaultTab }: SettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, preferences, and integrations
        </p>
      </div>

      <Tabs defaultValue={defaultTab || "user"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            User Settings
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Integrations
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

        <TabsContent value="integrations">
          <IntegrationsSettings />
        </TabsContent>

        <TabsContent value="time">
          <SimpleTimeSettings />
        </TabsContent>

        <TabsContent value="app">
          <AppSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}