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

  const sectionIconWrap = (bg: string): React.CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: bg,
    flexShrink: 0,
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--brand)',
          background: 'var(--brand-tint)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <HelpCircle className="w-4 h-4" />
        View Tips
      </button>

      {isOpen && (
        <div
          className="sc"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            minHeight: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="sc-card-static" style={{ padding: 0 }}>
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  background: 'var(--paper)',
                  borderBottom: '1px solid var(--hairline)',
                  padding: 24,
                  zIndex: 1,
                }}
              >
                <div className="sc-row-between" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h2 className="sc-h2" style={{ marginBottom: 4 }}>{guide.title}</h2>
                    <p className="sc-helper">{guide.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="sc-cta-ghost"
                    style={{
                      padding: 8,
                      width: 40,
                      height: 40,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="sc-stack-lg" style={{ padding: 24, gap: 24 }}>
                <div>
                  <div className="sc-row" style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={sectionIconWrap('var(--brand-tint)')}>
                      <Check className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>Do&apos;s</h3>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guide.dos.map((item, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                        <Check className="w-4 h-4" style={{ color: 'var(--brand)', flexShrink: 0, marginTop: 2 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="sc-row" style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={sectionIconWrap('rgba(239,68,68,0.1)')}>
                      <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                      {t.components?.photoGuide?.donts || "Don'ts"}
                    </h3>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guide.donts.map((item, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                        <XCircle className="w-4 h-4" style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="sc-row" style={{ alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={sectionIconWrap('var(--warn-tint)')}>
                      <Lightbulb className="w-5 h-5" style={{ color: 'var(--warn)' }} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
                      {t.components?.photoGuide?.proTips || 'Pro Tips'}
                    </h3>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {guide.tips.map((item, index) => (
                      <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                        <Lightbulb className="w-4 h-4" style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 2 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sc-cta"
                  style={{ width: '100%', padding: '14px 24px' }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
