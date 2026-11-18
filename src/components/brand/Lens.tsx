import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Product, DetailPoint } from '../../types';
import { useLocale } from '../../lib/i18n';
import { useStore } from '../../context/StoreContext';

/**
 * THE LENS — the signature feature.
 *
 * On desktop the cursor becomes the brush-circle icon (about 36px; maroon on
 * light areas, cream on dark areas). Over any product image it grows to about
 * 160px and reveals a Detail Layer inside the circle:
 *   Layer A — the Italian sketch: a technical flat drawing in cream lines on
 *             maroon (product.sketchUrl / metafield molfet.sketch_image)
 *   Layer B — a macro photo of the Egyptian-made fabric and stitching.
 * Each product has up to three hotspots (Fabric, Cut, Finish) stored as the
 * metaobject type `detail_point` with x, y, title, text and macro_image.
 * Moving the lens over a hotspot shows its callout.
 *
 * Caption: "Italian mindset. Egyptian hands."
 *
 * Touch devices get press-and-hold plus a visible Detail button. Everything
 * works from the keyboard (Tab to a hotspot, Enter to open). Built with a CSS
 * mask/clip-path and a small pointer handler using requestAnimationFrame.
 * No WebGL. A reduced-motion fallback is tap-to-reveal, no movement.
 */

const LensIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
    <path
      d="M 78.6 84.4 A 42 42 0 1 1 78.6 15.6"
      stroke="currentColor"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M 82 78 A 34 34 0 0 0 84.4 25"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      opacity=".7"
    />
  </svg>
);

export interface LensCursorProps {
  enabled: boolean;
  tone?: 'light' | 'dark';
}

/** The global brush-circle cursor. Mounted once, at app level. */
export const LensCursor: React.FC<LensCursorProps> = ({ enabled, tone = 'light' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const pos = useRef({ x: -200, y: -200 });

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

    const onMove = (event: PointerEvent) => {
      pos.current = { x: event.clientX, y: event.clientY };
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = 0;
        const el = ref.current;
        if (!el) return;
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
        el.dataset.visible = 'true';
      });
    };

    const onLeave = () => {
      if (ref.current) ref.current.dataset.visible = 'false';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="mf-lens-cursor select-none" ref={ref} data-tone={tone} aria-hidden="true">
      <LensIcon className="h-full w-full" />
    </div>
  );
};

interface LensMediaProps {
  product: Product;
  /** visible circle diameter in px */
  size?: number;
  className?: string;
}

/**
 * The circular reveal itself: layer A (Italian sketch, cream on maroon) sits
 * under layer B (macro fabric), which fades in as the lens approaches the
 * hotspot. Rendered inside a clip-path circle.
 */
export const LensMedia: React.FC<{
  product: Product;
  activeKey?: string | null;
  size?: number;
  showCaption?: boolean;
}> = ({ product, activeKey, size = 160, showCaption = true }) => {
  const { t } = useLocale();
  const sketch = product.sketchUrl;
  const macro =
    product.details?.find((d) => d.key === activeKey)?.macro ||
    product.macroUrl ||
    '/img/detail/fabric.webp';

  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{ width: size, height: size, background: 'var(--molfet-maroon)' }}
    >
      {/* Layer A — the Italian sketch */}
      <div className="mf-lens-sketch absolute inset-0">
        {sketch ? (
          <img src={sketch} alt="" className="h-full w-full object-contain p-3" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <LensIcon className="h-2/5 w-2/5 text-cream/70" />
          </div>
        )}
      </div>
      {/* Layer B — the Egyptian fabric, up close */}
      <img
        src={macro}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
        style={{ opacity: activeKey ? 1 : 0.12 }}
      />
      {showCaption && (
        <span className="mf-lens-caption">{t('Italian mindset. Egyptian hands.', 'عقلية إيطالية. أيدٍ مصرية.')}</span>
      )}
    </div>
  );
};

interface LensStageProps {
  product: Product;
  tone?: 'light' | 'dark';
  /** aspect class for the media box */
  className?: string;
  /** optional explicit hotspots (defaults to product.details) */
  points?: DetailPoint[];
  /** open the detail panel by default (touch / keyboard path) */
  pointsInit?: boolean;
}

/**
 * LensStage = a framed product photo with the lens hotspots.
 * Used on the product page gallery and inside product cards.
 */
export const LensStage: React.FC<LensStageProps> = ({
  product,
  tone = 'light',
  points,
  pointsInit = false,
  className = '',
}) => {
  const { t, isAr } = useLocale();
  const { settings } = useStore();
  const lensEnabled = settings?.lensEnabled !== false;

  const hotspots = (points || product.details || []).slice(0, 3);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(!!pointsInit);
  const [detailOpen, setDetailOpen] = useState(false);
  const [touchPinned, setTouchPinned] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [touchMode, setTouchMode] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setTouchMode(window.matchMedia('(hover: none), (pointer: coarse)').matches);
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const active = useMemo(
    () => hotspots.find((h) => h.key === (activeKey || hoverKey)) || null,
    [hotspots, activeKey, hoverKey]
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (touchMode) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (frame.current) return;
    const { clientX, clientY } = event;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = 0;
      setCursorPos({ x: clientX - rect.left, y: clientY - rect.top });
    });
  }, [touchMode]);

  // touch detail panel follows the hotspot the user tapped
  const selectPoint = useCallback((key: string | null) => {
    setActiveKey(key);
    setDetailOpen(Boolean(key));
  }, []);

  useEffect(() => () => { if (frame.current) cancelAnimationFrame(frame.current); }, []);

  const media = product.images?.[0] || product.thumbnailUrl || '';
  const cutout = product.cutoutUrl;

  // press-and-hold on touch devices opens the lens in place
  const holdTimer = useRef<number | null>(null);
  const onHoldStart = () => {
    if (!touchMode) return;
    holdTimer.current = window.setTimeout(() => {
      selectPoint(activeKey || hotspots[0]?.key || null);
    }, 260);
  };
  const onHoldEnd = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  return (
    <div className={`mf-frame group relative ${className}`} data-tone={tone === 'dark' ? 'dark' : 'light'}>
      <div
        ref={stageRef}
        className="mf-lens-zone relative overflow-hidden bg-cream"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => { setCursorPos(null); setHoverKey(null); }}
        onPointerDown={onHoldStart}
        onPointerUp={onHoldEnd}
        onPointerCancel={onHoldEnd}
      >
        {/* the photo */}
        <img
          src={media}
          alt={isAr ? product.titleAr : product.titleEn}
          className="block h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />

        {/* the cut-out that steps over the line */}
        {cutout && (
          <img
            src={cutout}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="mf-break pointer-events-none absolute inset-0 m-auto h-[104%] w-auto max-w-none object-contain drop-shadow-[0_18px_30px_rgba(50,30,25,0.18)]"
            style={{ bottom: '-6%', top: 'auto' }}
          />
        )}

        {/* hotspots: numbered, keyboard reachable, tap to open the detail panel */}
        {lensEnabled && hotspots.map((point, index) => (
          <button
            key={point.key}
            type="button"
            className="mf-hotspot"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            data-active={active?.key === point.key}
            aria-label={`${isAr ? point.titleAr : point.titleEn}: ${isAr ? point.textAr : point.textEn}`}
            aria-expanded={activeKey === point.key}
            onMouseEnter={() => !touchMode && setHoverKey(point.key)}
            onMouseLeave={() => !touchMode && setHoverKey(null)}
            onFocus={() => setHoverKey(point.key)}
            onBlur={() => setHoverKey(null)}
            onClick={(e) => {
              e.stopPropagation();
              selectPoint(activeKey === point.key ? null : point.key);
              setPanelOpen(true);
            }}
          >
            {String(index + 1).padStart(2, '0')}
          </button>
        ))}

        {/* desktop: the lens opens over the image */}
        {lensEnabled && !touchMode && cursorPos && (
          <div
            className="pointer-events-none absolute z-[8] hidden md:block"
            style={{ left: cursorPos.x, top: cursorPos.y }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2">
              <LensMedia product={product} activeKey={active?.key ?? null} size={168} />
            </div>
          </div>
        )}

        {/* desktop callout next to the active hotspot */}
        {lensEnabled && !touchMode && active && (
          <div
            className="mf-callout hidden md:block"
            style={{
              left: `calc(${active.x}% + 22px)`,
              top: `calc(${active.y}% - 12px)`,
              transform: active.x > 62 ? 'translateX(-108%)' : undefined,
            }}
          >
            <strong>{isAr ? active.titleAr : active.titleEn}</strong>
            {isAr ? active.textAr : active.textEn}
          </div>
        )}

        {/* touch: a visible Detail button */}
        {lensEnabled && hotspots.length > 0 && (
          <button
            type="button"
            className="absolute end-2.5 top-2.5 z-[9] flex items-center gap-1.5 border border-[var(--mf-hairline-strong)] bg-[var(--mf-surface)]/92 px-2 py-1.5 text-[8.5px] uppercase tracking-[0.16em] text-brown backdrop-blur-sm md:hidden"
            onClick={(e) => { e.stopPropagation(); setDetailOpen((v) => !v); setPanelOpen(true); }}
            aria-expanded={detailOpen}
          >
            <LensIcon className="h-3 w-3" />
            {t('Detail', 'التفاصيل')}
          </button>
        )}

        {/* touch / keyboard: explicit detail panel */}
        {panelOpen && active && (detailOpen || !touchMode) && (
          <div className="mf-detail-panel md:hidden" role="dialog" aria-label={isAr ? active.titleAr : active.titleEn}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-[0.24em] text-cream/80">
                {isAr ? active.titleAr : active.titleEn}
              </span>
              <button
                type="button"
                className="text-[10px] uppercase tracking-[0.18em] text-cream/70"
                onClick={() => { setPanelOpen(false); selectPoint(null); }}
              >
                {t('Close', 'إغلاق')}
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-cream/95">
              {isAr ? active.textAr : active.textEn}
            </p>
            <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-cream/60">
              {t('Italian mindset. Egyptian hands.', 'عقلية إيطالية. أيدٍ مصرية.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const LensToggleButton: React.FC<{
  product: Product;
  open: boolean;
  onToggle: () => void;
}> = ({ open, onToggle }) => {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 border border-hairline px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-brown/80 hover:border-maroon hover:text-maroon"
      aria-pressed={open}
    >
      <LensIcon className="h-3.5 w-3.5" />
      {t('Details', 'التفاصيل')}
    </button>
  );
};

export { LensIcon };
