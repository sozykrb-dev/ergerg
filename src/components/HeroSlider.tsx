import React from 'react';
import { useStore } from '../context/StoreContext';

export const HeroSlider: React.FC = () => {
  const { setActiveCategory, settings } = useStore();

  const handleNewArrivalsClick = () => {
    setActiveCategory('all');
    document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const bannerImageUrl = settings?.heroBannerImage || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop';
  const buttonText = settings?.heroButtonText || 'New Arrivals';

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Wide Editorial Banner matching screenshot */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[3/1] max-h-[420px] min-h-[180px] sm:min-h-[240px] overflow-hidden bg-[var(--mf-surface-soft)]">
        <img
          src={bannerImageUrl}
          alt={buttonText}
          className="w-full h-full object-cover object-[center_35%] transition-opacity duration-300"
          loading="eager"
        />

        {/* Centered 'New Arrivals' Button directly on banner as in screenshot */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={handleNewArrivalsClick}
            className="pointer-events-auto px-7 sm:px-9 py-2 sm:py-2.5 rounded-lg border border-[var(--molfet-cream)] bg-[var(--molfet-maroon)]/60 hover:bg-[var(--molfet-maroon)]/90 text-[var(--molfet-cream)] hover:text-white font-medium text-xs sm:text-sm tracking-wide backdrop-blur-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </section>
  );
};


