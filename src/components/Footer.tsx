import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { SOCIAL_LINKS_CONFIG } from '../data/socialLinksConfig';
import { ArrowRight, Check, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { SocialIcon } from './SocialIcon';

export const Footer: React.FC = () => {
  const { viewMode, setViewMode, settings } = useStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'refund' | 'shipping' | null>(null);

  // Compute active social links: synchronized directly with Admin Dashboard settings and defaults
  const activeSocialLinks = useMemo(() => {
    const list = settings?.socialLinks && settings.socialLinks.length > 0
      ? settings.socialLinks
      : SOCIAL_LINKS_CONFIG;

    return list.filter(
      (link) => link.isActive && link.url && link.url.trim() !== ''
    );
  }, [settings?.socialLinks]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
    }, 2000);
  };

  return (
    <footer className="bg-[var(--molfet-maroon)] border-t border-[var(--molfet-brown)] text-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-8 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          {/* Newsletter Section */}
          <div className="space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold tracking-[0.18em] uppercase text-[var(--molfet-cream)]">
              MOLFET — Style Without Limits
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              Get exclusive deals and early access to new products.
            </p>
          </div>

          <form onSubmit={handleSubscribe} className="relative max-w-md mx-auto">
            <div className="flex items-center border-b border-white py-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none pr-8"
              />
              <button
                type="submit"
                className="text-white hover:opacity-70 p-1 transition-opacity"
                aria-label="Subscribe to newsletter"
              >
                {subscribed ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
            {subscribed && (
              <p className="text-xs text-emerald-400 mt-2 font-medium">
                Thank you for subscribing!
              </p>
            )}
          </form>

          {/* Policy & Tracking Links */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-medium">
            <button 
              onClick={() => {
                setViewMode('track-order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-white hover:underline transition-colors font-bold flex items-center gap-1.5"
            >
              <span>Track Your Order • تتبع طلبك</span>
            </button>
            <span className="text-zinc-700">•</span>
            <button 
              onClick={() => setActivePolicyModal('refund')}
              className="hover:text-white hover:underline transition-colors"
            >
              Refund & Return Policy
            </button>
            <span className="text-zinc-700">•</span>
            <button 
              onClick={() => setActivePolicyModal('shipping')}
              className="hover:text-white hover:underline transition-colors"
            >
              Shipping Policy
            </button>
            <span className="text-zinc-700">•</span>
            <button 
              onClick={() => setActivePolicyModal('privacy')}
              className="hover:text-white hover:underline transition-colors"
            >
              Privacy Policy
            </button>
          </div>

          {/* Social Links - WhatsApp, Instagram, TikTok, Facebook side-by-side */}
          {activeSocialLinks.length > 0 && (
            <div className="flex items-center justify-center gap-4 sm:gap-5 pt-4">
              {activeSocialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.openInNewTab !== false ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="w-11 h-11 rounded-full bg-[var(--molfet-brown)]/60 border border-[var(--mf-brown-soft)]/50 text-[var(--molfet-cream)] hover:text-white hover:border-[var(--molfet-cream)] hover:bg-[var(--mf-brown-soft)]/60 transition-all transform hover:scale-110 flex items-center justify-center group shadow-xs"
                  aria-label={link.title || link.platform}
                  title={link.title || link.platform}
                >
                  <SocialIcon platform={link.platform} className="w-5 h-5 transition-transform group-hover:scale-110" />
                </a>
              ))}
            </div>
          )}

          {/* Copyright & Secret Admin Link on MOLFET */}
          <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 border-t border-zinc-800">
            <p>
              © {new Date().getFullYear()}{' '}
              <button
                onClick={() => setViewMode(viewMode === 'admin' ? 'store' : 'admin')}
                className="hover:text-white transition-colors cursor-default font-medium"
                title=""
              >
                MOLFET FOR FASHON
              </button>
            </p>
            <p className="text-zinc-500 text-[11px]">
              All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Modal */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs" 
            onClick={() => setActivePolicyModal(null)} 
          />
          <div className="relative bg-white rounded-2xl p-6 max-w-lg w-full z-10 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base">
                {activePolicyModal === 'refund' && 'Refund & Exchange Policy'}
                {activePolicyModal === 'shipping' && 'Shipping Policy'}
                {activePolicyModal === 'privacy' && 'Privacy Policy'}
              </h3>
              <button 
                onClick={() => setActivePolicyModal(null)}
                className="text-zinc-400 hover:text-black font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs sm:text-sm text-zinc-700 leading-relaxed space-y-3">
              {activePolicyModal === 'refund' && (
                <>
                  <p>• إمكانية المعاينة والقياس متاحة عند الاستلام مباشرةً مع مندوب التوصيل في كافة مناطق الإسكندرية.</p>
                  <p>• يمكن الاستبدال أو الاسترجاع خلال 14 يوماً من تاريخ الاستلام بشرط بقاء المنتج بحالته الأصلية وبالتكت.</p>
                  <p>• لطلب استبدال المقاس أو الاسترجاع السريع بالإسكندرية، يُرجى التواصل معنا عبر واتساب أو إنستجرام.</p>
                </>
              )}
              {activePolicyModal === 'shipping' && (
                <>
                  <p>• شحن وتوصيل فوري حصرياً داخل محافظة الإسكندرية.</p>
                  <p>• شحن مجاني لكافة طلبات الإسكندرية التي تتجاوز 2900 جنيه.</p>
                  <p>• مدة التوصيل: خلال 24 إلى 48 ساعة فقط حتى باب بيتك في أي منطقة بالإسكندرية.</p>
                </>
              )}
              {activePolicyModal === 'privacy' && (
                <>
                  <p>• We respect your privacy. Customer information is solely used to process shipping, orders, and delivery confirmation.</p>
                  <p>• Your personal data is never shared with third parties.</p>
                </>
              )}
            </div>

            <div className="pt-3 border-t">
              <button
                onClick={() => setActivePolicyModal(null)}
                className="w-full py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
