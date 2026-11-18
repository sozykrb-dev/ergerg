import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Logo, Slogan } from '../brand/Logo';
import { OpenCircle } from '../brand/OpenCircle';
import { BRAND, NAV } from '../../data/brand';
import { SocialIcon } from '../SocialIcon';
import { ArrowUp } from 'lucide-react';

/**
 * Footer: the cream lockup on dark brown, the slogan, the four columns, and the
 * open-circle back-to-top button.
 */
export const Footer: React.FC = () => {
  const { settings, setIsCartOpen } = useStore();
  const { t, isAr } = useLocale();

  const social = useMemo(
    () => (settings?.socialLinks || []).filter((link) => link.isActive && link.url?.trim()),
    [settings?.socialLinks]
  );

  const columns = [
    {
      title: t('Shop', 'المتجر'),
      links: [
        { label: t('All pieces', 'كل القطع'), href: '#/shop' },
        { label: t('Limitless Mix', 'تنسيق بلا حدود'), href: '#/mix' },
        { label: t('The brand', 'العلامة'), href: '#/about' },
        { label: t('Track an order', 'تتبع طلب'), href: '#/track' },
      ],
    },
    {
      title: t('Help', 'المساعدة'),
      links: [
        { label: t('Shipping & delivery', 'الشحن والتوصيل'), href: '#/track' },
        { label: t('Returns & exchange', 'الاستبدال والاسترجاع'), href: '#/track' },
        { label: t('Size guide', 'دليل المقاسات'), href: '#/shop' },
        { label: t('Contact', 'تواصل معنا'), href: `https://wa.me/${settings?.whatsapp || BRAND.whatsapp}` },
      ],
    },
  ];

  return (
    <footer className="bg-brown text-cream" data-tone="dark">
      <div className="mx-auto max-w-[1560px] px-5 py-14 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.7fr))_minmax(0,1fr)]">
          {/* brand */}
          <div>
            <Logo lockup="wordmarkOnBrown" height={24} />
            <p className="mf-slogan mt-4 text-[10px] uppercase text-cream/70">{t('Style Without Limits', 'Style Without Limits')}</p>
            <p className="mt-4 max-w-[34ch] text-[11.5px] leading-[1.85] text-cream/55">
              {t(
                'Egyptian fashion with an Italian design mindset. Comfort, quality and contemporary design that expresses the personality of the wearer.',
                'أزياء مصرية بعقلية تصميم إيطالية. راحة وجودة وتصميم معاصر يعبّر عن شخصية من يرتديها.'
              )}
            </p>

            {social.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {social.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.title || link.platform}
                    className="grid h-9 w-9 place-items-center border border-cream/25 text-cream/80 transition-colors hover:border-cream hover:text-cream"
                  >
                    <SocialIcon platform={link.platform} className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* link columns */}
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-[9px] uppercase tracking-[0.24em] text-cream/45">{column.title}</p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <button type="button" onClick={() => navigate(link.href)} className="mf-link text-[11.5px] text-cream/80">
                        {link.label}
                      </button>
                    ) : (
                      <a href={link.href} target="_blank" rel="noreferrer" className="mf-link text-[11.5px] text-cream/80">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* contact */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-cream/45">{t('Visit & call', 'تواصل وزيارة')}</p>
            <a
              href={`https://wa.me/${settings?.whatsapp || BRAND.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mf-link mt-4 block text-[13px] text-cream"
              dir="ltr"
            >
              +{settings?.whatsapp || BRAND.whatsapp}
            </a>
            <p className="mt-2 text-[11px] leading-relaxed text-cream/55">
              {t('Alexandria, Egypt · delivery nationwide', 'الإسكندرية، مصر · توصيل لكل المحافظات')}
            </p>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="mf-btn mf-btn-outline-cream mf-btn-sm mt-5"
            >
              {t('Open cart', 'افتح السلة')}
            </button>
          </div>
        </div>

        <hr className="my-9 border-cream/15" />

        <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
          <p className="text-[10px] uppercase tracking-[0.14em] text-cream/45">
            © {new Date().getFullYear()} {t('MOLFET · Alexandria, Egypt', 'MOLFET · الإسكندرية، مصر')}
          </p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('#/admin')}
              className="text-[9px] uppercase tracking-[0.18em] text-cream/30 transition-colors hover:text-cream/70"
              title={t('Store admin', 'إدارة المتجر')}
            >
              {t('Admin', 'الإدارة')}
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="grid h-10 w-10 place-items-center border border-cream/25 text-cream/80 transition-colors hover:border-cream hover:text-cream"
              aria-label={t('Back to top', 'أعلى الصفحة')}
            >
              <span className="relative grid place-items-center">
                <OpenCircle size={34} strokeWidth={1.6} className="text-cream/70" />
                <ArrowUp className="absolute h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
