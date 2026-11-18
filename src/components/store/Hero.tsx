import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Frame } from '../brand/Frame';
import { CircleMark, Logo, Slogan } from '../brand/Logo';
import { ArrowRight } from 'lucide-react';

/**
 * Hero — the frame-break image, the slogan and one button.
 * The subject (the model) is a cut-out layer that crosses the frame line and
 * moves 8–16px further out on hover or scroll. CSS transforms only.
 */
export const Hero: React.FC = () => {
  const { settings } = useStore();
  const { t, isAr } = useLocale();

  return (
    <section className="relative overflow-hidden bg-[var(--mf-surface)]">
      <div className="mx-auto grid max-w-[1560px] items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 lg:px-12 lg:py-16">
        {/* left: the words */}
        <div className="order-2 lg:order-1">
          <p className="mf-eyebrow mb-5 flex items-center gap-3">
            <CircleMark className="h-3.5 w-3.5" />
            {t('Italian mindset · Egyptian hands', 'عقلية إيطالية · أيدٍ مصرية')}
          </p>

          <h1 className="mf-display text-[clamp(2.4rem,6.4vw,4.6rem)] leading-[0.98] text-brown">
            {t('Break the frame.', 'اكسر الإطار.')}
          </h1>

          <p className="mf-slogan mt-5 text-[clamp(0.8rem,1.6vw,1.05rem)] uppercase text-maroon">
            {t('Style Without Limits', 'Style Without Limits')}
          </p>

          <p className="mf-measure mt-6 text-[13.5px] leading-[1.85] text-[var(--mf-brown-soft)]">
            {t(
              'Every image sits inside a thin frame — the limit. The cut, the fabric and the detail step out of it. Designed with an Italian mindset, crafted in Egypt.',
              'كل صورة داخل إطار رفيع — هذا هو الحد. أما القصّة والقماش والتفاصيل فتخرج منه. تصميم بعقلية إيطالية وتنفيذ بحرفية مصرية.'
            )}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button type="button" className="mf-btn" onClick={() => navigate('#/shop')}>
              {t('Shop the collection', 'تسوّق التشكيلة')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.6} />
            </button>
            <button type="button" className="mf-btn mf-btn-ghost" onClick={() => navigate('#/mix')}>
              {t('Build a look', 'نسّق إطلالة')}
            </button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-[var(--mf-hairline)] pt-6">
            {[
              { k: t('Fabric', 'القماش'), v: t('Egyptian cotton', 'قطن مصري') },
              { k: t('Cut', 'القصّة'), v: t('Italian flat', 'رسم إيطالي') },
              { k: t('Finish', 'التشطيب'), v: t('Hand-checked', 'مراجعة يدوية') },
            ].map((item) => (
              <div key={item.k}>
                <dt className="text-[9px] uppercase tracking-[0.2em] text-[var(--mf-brown-muted)]">{item.k}</dt>
                <dd className="mt-1 text-[12px] text-brown">{item.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* right: the framed photograph that breaks the frame */}
        <div className="order-1 lg:order-2">
          <Frame className="mx-auto aspect-[4/5] w-full max-w-[520px] bg-cream" gap={38} inset={0}>
            <img
              src={settings?.heroBannerImage || '/img/hero/model-hero.webp'}
              alt={t('MOLFET campaign — cream shirt, maroon trousers', 'حملة MOLFET — قميص كريمي وبنطلون مارون')}
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <img
              src="/img/hero/model-hero-cut.webp"
              alt=""
              aria-hidden="true"
              className="mf-break pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scale(1.03)' }}
            />
            <div className="absolute left-0 top-0 z-[5] m-4 flex flex-col gap-2">
              <Logo lockup="wordmarkOnCream" height={18} />
            </div>
            <span className="absolute bottom-4 start-4 z-[5] border border-[var(--mf-hairline-strong)] bg-[var(--mf-surface)] px-2.5 py-1 text-[9px] uppercase tracking-[0.22em] text-[var(--mf-brown-soft)]">
              {t('Break the Frame', 'اكسر الإطار')}
            </span>
          </Frame>
        </div>
      </div>

      {/* marquee: the slogan set in wide letter spacing */}
      <div className="overflow-hidden border-y border-[var(--mf-hairline)] bg-maroon py-3 text-cream">
        <div className="mf-marquee-track mf-slogan text-[11px] uppercase">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="flex items-center gap-3.5">
              <CircleMark className="h-2.5 w-2.5 opacity-80" />
              {t('Style Without Limits', 'Style Without Limits')}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
