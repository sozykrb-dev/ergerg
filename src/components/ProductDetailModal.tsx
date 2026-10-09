import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  ShoppingBag, 
  Ruler, 
  Check, 
  Share2, 
  Truck, 
  ShieldCheck, 
  RotateCcw,
  Zap
} from 'lucide-react';
import { SizeGuideModal } from './SizeGuideModal';

export const ProductDetailModal: React.FC = () => {
  const { 
    selectedProduct, 
    closeProductModal, 
    addToCart, 
    setViewMode,
    showToast
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  if (!selectedProduct) return null;

  const currentSize = selectedSize || selectedProduct.sizes[0] || 'M';
  const images = selectedProduct.images && selectedProduct.images.length > 0 
    ? selectedProduct.images 
    : ['https://sole-eg.net/cdn/shop/files/0B8448E8-CC72-40E2-B2E6-D4ACF518116D.png?v=1786064994&width=1200'];

  const handleAddToCart = () => {
    addToCart(selectedProduct, currentSize, selectedProduct.colors[0]?.name || 'Standard', quantity);
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      closeProductModal();
    }, 600);
  };

  const handleBuyNow = () => {
    addToCart(selectedProduct, currentSize, selectedProduct.colors[0]?.name || 'Standard', quantity);
    closeProductModal();
    setViewMode('checkout');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white border border-[#dfdfdf] rounded-2xl overflow-hidden shadow-2xl my-auto text-left text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeProductModal}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-black hover:text-white text-black border border-zinc-200 shadow-sm transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Column */}
          <div className="p-5 sm:p-8 bg-[#f9f9f9] flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-[#dfdfdf]">
            <div className="relative w-full aspect-[2/3] rounded-xs overflow-hidden bg-[#efefef]">
              <img
                src={images[activeImageIndex] || images[0]}
                alt={selectedProduct.titleEn}
                className="w-full h-full object-cover object-center"
              />
              {/* SALE Badge (Small black rectangle in top-left corner - controlled strictly by admin checkbox/badge) */}
              {selectedProduct.badge === 'SALE' && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="bg-black text-white text-[10px] font-extrabold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
                    SALE
                  </span>
                </div>
              )}
              {selectedProduct.badge && selectedProduct.badge !== 'SALE' && (
                <div className="absolute top-2.5 right-2.5 z-10">
                  <span className="bg-white/95 text-black border border-black/60 text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase shadow-xs">
                    {selectedProduct.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 mt-4 overflow-x-auto w-full py-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative w-14 h-18 rounded-xs overflow-hidden border shrink-0 transition-all ${
                      activeImageIndex === i ? 'ring-2 ring-black border-black' : 'border-zinc-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Column */}
          <div className="p-6 sm:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto space-y-6">
            <div>
              <span className="text-[11px] font-semibold text-[#6A7743] uppercase tracking-widest block mb-1">
                MOLFET FOR FASHON
              </span>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black uppercase leading-tight mb-2">
                {selectedProduct.titleEn}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-xl sm:text-2xl font-bold text-black">
                  LE {selectedProduct.price.toFixed(2)}
                </span>
                {selectedProduct.compareAtPrice && selectedProduct.compareAtPrice > selectedProduct.price && (
                  <span className="text-sm text-zinc-500 line-through">
                    LE {selectedProduct.compareAtPrice.toFixed(2)}
                  </span>
                )}
                <span className="text-xs text-zinc-500">Taxes included.</span>
              </div>

              {/* Size Selector */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-800">
                    Size: <span className="font-bold text-black">{currentSize}</span>
                  </span>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="text-xs text-zinc-600 hover:text-black flex items-center gap-1 font-medium underline"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Size guide</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`min-w-[44px] px-3 py-2 rounded-md text-xs font-bold border transition-all ${
                        currentSize === s
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-white text-zinc-800 border-zinc-300 hover:border-black'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="mb-6">
                <span className="text-xs font-semibold text-zinc-800 block mb-2">Quantity:</span>
                <div className="inline-flex items-center border border-zinc-300 rounded-full px-3 py-1 gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-zinc-600 hover:text-black font-bold text-sm px-1"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="text-zinc-600 hover:text-black font-bold text-sm px-1"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 mb-6">
                <button
                  id="modal-add-to-cart"
                  onClick={handleAddToCart}
                  className="w-full py-3.5 bg-black hover:bg-zinc-800 text-white font-semibold text-xs rounded-full uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform active:scale-98"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{addedAnimation ? 'Added to Cart!' : 'Add to cart'}</span>
                </button>

                <button
                  id="modal-buy-now"
                  onClick={handleBuyNow}
                  className="w-full py-3.5 bg-white hover:bg-zinc-100 text-black border border-black font-semibold text-xs rounded-full uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy it now</span>
                </button>
              </div>

              {/* Product Description */}
              <div className="border-t border-zinc-200 pt-4 space-y-3 text-xs text-zinc-700 leading-relaxed">
                <p>{selectedProduct.descriptionEn || selectedProduct.descriptionAr}</p>
                <div className="bg-zinc-50 p-3 rounded-lg space-y-1 text-[11px] text-zinc-600">
                  <p><strong>Fabric:</strong> {selectedProduct.fabricDetails}</p>
                  {selectedProduct.gsm && <p><strong>Weight:</strong> {selectedProduct.gsm}</p>}
                  <p><strong>Fit:</strong> {selectedProduct.fitType} Fit</p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 text-xs text-zinc-500">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 hover:text-black transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <Truck className="w-4 h-4" />
                <span>متوفر بالمخزن • توصيل فوري بالإسكندرية</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
    </div>
  );
};
