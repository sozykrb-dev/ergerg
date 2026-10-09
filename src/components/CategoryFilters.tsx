import React from 'react';
import { useStore } from '../context/StoreContext';

export const CategoryFilters: React.FC = () => {
  const { activeCategory, setActiveCategory, products, categories } = useStore();

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            تصنيفات كولكشن ملفت
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            اختر القطع التي تناسب أسلوبك وإطلالتك اليومية
          </p>
        </div>
      </div>

      {/* Visual Category Cards Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
        {categories.filter((c) => c.id !== 'all').map((cat) => {
          const isSelected = activeCategory === cat.id;
          const count = products.filter((p) => {
            if (cat.id === 'sale') return (p.compareAtPrice && p.compareAtPrice > p.price) || p.badge === 'SALE';
            return p.category === cat.id;
          }).length;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`group relative overflow-hidden rounded-2xl p-3 h-32 sm:h-36 flex flex-col justify-end text-right border transition-all cursor-pointer ${
                isSelected
                  ? 'border-white ring-2 ring-white/50 bg-zinc-800'
                  : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
              }`}
            >
              {/* Category Background Image */}
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.nameAr || cat.nameEn}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover filter brightness-50 group-hover:brightness-75 group-hover:scale-105 transition-all duration-500"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-zinc-800 to-zinc-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              {/* Text Info */}
              <div className="relative z-10">
                <span className="block text-xs sm:text-sm font-bold text-white group-hover:text-zinc-100 transition-colors">
                  {cat.nameAr || cat.nameEn}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-zinc-400 font-sans-eng">{cat.nameEn}</span>
                  <span className="text-[10px] bg-white/20 backdrop-blur-md px-1.5 py-0.2 rounded text-zinc-200 font-bold">
                    {count}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
