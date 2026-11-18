import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  Truck, 
  Tag, 
  Check, 
  AlertCircle 
} from 'lucide-react';

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
    setViewMode 
  } = useStore();

  const [couponInput, setCouponInput] = useState('');

  if (!isCartOpen) return null;

  const freeShippingThreshold = settings.freeShippingThreshold || 2900;
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const finalTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput) return;
    const success = applyCoupon(couponInput);
    if (success) {
      setCouponInput('');
    }
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setViewMode('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark backdrop overlay */}
      <div 
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white border-l border-[var(--mf-hairline)] text-black shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[var(--mf-hairline)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">Cart</h2>
              <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-zinc-500 hover:text-black transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="bg-[var(--mf-surface-soft)] p-4 border-b border-[var(--mf-hairline)]">
            <div className="flex items-center justify-between text-xs mb-2 font-medium">
              <span>
                {remainingForFreeShipping === 0 ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    You unlocked FREE SHIPPING!
                  </span>
                ) : (
                  <span>
                    Add <strong className="font-bold text-black">LE {remainingForFreeShipping.toFixed(2)}</strong> for Free Shipping
                  </span>
                )}
              </span>
              <span className="text-[11px] text-zinc-500">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  remainingForFreeShipping === 0 ? 'bg-emerald-600' : 'bg-black'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
                <h3 className="text-xl font-bold text-black">Your cart is empty</h3>
                <p className="text-xs text-zinc-500 max-w-xs">
                  Have an account? Log in to check out faster.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs rounded-full transition-colors"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 pb-4 border-b border-zinc-100 items-start"
                >
                  <img
                    src={item.product.images[0]}
                    alt={item.product.titleEn}
                    className="w-20 h-24 object-cover rounded-xs bg-[var(--mf-surface-soft)] shrink-0 border border-zinc-200"
                  />

                  <div className="flex-1 flex flex-col justify-between min-h-[96px]">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-black uppercase line-clamp-1">
                          {item.product.titleEn}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-zinc-400 hover:text-red-600 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
                        <span className="font-medium">Size: {item.size}</span>
                        {item.color && (
                          <>
                            <span>•</span>
                            <span>{item.color}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-zinc-300 rounded-full px-2 py-0.5 gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.id, -1)}
                          className="text-zinc-600 hover:text-black p-0.5 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-4 text-center text-xs font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, 1)}
                          className="text-zinc-600 hover:text-black p-0.5 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-black">
                        LE {(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Subtotal, Promo & Checkout */}
          {cart.length > 0 && (
            <div className="p-5 bg-white border-t border-[var(--mf-hairline)] space-y-4">
              {/* Promo Code Input */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                    <div className="flex items-center gap-1.5 text-black font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{appliedCoupon.code} applied (-LE {discountAmount.toFixed(2)})</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-zinc-500 hover:text-red-600 text-[11px] underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Discount code (e.g. SOLE20)"
                      className="flex-1 bg-white border border-zinc-300 rounded-md px-3 py-2 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-medium text-xs rounded-md transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                )}

                {couponError && (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {couponError}
                  </p>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-zinc-600 border-t border-zinc-100 pt-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-black">LE {cartSubtotal.toFixed(2)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>-LE {discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Estimated Shipping</span>
                  <span>{remainingForFreeShipping === 0 ? 'FREE' : 'Calculated at checkout'}</span>
                </div>

                <div className="flex justify-between text-sm font-bold text-black pt-2 border-t border-zinc-200">
                  <span>Total</span>
                  <span>LE {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                id="cart-checkout-btn"
                onClick={handleCheckout}
                className="w-full py-3.5 bg-black hover:bg-zinc-800 text-white font-semibold text-xs rounded-full uppercase tracking-wider transition-all transform active:scale-98"
              >
                Check out • LE {finalTotal.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
