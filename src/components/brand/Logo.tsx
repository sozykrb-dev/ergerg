import React from 'react';
import { useLocale } from '../../lib/i18n';

/**
 * The four official lockups, used exactly as supplied.
 * Never redraw, stretch, recolour, outline or add shadows.
 * Clear space on every side equals the width of the O ring.
 *
 * 1. maroon wordmark with slogan on cream   -> public/brand/molfet-wordmark.png
 * 2. cream wordmark with slogan on brown    -> public/brand/molfet-wordmark-cream.png
 * 3. cream brush-circle icon on maroon      -> /img/brand/icon-mark-cream.webp
 * 4. maroon brush-circle icon on cream      -> /img/brand/icon-mark.webp
 */

type Lockup = 'wordmarkOnCream' | 'wordmarkOnBrown' | 'iconOnMaroon' | 'iconOnCream';

interface LogoProps {
  lockup?: Lockup;
  className?: string;
  height?: number;
  withSlogan?: boolean;
  alt?: string;
}

const SRC: Record<Lockup, string> = {
  wordmarkOnCream: '/brand/molfet-wordmark.png',
  wordmarkOnBrown: '/brand/molfet-wordmark-cream.png',
  iconOnMaroon: '/img/brand/icon-mark-cream.webp',
  iconOnCream: '/img/brand/icon-mark.webp',
};

export const Logo: React.FC<LogoProps> = ({
  lockup = 'wordmarkOnCream',
  className = '',
  height = 34,
  alt = 'MOLFET',
}) => (
  <img
    src={SRC[lockup]}
    alt={alt}
    height={height}
    style={{ height, width: 'auto' }}
    className={`block select-none ${className}`}
    draggable={false}
  />
);

/** The brush circle used as an inline icon (favicon, spinners, markers). */
export const CircleMark: React.FC<{ className?: string; title?: string }> = ({ className = '', title }) => (
  <img
    src="/img/brand/icon-mark.webp"
    alt={title || ''}
    aria-hidden={title ? undefined : true}
    className={`block select-none ${className}`}
    draggable={false}
  />
);

/** Slogan, set in light weight with wide letter spacing, exactly as in the lockup. */
export const Slogan: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t, isAr } = useLocale();
  return (
    <span className={`mf-slogan ${className}`} aria-label="Style Without Limits">
      {isAr ? t('Style Without Limits', 'أسلوب بلا حدود') : 'Style Without Limits'}
    </span>
  );
};

/** "Designed with an Italian mindset. Crafted in Egypt." */
export const MadeBadge: React.FC<{ className?: string; tone?: 'light' | 'dark' }> = ({
  className = '',
  tone = 'light',
}) => {
  const { t } = useLocale();
  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[9.5px] font-medium uppercase leading-tight tracking-[0.2em] ${
        tone === 'dark'
          ? 'border-cream/40 text-cream/90'
          : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)]'
      } ${className}`}
    >
      <CircleMark className="h-3 w-3 shrink-0" />
      {t('Designed with an Italian mindset. Crafted in Egypt.', 'بتصميم إيطالي. وصناعة مصرية.')}
    </span>
  );
};
