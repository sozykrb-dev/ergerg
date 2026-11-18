import React, { useMemo, useState } from 'react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Frame } from '../brand/Frame';
import { CircleMark } from '../brand/Logo';
import { LensStage } from '../brand/Lens';
import { Plus, Check } from 'lucide-react';

/**
 * Framed product card. The photo and the cut-out sit inside the frame; the
 * cut-out steps 8–16px further out on hover. Quick add picks the first
 * available size.
 */
export const ProductCard: React.FC<{ product: Product; index?: number }> = ({ product, index = 0 }) => {
  const { addToCart } = useStore();
  const { t, isAr, money } = useLocale();
  const [quickOpen, setQuickOpen] = useState(false);
  const [added, setAdded] = useState(false);

  const title = isAr ? product.titleAr : product.titleEn;
  const image = product.images?.[0] || product.thumbnailUrl || '';
  const cutout = product.cutoutUrl;
  const onSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const discount = onSale ? Math.round(100 - (product.price / (product.compareAtPrice as number)) * 100) : 0;

  const sizes = useMemo(() => product.sizes?.length ? product.sizes : ['M'], [product.sizes]);

  const add = (size: string) => {
    addToCart(product, size, product.colors?.[0]?.name || 'Standard');
    setAdded(true);
    window.setTimeout(() => { setAdded(false); setQuickOpen(false); }, 1100);
  };

  return (
    <article
      className="group relative mf-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Frame
        className="bg-cream"
        gap={26}
        inset={0}
      >
        <button
          type="button"
          onClick={() => navigate(`#/product/${product.id}`)}
          className="relative block aspect-[4/5] w-full overflow-hidden bg-cream text-start"
          aria-label={title}
        >
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,.61,.36,1)] group-hover:scale-[1.03]"
          />
          {cutout && (
            <img
              src={cutout}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="mf-break pointer-events-none absolute inset-x-0 bottom-[-3%] mx-auto h-[104%] w-auto max-w-none object-contain drop-shadow-[0_16px_26px_rgba(50,30,25,0.16)]"
            />
          )}

          <span className="absolute start-3 top-3 z-[5] flex flex-col gap-1.5">
            {product.badge && (
              <span className="bg-maroon px-2 py-1 text-[8.5px] font-medium uppercase tracking-[0.18em] text-cream">
                {product.badge}
              </span>
            )}
            {onSale && (
              <span className="border border-maroon bg-cream px-2 py-1 text-[8.5px] font-medium uppercase tracking-[0.18em] text-maroon">
                −{discount}%
              </span>
            )}
          </span>
        </button>
      </Frame>

      {/* quick add — sits under the card so it never covers the frame line */}
      <div className="relative z-[5] flex items-start justify-between gap-3 px-0.5 pt-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(`#/product/${product.id}`)}
            className="block truncate text-[12px] font-medium uppercase tracking-[0.08em] text-brown transition-opacity hover:opacity-60"
          >
            {title}
          </button>
          <p className="mt-1 flex items-center gap-2 text-[11.5px]">
            <span className={onSale ? 'text-maroon' : 'text-brown'}>{money(product.price)}</span>
            {onSale && (
              <s className="text-[var(--mf-brown-muted)]">{money(product.compareAtPrice as number)}</s>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setQuickOpen((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--mf-hairline-strong)] text-brown transition-colors hover:border-maroon hover:bg-maroon hover:text-cream"
          aria-label={t('Quick add', 'إضافة سريعة')}
          aria-expanded={quickOpen}
        >
          {added ? <Check className="h-4 w-4" strokeWidth={1.6} /> : quickOpen ? <CircleMark className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" strokeWidth={1.4} />}
        </button>
      </div>

      {quickOpen && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => add(size)}
              className="min-w-9 border border-[var(--mf-hairline-strong)] px-2 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-brown transition-colors hover:border-maroon hover:bg-maroon hover:text-cream"
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </article>
  );
};

/** Large framed card used on the collection page, with the Lens enabled. */
export const ProductCardLens: React.FC<{ product: Product; index?: number }> = ({ product, index = 0 }) => {
  const { addToCart } = useStore();
  const { t, isAr, money } = useLocale();
  const [added, setAdded] = useState(false);
  const title = isAr ? product.titleAr : product.titleEn;
  const onSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);

  return (
    <article className="group mf-rise" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <LensStage product={product} className="aspect-[4/5] w-full" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(`#/product/${product.id}`)}
            className="block truncate text-[12px] font-medium uppercase tracking-[0.08em] text-brown hover:opacity-60"
          >
            {title}
          </button>
          <p className="mt-1 text-[11.5px]">
            <span className={onSale ? 'text-maroon' : 'text-brown'}>{money(product.price)}</span>
            {onSale && <s className="ms-2 text-[var(--mf-brown-muted)]">{money(product.compareAtPrice as number)}</s>}
          </p>
        </div>
        <button
          type="button"
          className="mf-btn mf-btn-ghost mf-btn-xs"
          onClick={() => {
            addToCart(product, product.sizes?.[0] || 'M', product.colors?.[0]?.name || 'Standard');
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1200);
          }}
        >
          {added ? t('Added', 'تمت') : t('Add', 'أضف')}
        </button>
      </div>
    </article>
  );
};
