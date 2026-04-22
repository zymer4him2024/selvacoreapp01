'use client';

import { useState } from 'react';
import { ArrowLeft, Check, Plus, Trash2, QrCode } from 'lucide-react';
import { MaintenanceScheduleInput } from '@/types/device';
import { DeviceRegistrationInput } from '@/types/device';

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-apple hover:bg-surface-elevated transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Maintenance Schedule</h2>
          <p className="text-sm text-text-secondary">Set up maintenance for this device</p>
        </div>
      </div>

      {/* QR Code confirmation */}
      <div className="apple-card flex items-center gap-3">
        <div className="w-10 h-10 rounded-apple bg-success/20 flex items-center justify-center flex-shrink-0">
          <QrCode className="w-5 h-5 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary">QR Code Scanned</p>
          <p className="font-mono text-sm truncate">{qrCodeData}</p>
        </div>
        <Check className="w-5 h-5 text-success flex-shrink-0" />
      </div>

      {/* Ezer Maintenance */}
      <div className="apple-card">
        <h3 className="font-semibold mb-4">Ezer Maintenance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-2">Maintenance Interval</label>
            <div className="grid grid-cols-3 gap-2">
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => {
                    setEzerInterval(opt.days);
                    setEzerDueDate(getDefaultDueDate(opt.days));
                  }}
                  className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                    ezerInterval === opt.days
                      ? 'bg-primary text-white'
                      : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-2">First Due Date</label>
            <input
              type="date"
              value={ezerDueDate}
              onChange={(e) => setEzerDueDate(e.target.value)}
              className="w-full px-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filter Replacements */}
      <div className="apple-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Filter Replacements</h3>
          {filters.length < 2 && (
            <button
              type="button"
              onClick={addFilter}
              className="flex items-center gap-1 text-sm text-primary font-medium hover:text-primary/80 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Filter
            </button>
          )}
        </div>

        <div className="space-y-6">
          {filters.map((filter, index) => (
            <div key={index} className="space-y-4 p-4 bg-surface-elevated rounded-apple">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">
                  Filter {index + 1}
                </span>
                {filters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    className="p-1 text-text-tertiary hover:text-error transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Filter Name</label>
                <input
                  type="text"
                  value={filter.name}
                  onChange={(e) => updateFilter(index, 'name', e.target.value)}
                  placeholder="e.g. Sediment Filter"
                  className="w-full px-4 py-3 bg-background border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Replacement Interval</label>
                <div className="grid grid-cols-3 gap-2">
                  {INTERVAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => {
                        updateFilter(index, 'intervalDays', opt.days);
                        updateFilter(index, 'dueDate', getDefaultDueDate(opt.days));
                      }}
                      className={`px-3 py-2 rounded-apple text-sm font-medium transition-all ${
                        filter.intervalDays === opt.days
                          ? 'bg-primary text-white'
                          : 'bg-background text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">First Due Date</label>
                <input
                  type="date"
                  value={filter.dueDate}
                  onChange={(e) => updateFilter(index, 'dueDate', e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-apple focus:border-primary focus:outline-none transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full px-6 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-apple transition-all hover:scale-[1.02]"
      >
        {submitting ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Registering Device...
          </div>
        ) : (
          'Register Device'
        )}
      </button>
    </div>
  );
}
