import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { LIMIT_COPY } from '../../data/brand';
import { Frame } from '../brand/Frame';
import { Slogan, CircleMark } from '../brand/Logo';
import { Product, MixSlot } from '../../types';
import { RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * RACK VIEW — the shop as a clothing rail.
 *
 * Only garments hang here (tops, bottoms, outerwear). Each piece hangs from a
 * wooden hanger on a maroon rail, sways a little when the rail moves, and turns
 * on the hanger: hover / focus spins it once, drag it with the pointer to turn it
 * freely, and the rotate button gives touch + keyboard the same turn.
 *
 * The rail itself is draggable and arrow-key scrollable; RTL flips the drag
 * direction so pulling feels natural in Arabic. Reduced motion keeps everything
 * still — no sway, no turn.
 */

/**
 * The hanger is drawn, not an icon: an OPEN ring hook (the logo's gap, again)
 * that the rail passes through, a stem, then the triangle shoulders.
 */
const Hanger: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 100" className={className} fill="none" aria-hidden="true">
    {/* the hook: a ring left open at the lower right — the logo's gap — so the rail
        passes through and the circle never closes */}
    <path
      d="M70.3 23.8 A11 11 0 1 0 63.8 30.3"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path
      d="M60 31 V42 L14 76 H106 L60 42"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M16 76 H104" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
  </svg>
);

const SLOTS: { key: MixSlot | 'all'; en: string; ar: string }[] = [
  { key: 'all', en: 'Everything hanging', ar: 'كل المعلّق' },
  { key: 'top', en: 'Tops', ar: 'علوية' },
  { key: 'bottom', en: 'Bottoms', ar: 'سفلية' },
  { key: 'outerwear', en: 'Outerwear', ar: 'خارجية' },
];

/** one garment on its hanger */
const RackItem: React.FC<{ product: Product; index: number; swaying: boolean }> = ({
  product,
  index,
  swaying,
}) => {
  const { t, isAr, money } = useLocale();
  const [spin, setSpin] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; base: number } | null>(null);

  const image = product.cutoutUrl || product.thumbnailUrl || product.images?.[0];
  const title = isAr ? product.titleAr : product.titleEn;

  const turn = useCallback((direction = 1) => {
    setSpin((value) => Math.round(value / 360) * 360 + 360 * direction);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // let the buttons inside work normally
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { x: event.clientX, base: spin };
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const delta = (event.clientX - drag.current.x) * (isAr ? -0.8 : 0.8);
    setSpin(drag.current.base + delta);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    // settle facing the customer again
    setSpin((value) => Math.round(value / 360) * 360);
  };

  return (
    <li
      className="mf-rack-item"
      style={{ ['--sway-delay' as string]: `${(index % 6) * 0.35}s` }}
      data-swaying={swaying ? 'true' : 'false'}
    >
      <div className="mf-rack-item__hang">
        <Hanger className="mf-rack-item__hanger" />

        <div
          className="mf-rack-item__stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => turn(1)}
          role="group"
          aria-label={t(`Turn ${title}`, `لفّ ${title}`)}
        >
          <div
            className="mf-rack-item__turn"
            data-dragging={dragging ? 'true' : 'false'}
            style={{ transform: `rotateY(${spin}deg)` }}
          >
            {image ? (
              <img src={image} alt={title} loading={index < 4 ? 'eager' : 'lazy'} draggable={false} />
            ) : (
              <span className="mf-rack-item__empty" aria-hidden="true" />
            )}
          </div>
        </div>

        <button
          type="button"
          className="mf-rack-item__spin"
          onClick={() => turn(1)}
          aria-label={t(`Turn ${title} around`, `لفّ ${title} دورة كاملة`)}
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div className="mf-rack-item__label">
        <button
          type="button"
          className="mf-rack-item__title"
          onClick={() => navigate(`#/product/${product.id}`)}
        >
          {title}
        </button>
        <div className="mf-rack-item__meta">
          <span>{money(product.price)}</span>
          <span className="mf-rack-item__sizes">{product.sizes?.slice(0, 4).join(' · ')}</span>
        </div>
      </div>
    </li>
  );
};

export const RackPage: React.FC = () => {
  const { products, isLoadingProducts } = useStore();
  const { t, isAr } = useLocale();
  const [slot, setSlot] = useState<MixSlot | 'all'>('all');
  const [interacted, setInteracted] = useState(false);
  const rail = useRef<HTMLDivElement | null>(null);

  /* garments only — the rack is for clothes, accessories stay on the shelf */
  const garments = useMemo(
    () => products.filter((product) => (product.slot || 'top') !== 'accessory'),
    [products],
  );

  const shown = useMemo(
    () => (slot === 'all' ? garments : garments.filter((product) => (product.slot || 'top') === slot)),
    [garments, slot],
  );

  const counts = useMemo(() => {
    const tally: Record<string, number> = { all: garments.length, top: 0, bottom: 0, outerwear: 0 };
    garments.forEach((product) => {
      const key = product.slot || 'top';
      if (tally[key] !== undefined) tally[key] += 1;
    });
    return tally;
  }, [garments]);

  const scrollRail = useCallback((direction: number) => {
    const node = rail.current;
    if (!node) return;
    const step = Math.max(220, node.clientWidth * 0.6);
    setInteracted(true);
    node.scrollBy({ left: step * direction * (isAr ? -1 : 1), behavior: 'smooth' });
  }, [isAr]);

  /* drag the rail like pulling a clothes rack */
  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    let pointer: { x: number; left: number } | null = null;

    const down = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      pointer = { x: event.clientX, left: node.scrollLeft };
      node.setPointerCapture(event.pointerId);
      node.dataset.dragging = 'true';
    };
    const move = (event: PointerEvent) => {
      if (!pointer) return;
      node.scrollLeft = pointer.left - (event.clientX - pointer.x);
      setInteracted(true);
    };
    const up = () => {
      pointer = null;
      node.dataset.dragging = 'false';
    };

    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    node.addEventListener('pointerleave', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.removeEventListener('pointerleave', up);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); scrollRail(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); scrollRail(-1); }
  };

  return (
    <div className="mf-rack-page">
      {/* header */}
      <section className="border-b border-[var(--mf-hairline)]">
        <div className="mx-auto max-w-[1560px] px-5 pb-8 pt-10 sm:px-8 lg:px-12">
          <nav className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">
            <button type="button" onClick={() => navigate('#/')} className="hover:text-maroon">
              {t('Home', 'الرئيسية')}
            </button>
            <span>/</span>
            <span className="text-brown">{t('The rack', 'الشماعة')}</span>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="mf-eyebrow text-maroon">{t('Rack view', 'عرض الشماعة')}</p>
              <h1 className="mt-2 text-[clamp(2rem,4.4vw,3.4rem)] leading-none text-brown">
                {t('Everything on the rail', 'كل الهدوم على الشماعة')}
              </h1>
              <p className="mt-4 max-w-[52ch] text-[12.5px] leading-relaxed text-[var(--mf-brown-soft)]">
                {t(
                  'Clothes only, hanging exactly as they would in the studio. Drag a piece to turn it, or pull the rail across.',
                  'هدوم بس، معلّقة زي ما هي في الاستوديو. اسحب القطعة تلف، أو اسحب الشماعة نفسها.',
                )}
              </p>
            </div>
            <Slogan className="text-[10px] uppercase text-[var(--mf-brown-muted)]" />
          </div>

          {/* slot chips */}
          <div className="mf-scroll-x mt-7 items-center gap-2">
            {SLOTS.map((item) => {
              const value = counts[item.key] ?? 0;
              const active = slot === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSlot(item.key)}
                  aria-pressed={active}
                  className={`shrink-0 border px-3.5 py-1.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? 'border-maroon bg-maroon text-cream'
                      : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)] hover:border-maroon hover:text-maroon'
                  }`}
                >
                  {t(item.en, item.ar)}
                  <span className={`ms-2 text-[9px] ${active ? 'text-cream/70' : 'text-[var(--mf-brown-muted)]'}`}>
                    {value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* the rack */}
      <section className="relative bg-[var(--mf-surface-deep)] pb-16 pt-10">
        <div className="mx-auto max-w-[1560px] px-4 sm:px-8 lg:px-12">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">
              {t(`${shown.length} on the rail`, `${shown.length} قطعة معلّقة`)}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                className="grid h-9 w-9 place-items-center border border-[var(--mf-hairline-strong)] text-brown transition-colors hover:border-maroon hover:text-maroon"
                aria-label={t('Pull the rail back', 'اسحب الشماعة لليمين')}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" strokeWidth={1.4} />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                className="grid h-9 w-9 place-items-center border border-[var(--mf-hairline-strong)] text-brown transition-colors hover:border-maroon hover:text-maroon"
                aria-label={t('Pull the rail forward', 'اسحب الشماعة لليسار')}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.4} />
              </button>
            </div>
          </div>

          {isLoadingProducts && shown.length === 0 ? (
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[420px] w-[180px] animate-pulse bg-[var(--mf-surface)]" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--mf-brown-soft)]">
              {t('The rail is empty in this corner.', 'الشماعة فاضية في الجزء دا.')}
            </p>
          ) : (
            <div className="mf-rack">
              {/* end posts */}
              <span className="mf-rack__post mf-rack__post--start" aria-hidden="true" />
              <span className="mf-rack__post mf-rack__post--end" aria-hidden="true" />
              {/* the rail sits outside the scroller so it stays put while the
                  garments slide under it, and it passes through the hook ring */}
              <span className="mf-rack__bar" aria-hidden="true" />

              <div
                className="mf-rack__scroller"
                ref={rail}
                tabIndex={0}
                role="list"
                aria-label={t('Clothing rail', 'شماعة الهدوم')}
                onKeyDown={onKeyDown}
                data-interacted={interacted ? 'true' : 'false'}
              >
                <ul className="mf-rack__items">
                  {shown.map((product, index) => (
                    <RackItem
                      key={product.id}
                      product={product}
                      index={index}
                      swaying={interacted}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">
            {t('Drag to turn · pull the rail · arrows work too', 'اسحب تلف · اسحب الشماعة · الأسهم تشتغل كمان')}
          </p>
        </div>
      </section>

      {/* close: the frame + the empty-cart line, tying the rack back to the concept */}
      <section className="mx-auto max-w-[1560px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="mf-slogan text-[11px] uppercase text-maroon">{t('Style Without Limits', 'Style Without Limits')}</p>
            <p className="mt-3 max-w-[46ch] text-[12.5px] leading-relaxed text-[var(--mf-brown-soft)]">
              {t(LIMIT_COPY.emptyCart.en, LIMIT_COPY.emptyCart.ar)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="mf-btn" onClick={() => navigate('#/shop')}>
              {t('Open the collection', 'افتح التشكيلة')}
            </button>
            <button type="button" className="mf-btn mf-btn-ghost" onClick={() => navigate('#/mix')}>
              {t('Mix a look', 'كوّن إطلالة')}
            </button>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4 border-t border-[var(--mf-hairline)] pt-8">
          <Frame className="h-14 w-14 shrink-0" gap={14}>
            <span className="absolute inset-0 grid place-items-center">
              <CircleMark className="h-6 w-6 opacity-70" />
            </span>
          </Frame>
          <p className="text-[11px] leading-relaxed text-[var(--mf-brown-muted)]">
            {t(
              'The rail is the frame, the hanger is the gap: every piece steps out of the line, then turns to show you the rest.',
              'الشماعة هي الإطار، والفتحة هي التعليقة: كل قطعة تخرج من الخط، وبعدين تلف تشوفك الباقي.',
            )}
          </p>
        </div>
      </section>
    </div>
  );
};

export default RackPage;
