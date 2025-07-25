"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  currentStep: number;
  totalSteps?: number;
}

export const StepProgress: React.FC<StepProgressProps> = ({ 
  currentStep, 
  totalSteps = 3 
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <React.Fragment key={stepNumber}>
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-lg font-bold transition-all duration-200",
                isActive
                  ? "bg-[#e6ff5a] text-black shadow-md"
                  : "bg-[#3a4222] text-[#e6ff5a]"
              )}
            >
              {stepNumber}
            </div>
            
            {/* Connector line */}
            {stepNumber < totalSteps && (
              <div
                className={cn(
                  "h-px w-12 transition-all duration-200",
                  {
                    "bg-accent": isCompleted,
                    "bg-white/20": !isCompleted,
                  }
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}; 