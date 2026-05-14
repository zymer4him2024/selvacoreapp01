'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2, QrCode } from 'lucide-react';
import { MaintenanceScheduleInput } from '@/types/device';
import { DeviceRegistrationInput } from '@/types/device';
import { useTranslation } from '@/hooks/useTranslation';

interface MaintenanceScheduleFormProps {
  qrCodeData: string;
  orderId: string;
  onSubmit: (input: DeviceRegistrationInput) => void;
  onBack: () => void;
  submitting: boolean;
}

const INTERVAL_OPTIONS = [
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '12 months', days: 365 },
];

function getDefaultDueDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

export default function MaintenanceScheduleForm({
  qrCodeData,
  orderId,
  onSubmit,
  onBack,
  submitting,
}: MaintenanceScheduleFormProps) {
  const { t } = useTranslation();
  const [ezerInterval, setEzerInterval] = useState(180);
  const [ezerDueDate, setEzerDueDate] = useState(getDefaultDueDate(180));

  const [filters, setFilters] = useState<Array<{
    name: string;
    intervalDays: number;
    dueDate: string;
  }>>([
    { name: 'Sediment Filter', intervalDays: 180, dueDate: getDefaultDueDate(180) },
  ]);

  const addFilter = () => {
    if (filters.length >= 2) return;
    setFilters([...filters, {
      name: 'Carbon Filter',
      intervalDays: 365,
      dueDate: getDefaultDueDate(365),
    }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: string, value: string | number) => {
    setFilters(filters.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const handleSubmit = () => {
    const schedules: MaintenanceScheduleInput[] = [
      {
        type: 'ezer_maintenance',
        intervalDays: ezerInterval,
        firstDueDate: new Date(ezerDueDate),
      },
      ...filters.map((f) => ({
        type: 'filter_replacement' as const,
        filterName: f.name,
        intervalDays: f.intervalDays,
        firstDueDate: new Date(f.dueDate),
      })),
    ];

    onSubmit({ qrCodeData, schedules });
  };

  const isValid = ezerDueDate && filters.every((f) => f.name.trim() && f.dueDate);

  const intervalBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--line)',
    background: active ? 'var(--brand)' : 'var(--paper)',
    color: active ? '#fff' : 'var(--soft)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  return (
    <div className="sc" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="sc-h2" style={{ margin: 0 }}>{t.components.maintenanceForm.title}</h2>
          <p className="sc-helper" style={{ margin: 0 }}>{t.components.maintenanceForm.subtitle}</p>
        </div>
      </div>

      <div className="sc-card-static" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--brand-tint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <QrCode className="w-5 h-5" style={{ color: 'var(--brand)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="sc-helper" style={{ margin: 0 }}>{t.components.maintenanceForm.qrCodeScanned}</p>
          <p style={{ fontFamily: 'monospace', fontSize: 14, margin: 0, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {qrCodeData}
          </p>
        </div>
        <Check className="w-5 h-5" style={{ color: 'var(--brand)', flexShrink: 0 }} />
      </div>

      <div className="sc-card-static">
        <h3 className="sc-h2" style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>
          {t.components.maintenanceForm.ezerMaintenance}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="sc-label">{t.components.maintenanceForm.maintenanceInterval}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    setEzerInterval(opt.days);
                    setEzerDueDate(getDefaultDueDate(opt.days));
                  }}
                  style={intervalBtn(ezerInterval === opt.days)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="sc-label">{t.components.maintenanceForm.firstDueDate}</label>
            <input
              type="date"
              value={ezerDueDate}
              onChange={(e) => setEzerDueDate(e.target.value)}
              className="sc-input"
            />
          </div>
        </div>
      </div>

      <div className="sc-card-static">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="sc-h2" style={{ margin: 0, fontSize: 18 }}>{t.components.maintenanceForm.filterReplacements}</h3>
          {filters.length < 2 && (
            <button
              type="button"
              onClick={addFilter}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--brand)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Plus className="w-4 h-4" />
              Add Filter
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {filters.map((filter, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: 16,
                background: 'var(--off-paper)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--soft)' }}>
                  Filter {index + 1}
                </span>
                {filters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    aria-label={t.components.maintenanceForm.removeFilter}
                    style={{
                      padding: 4,
                      color: 'var(--soft)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="sc-label">{t.components.maintenanceForm.filterName}</label>
                <input
                  type="text"
                  value={filter.name}
                  onChange={(e) => updateFilter(index, 'name', e.target.value)}
                  placeholder={t.components.maintenanceForm.filterPlaceholder}
                  className="sc-input"
                />
              </div>

              <div>
                <label className="sc-label">{t.components.maintenanceForm.replacementInterval}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        updateFilter(index, 'intervalDays', opt.days);
                        updateFilter(index, 'dueDate', getDefaultDueDate(opt.days));
                      }}
                      style={intervalBtn(filter.intervalDays === opt.days)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="sc-label">{t.components.maintenanceForm.firstDueDate}</label>
                <input
                  type="date"
                  value={filter.dueDate}
                  onChange={(e) => updateFilter(index, 'dueDate', e.target.value)}
                  className="sc-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="sc-cta"
        style={{
          width: '100%',
          padding: '16px 24px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          opacity: !isValid || submitting ? 0.5 : 1,
          cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
        }}
      >
        {submitting ? (
          <>
            <span className="sc-spinner" />
            Registering Device...
          </>
        ) : (
          'Register Device'
        )}
      </button>
    </div>
  );
}
