import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { ProductCardLens } from './ProductCard';
import { Frame } from '../brand/Frame';
import { Slogan } from '../brand/Logo';
import { SlidersHorizontal, X } from 'lucide-react';

const SORTS = [
  { key: 'featured', en: 'Featured', ar: 'المميزة' },
  { key: 'new', en: 'Newest', ar: 'الأحدث' },
  { key: 'price-asc', en: 'Price ↑', ar: 'السعر ↑' },
  { key: 'price-desc', en: 'Price ↓', ar: 'السعر ↓' },
] as const;

export const ShopPage: React.FC<{ category?: string }> = ({ category }) => {
  const { products, isLoadingProducts, categories, activeCategory, setActiveCategory } = useStore();
  const { t, isAr } = useLocale();
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('featured');
  const [slot, setSlot] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (category) setActiveCategory(category);
  }, [category, setActiveCategory]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeCategory && activeCategory !== 'all') {
      if (activeCategory === 'sale') {
        list = list.filter((p) => p.compareAtPrice && p.compareAtPrice > p.price);
      } else {
        const cat = categories.find((c) => c.id === activeCategory || c.slug === activeCategory);
        const keys = [activeCategory, cat?.id, cat?.slug, cat?.nameEn].filter(Boolean).map((k) => String(k).toLowerCase());
        list = list.filter((p) => keys.includes((p.category || '').toLowerCase()));
      }
    }
    if (slot !== 'all') list = list.filter((p) => (p.slot || 'top') === slot);

    switch (sort) {
      case 'new':
        return list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      default:
        return list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }
  }, [products, activeCategory, categories, slot, sort]);

  const activeCat = categories.find((c) => c.id === activeCategory);
  const heading = activeCategory === 'all'
    ? t('All pieces', 'كل القطع')
    : isAr ? activeCat?.nameAr || activeCat?.nameEn || '' : activeCat?.nameEn || activeCat?.nameAr || '';

  return (
    <div>
      {/* collection header */}
      <section className="border-b border-[var(--mf-hairline)] bg-[var(--mf-surface)]">
        <div className="mx-auto max-w-[1560px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <nav className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">
            <button type="button" onClick={() => navigate('#/')} className="hover:text-maroon">{t('Home', 'الرئيسية')}</button>
            <span>/</span>
            <span className="text-brown">{heading}</span>
          </nav>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-[clamp(1.9rem,4vw,3.2rem)] leading-none text-brown">{heading}</h1>
              <p className="mt-3 text-[11.5px] uppercase tracking-[0.16em] text-[var(--mf-brown-muted)]">
                {t(`${filtered.length} pieces`, `${filtered.length} قطعة`)}
              </p>
            </div>
            <Slogan className="text-[10px] uppercase text-[var(--mf-brown-muted)]" />
          </div>
        </div>
      </section>

      {/* category rail + toolbar */}
      <div className="sticky top-[58px] z-30 border-b border-[var(--mf-hairline)] bg-[color-mix(in_srgb,var(--molfet-cream)_58%,var(--molfet-cream))]/92 backdrop-blur-md sm:top-[70px]">
        <div className="mx-auto flex max-w-[1560px] items-center gap-3 px-4 py-3 sm:px-8 lg:px-12">
          <div className="mf-scroll-x flex-1 items-center gap-2">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 border px-3.5 py-1.5 text-[10.5px] uppercase tracking-[0.14em] transition-colors ${
                    isActive
                      ? 'border-maroon bg-maroon text-cream'
                      : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)] hover:border-maroon hover:text-maroon'
                  }`}
                >
                  {isAr ? cat.nameAr || cat.nameEn : cat.nameEn || cat.nameAr}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 border border-[var(--mf-hairline-strong)] px-3 py-1.5 text-[10.5px] uppercase tracking-[0.14em] text-brown hover:border-maroon"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.4} />
            {t('Filter', 'تصفية')}
          </button>
        </div>

        {filtersOpen && (
          <div className="border-t border-[var(--mf-hairline)] bg-[var(--mf-surface)]">
            <div className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-6 px-4 py-4 sm:px-8 lg:px-12">
              <div>
                <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">{t('Category slot', 'نوع القطعة')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { k: 'all', en: 'All', ar: 'الكل' },
                    { k: 'top', en: 'Top', ar: 'علوية' },
                    { k: 'bottom', en: 'Bottom', ar: 'سفلية' },
                    { k: 'outerwear', en: 'Outerwear', ar: 'خارجية' },
                    { k: 'accessory', en: 'Accessory', ar: 'إكسسوار' },
                  ].map((s) => (
                    <button
                      key={s.k}
                      type="button"
                      onClick={() => setSlot(s.k)}
                      className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${
                        slot === s.k ? 'border-maroon bg-maroon text-cream' : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)]'
                      }`}
                    >
                      {t(s.en, s.ar)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">{t('Sort', 'الترتيب')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORTS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setSort(s.key)}
                      className={`border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${
                        sort === s.key ? 'border-maroon bg-maroon text-cream' : 'border-[var(--mf-hairline-strong)] text-[var(--mf-brown-soft)]'
                      }`}
                    >
                      {t(s.en, s.ar)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setSlot('all'); setSort('featured'); setFiltersOpen(false); }}
                className="ms-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-[var(--mf-brown-soft)] hover:text-maroon"
              >
                <X className="h-3 w-3" /> {t('Clear', 'مسح')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* grid */}
      <section className="mx-auto max-w-[1560px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        {isLoadingProducts && filtered.length === 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse bg-[var(--mf-surface-deep)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-[13px] text-[var(--mf-brown-soft)]">{t('Nothing in this corner yet.', 'لا يوجد شيء هنا بعد.')}</p>
            <button type="button" className="mf-btn mt-6" onClick={() => setActiveCategory('all')}>
              {t('Shop everything', 'تسوّق الكل')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8">
            {filtered.map((product, i) => (
              <ProductCardLens key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* statement band */}
      <section className="border-t border-[var(--mf-hairline)] bg-[var(--mf-surface-deep)] py-12">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <p className="mf-slogan text-[11px] uppercase text-maroon">{t('Style Without Limits', 'Style Without Limits')}</p>
          <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--mf-brown-soft)]">
            {t('Hover any photograph: the lens opens and shows the sketch, the fabric and the finish.', 'مرّر فوق أي صورة: تنفتح العدسة لعرض الرسم والقماش والتشطيب.')}
          </p>
          <Frame className="mx-auto mt-6 h-16 w-16 bg-cream" gap={14}>
            <img src="/img/brand/icon-mark.webp" alt="" aria-hidden="true" className="absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)] object-contain" />
          </Frame>
        </div>
      </section>
    </div>
  );
};
