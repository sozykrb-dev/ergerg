import React from 'react';
import { ShieldCheck, Truck, RotateCcw, Sparkles } from 'lucide-react';

export const FeaturesBar: React.FC = () => {
  const features = [
    {
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      title: 'قطن مصري 100% فاخر',
      desc: 'خامات قطنية ثقيلة 270+ GSM معالجة ضد الانكماش',
    },
    {
      icon: <Truck className="w-5 h-5 text-sky-400" />,
      title: 'توصيل فوري داخل الإسكندرية',
      desc: 'شحن سريع خلال 24-48 ساعة لكافة أحياء ومناطق الإسكندرية',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: 'معاينة وقياس عند الاستلام',
      desc: 'عاين وقيس براحتك مع المندوب قبل الدفع أو ادفع عبر InstaPay',
    },
    {
      icon: <RotateCcw className="w-5 h-5 text-purple-400" />,
      title: 'استبدال فوري في الإسكندرية',
      desc: 'مندوبنا بيوصلك لتغيير المقاس بكل سهولة وسرعة',
    },
  ];

  return (
    <section className="bg-zinc-950/60 border-b border-zinc-800/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3.5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 transition-colors"
          >
            <div className="p-2.5 rounded-lg bg-zinc-800/80 shrink-0">
              {f.icon}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">{f.title}</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
