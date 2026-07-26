'use client';

/**
 * CrystalBg — fixed page background with three blurred color orbs.
 *
 * Gives the frosted glass surfaces real color to refract. Mount once, high in
 * the tree (app shell / layout). Renders behind content (z-index -1) and is
 * pointer-transparent, so it never intercepts clicks. Colors come from the
 * --bg-* / --orb-* tokens, so it re-tints automatically with the active theme.
 */
type CrystalBgProps = {
  /** Larger orbs for hero / marketing surfaces. */
  strong?: boolean;
  /** Hide orbs, keep the gradient (e.g. dense data screens). */
  showOrbs?: boolean;
  className?: string;
};

export default function CrystalBg({
  strong = false,
  showOrbs = true,
  className = '',
}: CrystalBgProps) {
  const classes = ['crystal-bg', strong ? 'crystal-bg--strong' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} aria-hidden="true">
      {showOrbs && (
        <>
          <div className="crystal-orb crystal-orb--1" />
          <div className="crystal-orb crystal-orb--2" />
          <div className="crystal-orb crystal-orb--3" />
        </>
      )}
    </div>
  );
}
