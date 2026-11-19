import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Product, MixSlot } from '../../types';
import { Frame } from '../brand/Frame';
import { CircleMark } from '../brand/Logo';
import { CATEGORY_SLOTS, LIMIT_COPY } from '../../data/brand';
import { ArrowRight, Check, Link2, ShoppingBag } from 'lucide-react';

/**
 * LIMITLESS MIX
 * One piece per category (top, bottom, outerwear, accessory) from swipeable
 * rows. A live preview stacks the images inside a frame, colourway chips change
 * the variant, and "Add the look" adds every selected variant in one request.
 * An automatic-discount message appears at three pieces or more. The look is
 * shareable through the URL query string.
 */

const slotOf = (p: Product): MixSlot => (p.slot as MixSlot) || 'top';

const encodeLook = (items: { id: string; size?: string; color?: string }[]) =>
  items
    .filter((i) => i.id)
    .map((i) => `${i.id}~${encodeURIComponent(i.size || '')}~${encodeURIComponent(i.color || '')}`)
    .join(',');

interface LookItem { id: string; size?: string; color?: string }

const decodeLook = (raw?: string): LookItem[] =>
  (raw || '')
    .split(',')
    .filter(Boolean)
    .map((chunk) => {
      const [id, size, color] = chunk.split('~');
      return { id, size: size ? decodeURIComponent(size) : undefined, color: color ? decodeURIComponent(color) : undefined };
    })
    .filter((i) => Boolean(i.id));

interface MixItModuleProps {
  /** when set, the look starts with that product chosen */
  anchorProduct?: Product;
  compact?: boolean;
}

export const MixItModule: React.FC<MixItModuleProps> = ({ anchorProduct, compact = false }) => {
  const {
    products, addToCart, setIsCartOpen, showToast, settings,
    shopifyConfigured, shopifyAddLook,
  } = useStore();
  const { t, isAr, money } = useLocale();

  type Selection = Record<string, { id: string; size?: string; color?: string }>;
  const [selection, setSelection] = useState<Selection>(() => {
    if (anchorProduct) return { [slotOf(anchorProduct)]: { id: anchorProduct.id, size: anchorProduct.sizes?.[0], color: anchorProduct.colors?.[0]?.name } };
    return {};
  });
  const [shared, setShared] = useState(false);
  const [added, setAdded] = useState(false);

  // hydrate from ?look= if present (shareable looks)
  useEffect(() => {
    const params = new URLSearchParams((window.location.hash.split('?')[1] || ''));
    const look = params.get('look');
    if (!look || !products.length) return;
    const next: Record<string, { id: string; size?: string; color?: string }> = {};
    decodeLook(look).forEach((item) => {
      const found = products.find((p) => p.id === item.id);
      if (found) next[slotOf(found)] = item;
    });
    if (Object.keys(next).length) setSelection(next);
  }, [products]);

  const bySlot = useMemo(() => {
    const map: Record<string, Product[]> = { top: [], bottom: [], outerwear: [], accessory: [] };
    products.forEach((p) => {
      const slot = slotOf(p);
      if (!map[slot]) map[slot] = [];
      map[slot].push(p);
    });
    return map;
  }, [products]);

  const chosen = useMemo(
    () =>
      (Object.entries(selection) as [string, { id: string; size?: string; color?: string }][])
        .map(([slot, value]) => ({ slot, product: products.find((p) => p.id === value.id), value }))
        .filter((entry) => Boolean(entry.product)),
    [selection, products]
  );

  const total = chosen.reduce((sum, entry) => sum + (entry.product?.price || 0), 0);
  const count = chosen.length;
  const discountPercent = settings?.lookDiscountPercent ?? 10;
  const discountValue = count >= 3 ? Math.round((total * discountPercent) / 100) : 0;

  const pick = (product: Product) => {
    const slot = slotOf(product);
    setSelection((prev) => {
      const current = prev[slot];
      if (current?.id === product.id) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return {
        ...prev,
        [slot]: { id: product.id, size: product.sizes?.[0], color: product.colors?.[0]?.name },
      };
    });
    setAdded(false);
  };

  const setSize = (slot: string, size: string) =>
    setSelection((prev) => (prev[slot] ? { ...prev, [slot]: { ...prev[slot], size } } : prev));

  const setColor = (slot: string, color: string) =>
    setSelection((prev) => (prev[slot] ? { ...prev, [slot]: { ...prev[slot], color } } : prev));

  /**
   * Adds every selected variant in one request (Shopify: one /cart/add.js POST
   * with an items array). Here: a single batched store action, one cart update.
   */
  const addLook = async () => {
    if (count === 0) return;

    // Shopify: one request for the whole look (one cartLinesAdd with every line)
    if (shopifyConfigured) {
      const lines = chosen.map((entry) => {
        const p = entry.product as Product;
        return {
          product: p,
          size: entry.value.size || p.sizes?.[0] || 'M',
          color: entry.value.color || p.colors?.[0]?.name || 'Standard',
          quantity: 1,
        };
      });
      const addedInShopify = await shopifyAddLook(lines);
      if (addedInShopify) {
        setAdded(true);
        setIsCartOpen(true);
        showToast?.(t('The whole look is in your cart', 'الإطلالة كاملة في سلتك'));
        return;
      }
      showToast?.(t('Could not add the look, try again.', 'تعذر إضافة الإطلالة، حاول مرة أخرى.'));
      return;
    }

    chosen.forEach((entry) => {
      const p = entry.product as Product;
      addToCart(p, entry.value.size || p.sizes?.[0] || 'M', entry.value.color || p.colors?.[0]?.name || 'Standard');
    });
    setAdded(true);
    setIsCartOpen(true);
    showToast?.(t('The whole look is in your cart', 'الإطلالة كاملة في سلتك'));
  };

  const share = async () => {
    const query = encodeLook(chosen.map((entry) => ({ id: entry.value.id, size: entry.value.size, color: entry.value.color })));
    const url = `${window.location.origin}${window.location.pathname}#/mix?look=${encodeURIComponent(query)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'MOLFET — Limitless Mix', url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
      showToast?.(t('Look link copied', 'تم نسخ رابط الإطلالة'));
    } catch {
      /* cancelled */
    }
  };

  return (
    <section className={`border-t border-[var(--mf-hairline)] bg-[var(--mf-surface-deep)] ${compact ? 'py-10' : 'py-14 lg:py-20'}`}>
      <div className="mx-auto max-w-[1560px] px-5 sm:px-8 lg:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mf-eyebrow flex items-center gap-2">
              <CircleMark className="h-3 w-3" />
              {t('Limitless Mix', 'تنسيق بلا حدود')}
            </p>
            <h2 className="mt-3 max-w-[24ch] text-[clamp(1.5rem,2.8vw,2.2rem)] leading-tight text-brown">
              {t('Combine pieces freely. Add the whole look.', 'نسّق القطع بحرية. أضف الإطلالة كاملة.')}
            </h2>
          </div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--mf-brown-muted)]">
            {t('One piece per category', 'قطعة واحدة من كل تصنيف')}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* swipeable rows */}
          <div className="space-y-7">
            {CATEGORY_SLOTS.map((slotDef) => {
              const list = bySlot[slotDef.slot] || [];
              if (list.length === 0) return null;
              const current = selection[slotDef.slot];
              return (
                <div key={slotDef.slot}>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-[9.5px] uppercase tracking-[0.22em] text-[var(--mf-brown-muted)]">
                      {t(slotDef.en, slotDef.ar)}
                    </span>
                    <span className="h-px flex-1 bg-[var(--mf-hairline)]" />
                    {current && (
                      <button
                        type="button"
                        onClick={() => setSelection((prev) => { const n = { ...prev }; delete n[slotDef.slot]; return n; })}
                        className="text-[9px] uppercase tracking-[0.16em] text-[var(--mf-brown-muted)] hover:text-maroon"
                      >
                        {t('Clear', 'مسح')}
                      </button>
                    )}
                  </div>

                  <div className="mf-scroll-x pb-2">
                    {list.map((p) => {
                      const isSelected = current?.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => pick(p)}
                          aria-pressed={isSelected}
                          className={`group relative w-[128px] shrink-0 border text-start transition-colors sm:w-[150px] ${
                            isSelected ? 'border-maroon' : 'border-[var(--mf-hairline)] hover:border-[var(--mf-hairline-strong)]'
                          }`}
                        >
                          <span className="relative block aspect-[4/5] overflow-hidden bg-cream">
                            <img
                              src={p.cutoutUrl || p.images?.[0]}
                              alt={isAr ? p.titleAr : p.titleEn}
                              loading="lazy"
                              className="absolute inset-0 m-auto h-[88%] w-auto object-contain transition-transform duration-500 group-hover:scale-105"
                            />
                            {isSelected && (
                              <span className="absolute end-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-maroon text-cream">
                                <Check className="h-3 w-3" strokeWidth={2} />
                              </span>
                            )}
                          </span>
                          <span className="block px-2 py-2">
                            <span className="block truncate text-[10px] uppercase tracking-[0.06em] text-brown">
                              {isAr ? p.titleAr : p.titleEn}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-[var(--mf-brown-soft)]">{money(p.price)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* colourway + size chips for the selected piece */}
                  {current && (() => {
                    const p = products.find((x) => x.id === current.id);
                    if (!p) return null;
                    return (
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        {p.colors?.length > 1 && (
                          <div className="flex items-center gap-1.5">
                            {p.colors.map((c) => (
                              <button
                                key={c.name}
                                type="button"
                                className="mf-swatch mf-swatch-sm"
                                style={{ background: c.hex }}
                                aria-label={c.name}
                                aria-pressed={current.color === c.name}
                                onClick={() => setColor(slotDef.slot, c.name)}
                              />
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {(p.sizes || []).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setSize(slotDef.slot, s)}
                              aria-pressed={current.size === s}
                              className={`border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.06em] ${
                                current.size === s ? 'border-maroon bg-maroon text-cream' : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* live preview, stacked inside a frame */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Frame className="w-full bg-cream" gap={28}>
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-cream">
                {count === 0 ? (
                  <div className="absolute inset-0 grid place-items-center px-8 text-center">
                    <div>
                      <CircleMark className="mx-auto h-8 w-8 opacity-30" />
                      <p className="mt-3 text-[11px] leading-relaxed text-[var(--mf-brown-soft)]">
                        {t('Your look has no limits yet. Start building it.', 'إطلالتك بلا حدود بعد. ابدأ في تكوينها.')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    {chosen.map((entry, index) => (
                      <img
                        key={entry.slot}
                        src={entry.product!.cutoutUrl || entry.product!.images?.[0]}
                        alt={entry.product!.titleEn}
                        loading="lazy"
                        className="mf-rise absolute inset-0 m-auto w-auto object-contain mix-blend-multiply"
                        style={{
                          height: `${86 - index * 4}%`,
                          zIndex: index + 1,
                          animationDelay: `${index * 60}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {count > 0 && (
                  <span className="absolute start-2.5 top-2.5 z-20 border border-[var(--mf-hairline-strong)] bg-[var(--mf-surface)] px-2 py-1 text-[8.5px] uppercase tracking-[0.18em] text-[var(--mf-brown-soft)]">
                    {count} {t('pieces', 'قطع')}
                  </span>
                )}
              </div>
            </Frame>

            <div className="mt-4 space-y-1.5">
              {chosen.length === 0 ? (
                <p className="text-[11px] text-[var(--mf-brown-muted)]">{t('Nothing selected yet.', 'لم يتم اختيار شيء بعد.')}</p>
              ) : (
                chosen.map((entry) => (
                  <div key={entry.slot} className="flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="truncate text-[var(--mf-brown-soft)]">
                      {isAr ? entry.product!.titleAr : entry.product!.titleEn}
                      <span className="ms-1.5 text-[9.5px] uppercase tracking-[0.1em] text-[var(--mf-brown-muted)]">
                        {entry.value.size}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-brown">{money(entry.product!.price)}</span>
                  </div>
                ))
              )}

              <div className="mt-3 flex items-baseline justify-between border-t border-[var(--mf-hairline)] pt-3">
                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">{t('Look total', 'إجمالي الإطلالة')}</span>
                <span className="text-[15px] text-brown">{money(Math.max(0, total - discountValue))}</span>
              </div>

              {count >= 3 && (
                <p className="border border-maroon/30 bg-cream px-2.5 py-2 text-[10.5px] leading-relaxed text-maroon">
                  {t(
                    LIMIT_COPY.mixDiscount.en(count),
                    LIMIT_COPY.mixDiscount.ar(count)
                  )}
                  {discountValue > 0 && (
                    <span className="mt-0.5 block text-[10px] text-[var(--mf-brown-soft)]">
                      {t(`Estimated ${discountValue} EGP off — confirmed at checkout.`, `خصم تقديري ${discountValue} ج.م — يُعتمد عند إتمام الطلب.`)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="mf-btn mf-btn-sm flex-1"
                onClick={addLook}
                disabled={count === 0}
              >
                {added ? <Check className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {t('Add the look', 'أضف الإطلالة')}
              </button>
              <button
                type="button"
                className="mf-btn mf-btn-ghost mf-btn-sm flex-1"
                onClick={share}
                disabled={count === 0}
              >
                {shared ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                {t('Share', 'مشاركة')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('#/mix')}
              className="mf-link mt-3 inline-flex items-center gap-1 text-[9.5px] uppercase tracking-[0.16em] text-[var(--mf-brown-soft)]"
            >
              {t('Open the full Mix studio', 'افتح استوديو التنسيق')}
              <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
};
