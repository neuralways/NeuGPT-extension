import { useState, useEffect } from 'react';
import { CheckCircle2, Loader, AlertCircle } from 'lucide-react';

export default function ProgressTracker({ steps, currentStep }) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={step.id} className="flex items-start gap-4">
            {/* Step indicator */}
            <div className="flex-shrink-0 mt-1">
              {isCompleted ? (
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
              ) : isCurrent ? (
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center animate-spin">
                  <Loader className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-slate-500 font-medium text-sm">
                    {index + 1}
                  </span>
                </div>
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 pt-1">
              <h3
                className={`font-semibold transition-colors ${
                  isCompleted || isCurrent
                    ? 'text-slate-900'
                    : 'text-slate-400'
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-slate-500 mt-1">{step.description}</p>

              {/* Progress bar for current step */}
              {isCurrent && step.progress !== undefined && (
                <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary-400 to-primary-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Error indicator */}
            {step.error && (
              <div className="flex-shrink-0 mt-1">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}