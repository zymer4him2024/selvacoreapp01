'use client';

import { TimeSlot } from '@/types/user';

interface TimeSlotPickerProps {
  selectedSlot: TimeSlot | '';
  onSelect: (slot: TimeSlot) => void;
  slotCounts: Record<string, number>;
  label: string;
  jobsLabel: string;
}

const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: '9-12', label: '9:00 - 12:00' },
  { value: '13-15', label: '13:00 - 15:00' },
  { value: '15-18', label: '15:00 - 18:00' },
  { value: '18-21', label: '18:00 - 21:00' },
];

export default function TimeSlotPicker({ selectedSlot, onSelect, slotCounts, label, jobsLabel }: TimeSlotPickerProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {TIME_SLOTS.map((slot) => {
        const count = slotCounts[slot.value] || 0;
        const isWarning = count >= 2;
        return (
          <label
            key={slot.value}
            className={`flex items-center justify-between p-3 rounded-apple border cursor-pointer transition-all ${
              selectedSlot === slot.value ? 'border-primary bg-primary/5' : 'border-border hover:border-text-tertiary'
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="radio" name="slot" value={slot.value} checked={selectedSlot === slot.value}
                onChange={() => onSelect(slot.value)} className="sr-only" />
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedSlot === slot.value ? 'border-primary' : 'border-text-tertiary'
              }`}>
                {selectedSlot === slot.value && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <span className="text-sm font-medium">{slot.label}</span>
            </div>
            <span className={`text-xs ${isWarning ? 'text-warning font-semibold' : 'text-text-tertiary'}`}>
              {count} {jobsLabel}
            </span>
          </label>
        );
      })}
    </div>
  );
}
