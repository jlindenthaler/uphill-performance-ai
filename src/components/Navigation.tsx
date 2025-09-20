import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SportModeToggle } from "@/components/SportModeToggle";
import { 
  Home, 
  Calendar, 
  Activity, 
  Target, 
  Heart, 
  Download,
  Settings,
  Zap,
  TrendingUp,
  BookOpen
} from "lucide-react";

interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Navigation({ activeSection, onSectionChange }: NavigationProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'workouts', label: 'Workouts', icon: Activity },
    { id: 'physiology', label: 'Physiology', icon: Heart },
    { id: 'pmc', label: 'PMC', icon: TrendingUp },
    { id: 'research', label: 'Research', icon: BookOpen },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg primary-gradient flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">EliteEndurance</h1>
            <p className="text-xs text-muted-foreground">Science-based training</p>
          </div>
        </div>
        
        {/* Sport Mode Toggle */}
        <SportModeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive 
                    ? "primary-gradient shadow-primary" 
                    : "hover:bg-secondary/80"
                }`}
                onClick={() => onSectionChange(item.id)}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {(item.id === 'workouts' || item.id === 'research') && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.id === 'research' ? 'AI' : 'New'}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>Training zones based on</p>
          <p className="font-medium">Modified Seiler 4-Zone Model</p>
        </div>
      </div>
    </div>
  );
}