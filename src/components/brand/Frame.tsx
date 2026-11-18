import React, { useEffect, useRef, useState } from 'react';

/**
 * THE FRAME — "the limit"
 * A 2px line in maroon (on cream) or cream (on maroon or brown) around the hero
 * and every product card. The frame has a gap at the bottom-right corner,
 * matching the logo's open brush circle.
 *
 * The gap stays bottom-right in Arabic (RTL) too, because the logo never
 * mirrors — so the four sides are positioned with physical offsets on purpose.
 */

interface FrameProps {
  children: React.ReactNode;
  tone?: 'light' | 'dark';
  className?: string;
  /** size of the corner opening, in px */
  gap?: number;
  /** inset of the line inside the box, in px */
  inset?: number;
}

/**
 * The subject of the photo also crosses the line on scroll: once the frame is in
 * view the `.is-breaking` class lets the cut-out travel 8px past the edge, and
 * hover pushes it on to 16px (CSS transforms only). Reduced motion keeps it still.
 */
export const Frame: React.FC<FrameProps> = ({
  children,
  tone = 'light',
  className = '',
  gap = 30,
  inset = 0,
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [breaking, setBreaking] = useState(false);

  useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still || typeof IntersectionObserver === 'undefined') {
      setBreaking(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setBreaking(true);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const line = tone === 'dark' ? 'var(--molfet-cream)' : 'var(--molfet-maroon)';
  const side: React.CSSProperties = { position: 'absolute', background: line, pointerEvents: 'none', zIndex: 3 };

  return (
    <div
      ref={boxRef}
      className={`mf-frame relative ${breaking ? 'is-breaking' : ''} ${className}`}
      data-tone={tone === 'dark' ? 'dark' : 'light'}
    >
      <span aria-hidden="true" style={{ ...side, left: inset, right: inset, top: inset, height: 2 }} />
      <span aria-hidden="true" style={{ ...side, left: inset, top: inset, bottom: inset, width: 2 }} />
      {/* the right side stops short of the corner: the circle never closes */}
      <span aria-hidden="true" style={{ ...side, right: inset, top: inset, bottom: inset + gap, width: 2 }} />
      {/* the bottom side stops short of the corner too */}
      <span aria-hidden="true" style={{ ...side, bottom: inset, left: inset, right: inset + gap, height: 2 }} />
      {children}
    </div>
  );
};

export default Frame;
