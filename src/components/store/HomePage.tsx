import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Hero } from './Hero';
import { ProductCard } from './ProductCard';
import { Frame } from '../brand/Frame';
import { CircleMark, MadeBadge, Slogan } from '../brand/Logo';
import { ProgressRing, OpenCircle } from '../brand/OpenCircle';
import { LIMIT_COPY, DETAILS_STRIP, BRAND } from '../../data/brand';
import { ArrowRight, Check, MoveRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Italian mindset | Egyptian craftsmanship — split panels             */
/* ------------------------------------------------------------------ */
const SplitStatement: React.FC = () => {
  const { t } = useLocale();
  return (
    <section className="mx-auto max-w-[1560px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="relative bg-maroon px-7 py-12 text-cream sm:px-12 lg:py-16" data-tone="dark">
          <p className="mf-eyebrow">{t('Italian mindset', 'عقلية إيطالية')}</p>
          <h2 className="mt-4 max-w-[16ch] text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.05] text-cream">
            {t('Elegance lives in the details.', 'الأناقة تسكن في التفاصيل.')}
          </h2>
          <p className="mt-6 max-w-[42ch] text-[13px] leading-[1.9] text-cream/80">
            {t(
              'The sketch comes first. A geometric line, a clean shoulder, a collar that holds. Every piece is drafted before a single metre of fabric is cut.',
              'الرسم يأتي أولاً. خط هندسي، كتف نظيف، وياقة تحتفظ بشكلها. كل قطعة تُرسم قبل أن يُقص متر واحد من القماش.'
            )}
          </p>
          <CircleMark className="absolute bottom-6 end-6 h-14 w-14 opacity-25" />
        </div>

        <div className="relative bg-cream px-7 py-12 text-brown sm:px-12 lg:py-16">
          <p className="mf-eyebrow">{t('Egyptian craftsmanship', 'حرفية مصرية')}</p>
          <h2 className="mt-4 max-w-[18ch] text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.05] text-brown">
            {t('Made by hands that know fabric.', 'بأيدٍ تعرف القماش.')}
          </h2>
          <p className="mt-6 max-w-[44ch] text-[13px] leading-[1.9] text-[var(--mf-brown-soft)]">
            {t(
              'Long-staple cotton, local expertise and the finest fabrics. Comfort, quality and contemporary design that expresses the personality of the wearer.',
              'قطن طويل التيلة، خبرات محلية، وأجود الأقمشة. راحة وجودة وتصميم معاصر يعبّر عن شخصية من يرتديها.'
            )}
          </p>
          <MadeBadge className="mt-7" />
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Limitless Mix teaser                                                */
/* ------------------------------------------------------------------ */
const MixTeaser: React.FC = () => {
  const { t, money } = useLocale();
  const { products } = useStore();
  const picks = useMemo(() => {
    const slots = ['top', 'bottom', 'outerwear', 'accessory'];
    return slots
      .map((slot) => products.find((p) => (p.slot || 'top') === slot))
      .filter(Boolean)
      .slice(0, 4);
  }, [products]);
  const total = picks.reduce((sum, p) => sum + (p?.price || 0), 0);

  return (
    <section className="bg-brown py-14 text-cream lg:py-20" data-tone="dark">
      <div className="mx-auto grid max-w-[1560px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
        <div>
          <p className="mf-eyebrow">{t('Limitless Mix', 'تنسيق بلا حدود')}</p>
          <h2 className="mt-4 max-w-[20ch] text-[clamp(1.9rem,3.6vw,3.1rem)] leading-[1.03] text-cream">
            {t('One piece per category. One look, added in one tap.', 'قطعة من كل تصنيف. إطلالة واحدة بضغطة.')}
          </h2>
          <p className="mt-6 max-w-[46ch] text-[13px] leading-[1.9] text-cream/75">
            {t(
              'Pick a top, a bottom, an outer layer and an accessory. The preview stacks them inside the frame, colourways change with a chip, and the whole look goes to the cart in one request.',
              'اختر قطعة علوية وسفلية وطبقة خارجية وإكسسوار. تتجمّع المعاينة داخل الإطار، وتتغير الألوان بالضغط على الشريحة، وتُضاف الإطلالة كلها للسلة بطلب واحد.'
            )}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" className="mf-btn mf-btn-cream" onClick={() => navigate('#/mix')}>
              {t('Build a look', 'نسّق إطلالة')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.6} />
            </button>
            <span className="text-[11px] uppercase tracking-[0.16em] text-cream/60">
              {t(LIMIT_COPY.mixDiscount.en(picks.length), LIMIT_COPY.mixDiscount.ar(picks.length))}
            </span>
          </div>
        </div>

        <div className="relative">
          <Frame tone="dark" className="aspect-[5/4] w-full bg-cream" gap={34}>
            <div className="absolute inset-0 grid grid-cols-4">
              {picks.map((p) => (
                <div key={p!.id} className="relative overflow-hidden border-e border-[var(--mf-hairline)] last:border-e-0">
                  <img
                    src={p!.cutoutUrl || p!.images?.[0]}
                    alt={p!.titleEn}
                    loading="lazy"
                    className="absolute inset-0 m-auto h-[86%] w-auto object-contain"
                  />
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 start-3 z-[5] border border-[var(--mf-hairline-strong)] bg-[var(--mf-surface)] px-2.5 py-1 text-[10px] tracking-[0.1em] text-brown">
              {t('Look total', 'إجمالي الإطلالة')} · {money(total)}
            </div>
          </Frame>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Featured collection                                                 */
/* ------------------------------------------------------------------ */
const Featured: React.FC = () => {
  const { products, isLoadingProducts } = useStore();
  const { t } = useLocale();
  const featured = useMemo(() => {
    const list = products.filter((p) => p.isFeatured !== false);
    return (list.length >= 4 ? list : products).slice(0, 8);
  }, [products]);

  return (
    <section className="mx-auto max-w-[1560px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20" id="featured">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mf-eyebrow">{t('The collection', 'التشكيلة')}</p>
          <h2 className="mt-3 text-[clamp(1.7rem,3.2vw,2.6rem)] leading-tight text-brown">
            {t('Framed pieces, Lens enabled', 'قطع داخل الإطار، مع العدسة')}
          </h2>
        </div>
        <button type="button" className="mf-link text-[11px] uppercase tracking-[0.2em] text-brown" onClick={() => navigate('#/shop')}>
          {t('View all', 'عرض الكل')}
        </button>
      </header>

      {isLoadingProducts && featured.length === 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-[var(--mf-surface-deep)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Details strip — three macro images                                  */
/* ------------------------------------------------------------------ */
const DetailsStrip: React.FC = () => {
  const { t } = useLocale();
  return (
    <section className="border-y border-[var(--mf-hairline)] bg-[var(--mf-surface-deep)]">
      <div className="mx-auto max-w-[1560px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mf-eyebrow">{t('Up close', 'عن قرب')}</p>
            <h2 className="mt-3 max-w-[22ch] text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-brown">
              {t('Fabric, cut and finish — the three things you can feel.', 'القماش والقصّة والتشطيب — ثلاثة أشياء تُحسّها.')}
            </h2>
          </div>
          <Slogan className="hidden text-[10px] uppercase text-[var(--mf-brown-muted)] sm:block" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {DETAILS_STRIP.map((item) => (
            <figure key={item.key} className="group relative">
              <div className="relative aspect-[4/5] overflow-hidden bg-maroon">
                <img
                  src={item.image}
                  alt={t(item.en, item.ar)}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brown/80 to-transparent p-4">
                  <span className="block text-[9px] uppercase tracking-[0.24em] text-cream/70">
                    {String(DETAILS_STRIP.indexOf(item) + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-1 block text-[15px] text-cream">{t(item.en, item.ar)}</span>
                </span>
              </div>
              <figcaption className="mt-3 text-[11.5px] tracking-wide text-[var(--mf-brown-soft)]">
                {t(item.lineEn, item.lineAr)}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Newsletter                                                          */
/* ------------------------------------------------------------------ */
const Newsletter: React.FC = () => {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section className="bg-maroon py-14 text-cream lg:py-20">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <img src="/img/brand/icon-mark-cream.webp" alt="" aria-hidden="true" className="mx-auto h-9 w-9 opacity-90" />
        <h2 className="mt-6 text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-cream">
          {t('Join the list. No limits, no noise.', 'انضم للقائمة. بلا حدود وبلا ضجيج.')}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[12.5px] leading-relaxed text-cream/70">
          {t('Early access to new pieces and the occasional look from the studio.', 'وصول مبكر للقطع الجديدة وبعض الإطلالات من الاستوديو.')}
        </p>

        <form
          className="mx-auto mt-8 flex max-w-md items-center gap-0 border-b border-cream/40 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.includes('@')) return;
            setDone(true);
            setEmail('');
          }}
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('Your email', 'بريدك الإلكتروني')}
            className="flex-1 bg-transparent text-[13px] text-cream placeholder:text-cream/45 focus:outline-none"
            aria-label={t('Email address', 'البريد الإلكتروني')}
          />
          <button
            type="submit"
            className="grid h-9 w-9 place-items-center text-cream transition-transform hover:translate-x-0.5"
            aria-label={t('Subscribe', 'اشترك')}
          >
            {done ? <Check className="h-4 w-4" strokeWidth={1.6} /> : <MoveRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.4} />}
          </button>
        </form>
        {done && (
          <p className="mt-3 text-[11px] text-cream/75">{t('You are on the list.', 'تم تسجيلك في القائمة.')}</p>
        )}
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
export const HomePage: React.FC = () => {
  return (
    <div>
      <Hero />
      <SplitStatement />
      <MixTeaser />
      <Featured />
      <DetailsStrip />
      <Newsletter />
    </div>
  );
};
