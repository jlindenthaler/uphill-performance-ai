import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { PhysiologyForm } from "@/components/PhysiologyForm";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { ResearchUpdates } from "@/components/ResearchUpdates";
import { Settings } from "@/components/Settings";
import { Calendar } from "@/components/Calendar";
import { Activities } from "@/components/Activities";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />;
      case 'physiology':
        return <PhysiologyForm />;
      case 'calendar':
        return <Calendar />;
      case 'activities':
        return <Activities />;
      case 'workouts':
        return <WorkoutLibrary />;
      case 'analysis':
        return <AnalysisDashboard />;
      case 'goals':
        return <div className="p-8 text-center text-muted-foreground">Goal Setting - Coming Soon</div>;
      case 'research':
        return <ResearchUpdates />;
      case 'export':
        return <div className="p-8 text-center text-muted-foreground">Export to Devices - Coming Soon</div>;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {isMobile ? (
        <>
          {/* Mobile Header with Menu Button */}
          <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 z-40">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <Navigation 
                  activeSection={activeSection}
                  onSectionChange={handleSectionChange}
                />
              </SheetContent>
            </Sheet>
            <h1 className="ml-3 font-semibold">UpHill Ai</h1>
          </div>

          {/* Mobile Main Content */}
          <div className="flex-1 pt-14">
            <div className="p-4">
              {renderContent()}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Sidebar */}
          <div className="w-64 bg-card border-r border-border">
            <Navigation 
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </div>

          {/* Desktop Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {renderContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
