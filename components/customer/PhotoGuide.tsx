'use client';

import { useState } from 'react';
import { HelpCircle, X, Check, XCircle, Lightbulb } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PhotoGuideProps {
  type: 'waterSource' | 'productLocation' | 'waterRunning' | 'fullShot';
}

export default function PhotoGuide({ type }: PhotoGuideProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const guides = {
    waterSource: {
      title: 'Water Source Photo Guide',
      description: 'Take a clear photo of your main water supply connection',
      dos: [
        'Include the entire pipe and connection point',
        'Make sure the area is well-lit',
        'Show any valves or shut-off points',
        'Capture from a clear angle',
      ],
      donts: [
        'Don\'t take photos in dark areas',
        'Avoid blurry or out-of-focus shots',
        'Don\'t cover important details',
        'Avoid extreme angles',
      ],
      tips: [
        'Use your phone\'s flash if needed',
        'Stand about 3-4 feet away',
        'Show the wall and surrounding area',
        'Include any visible pipes or fittings',
      ],
    },
    productLocation: {
      title: 'Installation Location Photo Guide',
      description: 'Show where the product will be installed',
      dos: [
        'Show the full installation area',
        'Include nearby walls and surfaces',
        'Capture any existing equipment',
        'Show available space clearly',
      ],
      donts: [
        'Don\'t take extreme close-ups',
        'Avoid cluttered backgrounds',
        'Don\'t hide important areas',
        'Avoid poor lighting',
      ],
      tips: [
        'Stand back to show the whole area',
        'Include floor and ceiling if relevant',
        'Show electrical outlets nearby',
        'Capture any obstacles or limitations',
      ],
    },
    waterRunning: {
      title: 'Water Running Video Guide',
      description: 'Record a short video of your current water flow',
      dos: [
        'Record for at least 10 seconds',
        'Show water flowing clearly',
        'Keep camera steady',
        'Include the faucet or outlet',
      ],
      donts: [
        'Don\'t move camera too fast',
        'Avoid shaky footage',
        'Don\'t record in poor lighting',
        'Avoid background noise',
      ],
      tips: [
        'Hold phone horizontally (landscape)',
        'Turn on a faucet fully',
        'Keep recording for 15-20 seconds',
        'Show water pressure and flow rate',
      ],
    },
    fullShot: {
      title: 'Full Shot Photo Guide',
      description: 'Take a wide photo showing both water source and installation area',
      dos: [
        'Include both water source and installation area in one shot',
        'Show the relationship between the two areas',
        'Capture the overall space layout',
        'Ensure both areas are clearly visible',
      ],
      donts: [
        'Don\'t focus on just one area',
        'Avoid extreme close-ups',
        'Don\'t cut off important parts',
        'Avoid poor lighting that hides details',
      ],
      tips: [
        'Stand back to capture the full scene',
        'Position yourself to show both areas clearly',
        'Use good lighting to illuminate both areas',
        'Show the distance and connection between areas',
      ],
    },
  };

  const guide = guides[type];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 rounded-apple transition-all"
      >
        <HelpCircle className="w-4 h-4" />
        View Tips
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-surface rounded-apple border border-border shadow-apple max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-surface border-b border-border p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{guide.title}</h2>
                  <p className="text-text-secondary text-sm">{guide.description}</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-surface-elevated rounded-apple transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Do's */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-success/10 rounded-apple">
                    <Check className="w-5 h-5 text-success" />
                  </div>
                  <h3 className="font-semibold text-lg">Do's</h3>
                </div>
                <ul className="space-y-2">
                  {guide.dos.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Don'ts */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-error/10 rounded-apple">
                    <XCircle className="w-5 h-5 text-error" />
                  </div>
                  <h3 className="font-semibold text-lg">Don'ts</h3>
                </div>
                <ul className="space-y-2">
                  {guide.donts.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-warning/10 rounded-apple">
                    <Lightbulb className="w-5 h-5 text-warning" />
                  </div>
                  <h3 className="font-semibold text-lg">Pro Tips</h3>
                </div>
                <ul className="space-y-2">
                  {guide.tips.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-apple transition-all"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

