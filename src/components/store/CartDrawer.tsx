import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useLocale } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import { ProgressRing, OpenCircle } from '../brand/OpenCircle';
import { CircleMark, Slogan } from '../brand/Logo';
import { Frame } from '../brand/Frame';
import { BRAND, LIMIT_COPY } from '../../data/brand';
import { X, Minus, Plus, Trash2, ArrowRight, Truck } from 'lucide-react';

/**
 * The cart drawer. The free-shipping progress ring is drawn as the brush
 * circle: the stroke fills toward the gap and lights up in cream when the
 * threshold is reached.
 */
export const CartDrawer: React.FC = () => {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateCartQuantity,
    cartSubtotal,
    settings,
    appliedCoupon,
    couponError,
    applyCoupon,
    removeCoupon,
    discountAmount,
  } = useStore();
  const { t, isAr, money } = useLocale();
  const [code, setCode] = useState('');

  if (!isCartOpen) return null;

  const threshold = settings?.freeShippingThreshold || BRAND.freeShippingThreshold;
  const progress = Math.min(1, cartSubtotal / threshold);
  const remaining = Math.max(0, threshold - cartSubtotal);
  const complete = remaining === 0;
  const total = Math.max(0, cartSubtotal - discountAmount);

  const close = () => setIsCartOpen(false);

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label={t('Close cart', 'إغلاق السلة')} onClick={close} className="absolute inset-0 bg-brown/55 backdrop-blur-[2px]" />

      <aside
        className="absolute inset-y-0 end-0 flex w-full max-w-[420px] flex-col bg-[var(--mf-surface)] shadow-[-24px_0_60px_rgba(50,30,25,0.22)]"
        role="dialog"
        aria-modal="true"
        aria-label={t('Cart', 'السلة')}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-[var(--mf-hairline)] px-5 py-4">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[15px] uppercase tracking-[0.16em] text-brown">{t('Cart', 'السلة')}</h2>
            <span className="text-[10px] tabular-nums text-[var(--mf-brown-muted)]">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} {t('items', 'قطعة')}
            </span>
          </div>
          <button type="button" onClick={close} aria-label={t('Close', 'إغلاق')} className="grid h-8 w-8 place-items-center text-brown/70 hover:text-maroon">
            <X className="h-4 w-4" strokeWidth={1.4} />
          </button>
        </div>

        {/* free-shipping ring */}
        <div className="border-b border-[var(--mf-hairline)] bg-brown px-5 py-4 text-cream">
          <div className="flex items-center gap-4">
            <ProgressRing
              progress={progress}
              complete={complete}
              size={58}
              label={complete ? <CircleMark className="h-4 w-4" /> : <span className="text-[9px] tabular-nums text-cream">{Math.round(progress * 100)}%</span>}
            />
            <div className="min-w-0">
              <p className="text-[10.5px] leading-snug text-cream/90">
                {t(LIMIT_COPY.shippingBar.en(money(threshold)), LIMIT_COPY.shippingBar.ar(money(threshold)))}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-cream/60">
                {complete
                  ? t('Free shipping unlocked', 'تم تفعيل الشحن المجاني')
                  : t(`${money(remaining)} to go`, `باقي ${money(remaining)}`)}
              </p>
            </div>
          </div>
        </div>

        {/* items */}
        <div className="flex-1 overflow-y-auto px-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
              <Frame className="h-20 w-20 bg-cream" gap={18}>
                <div className="absolute inset-0 grid place-items-center">
                  <CircleMark className="h-8 w-8 opacity-70" />
                </div>
              </Frame>
              <p className="max-w-[24ch] text-[13px] leading-relaxed text-[var(--mf-brown-soft)]">
                {t(LIMIT_COPY.emptyCart.en, LIMIT_COPY.emptyCart.ar)}
              </p>
              <button type="button" className="mf-btn" onClick={() => { close(); navigate('#/shop'); }}>
                {t('Start building it', 'ابدأ التكوين')}
              </button>
              <Slogan className="mt-2 text-[9.5px] uppercase text-[var(--mf-brown-muted)]" />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--mf-hairline)]">
              {cart.map((item) => (
                <li key={item.id} className="flex gap-3.5 py-4">
                  <div className="relative h-[92px] w-[74px] shrink-0 overflow-hidden bg-cream">
                    <img
                      src={item.product.cutoutUrl || item.product.images?.[0]}
                      alt={isAr ? item.product.titleAr : item.product.titleEn}
                      className="absolute inset-0 m-auto h-[92%] w-auto object-contain"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[11px] uppercase tracking-[0.06em] text-brown">
                          {isAr ? item.product.titleAr : item.product.titleEn}
                        </p>
                        <button type="button" onClick={() => removeFromCart(item.id)} aria-label={t('Remove', 'إزالة')} className="text-[var(--mf-brown-muted)] hover:text-maroon">
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.4} />
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-[var(--mf-brown-muted)]">
                        {item.size} · {item.color}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-[var(--mf-hairline-strong)]">
                        <button type="button" onClick={() => updateCartQuantity(item.id, -1)} className="grid h-7 w-7 place-items-center text-brown/80 hover:text-maroon" aria-label={t('Decrease', 'تقليل')}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-[11px] tabular-nums">{item.quantity}</span>
                        <button type="button" onClick={() => updateCartQuantity(item.id, 1)} className="grid h-7 w-7 place-items-center text-brown/80 hover:text-maroon" aria-label={t('Increase', 'زيادة')}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-[11.5px] tabular-nums text-brown">{money(item.product.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* footer */}
        {cart.length > 0 && (
          <div className="border-t border-[var(--mf-hairline)] px-5 py-4">
            {/* promo */}
            {appliedCoupon ? (
              <div className="mb-3 flex items-center justify-between border border-maroon/30 bg-cream px-3 py-2">
                <span className="text-[10.5px] uppercase tracking-[0.12em] text-maroon">
                  {appliedCoupon.code} · −{money(discountAmount)}
                </span>
                <button type="button" onClick={removeCoupon} className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--mf-brown-soft)] hover:text-maroon">
                  {t('Remove', 'إزالة')}
                </button>
              </div>
            ) : (
              <form
                className="mb-3 flex items-stretch"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (applyCoupon(code)) setCode('');
                }}
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={t('Promo code', 'كود الخصم')}
                  aria-label={t('Promo code', 'كود الخصم')}
                  className="min-w-0 flex-1 border border-[var(--mf-hairline-strong)] bg-transparent px-3 py-2 text-[11px] text-brown focus:border-maroon focus:outline-none"
                />
                <button type="submit" className="border border-s-0 border-[var(--mf-hairline-strong)] px-3 text-[9.5px] uppercase tracking-[0.14em] text-brown hover:bg-maroon hover:text-cream">
                  {t('Apply', 'تطبيق')}
                </button>
              </form>
            )}
            {couponError && <p className="mb-2 text-[10px] text-maroon">{couponError}</p>}

            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--mf-brown-muted)]">{t('Subtotal', 'الإجمالي الفرعي')}</span>
              <span className="text-[16px] tabular-nums text-brown">{money(total)}</span>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.1em] text-[var(--mf-brown-muted)]">
              <Truck className="h-3 w-3" strokeWidth={1.4} />
              {t('Shipping and discount confirmed at checkout', 'الشحن والخصم يُحسبان عند إتمام الطلب')}
            </p>

            <button
              type="button"
              className="mf-btn mt-4 w-full"
              onClick={() => { close(); navigate('#/checkout'); }}
            >
              {t('Checkout', 'إتمام الطلب')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.6} />
            </button>
            <button type="button" onClick={close} className="mf-link mt-3 block w-full text-center text-[9.5px] uppercase tracking-[0.16em] text-[var(--mf-brown-soft)]">
              {t('Continue shopping', 'متابعة التسوّق')}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};
