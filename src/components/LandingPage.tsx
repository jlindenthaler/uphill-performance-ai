import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthModal } from '@/components/AuthModal';
import { 
  Activity, 
  TrendingUp, 
  Target, 
  Brain, 
  BarChart3, 
  Zap,
  ChevronRight 
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Get personalized training recommendations based on your performance data and recovery metrics."
    },
    {
      icon: Activity,
      title: "Advanced Analytics",
      description: "Track VO2max, power profiles, training zones, and metabolic data with precision."
    },
    {
      icon: Target,
      title: "Performance Management",
      description: "Monitor training load, recovery, and fitness trends to optimize your performance."
    },
    {
      icon: BarChart3,
      title: "Lab Integration",
      description: "Connect lab results and physiological testing data for complete performance insights."
    },
    {
      icon: TrendingUp,
      title: "Training Zones",
      description: "Personalized training zones based on your metabolic profile and testing results."
    },
    {
      icon: Zap,
      title: "Recovery Tracking",
      description: "Monitor recovery metrics and optimize training load for peak performance."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 primary-gradient rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">UpHill Ai</h1>
          </div>
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="primary-gradient shadow-[var(--shadow-primary)]"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Elite Training
            <span className="block primary-gradient bg-clip-text text-transparent">
              Analytics Platform
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Unlock your athletic potential with AI-powered insights, advanced performance analytics, 
            and personalized training optimization for endurance athletes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => setShowAuthModal(true)}
              className="primary-gradient shadow-[var(--shadow-primary)] text-lg px-8"
            >
              Get Started
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Advanced Performance Analytics
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools for serious athletes who demand precision in their training
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-gradient border-border hover:shadow-[var(--shadow-card)] transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 primary-gradient rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Performance Highlights */}
      <section className="bg-card/50 border-y border-border">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Professional-Grade Metrics
            </h2>
            <p className="text-lg text-muted-foreground">
              Track the metrics that matter for elite performance
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-zone-1 mb-2">VO2max</div>
              <div className="text-sm text-muted-foreground">Aerobic Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-zone-2 mb-2">FTP</div>
              <div className="text-sm text-muted-foreground">Functional Threshold</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-zone-3 mb-2">VLaMax</div>
              <div className="text-sm text-muted-foreground">Lactate Production</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-zone-4 mb-2">PRC</div>
              <div className="text-sm text-muted-foreground">Performance Readiness</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Optimize Your Training?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join elite athletes using UpHill Ai to maximize their performance potential
          </p>
          <Button 
            size="lg"
            onClick={() => setShowAuthModal(true)}
            className="primary-gradient shadow-[var(--shadow-primary)] text-lg px-8"
          >
            Start Your Journey
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">
            © 2024 UpHill Ai. Elite training analytics for serious athletes.
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
};