import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ANNOUNCEMENT_SLIDES } from '../data/constants';
import { SOCIAL_LINKS_CONFIG } from '../data/socialLinksConfig';
import { SocialIcon } from './SocialIcon';
import { 
  ShoppingBag, 
  Search, 
  User, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    cartCount, 
    setIsCartOpen, 
    viewMode, 
    setViewMode, 
    activeCategory, 
    setActiveCategory,
    setIsSearchOpen,
    settings,
    categories
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  // Display social links synchronized directly with Admin Dashboard and persistent settings
  const activeSocialLinks = useMemo(() => {
    const list = settings?.socialLinks && settings.socialLinks.length > 0
      ? settings.socialLinks
      : SOCIAL_LINKS_CONFIG;

    return list.filter(
      (link) => link.isActive && link.url && link.url.trim() !== ''
    );
  }, [settings?.socialLinks]);

  const activeAnnouncements = (settings?.announcements && settings.announcements.length > 0)
    ? settings.announcements
    : ANNOUNCEMENT_SLIDES;

  // Auto rotate announcement
  useEffect(() => {
    if (activeAnnouncements.length <= 1) return;
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % activeAnnouncements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeAnnouncements.length]);

  const currentIdx = announcementIdx % (activeAnnouncements.length || 1);

  const prevAnnouncement = () => {
    if (activeAnnouncements.length <= 1) return;
    setAnnouncementIdx((prev) => (prev - 1 + activeAnnouncements.length) % activeAnnouncements.length);
  };

  const nextAnnouncement = () => {
    if (activeAnnouncements.length <= 1) return;
    setAnnouncementIdx((prev) => (prev + 1) % activeAnnouncements.length);
  };

  const navLinks = useMemo(() => {
    const links = [
      { 
        label: 'Home', 
        active: viewMode === 'store' && activeCategory === 'all',
        action: () => { 
          setViewMode('store'); 
          setActiveCategory('all'); 
          window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } 
      },
      { 
        label: 'Shop', 
        active: false,
        action: () => { 
          setViewMode('store'); 
          setActiveCategory('all'); 
          document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' }); 
        } 
      },
    ];

    // Add dynamic categories (excluding 'all')
    const displayCategories = categories.filter((c) => c.id !== 'all');
    for (const cat of displayCategories.slice(0, 4)) {
      links.push({
        label: cat.nameEn || cat.nameAr,
        active: viewMode === 'store' && activeCategory === cat.id,
        action: () => {
          setViewMode('store');
          setActiveCategory(cat.id);
          const targetSection = document.getElementById(`section-${cat.id}`) || document.getElementById('products-section');
          targetSection?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    links.push({ 
      label: 'Track Order', 
      active: viewMode === 'track-order',
      action: () => { 
        setViewMode('track-order'); 
      } 
    });

    return links;
  }, [categories, viewMode, activeCategory, setViewMode, setActiveCategory]);

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-zinc-200/70 lg:border-[var(--mf-surface-soft)] shadow-none lg:shadow-xs">
      {/* 1. Top Announcement Bar */}
      <div className="bg-black text-white py-2 px-4 text-xs font-normal relative z-50 select-none">
        <div className="max-w-[1500px] mx-auto flex items-center justify-between">
          <button 
            onClick={prevAnnouncement} 
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="text-center font-normal tracking-wide text-[12.5px] sm:text-xs">
            <span className="transition-opacity duration-300">
              {activeAnnouncements[currentIdx] || 'Shop our latest arrivals!'}
            </span>
          </div>

          <button 
            onClick={nextAnnouncement} 
            className="p-1 text-zinc-400 hover:text-white transition-colors"
            aria-label="Next announcement"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="bg-white">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[58px] sm:h-[62px] lg:h-[72px] w-full" style={{ direction: 'ltr' }}>
            
            {/* LEFT: Mobile (Menu & Search) / Desktop (Navigation Links) */}
            <div className="justify-self-start flex items-center gap-1.5 sm:gap-3 lg:gap-6" dir="ltr" style={{ direction: 'ltr' }}>
              {/* Mobile Menu & Search Triggers */}
              <div className="flex lg:hidden items-center gap-0.5 sm:gap-1.5">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 text-black hover:opacity-60 active:scale-95 transition-all cursor-pointer flex items-center justify-center rounded-full"
                  aria-label="Menu"
                  title="Menu"
                >
                  <Menu className="w-[21px] h-[21px] stroke-[1.25]" />
                </button>
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-black hover:opacity-60 active:scale-95 transition-all cursor-pointer flex items-center justify-center rounded-full"
                  aria-label="Search"
                  title="Search products"
                >
                  <Search className="w-[20px] h-[20px] stroke-[1.25]" />
                </button>
              </div>

              {/* Desktop Navigation Links (Hidden on mobile, visible on desktop) */}
              <nav 
                className="hidden lg:flex items-center gap-5 xl:gap-7 text-[13.5px] font-normal text-black tracking-normal flex-row" 
                dir="ltr"
              >
                {navLinks.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={link.action}
                    className={`hover:opacity-60 transition-opacity whitespace-nowrap text-black cursor-pointer ${
                      link.active
                        ? 'font-medium'
                        : 'font-normal'
                    }`}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* CENTER: Brand Logo */}
            <div className="justify-self-center flex items-center justify-center text-center pointer-events-auto">
              <button
                onClick={() => {
                  setViewMode('store');
                  setActiveCategory('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="focus:outline-none flex items-center justify-center group cursor-pointer"
              >
                <span className="flex flex-col items-center leading-none">
                  <span className="font-serif font-black text-[21px] sm:text-2xl md:text-[28px] tracking-[0.14em] text-[var(--molfet-maroon)] group-hover:opacity-75 transition-opacity">
                    MOLFET
                  </span>
                  <span className="hidden sm:block font-sans font-semibold text-[8px] sm:text-[9px] tracking-[0.3em] text-[var(--mf-brown-soft)] mt-1 uppercase">
                    For Fashon
                  </span>
                </span>
              </button>
            </div>

            {/* RIGHT: Action Icons (Account, Desktop Search, Cart) */}
            <div className="justify-self-end flex items-center gap-0.5 sm:gap-1.5 lg:gap-4" dir="ltr" style={{ direction: 'ltr' }}>
              {/* Account / Support link */}
              <button
                onClick={() => setViewMode('track-order')}
                className="p-2 text-black hover:opacity-60 active:scale-95 transition-all cursor-pointer flex items-center justify-center rounded-full"
                aria-label="Account"
                title="Account & Orders"
              >
                <User className="w-[20px] h-[20px] stroke-[1.25] lg:stroke-[1.4]" />
              </button>

              {/* Desktop Search Trigger Button */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:flex p-2 text-black hover:opacity-60 transition-opacity cursor-pointer items-center justify-center rounded-full"
                aria-label="Search"
                title="Search products"
              >
                <Search className="w-5 h-5 stroke-[1.4]" />
              </button>

              {/* Cart Drawer Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-black hover:opacity-60 active:scale-95 transition-all cursor-pointer flex items-center justify-center rounded-full"
                aria-label="Cart"
                title="Shopping Bag"
              >
                <ShoppingBag className="w-[20px] h-[20px] stroke-[1.25] lg:stroke-[1.4]" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-0.5 w-4 h-4 bg-black text-white text-[9.5px] font-bold rounded-full flex items-center justify-center leading-none shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-full max-w-[320px] bg-white text-black h-full shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-left duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-zinc-200 mb-6">
                <div>
                  <span className="font-black text-2xl tracking-wider font-sans block text-[var(--molfet-maroon)]">MOLFET</span>
                  <span className="font-semibold text-[9px] tracking-[0.3em] text-[var(--mf-brown-soft)] uppercase">For Fashon</span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-zinc-600 hover:text-black rounded-full hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm font-medium">
                {navLinks.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      item.action();
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left py-2.5 px-2 rounded-lg font-normal text-[14px] transition-all flex items-center justify-between ${
                      item.active 
                        ? 'font-bold text-black bg-zinc-100' 
                        : 'text-zinc-800 hover:bg-zinc-50 hover:text-black'
                    }`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 space-y-4 text-xs text-zinc-500">
              {activeSocialLinks.length > 0 && (
                <div className="flex items-center justify-center gap-3">
                  {activeSocialLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target={link.openInNewTab !== false ? '_blank' : '_self'}
                      rel="noreferrer"
                      className="p-2 rounded-full bg-zinc-100 text-zinc-700 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                      title={link.title || link.platform}
                      aria-label={link.title || link.platform}
                    >
                      <SocialIcon platform={link.platform} className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
              <p className="text-center text-[11px] text-zinc-400">
                © {new Date().getFullYear()} {settings?.storeName || 'MOLFET FOR FASHON'} • Alexandria, Egypt
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

