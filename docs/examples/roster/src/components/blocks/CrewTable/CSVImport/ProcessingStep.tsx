"use client";

import React from "react";
import { LoadingIndicator } from "@/components/ui/LoadingIndicator";
import { CheckCircle } from "lucide-react";

interface ProcessingStepProps {
  isProcessing: boolean;
  isSuccess: boolean;
  successMessage?: string;
  onClose?: () => void;
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({
  isProcessing,
  isSuccess,
  successMessage = "Import Successful!",
  onClose,
}) => {
  React.useEffect(() => {
    if (isSuccess && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000); // Auto-close after 2 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <LoadingIndicator size="medium" accent />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">Processing Import</h3>
          <p className="text-sm text-neutral-400 max-w-md">
            Please wait while we process your CSV file. This may take a moment depending on the size of your data.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-white">{successMessage}</h3>
          <p className="text-sm text-neutral-400">
            Your crew data has been successfully imported. The modal will close automatically.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return null;
}; 