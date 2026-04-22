'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Order } from '@/types';
import { TimeSlot } from '@/types/user';
import TimeSlotPicker from './TimeSlotPicker';

interface AssignModalProps {
  order: Order;
  technicianName: string;
  date: Date;
  existingSlotCounts: Record<string, number>;
  defaultDuration: number;
  isReassign: boolean;
  labels: {
    assignOrder: string;
    reassignOrder: string;
    selectTimeSlot: string;
    estimatedDuration: string;
    jobsScheduled: string;
    confirm: string;
    cancel: string;
    orderNumber: string;
  };
  onConfirm: (timeSlot: TimeSlot, durationMinutes: number) => Promise<void>;
  onClose: () => void;
}

export default function AssignModal({
  order, technicianName, date, existingSlotCounts, defaultDuration,
  isReassign, labels, onConfirm, onClose,
}: AssignModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | ''>('');
  const [duration, setDuration] = useState(defaultDuration);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setProcessing(true);
    try {
      await onConfirm(selectedSlot as TimeSlot, duration);
    } finally {
      setProcessing(false);
    }
  };

  const dateStr = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-apple-lg animate-scale-in overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{isReassign ? labels.reassignOrder : labels.assignOrder}</h2>
              <p className="text-sm text-text-secondary mt-1">
                {labels.orderNumber} #{order.orderNumber} &rarr; {technicianName}
              </p>
              <p className="text-sm text-text-tertiary">{dateStr}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-elevated rounded-apple transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <TimeSlotPicker
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
            slotCounts={existingSlotCounts}
            label={labels.selectTimeSlot}
            jobsLabel={labels.jobsScheduled}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">{labels.estimatedDuration}</label>
            <input type="number" value={duration} onChange={(e) => setDuration(Math.max(15, parseInt(e.target.value) || 60))}
              min={15} step={15}
              className="w-full px-4 py-2 border border-border rounded-apple focus:border-primary focus:outline-none text-sm" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={processing}
              className="flex-1 px-4 py-3 bg-surface-elevated hover:bg-border text-text-primary font-medium rounded-apple transition-all">
              {labels.cancel}
            </button>
            <button onClick={handleConfirm} disabled={!selectedSlot || processing}
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-apple transition-all">
              {processing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : labels.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
