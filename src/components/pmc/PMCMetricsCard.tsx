import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PMCTooltip } from "./PMCTooltip";

interface PMCMetricsCardProps {
  ltl: number;
  stl: number;
  fi: number;
  previousLtl?: number;
  previousStl?: number;
  previousFi?: number;
  showTrends?: boolean;
  className?: string;
}

export const PMCMetricsCard: React.FC<PMCMetricsCardProps> = ({
  ltl,
  stl,
  fi,
  previousLtl,
  previousStl,
  previousFi,
  showTrends = false,
  className = ""
}) => {
  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous || !showTrends) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return diff > 0 
      ? <TrendingUp className="h-3 w-3 text-green-500" />
      : <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      <Card className="border-[hsl(var(--ltl-blue))] border-l-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-[hsl(var(--ltl-blue))]" />
            LTL (Fitness)
            <PMCTooltip type="ltl" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-[hsl(var(--ltl-blue))]">
              {ltl.toFixed(0)}
            </div>
            {getTrendIcon(ltl, previousLtl)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">42-day average</p>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--stl-pink))] border-l-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-[hsl(var(--stl-pink))]" />
            STL (Fatigue)
            <PMCTooltip type="stl" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-[hsl(var(--stl-pink))]">
              {stl.toFixed(0)}
            </div>
            {getTrendIcon(stl, previousStl)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">7-day average</p>
        </CardContent>
      </Card>

      <Card className="border-[hsl(var(--fi-yellow))] border-l-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-[hsl(var(--fi-yellow))]" />
            FI (Form)
            <PMCTooltip type="fi" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-[hsl(var(--fi-yellow))]">
              {fi > 0 ? '+' : ''}{fi.toFixed(0)}
            </div>
            {getTrendIcon(fi, previousFi)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">LTL - STL</p>
        </CardContent>
      </Card>
    </div>
  );
};
