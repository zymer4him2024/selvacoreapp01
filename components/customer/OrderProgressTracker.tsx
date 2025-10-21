'use client';

import { Check } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface OrderProgressTrackerProps {
  currentStep: number; // 1-4
}

export default function OrderProgressTracker({ currentStep }: OrderProgressTrackerProps) {
  const { t } = useTranslation();

  const steps = [
    { number: 1, label: t.customer?.orderSteps?.product || 'Product' },
    { number: 2, label: t.customer?.orderSteps?.details || 'Details' },
    { number: 3, label: t.customer?.orderSteps?.photos || 'Photos' },
    { number: 4, label: t.customer?.orderSteps?.payment || 'Payment' },
  ];

  return (
    <div className="w-full py-6">
      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-center gap-2">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                  ${
                    step.number < currentStep
                      ? 'bg-success text-white'
                      : step.number === currentStep
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-surface border-2 border-border text-text-tertiary'
                  }
                `}
              >
                {step.number < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${
                    step.number <= currentStep
                      ? 'text-text-primary'
                      : 'text-text-tertiary'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-16 h-1 mx-2 transition-all
                  ${
                    step.number < currentStep
                      ? 'bg-success'
                      : 'bg-border'
                  }
                `}
              ></div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-sm font-medium text-primary">
            {steps[currentStep - 1]?.label}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between mt-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`
                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                ${
                  step.number < currentStep
                    ? 'bg-success text-white'
                    : step.number === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-text-tertiary'
                }
              `}
            >
              {step.number < currentStep ? <Check className="w-3 h-3" /> : step.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

