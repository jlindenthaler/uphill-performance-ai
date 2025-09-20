import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { PhysiologyForm } from "@/components/PhysiologyForm";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { AnalysisDashboard } from "@/components/AnalysisDashboard";
import { ResearchUpdates } from "@/components/ResearchUpdates";
import { Settings } from "@/components/Settings";
import { Calendar } from "@/components/Calendar";

const Index = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveSection} />;
      case 'physiology':
        return <PhysiologyForm />;
      case 'calendar':
        return <Calendar />;
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

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <Navigation 
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Index;
