import React from 'react';
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PMCTooltipProps {
  type: 'ltl' | 'stl' | 'fi';
}

const tooltipContent = {
  ltl: {
    title: "Long-Term Load (LTL)",
    description: "Your fitness level built over 42 days using an exponentially weighted moving average. Higher values indicate better fitness and training adaptation.",
    formula: "Also known as CTL (Chronic Training Load)"
  },
  stl: {
    title: "Short-Term Load (STL)",
    description: "Your fatigue level from recent training over 7 days using an exponentially weighted moving average. Represents the immediate stress on your body from training.",
    formula: "Also known as ATL (Acute Training Load)"
  },
  fi: {
    title: "Form Index (FI)",
    description: "Your readiness to perform, calculated as LTL minus STL. Positive values mean you're fresh and ready to race. Negative values indicate fatigue from training.",
    formula: "Also known as TSB (Training Stress Balance)"
  }
};

export const PMCTooltip: React.FC<PMCTooltipProps> = ({ type }) => {
  const content = tooltipContent[type];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{content.title}</p>
            <p className="text-sm">{content.description}</p>
            <p className="text-xs text-muted-foreground italic">{content.formula}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
