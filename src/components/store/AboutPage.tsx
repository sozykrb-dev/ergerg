import React from 'react';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { BRAND } from '../../data/brand';
import { Frame } from '../brand/Frame';
import { CircleMark, Logo, MadeBadge, Slogan } from '../brand/Logo';
import { ArrowRight } from 'lucide-react';

const PILLARS = [
  {
    en: 'The circle never closes',
    ar: 'الدائرة لا تكتمل',
    bodyEn: 'The brush circle inside the O is open at the lower right. That gap is the most literal drawing of “without limits”, so it returns as the frame gap, the cursor, the loader and the cart ring.',
    bodyAr: 'دائرة الفرشاة داخل حرف O مفتوحة من أسفل اليمين. هذا الفراغ هو أبسط تعبير عن «بلا حدود»، لذلك يعود في فتحة الإطار والمؤشر واللودر وحلقة السلة.',
  },
  {
    en: 'MOLFET means eye-catching',
    ar: 'ملفت تعني لافت للنظر',
    bodyEn: 'In Arabic the name describes the effect on the viewer. The site rewards people for looking closer, which is what the Lens does.',
    bodyAr: 'بالعربية يصف الاسم الأثر الذي تتركه القطعة فيمن يراها. الموقع يكافئ من ينظر عن قرب، وهذا ما تفعله العدسة.',
  },
  {
    en: 'Italian mind, Egyptian hands',
    ar: 'عقل إيطالي وأيدٍ مصرية',
    bodyEn: 'Elegance lives in the details. Each product shows both halves: the Italian sketch and the Egyptian-made fabric.',
    bodyAr: 'الأناقة في التفاصيل. كل منتج يعرض النصفين: الرسم الإيطالي والقماش المصري.',
  },
];

export const AboutPage: React.FC = () => {
  const { t, isAr } = useLocale();

  return (
    <div>
      {/* statement */}
      <section className="bg-[var(--mf-surface)]">
        <div className="mx-auto grid max-w-[1560px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-20">
          <div>
            <p className="mf-eyebrow">{t('The brand', 'العلامة')}</p>
            <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.02] text-brown">
              {t('A name, a slogan and an open circle.', 'اسم، وشعار، ودائرة مفتوحة.')}
            </h1>
            <p className="mf-slogan mt-5 text-[11px] uppercase text-maroon">{t('Style Without Limits', 'Style Without Limits')}</p>
            <p className="mt-6 max-w-[58ch] text-[13.5px] leading-[1.9] text-[var(--mf-brown-soft)]">
              {t(BRAND.statementEn, BRAND.statementAr)}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" className="mf-btn" onClick={() => navigate('#/shop')}>
                {t('Shop the collection', 'تسوّق التشكيلة')}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.6} />
              </button>
              <MadeBadge />
            </div>
          </div>

          <div className="space-y-4">
            <Frame className="aspect-[4/3] w-full bg-cream" gap={30}>
              <img
                src="/img/detail/fabric.webp"
                alt={t('Egyptian cotton, up close', 'قطن مصري عن قرب')}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute bottom-3 start-3 z-[5] bg-[var(--mf-surface)] px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[var(--mf-brown-soft)]">
                {t('Egyptian fabric, up close', 'القماش المصري عن قرب')}
              </span>
            </Frame>

            <div className="grid grid-cols-2 gap-4">
              <Frame className="aspect-square w-full bg-maroon" gap={20} tone="dark">
                <div className="absolute inset-0 grid place-items-center">
                  <p className="mf-slogan px-4 text-center text-[9px] uppercase text-cream/85">
                    {t('Italian sketch', 'الرسم الإيطالي')}
                  </p>
                </div>
              </Frame>
              <Frame className="aspect-square w-full bg-cream" gap={20}>
                <div className="absolute inset-0 grid place-items-center">
                  <Logo lockup="iconOnCream" height={64} />
                </div>
              </Frame>
            </div>
          </div>
        </div>
      </section>

      {/* pillars */}
      <section className="border-y border-[var(--mf-hairline)] bg-[var(--mf-surface-deep)] py-14 lg:py-20">
        <div className="mx-auto max-w-[1560px] px-5 sm:px-8 lg:px-12">
          <div className="grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar, index) => (
              <article key={pillar.en} className="border-t-2 border-maroon pt-5">
                <span className="text-[9px] uppercase tracking-[0.24em] text-[var(--mf-brown-muted)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h2 className="mt-2 text-[17px] leading-snug text-brown">{t(pillar.en, pillar.ar)}</h2>
                <p className="mt-3 text-[12.5px] leading-[1.85] text-[var(--mf-brown-soft)]">{t(pillar.bodyEn, pillar.bodyAr)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* the three colours */}
      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-[1560px] px-5 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mf-eyebrow">{t('The palette', 'لوحة الألوان')}</p>
              <h2 className="mt-3 text-[clamp(1.5rem,2.8vw,2.2rem)] text-brown">
                {t('Three colours. Nothing else.', 'ثلاثة ألوان. لا شيء غيرها.')}
              </h2>
            </div>
            <Slogan className="text-[10px] uppercase text-[var(--mf-brown-muted)]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { name: t('Maroon', 'مارون'), hex: '#711518', share: '30%', use: t('Headings, buttons, key shapes, hero blocks', 'العناوين والأزرار والأشكال الأساسية ومساحات الهيرو'), dark: true },
              { name: t('Cream', 'كريمي'), hex: '#FAED99', share: '60%', use: t('Page surfaces, text on maroon and brown', 'مساحات الصفحات والنصوص على المارون والبني'), dark: false },
              { name: t('Dark brown', 'بني غامق'), hex: '#321E19', share: '10%', use: t('Body text on cream, the footer, dark sections', 'نصوص الصفحة على الكريمي والفوتر والمساحات الغامقة'), dark: true },
            ].map((swatch) => (
              <div key={swatch.hex} className="border border-[var(--mf-hairline)]">
                <div
                  className={`flex h-32 items-end justify-between p-4 ${swatch.dark ? 'text-cream' : 'text-brown'}`}
                  style={{ background: swatch.hex }}
                >
                  <span className="text-[12px] uppercase tracking-[0.16em]">{swatch.name}</span>
                  <span className="text-[10px] tabular-nums opacity-80">{swatch.share}</span>
                </div>
                <div className="p-4">
                  <p className="font-mono text-[11px] text-brown">{swatch.hex}</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--mf-brown-soft)]">{swatch.use}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-start gap-2 text-[10.5px] leading-relaxed text-[var(--mf-brown-muted)]">
            <CircleMark className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
            {t(
              'Never maroon text on brown — contrast is about 1.4:1. Every other shade on this site is mixed from these three colours.',
              'لا نص مارون على بني — التباين نحو ١٫٤:١. وكل درجة أخرى في الموقع مخلوطة من هذه الألوان الثلاثة.'
            )}
          </p>
        </div>
      </section>
    </div>
  );
};
