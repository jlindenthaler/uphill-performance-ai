import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SportModeToggle } from "@/components/SportModeToggle";
import { Home, Calendar, Activity, Target, Heart, Download, Settings, Zap, TrendingUp, BookOpen, Upload, ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
interface NavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
export function Navigation({
  activeSection,
  onSectionChange,
  collapsed = false,
  onToggleCollapse
}: NavigationProps) {
  const navItems = [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home
  }, {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar
  }, {
    id: 'activities',
    label: 'Training',
    icon: Upload
  }, {
    id: 'goals',
    label: 'Goals',
    icon: Target
  }, {
    id: 'workouts',
    label: 'Workouts',
    icon: Activity
  }, {
    id: 'lab-results',
    label: 'Lab Results',
    icon: FlaskConical
  }, {
    id: 'analysis',
    label: 'Analysis',
    icon: TrendingUp
  }, {
    id: 'research',
    label: 'Research',
    icon: BookOpen
  }, {
    id: 'export',
    label: 'Export',
    icon: Download
  }, {
    id: 'settings',
    label: 'Settings',
    icon: Settings
  }];
  return <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-border transition-all duration-300`}>
        {!collapsed && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg primary-gradient flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">UpHill Ai</h1>
              <p className="text-xs text-muted-foreground">Science-based Ai training</p>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-lg primary-gradient flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        )}
        
        {/* Sport Mode Toggle - hide in collapsed mode */}
        {!collapsed && <SportModeToggle />}
        
        {/* Collapse Toggle Button */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={`w-full mt-4 ${collapsed ? 'px-0' : 'justify-start'}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="ml-2">Collapse</span>}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-4'} transition-all duration-300`}>
        <div className="space-y-2">
          {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return <Button 
            key={item.id} 
            variant={isActive ? "default" : "ghost"} 
            className={`w-full ${collapsed ? 'px-2 justify-center' : 'justify-start gap-3'} ${isActive ? "primary-gradient shadow-primary" : "hover:bg-secondary/80"}`} 
            onClick={() => onSectionChange(item.id)}
            title={collapsed ? item.label : undefined}
          >
                <Icon className="w-4 h-4" />
                {!collapsed && (
                  <>
                    {item.label}
                    {(item.id === 'workouts' || item.id === 'research') && <Badge variant="secondary" className="ml-auto text-xs">
                        {item.id === 'research' ? 'AI' : 'New'}
                      </Badge>}
                  </>
                )}
              </Button>;
        })}
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            <p>Training zones based on</p>
            <p className="font-medium">Modified Seiler 4-Zone Model</p>
          </div>
        </div>
      )}
    </div>;
}