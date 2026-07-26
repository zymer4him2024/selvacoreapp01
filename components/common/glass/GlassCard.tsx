'use client';

import type { ElementType, ReactNode, HTMLAttributes } from 'react';

/**
 * GlassCard — the workhorse frosted surface.
 *
 * Frosted translucent card with a specular sheen band. Pass `tint` for an
 * accent-filled primary/CTA surface, `interactive` for a hover lift (use only
 * on clickable cards), and `radius` to scale the corner rounding. Renders a
 * <div> by default; pass `as` to render another element/component.
 */
type GlassCardProps = {
  children: ReactNode;
  /** Accent-tinted glass for primary / CTA surfaces. */
  tint?: boolean;
  /** Hover-lift for interactive cards. Static cards should omit this. */
  interactive?: boolean;
  /** Corner rounding. Defaults to the standard 28px card radius. */
  radius?: 'glass' | 'glass-lg' | 'glass-sm';
  as?: ElementType;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'color'>;

const RADIUS_CLASS: Record<NonNullable<GlassCardProps['radius']>, string> = {
  glass: 'rounded-glass',
  'glass-lg': 'rounded-glass-lg',
  'glass-sm': 'rounded-glass-sm',
};

export default function GlassCard({
  children,
  tint = false,
  interactive = false,
  radius = 'glass',
  as: Tag = 'div',
  className = '',
  ...rest
}: GlassCardProps) {
  const classes = [
    'glass-card',
    RADIUS_CLASS[radius],
    tint ? 'glass-card--tint' : '',
    interactive ? 'glass-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      <span className="glass-sheen" aria-hidden="true" />
      <div className="glass-content">{children}</div>
    </Tag>
  );
}
