'use client';

import type { HTMLAttributes, ReactNode } from 'react';

/**
 * GlassChip — pill tag for statuses, labels, and filters.
 *
 * Optional leading accent dot. For semantic statuses (e.g. maintenance
 * escalation), override the dot color via the `dotColor` prop rather than
 * forcing everything to the accent green.
 */
type GlassChipProps = {
  children: ReactNode;
  /** Show the leading dot. */
  dot?: boolean;
  /** Override the dot color for semantic statuses (CSS color value). */
  dotColor?: string;
} & HTMLAttributes<HTMLSpanElement>;

export default function GlassChip({
  children,
  dot = true,
  dotColor,
  className = '',
  ...rest
}: GlassChipProps) {
  const classes = ['glass-chip', className].filter(Boolean).join(' ');

  return (
    <span className={classes} {...rest}>
      {dot && (
        <span
          className="glass-chip__dot"
          style={dotColor ? { background: dotColor } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
