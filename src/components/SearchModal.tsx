import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Search, X, ArrowRight } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, products, openProductModal } = useStore();
  const [query, setQuery] = useState('');

  if (!isSearchOpen) return null;

  const results = query.trim()
    ? products.filter(
        (p) =>
          p.titleEn.toLowerCase().includes(query.toLowerCase()) ||
          p.titleAr.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.sku.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-xl bg-white border border-[#dfdfdf] rounded-2xl p-6 shadow-2xl text-left text-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-4">
          <h3 className="text-base font-bold text-black">Search MOLFET FOR FASHON</h3>
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 text-zinc-400 hover:text-black rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="relative mb-6">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for shirts, tees, pants..."
            className="w-full bg-[#f7f7f7] border border-zinc-200 rounded-xl pl-10 pr-4 py-3 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-black"
          />
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {query.trim() === '' ? (
            <div className="text-center py-8 text-xs text-zinc-400">
              Start typing to search products...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            results.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  openProductModal(product);
                  setIsSearchOpen(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={product.images[0]}
                    alt=""
                    className="w-12 h-16 object-cover rounded-xs bg-[#efefef] border border-zinc-200"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-black uppercase">{product.titleEn}</h4>
                    <p className="text-[11px] text-zinc-500">{product.category.toUpperCase()} • {product.sku}</p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <span className="text-xs font-bold text-black">LE {product.price.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
