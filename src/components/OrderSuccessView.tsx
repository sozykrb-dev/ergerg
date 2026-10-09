import React from 'react';
import { useStore } from '../context/StoreContext';
import { 
  CheckCircle2, 
  Truck, 
  MessageCircle, 
  Printer, 
  ArrowLeft, 
  Copy,
  Clock
} from 'lucide-react';

export const OrderSuccessView: React.FC = () => {
  const { lastPlacedOrder, setViewMode, settings, showToast } = useStore();

  if (!lastPlacedOrder) {
    return (
      <div className="py-20 text-center text-black">
        <p className="text-zinc-500 text-sm">No recent order to display</p>
        <button
          onClick={() => setViewMode('store')}
          className="mt-4 px-6 py-2.5 bg-black text-white font-medium text-xs rounded-full"
        >
          Return to shop
        </button>
      </div>
    );
  }

  const copyOrderNumber = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(lastPlacedOrder.orderNumber);
      showToast('Order number copied');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-12 px-4 sm:px-8 max-w-3xl mx-auto text-left text-black">
      <div className="bg-white border border-[#dfdfdf] rounded-2xl p-6 sm:p-10 shadow-xs">
        {/* Success Icon & Heading */}
        <div className="text-center mb-8 pb-8 border-b border-zinc-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mb-2">
            Order Confirmed!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 max-w-md mx-auto">
            Thank you for shopping with <span className="font-bold text-black">MOLFET</span>. Your order has been placed and will be dispatched shortly.
          </p>

          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-full">
            <span className="text-xs text-zinc-500">Order Number:</span>
            <span className="font-mono font-bold text-black tracking-wider">{lastPlacedOrder.orderNumber}</span>
            <button
              onClick={copyOrderNumber}
              className="p-1 hover:text-black text-zinc-400 transition-colors"
              title="Copy Order ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Delivery Estimates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-3">
            <Clock className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-black mb-0.5">موعد التوصيل المتوقع</h4>
              <p className="text-xs text-zinc-600">خلال 24 إلى 48 ساعة ({lastPlacedOrder.governorate})</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-3">
            <Truck className="w-5 h-5 text-zinc-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-black mb-0.5">طريقة الاستلام</h4>
              <p className="text-xs text-zinc-600">شحن وتوصيل سريع لباب البيت مع إمكانية المعاينة والقياس قبل الدفع</p>
            </div>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className="space-y-3 p-5 rounded-xl bg-[#f9f9f9] border border-zinc-200 text-xs text-zinc-700 mb-8">
          <h4 className="font-bold text-black pb-2 border-b border-zinc-200 flex items-center justify-between">
            <span>Customer & Shipping Information</span>
            <span className="text-[11px] text-zinc-400 font-normal">{new Date(lastPlacedOrder.createdAt).toLocaleDateString()}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <p><span className="text-zinc-500">Name:</span> {lastPlacedOrder.customerName}</p>
            <p><span className="text-zinc-500">Phone:</span> <span className="font-mono">{lastPlacedOrder.phone}</span></p>
            <p><span className="text-zinc-500">Governorate:</span> {lastPlacedOrder.governorate}</p>
            <p><span className="text-zinc-500">City / Area:</span> {lastPlacedOrder.city}</p>
            <p className="sm:col-span-2"><span className="text-zinc-500">Address:</span> {lastPlacedOrder.address}</p>
            {lastPlacedOrder.notes && (
              <p className="sm:col-span-2"><span className="text-zinc-500">Notes:</span> {lastPlacedOrder.notes}</p>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-8">
          <h4 className="text-xs font-bold text-black uppercase mb-3">Items Ordered:</h4>
          <div className="space-y-2">
            {lastPlacedOrder.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs">
                <div className="flex items-center gap-3">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-14 object-cover rounded-xs bg-[#efefef] border border-zinc-200" />
                  )}
                  <div>
                    <h5 className="font-bold text-black uppercase">{item.title}</h5>
                    <p className="text-[11px] text-zinc-500">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-black">LE {(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-2 mb-8">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal</span>
            <span className="font-bold text-black">LE {lastPlacedOrder.subtotal.toFixed(2)}</span>
          </div>
          {lastPlacedOrder.discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({lastPlacedOrder.appliedCoupon})</span>
              <span>-LE {lastPlacedOrder.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-600">
            <span>Shipping Fee</span>
            <span className="font-bold text-black">
              {lastPlacedOrder.shippingFee === 0 ? 'FREE' : `LE ${lastPlacedOrder.shippingFee.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold text-black pt-2 border-t border-zinc-200">
            <span>Total</span>
            <span className="text-base">LE {lastPlacedOrder.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('store')}
              className="px-5 py-2.5 bg-black text-white hover:bg-zinc-800 font-semibold text-xs rounded-full flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>متابعة التسوق</span>
            </button>
            <button
              onClick={() => {
                setViewMode('track-order');
                window.scrollTo({ top: 0, behavior: 'instant' });
              }}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold text-xs rounded-full flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-300"
            >
              <Truck className="w-4 h-4" />
              <span>تتبع الطلب</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-black rounded-full transition-colors cursor-pointer"
              title="طباعة الفاتورة"
            >
              <Printer className="w-4 h-4" />
            </button>

            <a
              href={`https://wa.me/${(settings?.whatsapp || '201012345678').replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً MOLFET، أود المتابعة بخصوص الطلب #${lastPlacedOrder.orderNumber}`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 font-semibold text-xs rounded-full flex items-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتساب</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
