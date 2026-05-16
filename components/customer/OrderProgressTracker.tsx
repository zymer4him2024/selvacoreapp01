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

  const circleStyle = (step: number): React.CSSProperties => {
    if (step < currentStep) {
      return { background: 'var(--brand)', color: '#fff', border: 'none' };
    }
    if (step === currentStep) {
      return { background: 'var(--brand)', color: '#fff', border: 'none', boxShadow: '0 0 0 4px var(--brand-tint)' };
    }
    return { background: 'var(--paper)', color: 'var(--soft)', border: '2px solid var(--hairline)' };
  };

  return (
    <div style={{ width: '100%', padding: '24px 0' }}>
      <div className="hidden md:flex" style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {steps.map((step, index) => (
          <div key={step.number} className="sc-row" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  ...circleStyle(step.number),
                }}
              >
                {step.number < currentStep ? <Check className="w-5 h-5" /> : step.number}
              </div>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  color: step.number <= currentStep ? 'var(--ink)' : 'var(--soft)',
                }}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                style={{
                  width: 64,
                  height: 4,
                  margin: '0 8px',
                  background: step.number < currentStep ? 'var(--brand)' : 'var(--hairline)',
                  transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden">
        <div className="sc-row-between" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--soft)' }}>
            Step {currentStep} of {steps.length}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand)' }}>
            {steps[currentStep - 1]?.label}
          </span>
        </div>

        <div style={{ width: '100%', height: 8, background: 'var(--off-paper)', borderRadius: 9999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--brand)',
              width: `${(currentStep / steps.length) * 100}%`,
              transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <div className="sc-row-between" style={{ marginTop: 8 }}>
          {steps.map((step) => (
            <div
              key={step.number}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                ...circleStyle(step.number),
                boxShadow: 'none',
              }}
            >
              {step.number < currentStep ? <Check className="w-3 h-3" /> : step.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
