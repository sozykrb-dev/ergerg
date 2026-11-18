import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { LensStage } from '../brand/Lens';
import { Frame } from '../brand/Frame';
import { MadeBadge, Slogan } from '../brand/Logo';
import { MixItModule } from './MixItModule';
import { SizeGuideModal } from '../SizeGuideModal';
import { Product, DetailPoint } from '../../types';
import {
  ArrowLeft, Minus, Plus, Ruler, Truck, RotateCcw, ShieldCheck, ChevronDown, Share2, MessageCircle
} from 'lucide-react';

const ACCORDIONS = [
  {
    key: 'shipping',
    en: 'Shipping & delivery',
    ar: 'الشحن والتوصيل',
    bodyEn: 'Dispatched from Alexandria within 24 hours. 24–48 hours inside Alexandria and Cairo, 2–4 working days across Egypt. Free above the threshold shown in the cart.',
    bodyAr: 'يُشحن من الإسكندرية خلال ٢٤ ساعة. من ٢٤ إلى ٤٨ ساعة داخل الإسكندرية والقاهرة، ومن ٢ إلى ٤ أيام عمل لبقية المحافظات. الشحن مجاني فوق الحد الموضح في السلة.',
  },
  {
    key: 'returns',
    en: 'Returns & exchange',
    ar: 'الاستبدال والاسترجاع',
    bodyEn: 'Fourteen days from delivery, unworn and with the tag. Exchange with our courier inside Alexandria; elsewhere by pickup.',
    bodyAr: 'أربعة عشر يوماً من الاستلام، دون استخدام وبالتاج. الاستبدال مع المندوب داخل الإسكندرية، ولخارجها عبر خدمة الاستلام.',
  },
  {
    key: 'care',
    en: 'Fabric & care',
    ar: 'القماش والعناية',
    bodyEn: 'Egyptian cotton, pre-shrunk. Wash cold, inside out, with like colours. Warm iron on the reverse. Do not tumble dry.',
    bodyAr: 'قطن مصري معالج ضد الانكماش. يُغسل بماء بارد ومقلوباً مع ألوان مشابهة. يُكوى بحرارة متوسطة من الداخل. لا يُجفّف في الغسالة.',
  },
  {
    key: 'payment',
    en: 'Payment',
    ar: 'الدفع',
    bodyEn: 'Cash on delivery across Egypt, InstaPay and Vodafone Cash. Card payments are handled by the store gateway at checkout.',
    bodyAr: 'الدفع عند الاستلام في كل مصر، وإنستاباي وفودافون كاش. الدفع بالبطاقة يتم عبر بوابة الدفع أثناء إتمام الطلب.',
  },
];

export const ProductPage: React.FC<{ productId: string }> = ({ productId }) => {
  const { products, addToCart, settings, showToast } = useStore();
  const { t, isAr, money } = useLocale();
  const product = useMemo<Product | undefined>(() => products.find((p) => p.id === productId), [products, productId]);

  const [size, setSize] = useState<string>('');
  const [colorIndex, setColorIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [activePoint, setActivePoint] = useState<DetailPoint | null>(null);
  const [lensOpen, setLensOpen] = useState(true);

  useEffect(() => {
    if (product) {
      setSize(product.sizes?.[0] || 'M');
      setColorIndex(0);
      setQty(1);
      setActivePoint(product.details?.[0] || null);
    }
  }, [product]);

  if (!product) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="text-[13px] text-[var(--mf-brown-soft)]">{t('This piece is no longer on the rail.', 'هذه القطعة لم تعد متاحة.')}</p>
        <button type="button" className="mf-btn mt-6" onClick={() => navigate('#/shop')}>{t('Back to the collection', 'عودة للتشكيلة')}</button>
      </div>
    );
  }

  const title = isAr ? product.titleAr : product.titleEn;
  const description = isAr ? product.descriptionAr : product.descriptionEn;
  const onSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const points = product.details || [];
  const color = product.colors?.[colorIndex] || product.colors?.[0];

  const add = () => {
    addToCart(product, size || product.sizes?.[0] || 'M', color?.name || 'Standard', qty);
    showToast?.(t('Added to the cart', 'أُضيفت إلى السلة'));
  };

  const whatsappMessage = encodeURIComponent(
    t(
      `Hello MOLFET, I would like to order: ${product.titleEn} — size ${size}.`,
      `مرحباً MOLFET، أرغب في طلب: ${product.titleAr} — مقاس ${size}.`
    )
  );
  const wa = settings?.whatsapp || '201012345678';

  return (
    <div className="bg-[var(--mf-surface)]">
      {/* breadcrumb */}
      <div className="mx-auto max-w-[1560px] px-5 pt-6 sm:px-8 lg:px-12">
        <button type="button" onClick={() => navigate('#/shop')} className="mf-link inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-soft)]">
          <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> {t('Collection', 'التشكيلة')}
        </button>
      </div>

      <div className="mx-auto grid max-w-[1560px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-16 lg:px-12 lg:py-12">
        {/* gallery with the Lens */}
        <div>
          <LensStage
            product={product}
            className="aspect-[4/5] w-full bg-cream"
            points={lensOpen ? points : []}
          />

          {/* detail rail: Fabric / Cut / Finish */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {points.map((point, i) => (
              <button
                key={point.key}
                type="button"
                onMouseEnter={() => setActivePoint(point)}
                onFocus={() => setActivePoint(point)}
                onClick={() => setActivePoint(point)}
                className={`group relative aspect-square overflow-hidden border text-start transition-colors ${
                  activePoint?.key === point.key ? 'border-maroon' : 'border-[var(--mf-hairline)] hover:border-[var(--mf-hairline-strong)]'
                }`}
                aria-pressed={activePoint?.key === point.key}
              >
                <img src={point.macro} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-brown/85 via-brown/15 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-2">
                  <span className="block text-[8px] uppercase tracking-[0.2em] text-cream/70">
                    {t('Layer', 'طبقة')} {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-cream">{isAr ? point.titleAr : point.titleEn}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-3 flex items-center gap-2 text-[9.5px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-maroon" />
            {t('Hover the photograph — or tap a hotspot — to open the Lens', 'مرّر فوق الصورة أو اضغط على نقطة لفتح العدسة')}
          </p>
        </div>

        {/* buy column */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between gap-3">
            <p className="mf-eyebrow">{product.sku}</p>
            <div className="flex items-center gap-2">
              {product.badge && (
                <span className="bg-maroon px-2 py-[3px] text-[8.5px] uppercase tracking-[0.18em] text-cream">{product.badge}</span>
              )}
              <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--mf-brown-muted)]">
                {product.rating?.toFixed(1)} ★ ({product.reviewsCount})
              </span>
            </div>
          </div>

          <h1 className="mt-3 text-[clamp(1.6rem,3.2vw,2.5rem)] leading-[1.06] text-brown">{title}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-[22px] text-brown">{money(product.price)}</span>
            {onSale && (
              <>
                <s className="text-[14px] text-[var(--mf-brown-muted)]">{money(product.compareAtPrice as number)}</s>
                <span className="bg-cream px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-maroon">
                  {t('Save', 'وفّر')} {money((product.compareAtPrice as number) - product.price)}
                </span>
              </>
            )}
          </div>

          <p className="mt-5 max-w-[52ch] text-[13px] leading-[1.85] text-[var(--mf-brown-soft)]">{description}</p>

          <MadeBadge className="mt-6" />

          {/* colourway */}
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9.5px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">
                {t('Colourway', 'اللون')} — <span className="text-brown">{color?.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              {product.colors?.map((c, i) => (
                <button
                  key={`${c.name}-${i}`}
                  type="button"
                  className="mf-swatch"
                  style={{ background: c.hex }}
                  aria-label={c.name}
                  aria-pressed={i === colorIndex}
                  onClick={() => setColorIndex(i)}
                />
              ))}
            </div>
          </div>

          {/* size + quantity */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9.5px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">{t('Size', 'المقاس')}</p>
              <button type="button" onClick={() => setGuideOpen(true)} className="mf-link flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-brown">
                <Ruler className="h-3 w-3" /> {t('Size guide', 'دليل المقاسات')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={`min-w-[46px] border px-3 py-2.5 text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    size === s
                      ? 'border-maroon bg-maroon text-cream'
                      : 'border-[var(--mf-hairline-strong)] text-brown hover:border-maroon'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* add to cart */}
          <div className="mt-7 flex items-stretch gap-2">
            <div className="flex items-center border border-[var(--mf-hairline-strong)]">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-9 place-items-center text-brown hover:text-maroon" aria-label={t('Decrease quantity', 'تقليل الكمية')}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-[12px] tabular-nums">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(9, q + 1))} className="grid h-full w-9 place-items-center text-brown hover:text-maroon" aria-label={t('Increase quantity', 'زيادة الكمية')}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" className="mf-btn flex-1" onClick={add}>
              {t('Add to cart', 'أضف إلى السلة')}
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button type="button" className="mf-btn mf-btn-ghost mf-btn-sm flex-1" onClick={() => { add(); navigate('#/checkout'); }}>
              {t('Buy it now', 'اشترِ الآن')}
            </button>
            <a
              href={`https://wa.me/${wa}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="mf-btn mf-btn-ghost mf-btn-sm flex-1"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('Order on WhatsApp', 'اطلب واتساب')}
            </a>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[var(--mf-hairline)] py-4">
            {[
              { icon: Truck, en: 'Delivery 24–48h', ar: 'توصيل ٢٤–٤٨ س' },
              { icon: RotateCcw, en: '14-day exchange', ar: 'استبدال ١٤ يوم' },
              { icon: ShieldCheck, en: 'Cash on delivery', ar: 'دفع عند الاستلام' },
            ].map((item) => (
              <div key={item.en} className="flex flex-col items-center gap-1.5 text-center">
                <item.icon className="h-4 w-4 text-maroon" strokeWidth={1.3} />
                <span className="text-[9.5px] uppercase leading-tight tracking-[0.1em] text-[var(--mf-brown-soft)]">{t(item.en, item.ar)}</span>
              </div>
            ))}
          </div>

          {/* live detail callout from the Lens */}
          {activePoint && (
            <div className="mt-5 border border-maroon/30 bg-cream p-4">
              <div className="flex items-start gap-3">
                <img src={activePoint.macro} alt="" loading="lazy" className="h-16 w-16 shrink-0 object-cover" />
                <div>
                  <p className="text-[9px] uppercase tracking-[0.22em] text-maroon">{isAr ? activePoint.titleAr : activePoint.titleEn}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-brown">{isAr ? activePoint.textAr : activePoint.textEn}</p>
                  <p className="mt-1.5 text-[8.5px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">
                    {t('Italian mindset. Egyptian hands.', 'عقلية إيطالية. أيدٍ مصرية.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* accordions */}
          <div className="mt-7">
            {ACCORDIONS.map((acc) => (
              <details key={acc.key} className="mf-accordion group border-b border-[var(--mf-hairline)]">
                <summary className="flex items-center justify-between py-3.5">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-brown">{t(acc.en, acc.ar)}</span>
                  <ChevronDown className="h-4 w-4 text-[var(--mf-brown-soft)] transition-transform duration-300 group-open:rotate-180" strokeWidth={1.4} />
                </summary>
                <p className="pb-4 text-[12px] leading-[1.85] text-[var(--mf-brown-soft)]">{t(acc.bodyEn, acc.bodyAr)}</p>
              </details>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <Slogan className="text-[9.5px] uppercase text-[var(--mf-brown-muted)]" />
            <button
              type="button"
              className="mf-link flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-brown"
              onClick={async () => {
                const url = `${window.location.origin}${window.location.pathname}#/product/${product.id}`;
                try {
                  if (navigator.share) await navigator.share({ title: product.titleEn, url });
                  else await navigator.clipboard.writeText(url);
                  showToast?.(t('Link copied', 'تم نسخ الرابط'));
                } catch { /* cancelled */ }
              }}
            >
              <Share2 className="h-3.5 w-3.5" /> {t('Share', 'مشاركة')}
            </button>
          </div>
        </div>
      </div>

      {/* Mix it module */}
      <MixItModule anchorProduct={product} />

      {/* sticky add to cart on mobile */}
      <div className="mf-sticky-atc flex items-center gap-3 px-4 py-3 md:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10.5px] uppercase tracking-[0.08em] text-brown">{title}</p>
          <p className="text-[11px] text-[var(--mf-brown-soft)]">{money(product.price)} · {size}</p>
        </div>
        <button type="button" className="mf-btn mf-btn-sm" onClick={add}>
          {t('Add', 'أضف')}
        </button>
      </div>

      {guideOpen && <SizeGuideModal onClose={() => setGuideOpen(false)} />}
    </div>
  );
};
