'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * GlassButton — pill button in accent or glass variant.
 *
 * A real <button> (keyboard + a11y come free). `variant="accent"` is the
 * primary fill; `variant="glass"` is the frosted secondary. Hover lift, active
 * reset, and a focus-visible accent ring are handled in CSS. Meets the 44px
 * minimum touch target at both sizes.
 */
type GlassButtonProps = {
  children: ReactNode;
  variant?: 'accent' | 'glass';
  size?: 'md' | 'sm';
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function GlassButton({
  children,
  variant = 'accent',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: GlassButtonProps) {
  const classes = [
    'glass-btn',
    variant === 'accent' ? 'glass-btn--accent' : 'glass-btn--glass',
    size === 'sm' ? 'glass-btn--sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    // eslint-disable-next-line react/button-has-type
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
