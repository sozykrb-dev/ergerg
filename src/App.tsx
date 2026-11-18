import React, { useEffect, useMemo, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { LocaleProvider, useLocale } from './lib/i18n';
import { useRoute, navigate } from './lib/router';

import { Header } from './components/store/Header';
import { Footer } from './components/store/Footer';
import { HomePage } from './components/store/HomePage';
import { ShopPage } from './components/store/ShopPage';
import { ProductPage } from './components/store/ProductPage';
import { MixPage } from './components/store/MixPage';
import { RackPage } from './components/store/RackPage';
import { AboutPage } from './components/store/AboutPage';
import { CartDrawer } from './components/store/CartDrawer';

import { SearchModal } from './components/SearchModal';
import { CheckoutView } from './components/CheckoutView';
import { OrderSuccessView } from './components/OrderSuccessView';
import { TrackOrderModal } from './components/TrackOrderModal';
import { lazy, Suspense } from 'react';

// the back-office is code-split so the storefront stays light
const AdminAuthGate = lazy(() => import('./components/AdminAuthGate').then((m) => ({ default: m.AdminAuthGate })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

import { LensCursor } from './components/brand/Lens';
import { PageLoader, OpenCircle } from './components/brand/OpenCircle';
import { CircleMark, Slogan } from './components/brand/Logo';
import { LIMIT_COPY } from './data/brand';
import { Check } from 'lucide-react';

/* ---------------------------------------------------------------- */
/* toast                                                            */
/* ---------------------------------------------------------------- */
const Toast: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed bottom-5 start-1/2 z-[80] w-[min(92vw,420px)] -translate-x-1/2 rtl:translate-x-1/2" role="status" aria-live="polite">
    <div className="mf-rise flex items-center gap-3 border border-cream/20 bg-brown px-4 py-3 text-cream shadow-[0_18px_40px_rgba(50,30,25,0.35)]">
      <CircleMark className="h-4 w-4 shrink-0 brightness-0 invert-[.95] sepia-[.3] saturate-[2] hue-rotate-[-10deg]" />
      <span className="text-[11.5px] leading-snug">{message}</span>
    </div>
  </div>
);

/* ---------------------------------------------------------------- */
/* 404 — the slogan microcopy                                       */
/* ---------------------------------------------------------------- */
const NotFound: React.FC = () => {
  const { t } = useLocale();
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
      <CircleMark className="h-16 w-16 opacity-80" />
      <p className="mt-8 text-[clamp(3rem,10vw,5.5rem)] leading-none text-maroon">404</p>
      <h1 className="mt-4 max-w-[26ch] text-[clamp(1.1rem,2.4vw,1.5rem)] leading-snug text-brown">
        {t(LIMIT_COPY.notFound.en, LIMIT_COPY.notFound.ar)}
      </h1>
      <Slogan className="mt-5 text-[10px] uppercase text-[var(--mf-brown-muted)]" />
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" className="mf-btn" onClick={() => navigate('#/shop')}>{t('Back to the collection', 'عودة للتشكيلة')}</button>
        <button type="button" className="mf-btn mf-btn-ghost" onClick={() => navigate('#/')}>{t('Home', 'الرئيسية')}</button>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- */
/* routes                                                           */
/* ---------------------------------------------------------------- */
const Storefront: React.FC = () => {
  const route = useRoute();
  const { toastMessage, products, openProductModal, isLoadingProducts, settings } = useStore();
  const { t, isAr } = useLocale();
  const [booting, setBooting] = useState(true);

  // the page loader draws the brush circle in about 600ms
  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 620);
    return () => window.clearTimeout(timer);
  }, []);

  // product route opens the full product page (and keeps the old modal usable)
  const resolvedId = useMemo(() => (route.name === 'product' ? route.id : null), [route]);

  if (route.name === 'admin') {
    return (
      <Suspense fallback={<PageLoader label={t('Style Without Limits', 'Style Without Limits')} />}>
        <AdminAuthGate onCancel={() => navigate('#/')}>
          <AdminDashboard />
        </AdminAuthGate>
      </Suspense>
    );
  }

  let content: React.ReactNode;
  switch (route.name) {
    case 'home':
      content = <HomePage />;
      break;
    case 'shop':
      content = <ShopPage category={route.category} />;
      break;
    case 'product':
      content = <ProductPage productId={resolvedId as string} />;
      break;
    case 'mix':
      content = <MixPage />;
      break;
    case 'rack':
      content = <RackPage />;
      break;
    case 'about':
      content = <AboutPage />;
      break;
    case 'checkout':
      content = <CheckoutView />;
      break;
    case 'success':
      content = <OrderSuccessView />;
      break;
    case 'track':
      content = <TrackOrderModal />;
      break;
    case 'cart':
      content = <ShopPage />;
      break;
    default:
      content = <NotFound />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--mf-surface)] text-brown">
      {booting && <PageLoader label={t('Style Without Limits', 'Style Without Limits')} />}
      <Header />
      <main id="main" className="flex-1">
        {content}
      </main>
      <Footer />
      <CartDrawer />
      <SearchModal />
      <LensCursor enabled={settings?.lensEnabled !== false} />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
};

export default function App() {
  return (
    <LocaleProvider>
      <StoreProvider>
        <Storefront />
      </StoreProvider>
    </LocaleProvider>
  );
}
