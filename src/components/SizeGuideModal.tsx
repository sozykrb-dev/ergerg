import React from 'react';
import { X, Ruler, CheckCircle2 } from 'lucide-react';

interface SizeGuideModalProps {
  onClose: () => void;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({ onClose }) => {
  const sizeData = [
    { size: 'S', chest: '54 - 56 cm', length: '70 cm', weight: '55 - 68 kg', fit: 'Relaxed' },
    { size: 'M', chest: '57 - 59 cm', length: '73 cm', weight: '69 - 78 kg', fit: 'Relaxed' },
    { size: 'L', chest: '60 - 62 cm', length: '76 cm', weight: '79 - 88 kg', fit: 'Relaxed' },
    { size: 'XL', chest: '63 - 65 cm', length: '78 cm', weight: '89 - 98 kg', fit: 'Relaxed' },
    { size: '2XL', chest: '66 - 69 cm', length: '81 cm', weight: '99 - 115 kg', fit: 'Relaxed' },
  ];

  return (
    <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#dfdfdf] rounded-2xl p-6 shadow-2xl text-left text-black">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-4">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-zinc-700" />
            <h3 className="text-base font-bold text-black uppercase">MOLFET Size Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
          Our products are tailored in a comfortable modern relaxed silhouette. Choose your usual size for standard fit, or one size down for a slimmer look.
        </p>

        {/* Size Chart Table */}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 mb-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-700 font-semibold border-b border-zinc-200">
              <tr>
                <th className="p-2.5">Size</th>
                <th className="p-2.5">Chest Width</th>
                <th className="p-2.5">Total Length</th>
                <th className="p-2.5">Estimated Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {sizeData.map((row) => (
                <tr key={row.size} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-2.5 font-bold text-black">{row.size}</td>
                  <td className="p-2.5">{row.chest}</td>
                  <td className="p-2.5">{row.length}</td>
                  <td className="p-2.5">{row.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
          <div className="flex items-center gap-1.5 text-black font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fitting & Try-on Policy:</span>
          </div>
          <p>You can inspect and try sizes upon delivery before payment. Easy 14-day exchange guarantee.</p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 bg-black text-white font-semibold text-xs rounded-full hover:bg-zinc-800 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
