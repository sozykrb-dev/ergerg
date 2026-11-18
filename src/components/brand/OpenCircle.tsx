import React from 'react';

/**
 * THE OPEN CIRCLE
 * The brush circle inside the O is open at the lower right — the stroke trails
 * off and never closes. That gap is the brand signature and it is reused as the
 * loader, the free-shipping ring, the spinners, the back-to-top button and the
 * cursor.
 *
 * The path is drawn in a 100x100 box and deliberately stops short of closing,
 * leaving the opening in the lower-right quadrant. `gap` fine-tunes how much of
 * the circle is left open.
 */

export const OPEN_CIRCLE_PATH =
  'M 78.6 84.4 A 42 42 0 1 1 78.6 15.6';

interface OpenCircleParams {
  /** circumference length used for dash animations (defaults to 42-radius circle) */
  length?: number;
  /** portion of the circle that is drawn, 0-1 */
  drawn?: number;
}

/** Returns props for a dashed stroke that fills toward the gap. */
export const ringDash = (radius: number, progress: number, gapFraction = 0.16) => {
  const circumference = 2 * Math.PI * radius;
  const usable = circumference * (1 - gapFraction);
  const filled = usable * Math.max(0, Math.min(1, progress));
  return {
    circumference,
    dashArray: `${usable} ${circumference}`,
    dashOffset: usable - filled,
    rotate: -90 + (gapFraction * 360) / 2,
  };
};

export const OpenCircle: React.FC<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
  spin?: boolean;
}> = ({ size = 24, strokeWidth = 7, className = '', title, spin = false }) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={`${className} ${spin ? 'mf-spin' : ''}`}
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : 'presentation'}
    fill="none"
  >
    {title ? <title>{title}</title> : null}
    <path
      d={OPEN_CIRCLE_PATH}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** Page loader: the circle draws itself in about 600ms. */
export const PageLoader: React.FC<{ label?: string}> = ({ label }) => (
  <div className="fixed inset-0 z-[95] grid place-items-center bg-cream" role="status" aria-live="polite">
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 100 100" width="86" height="86" className="mf-loader-ring" fill="none" aria-hidden="true">
        <path
          d="M 78.6 84.4 A 42 42 0 1 1 78.6 15.6"
          stroke="#711518"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      <p className="mf-slogan text-[11px] text-maroon">{label || 'Style Without Limits'}</p>
    </div>
  </div>
);

/** Free-shipping progress ring that fills toward the gap and lights up in cream. */
export const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  complete?: boolean;
  label?: React.ReactNode;
}> = ({ progress, size = 56, complete = false, label }) => {
  const radius = 42;
  const { dashArray, dashOffset, rotate } = ringDash(radius, complete ? 1 : progress);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="mf-ring-track"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * radius * 0.84} ${2 * Math.PI * radius}`}
          transform={`rotate(${rotate} 50 50)`}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="mf-ring-fill"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dashArray}
          strokeDashoffset={dashOffset}
          transform={`rotate(${rotate} 50 50)`}
          data-complete={complete}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-medium leading-none">
        {label ?? `${Math.round((complete ? 1 : progress) * 100)}%`}
      </span>
    </div>
  );
};
