import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { openProductModal, addToCart } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || 'M');
  const [addedAnimation, setAddedAnimation] = useState(false);

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://sole-eg.net/cdn/shop/files/0B8448E8-CC72-40E2-B2E6-D4ACF518116D.png?v=1786064994&width=1200'];

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickSelect(true);
  };

  const handleSelectSizeAndAdd = (size: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSize(size);
    addToCart(product, size, product.colors[0]?.name || 'Standard');
    setAddedAnimation(true);
    setTimeout(() => {
      setAddedAnimation(false);
      setShowQuickSelect(false);
    }, 900);
  };

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative flex flex-col bg-white text-left transition-all duration-300 select-none"
    >
      {/* Product Media Gallery Container */}
      <div 
        onClick={() => openProductModal(product)}
        className="relative aspect-[2/3] w-full overflow-hidden bg-[#f4f4f4] cursor-pointer rounded-xs"
      >
        <img
          src={images[currentImageIndex]}
          alt={product.titleEn}
          className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          loading="lazy"
        />

        {/* SALE Badge (Small black rectangle in top-left corner - controlled strictly by admin badge) */}
        {product.badge === 'SALE' && (
          <div className="absolute top-2 left-2 z-10">
            <span className="bg-black text-white text-[10px] font-extrabold px-2 py-0.5 rounded-xs tracking-wider uppercase shadow-xs">
              SALE
            </span>
          </div>
        )}

        {/* Custom Non-Sale Badges (NEW, HOT, LIMITED, BESTSELLER) */}
        {product.badge && product.badge !== 'SALE' && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] font-bold tracking-wide bg-white/95 text-black border border-black/60 px-2 py-0.5 rounded-xs uppercase shadow-xs">
              {product.badge}
            </span>
          </div>
        )}

        {/* Slideshow Arrows (Appear on hover if > 1 image) */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>

            {/* Slideshow Dots */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    currentImageIndex === idx ? 'bg-black w-3' : 'bg-black/30'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick Add "Choose" Button on bottom of image */}
        <div className="absolute bottom-3 inset-x-3 z-20 flex justify-center">
          {!showQuickSelect ? (
            <button
              onClick={handleQuickAddClick}
              className="w-full max-w-[200px] py-2 px-4 rounded-full bg-white hover:bg-[#262626] text-black hover:text-white border border-[#dfdfdf] hover:border-black text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 shadow-sm transition-all transform active:scale-95 duration-150"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.608 9.421V6.906H3.392v8.016c0 .567.224 1.112.624 1.513.4.402.941.627 1.506.627H8.63M8.818 3h2.333c.618 0 1.212.247 1.649.686a2.35 2.35 0 0 1 .683 1.658v1.562H6.486V5.344c0-.622.246-1.218.683-1.658A2.33 2.33 0 0 1 8.82 3"></path>
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M14.608 12.563v5m2.5-2.5h-5"></path>
              </svg>
              <span>Choose</span>
            </button>
          ) : (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white border border-[#dfdfdf] p-2 rounded-xl shadow-xl animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 mb-1.5 px-1">
                <span>Select Size:</span>
                <button 
                  onClick={() => setShowQuickSelect(false)}
                  className="text-zinc-400 hover:text-black text-[10px]"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => handleSelectSizeAndAdd(s, e)}
                    className="flex-1 min-w-[32px] py-1 bg-zinc-100 hover:bg-black hover:text-white rounded-md text-[11px] font-bold text-black border border-zinc-200 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {addedAnimation && (
                <div className="text-center text-[10px] font-bold text-emerald-600 mt-1 flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Added to Cart!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Details (Title & Price) */}
      <div className="pt-3 pb-1 flex flex-col space-y-1">
        <h3 
          onClick={() => openProductModal(product)}
          className="text-sm font-medium text-black tracking-tight hover:underline cursor-pointer line-clamp-1 uppercase"
        >
          {product.titleEn}
        </h3>

        <div className="flex items-baseline gap-2 text-xs font-normal">
          <span className="text-black font-semibold">
            LE {product.price.toFixed(2)}
          </span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-zinc-500 line-through text-[11.5px]">
              LE {product.compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
