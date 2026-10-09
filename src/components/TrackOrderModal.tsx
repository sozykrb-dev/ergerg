import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowLeft, 
  Phone, 
  MessageCircle, 
  MapPin, 
  CreditCard,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Order } from '../types';

export const TrackOrderModal: React.FC = () => {
  const { trackSingleOrder, setViewMode, lastPlacedOrder, settings } = useStore();
  const [query, setQuery] = useState('');
  const [foundOrder, setFoundOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Auto load last placed order if user recently ordered
  useEffect(() => {
    if (lastPlacedOrder && !searched) {
      setFoundOrder(lastPlacedOrder);
      setQuery(lastPlacedOrder.orderNumber);
      setSearched(true);
    }
  }, [lastPlacedOrder]);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const targetQuery = customQuery !== undefined ? customQuery : query;
    if (!targetQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await trackSingleOrder(targetQuery.trim());
      setFoundOrder(result);
      setSearched(true);
    } catch {
      setFoundOrder(null);
      setSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { 
          labelEn: 'Pending Review', 
          labelAr: 'قيد المراجعة والتأكيد', 
          color: 'bg-amber-50 text-amber-900 border-amber-200', 
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          step: 1
        };
      case 'processing':
        return { 
          labelEn: 'Processing & Packing', 
          labelAr: 'جاري التجهيز والتعبئة', 
          color: 'bg-blue-50 text-blue-900 border-blue-200', 
          icon: <Package className="w-4 h-4 text-blue-600" />,
          step: 2
        };
      case 'shipped':
        return { 
          labelEn: 'Shipped & Out For Delivery', 
          labelAr: 'خرج للشحن والتوصيل', 
          color: 'bg-purple-50 text-purple-900 border-purple-200', 
          icon: <Truck className="w-4 h-4 text-purple-600" />,
          step: 3
        };
      case 'delivered':
        return { 
          labelEn: 'Delivered Successfully', 
          labelAr: 'تم التوصيل بنجاح', 
          color: 'bg-emerald-50 text-emerald-900 border-emerald-200', 
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
          step: 4
        };
      case 'cancelled':
        return { 
          labelEn: 'Order Cancelled', 
          labelAr: 'تم إلغاء الطلب', 
          color: 'bg-red-50 text-red-900 border-red-200', 
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          step: 0
        };
      default:
        return { 
          labelEn: 'In Progress', 
          labelAr: 'قيد المتابعة', 
          color: 'bg-zinc-50 text-zinc-900 border-zinc-200', 
          icon: <Clock className="w-4 h-4 text-zinc-600" />,
          step: 1
        };
    }
  };

  const steps = [
    { titleEn: 'Order Placed', titleAr: 'تم استلام الطلب', descAr: 'تم تأكيد طلبك بنجاح' },
    { titleEn: 'Processing', titleAr: 'جاري التجهيز', descAr: 'تجهيز وتغليف المنتجات' },
    { titleEn: 'Shipped', titleAr: 'خرج للشحن', descAr: 'مع مندوب التوصيل' },
    { titleEn: 'Delivered', titleAr: 'تم التوصيل', descAr: 'تم تسليم الشحنة للعميل' },
  ];

  return (
    <div className="min-h-[80vh] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto text-black">
      {/* Top Header Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-6">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase block mb-1">MOLFET Order Tracking</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black">تتبع حالة طلبك • Track Order</h1>
          </div>
          <button
            onClick={() => setViewMode('store')}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-black font-semibold transition-colors px-3 py-1.5 rounded-full hover:bg-zinc-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">العودة للمتجر</span>
          </button>
        </div>

        <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
          اكتب <span className="font-bold text-black">رقم الطلب</span> (مثل <span className="font-mono font-bold text-black">MLF-123456</span>) أو <span className="font-bold text-black">رقم الهاتف</span> المسجل أثناء إتمام الشراء لمتابعة حالة الشحنة فوراً.
        </p>

        {/* Quick button for last placed order */}
        {lastPlacedOrder && (
          <div className="mb-6 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-black" />
              <div className="text-xs">
                <span className="text-zinc-500">آخر طلب مسجل: </span>
                <span className="font-mono font-bold text-black">#{lastPlacedOrder.orderNumber}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setQuery(lastPlacedOrder.orderNumber);
                handleSearch(undefined, lastPlacedOrder.orderNumber);
              }}
              className="text-xs font-bold text-black bg-white hover:bg-zinc-100 border border-zinc-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>عرض تفاصيله</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search Form */}
        <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="اكتب رقم الطلب أو رقم الهاتف..."
              className="w-full bg-[#f9f9f9] border border-zinc-300 rounded-xl pl-10 pr-4 py-3 text-sm text-black focus:outline-none focus:border-black focus:bg-white transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-7 py-3 bg-black text-white hover:bg-zinc-800 disabled:opacity-50 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            {isSearching ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>تتبع الطلب (Track)</span>
          </button>
        </form>
      </div>

      {/* Search Result */}
      {searched && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {foundOrder ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
              {/* Order Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-200 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Order Details</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-xl sm:text-2xl text-black">#{foundOrder.orderNumber}</span>
                    <span className="text-xs text-zinc-500">
                      {new Date(foundOrder.createdAt).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  {(() => {
                    const badge = getStatusBadge(foundOrder.status);
                    return (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border ${badge.color}`}>
                        {badge.icon}
                        <span>{badge.labelAr} ({badge.labelEn})</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Progress Timeline Stepper */}
              {foundOrder.status !== 'cancelled' && (
                <div className="py-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase block mb-4">Shipment Progress • مسار الشحنة</span>
                  <div className="grid grid-cols-4 gap-2 relative">
                    {/* Connecting Bar */}
                    <div className="absolute top-4 left-[12%] right-[12%] h-1 bg-zinc-200 -z-0">
                      <div 
                        className="h-full bg-black transition-all duration-500"
                        style={{ 
                          width: `${Math.max(0, ((getStatusBadge(foundOrder.status).step - 1) / 3) * 100)}%` 
                        }}
                      />
                    </div>

                    {steps.map((step, idx) => {
                      const currentStep = getStatusBadge(foundOrder.status).step;
                      const isCompleted = currentStep > idx + 1;
                      const isCurrent = currentStep === idx + 1;

                      return (
                        <div key={idx} className="flex flex-col items-center text-center relative z-10">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                              isCompleted 
                                ? 'bg-black border-black text-white' 
                                : isCurrent 
                                ? 'bg-black border-black text-white ring-4 ring-zinc-200' 
                                : 'bg-white border-zinc-300 text-zinc-400'
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={`text-[11px] font-bold mt-2 ${isCurrent ? 'text-black font-black' : isCompleted ? 'text-zinc-800' : 'text-zinc-400'}`}>
                            {step.titleAr}
                          </span>
                          <span className="text-[9.5px] text-zinc-400 hidden sm:block">
                            {step.titleEn}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customer & Delivery Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-[#fafafa] border border-zinc-200 rounded-xl text-xs">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>بيانات التوصيل والعميل</span>
                  </div>
                  <p className="font-bold text-black text-sm">{foundOrder.customerName}</p>
                  <p className="text-zinc-600 font-mono">{foundOrder.phone} {foundOrder.altPhone && `• ${foundOrder.altPhone}`}</p>
                  <p className="text-zinc-700">{foundOrder.address}, {foundOrder.city}, {foundOrder.governorate}</p>
                  {foundOrder.notes && (
                    <p className="text-zinc-500 italic bg-white p-2 rounded border border-zinc-200">
                      ملاحظة العميل: {foundOrder.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:border-l md:border-zinc-200 md:pl-5">
                  <div className="flex items-center gap-2 text-zinc-500 font-bold uppercase text-[10px]">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>طريقة الدفع والتفاصيل</span>
                  </div>
                  <p className="font-bold text-black text-sm capitalize">
                    {foundOrder.paymentMethod === 'instapay' ? 'InstaPay (إنستاباي)' : foundOrder.paymentMethod === 'vodafone_cash' ? 'Vodafone Cash (فودافون كاش)' : 'Cash on Delivery (الدفع عند الاستلام)'}
                  </p>
                  <div className="space-y-1 text-zinc-600 pt-1">
                    <div className="flex justify-between">
                      <span>قيمة المنتجات:</span>
                      <span className="font-mono">{foundOrder.subtotal.toFixed(2)} LE</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مصاريف الشحن:</span>
                      <span className="font-mono">{foundOrder.shippingFee === 0 ? 'مجاناً' : `${foundOrder.shippingFee.toFixed(2)} LE`}</span>
                    </div>
                    {foundOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>الخصم:</span>
                        <span className="font-mono">-{foundOrder.discount.toFixed(2)} LE</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-black text-sm pt-1 border-t border-zinc-200">
                      <span>الإجمالي المطلوب:</span>
                      <span className="font-mono">{foundOrder.total.toFixed(2)} LE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items in Shipment */}
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase block mb-3">المنتجات في الشحنة • Items in Shipment</span>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden bg-white">
                  {foundOrder.items && foundOrder.items.length > 0 ? (
                    foundOrder.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-12 h-14 object-cover rounded-md bg-zinc-100" 
                            />
                          ) : (
                            <div className="w-12 h-14 bg-zinc-100 rounded-md flex items-center justify-center">
                              <ShoppingBag className="w-5 h-5 text-zinc-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-black">{item.title}</p>
                            <p className="text-zinc-500">
                              المقاس: <span className="font-semibold text-black uppercase">{item.size}</span>
                              {item.color && item.color !== 'Standard' && (
                                <> • اللون: <span className="font-semibold text-black">{item.color}</span></>
                              )}
                            </p>
                            <p className="text-zinc-500">الكمية: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-black text-sm">
                          LE {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-zinc-500">
                      تفاصيل المنتجات مسجلة في الشحنة
                    </div>
                  )}
                </div>
              </div>

              {/* Support & Contact Action */}
              <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-zinc-500">
                  <span>هل لديك استفسار بخصوص هذا الطلب؟</span>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {/* WhatsApp Help */}
                  <a
                    href={`https://wa.me/${(settings?.whatsapp || '201012345678').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `مرحباً MOLFET، أود الاستفسار عن طلبي رقم #${foundOrder.orderNumber}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>تواصل عبر واتساب</span>
                  </a>
                  {/* Call Store */}
                  {settings?.phone && (
                    <a
                      href={`tel:${settings.phone}`}
                      className="px-4 py-2.5 border border-zinc-300 hover:border-black text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      <span>اتصال</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Not Found State */
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-black mb-1.5">لم نتمكن من العثور على طلب بهذه البيانات</h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6 leading-relaxed">
                يرجى التأكد من كتابة رقم الطلب بصورة صحيحة (مثال: MLF-123456) أو رقم الهاتف الذي سجلت به الطلب.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setQuery('')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  إعادة المحاولة
                </button>
                <a
                  href={`https://wa.me/${(settings?.whatsapp || '201012345678').replace(/\D/g, '')}?text=${encodeURIComponent(
                    'مرحباً MOLFET، أود المساعدة في تتبع طلبي'
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-2.5 border border-zinc-300 text-black text-xs font-bold rounded-xl hover:bg-zinc-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>مساعدة خدمة العملاء</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
