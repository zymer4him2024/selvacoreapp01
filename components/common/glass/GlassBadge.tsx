'use client';

import type { HTMLAttributes, ReactNode } from 'react';

/**
 * GlassBadge — molded accent squircle for step numbers, counts, and status icons.
 *
 * `size` sets the box in px; the glyph scales to 44% of it (matching the
 * reference recipe). Defaults to a compact 44px suitable for inline app use.
 */
type GlassBadgeProps = {
  children: ReactNode;
  /** Box size in px. */
  size?: number;
} & HTMLAttributes<HTMLDivElement>;

export default function GlassBadge({
  children,
  size = 44,
  className = '',
  style,
  ...rest
}: GlassBadgeProps) {
  const classes = ['glass-badge', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
