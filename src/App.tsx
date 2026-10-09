import React, { useMemo } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { HeroSlider } from './components/HeroSlider';
import { FeaturesBar } from './components/FeaturesBar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { SearchModal } from './components/SearchModal';
import { CheckoutView } from './components/CheckoutView';
import { OrderSuccessView } from './components/OrderSuccessView';
import { TrackOrderModal } from './components/TrackOrderModal';
import { AdminAuthGate } from './components/AdminAuthGate';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { CATEGORIES } from './data/constants';
import { Check } from 'lucide-react';

const ToastNotification: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="fixed bottom-6 right-6 z-70 bg-black text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-zinc-800 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5" />
      </div>
      <span>{message}</span>
    </div>
  );
};

const StorefrontContent: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    products,
    isLoadingProducts,
    activeCategory,
    setActiveCategory,
    categories,
    toastMessage,
  } = useStore();

  const activeCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === activeCategory);
  }, [categories, activeCategory]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (activeCategory === 'all') return products;
    if (activeCategory === 'sale') {
      return products.filter(
        (p) => (p.compareAtPrice && p.compareAtPrice > p.price) || p.badge === 'SALE'
      );
    }
    const targetKey = activeCategory.toLowerCase().trim();
    const matchedCategory = categories.find(
      (c) => c.id.toLowerCase() === targetKey || c.slug?.toLowerCase() === targetKey
    );

    return products.filter((p) => {
      const pCat = (p.category || '').toLowerCase().trim();
      if (!pCat) return false;
      if (pCat === targetKey) return true;
      if (matchedCategory) {
        if (pCat === matchedCategory.id.toLowerCase()) return true;
        if (matchedCategory.slug && pCat === matchedCategory.slug.toLowerCase()) return true;
        if (matchedCategory.nameEn && pCat === matchedCategory.nameEn.toLowerCase()) return true;
        if (matchedCategory.nameAr && pCat === matchedCategory.nameAr.toLowerCase()) return true;
      }
      return false;
    });
  }, [products, activeCategory, categories]);

  if (viewMode === 'admin') {
    return (
      <AdminAuthGate onCancel={() => setViewMode('store')}>
        <AdminDashboard />
      </AdminAuthGate>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-black selection:bg-black selection:text-white">
      <Header />

      <main className="flex-1">
        {viewMode === 'checkout' && <CheckoutView />}

        {viewMode === 'order-success' && <OrderSuccessView />}

        {viewMode === 'track-order' && <TrackOrderModal />}

        {viewMode === 'store' && (
          <>
            <HeroSlider />

            <section id="products-section" className="max-w-[1500px] mx-auto px-4 sm:px-8 py-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-zinc-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black capitalize">
                    {activeCategory === 'all'
                      ? 'All Products'
                      : activeCategoryObj?.nameEn || activeCategoryObj?.nameAr || activeCategory}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {filteredProducts.length} items available
                  </p>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat.id;
                    const count = products.filter((p) => {
                      if (cat.id === 'all') return true;
                      if (cat.id === 'sale') return (p.compareAtPrice && p.compareAtPrice > p.price) || p.badge === 'SALE';
                      const pCat = (p.category || '').toLowerCase().trim();
                      const catId = cat.id.toLowerCase().trim();
                      const catSlug = (cat.slug || '').toLowerCase().trim();
                      return pCat === catId || (catSlug && pCat === catSlug);
                    }).length;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-black text-white shadow-xs'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-black'
                        }`}
                      >
                        <span>{cat.nameEn || cat.nameAr}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isLoadingProducts ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 animate-pulse">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <div key={n} className="space-y-3">
                      <div className="aspect-[2/3] bg-zinc-100 rounded-xs" />
                      <div className="h-4 bg-zinc-100 rounded w-3/4" />
                      <div className="h-3 bg-zinc-100 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-zinc-500 text-sm">No products found in this category.</p>
                  <button
                    onClick={() => setActiveCategory('all')}
                    className="mt-4 px-6 py-2 bg-black text-white text-xs rounded-full cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    View All Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />

      <ProductDetailModal />
      <CartDrawer />
      <SearchModal />
      {toastMessage && <ToastNotification message={toastMessage} />}
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <StorefrontContent />
    </StoreProvider>
  );
}

