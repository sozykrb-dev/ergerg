import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { Logo, CircleMark, Slogan } from '../brand/Logo';
import { ProgressRing } from '../brand/OpenCircle';
import { BRAND, NAV } from '../../data/brand';
import { Menu, X, Search, ShoppingBag, Globe, ChevronRight } from 'lucide-react';

/**
 * Header
 * - announcement bar with the slogan
 * - the wordmark, collapsing into the brush-circle icon on scroll
 * - language switch EN / AR (RTL), the cart trigger with the cart count
 */
export const Header: React.FC = () => {
  const { cartCount, setIsCartOpen, setIsSearchOpen, settings } = useStore();
  const { t, isAr, toggleLang } = useLocale();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [annIndex, setAnnIndex] = useState(0);

  const threshold = settings?.freeShippingThreshold || BRAND.freeShippingThreshold;
  const announcements = useMemo(
    () => [
      { en: settings?.slogan || 'Style Without Limits', ar: 'Style Without Limits' },
      { en: 'Designed with an Italian mindset. Crafted in Egypt.', ar: 'بتصميم إيطالي. وصناعة مصرية.' },
      { en: `Free shipping from ${threshold.toLocaleString('en-US')} EGP`, ar: `شحن مجاني من ${threshold.toLocaleString('en-US')} ج.م` },
    ],
    [settings?.slogan, threshold]
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setAnnIndex((i) => (i + 1) % announcements.length), 5200);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const go = (href: string) => {
    setMenuOpen(false);
    navigate(href);
  };

  const current = announcements[annIndex % announcements.length];

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-maroon focus:px-4 focus:py-2 focus:text-cream"
      >
        {t('Skip to content', 'انتقل إلى المحتوى')}
      </a>

      {/* announcement bar — the slogan lives here too */}
      <div className="relative z-40 bg-brown text-cream">
        <div className="mx-auto flex h-9 max-w-[1560px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* the slogan is fixed, never carousel-ed — the limit note sits beside it */}
          <Slogan className="shrink-0 text-[10px] leading-none text-cream" />
          <p className="hidden truncate text-[10px] leading-none text-[color-mix(in_srgb,var(--molfet-cream)_72%,var(--molfet-brown))] sm:block">
            {isAr ? current.ar : current.en}
          </p>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
          scrolled
            ? 'border-[var(--mf-hairline)] bg-[var(--mf-surface)]/95 backdrop-blur-md'
            : 'border-transparent bg-[var(--mf-surface)]'
        }`}
      >
        <div className="mx-auto flex max-w-[1560px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          {/* left: menu (mobile) + nav (desktop) */}
          <div className="flex flex-1 items-center gap-1">
            <button
              type="button"
              className="-ms-2 grid h-10 w-10 place-items-center text-brown lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label={t('Open menu', 'افتح القائمة')}
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" strokeWidth={1.4} />
            </button>

            <nav className="hidden items-center gap-7 lg:flex" aria-label={t('Primary', 'القائمة الرئيسية')}>
              {NAV.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.href)}
                  className="mf-link text-[11px] font-medium uppercase tracking-[0.18em] text-brown"
                >
                  {t(item.en, item.ar)}
                </button>
              ))}
            </nav>
          </div>

          {/* centre: logo, wordmark -> brush circle on scroll */}
          <button
            type="button"
            onClick={() => go('#/')}
            className="flex h-[58px] items-center justify-center gap-2 sm:h-[70px]"
            aria-label={t('MOLFET home', 'الصفحة الرئيسية MOLFET')}
          >
            <span className={`overflow-hidden transition-all duration-500 ${scrolled ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <Logo lockup="wordmarkOnCream" height={26} className="max-w-[168px] sm:max-w-none" />
            </span>
            <span
              className={`grid place-items-center transition-all duration-500 ${
                scrolled ? 'h-9 w-9 opacity-100' : 'h-0 w-0 opacity-0'
              }`}
            >
              <CircleMark className="h-full w-full" />
            </span>
          </button>

          {/* right: search / language / cart */}
          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="grid h-10 w-10 place-items-center text-brown transition-opacity hover:opacity-60"
              aria-label={t('Search', 'بحث')}
            >
              <Search className="h-[19px] w-[19px]" strokeWidth={1.2} />
            </button>

            <button
              type="button"
              onClick={toggleLang}
              className="hidden items-center gap-1.5 border border-[var(--mf-hairline-strong)] px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-brown transition-colors hover:border-maroon hover:text-maroon sm:flex"
              aria-label={t('Switch to Arabic', 'التبديل إلى الإنجليزية')}
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={1.4} />
              {isAr ? 'EN' : 'عربي'}
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative grid h-10 w-10 place-items-center text-brown transition-opacity hover:opacity-60"
              aria-label={t(`Cart, ${cartCount} items`, `السلة، ${cartCount} قطعة`)}
            >
              <ShoppingBag className="h-10 w-10 p-[11px]" strokeWidth={1.2} />
              <span className="pointer-events-none absolute end-0 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-maroon px-1 text-[9px] font-semibold leading-none text-cream">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-brown/50"
            onClick={() => setMenuOpen(false)}
            aria-label={t('Close menu', 'أغلق القائمة')}
          />
          <div className="relative flex h-full w-[86%] max-w-[360px] flex-col bg-cream">
            <div className="flex items-center justify-between border-b border-[var(--mf-hairline)] px-5 py-4">
              <Logo lockup="wordmarkOnCream" height={20} />
              <button type="button" onClick={() => setMenuOpen(false)} aria-label={t('Close', 'إغلاق')}>
                <X className="h-5 w-5" strokeWidth={1.4} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-4">
              {NAV.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.href)}
                  className="flex w-full items-center justify-between border-b border-[var(--mf-hairline)] px-3 py-4 text-start text-[15px] text-brown"
                >
                  <span>{t(item.en, item.ar)}</span>
                  <ChevronRight className="h-4 w-4 opacity-50 rtl:rotate-180" strokeWidth={1.4} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); toggleLang(); }}
                className="flex w-full items-center justify-between border-b border-[var(--mf-hairline)] px-3 py-4 text-start text-[15px] text-brown"
              >
                <span>{t('العربية', 'English')}</span>
                <Globe className="h-4 w-4 opacity-50" strokeWidth={1.4} />
              </button>
            </div>

            <div className="border-t border-[var(--mf-hairline)] px-5 py-5">
              <Slogan className="block text-[10px] text-[var(--mf-brown-soft)]" />
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">
                {t('Cairo · Egypt', 'القاهرة · مصر')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
