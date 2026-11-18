import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { EGYPT_GOVERNORATES } from '../data/constants';
import { optimizeImageClientSide } from '../lib/imageOptimizer';
import { 
  ShieldCheck, 
  Truck, 
  Banknote, 
  Smartphone, 
  ArrowLeft, 
  CheckCircle, 
  MessageCircle, 
  Copy,
  Upload,
  X,
  Image as ImageIcon,
  Check,
  Phone,
  AlertCircle
} from 'lucide-react';

export const CheckoutView: React.FC = () => {
  const { 
    cart, 
    cartSubtotal, 
    discountAmount, 
    appliedCoupon, 
    settings, 
    createOrder, 
    setViewMode,
    showToast 
  } = useStore();

  const topRef = React.useRef<HTMLDivElement>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [governorate, setGovernorate] = useState(EGYPT_GOVERNORATES[0].name);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay' | 'vodafone_cash' | 'card'>('cod');
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [isCompressingReceipt, setIsCompressingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [copiedInstaPay, setCopiedInstaPay] = useState(false);
  const [copiedInstaPayPhone, setCopiedInstaPayPhone] = useState(false);
  const [copiedVodafone, setCopiedVodafone] = useState(false);

  // Scroll to top immediately when checkout page opens so it starts from the Shipping Address
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    const timer1 = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 40);

    const timer2 = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      topRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, 120);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-black mb-2">Your cart is empty</h2>
        <p className="text-zinc-500 text-sm mb-6">Please add items to your cart before proceeding to checkout.</p>
        <button
          onClick={() => setViewMode('store')}
          className="px-6 py-3 bg-black text-white font-medium text-xs rounded-full hover:bg-zinc-800 transition-colors"
        >
          Return to shop
        </button>
      </div>
    );
  }

  // Calculate Shipping fee based on selected Governorate and Store Settings
  const selectedGovObj = EGYPT_GOVERNORATES.find((g) => g.name === governorate);
  let shippingFee = selectedGovObj ? selectedGovObj.defaultFee : (settings.defaultShippingFee || 50);

  if (selectedGovObj) {
    if (selectedGovObj.region === 'alex' && typeof settings.alexShipping === 'number') {
      shippingFee = settings.alexShipping;
    } else if (selectedGovObj.region === 'cairo_giza' && typeof settings.cairoGizaShipping === 'number') {
      shippingFee = settings.cairoGizaShipping;
    } else if (selectedGovObj.region === 'delta' && typeof settings.deltaShipping === 'number') {
      shippingFee = settings.deltaShipping;
    } else if (selectedGovObj.region === 'upper_egypt' && typeof settings.upperEgyptShipping === 'number') {
      shippingFee = settings.upperEgyptShipping;
    }
  }
  
  if (cartSubtotal >= settings.freeShippingThreshold) {
    shippingFee = 0;
  }

  const finalTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!customerName.trim()) errors.customerName = 'يرجى إدخال الاسم بالكامل';
    if (!phone.trim() || phone.length < 10) errors.phone = 'يرجى إدخال رقم هاتف صحيح (مثال: 01200000000)';
    if (!address.trim()) errors.address = 'يرجى إدخال العنوان التفصيلي لتوصيل الطلب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setReceiptError('يرجى اختيار ملف صورة صحيح (JPG, PNG, WebP)');
      return;
    }

    setIsCompressingReceipt(true);
    setReceiptError(null);
    try {
      const result = await optimizeImageClientSide(file, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.82,
        format: 'image/webp',
      });
      setPaymentReceipt(result.dataUrl);
      showToast('تم إرفاق وضغط إيصال التحويل بنجاح');
    } catch (err) {
      console.error(err);
      setReceiptError('تعذر معالجة الصورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsCompressingReceipt(false);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const orderItems = cart.map((c) => ({
      productId: c.product.id,
      title: c.product.titleEn,
      price: c.product.price,
      size: c.size,
      color: c.color,
      quantity: c.quantity,
      image: c.product.images[0] || '',
    }));

    createOrder({
      customerName,
      phone,
      altPhone: altPhone || undefined,
      governorate,
      city: city || 'City / Area',
      address,
      notes: notes || undefined,
      items: orderItems,
      subtotal: cartSubtotal,
      shippingFee,
      discount: discountAmount,
      total: finalTotal,
      appliedCoupon: appliedCoupon?.code,
      paymentMethod,
      paymentReceiptUrl: paymentReceipt || undefined,
      status: 'pending',
    });
  };

  const handleWhatsAppCheckout = () => {
    if (!validateForm()) return;

    const itemsSummary = cart
      .map((i) => `- ${i.product.titleEn} (Size: ${i.size}) × ${i.quantity} = LE ${(i.product.price * i.quantity).toFixed(2)}`)
      .join('\n');

    const receiptNotice = paymentReceipt ? '🧾 تم إرفاق سكرين شوت التحويل في الطلب بنجاح ✅\n' : '';

    const msg = encodeURIComponent(
      `طلب جديد من متجر MOLFET FOR FASHON:\n` +
      `👤 العميل: ${customerName}\n` +
      `📱 الهاتف: ${phone}\n` +
      `📍 المحافظة والمنطقة: ${governorate} - ${city || 'مصر'}\n` +
      `🏠 العنوان التفصيلي: ${address}\n` +
      `💳 الدفع: ${paymentMethod === 'cod' ? 'الدفع عند الاستلام (COD)' : paymentMethod === 'instapay' ? 'InstaPay' : 'فودافون كاش'}\n` +
      receiptNotice +
      `\n🛒 المنتجات:\n${itemsSummary}\n\n` +
      `💰 المجموع: ${cartSubtotal.toFixed(2)} ج.م\n` +
      `🚚 الشحن والتوصيل: ${shippingFee === 0 ? 'مجاناً' : `${shippingFee.toFixed(2)} ج.م`}\n` +
      (discountAmount > 0 ? `🏷️ الخصم: -${discountAmount.toFixed(2)} ج.م\n` : '') +
      `💵 الإجمالي المطلوب: ${finalTotal.toFixed(2)} ج.م`
    );

    // Also register order
    handlePlaceOrder({ preventDefault: () => {} } as any);
    window.open(`https://wa.me/${settings.whatsapp}?text=${msg}`, '_blank');
  };

  const copyInstaPayId = () => {
    const id = settings.instapayAddress || 'molfet@instapay';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedInstaPay(true);
      showToast('تم نسخ عنوان إنستاباي');
      setTimeout(() => setCopiedInstaPay(false), 2500);
    }
  };

  const copyInstaPayPhone = () => {
    const p = settings.instapayPhone || settings.phone || '01012345678';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(p);
      setCopiedInstaPayPhone(true);
      showToast('تم نسخ رقم إنستاباي');
      setTimeout(() => setCopiedInstaPayPhone(false), 2500);
    }
  };

  const copyVodafoneNumber = () => {
    const num = settings.vodafoneCashNumber || settings.phone || '01012345678';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedVodafone(true);
      showToast('تم نسخ رقم فودافون كاش');
      setTimeout(() => setCopiedVodafone(false), 2500);
    }
  };

  return (
    <div ref={topRef} id="checkout-page-root" className="py-8 sm:py-12 px-4 sm:px-8 max-w-[1200px] mx-auto text-left text-black">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setViewMode('store')}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to store</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">Checkout</h1>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Forms & Payment) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Customer Information */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
              <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">1</span>
              <h3 className="text-base font-bold text-black">Shipping Address</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Full Name (الاسم بالكامل) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="الاسم"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black text-right"
                />
                {formErrors.customerName && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.customerName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Phone Number (رقم التليفون) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01200000000"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black font-mono text-right"
                  />
                  {formErrors.phone && (
                    <p className="text-red-600 text-xs mt-1">{formErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Alternative Phone (رقم تليفون إضافي - اختياري)
                  </label>
                  <input
                    type="tel"
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="01200000000"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black font-mono text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    المحافظة (Governorate) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black text-right"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name} ({cartSubtotal >= settings.freeShippingThreshold ? 'شحن مجاني' : `${g.defaultFee} ج.م`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    المدينة / المنطقة / الحي (City / District)
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="مثال: مدينة نصر، المعادي، سموحة، المنصورة..."
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Detailed Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street name, building number, apartment, floor, landmark..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
                {formErrors.address && (
                  <p className="text-red-600 text-xs mt-1">{formErrors.address}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Order Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please call before arrival"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-4 py-2 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-200">
              <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">2</span>
              <h3 className="text-base font-bold text-black">Payment Method (طريقة الدفع)</h3>
            </div>

            <div className="space-y-4">
              {/* Cash On Delivery */}
              <label
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'bg-zinc-50 border-black ring-1 ring-black'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100 text-black">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-black block">الدفع عند الاستلام (COD)</span>
                    <span className="text-xs text-zinc-500">ادفع كاش لمندوب التوصيل بعد المعاينة والقياس</span>
                  </div>
                </div>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="w-4 h-4 accent-black"
                />
              </label>

              {/* InstaPay */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  paymentMethod === 'instapay'
                    ? 'bg-zinc-50 border-black ring-1 ring-black'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-black block">الدفع عبر تطبيق إنستاباي (InstaPay)</span>
                      <span className="text-xs text-zinc-500">تحويل فوري ومباشر مع إمكانية رفع إيصال التحويل</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'instapay'}
                    onChange={() => setPaymentMethod('instapay')}
                    className="w-4 h-4 accent-purple-700"
                  />
                </label>

                {paymentMethod === 'instapay' && (
                  <div className="mt-4 pt-4 border-t border-zinc-200 space-y-3">
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 block">
                        بيانات التحويل على InstaPay:
                      </span>

                      {/* InstaPay Address */}
                      <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">عنوان الحساب (IPA):</span>
                          <span className="font-mono font-bold text-purple-900 text-sm">
                            {settings.instapayAddress || 'molfet@instapay'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={copyInstaPayId}
                          className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedInstaPay ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedInstaPay ? 'تم النسخ' : 'نسخ العنوان'}</span>
                        </button>
                      </div>

                      {/* InstaPay Phone if configured */}
                      {settings.instapayPhone && (
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">أو عبر رقم الموبايل:</span>
                            <span className="font-mono font-bold text-purple-900 text-sm">
                              {settings.instapayPhone}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={copyInstaPayPhone}
                            className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            {copiedInstaPayPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedInstaPayPhone ? 'تم النسخ' : 'نسخ الرقم'}</span>
                          </button>
                        </div>
                      )}

                      {settings.paymentInstructions && (
                        <p className="text-[11px] text-purple-800 leading-relaxed pt-1">
                          💡 {settings.paymentInstructions}
                        </p>
                      )}
                    </div>

                    {/* Receipt Upload Dropzone */}
                    <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 bg-white text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ImageIcon className="w-5 h-5 text-purple-700" />
                        <span className="text-xs font-bold text-black">
                          إرفاق سكرين شوت التحويل (Screenshot)
                        </span>
                      </div>

                      {paymentReceipt ? (
                        <div className="relative inline-block mt-2">
                          <img
                            src={paymentReceipt}
                            alt="Receipt Preview"
                            className="max-h-48 rounded-lg border border-purple-200 object-contain shadow-xs bg-zinc-50"
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentReceipt(null)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition-colors"
                            title="حذف الصورة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="block text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            تم إرفاق إيصال التحويل بنجاح
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-zinc-500">
                            بعد إتمام التحويل عبر تطبيق InstaPay، ارفع صورة التحويل هنا لتسريع وتأكيد الطلب.
                          </p>
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isCompressingReceipt ? 'جاري ضغط ومعالجة الصورة...' : 'اختيار صورة الإيصال'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isCompressingReceipt}
                              onChange={handleReceiptFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {receiptError && (
                        <p className="text-red-600 text-xs mt-2 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {receiptError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Vodafone Cash */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  paymentMethod === 'vodafone_cash'
                    ? 'bg-zinc-50 border-black ring-1 ring-black'
                    : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-black block">فودافون كاش / المحافظ الإلكترونية</span>
                      <span className="text-xs text-zinc-500">تحويل كاش إلى محفظة المتجر المعتمدة مع إرفاق الإيصال</span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'vodafone_cash'}
                    onChange={() => setPaymentMethod('vodafone_cash')}
                    className="w-4 h-4 accent-red-600"
                  />
                </label>

                {paymentMethod === 'vodafone_cash' && (
                  <div className="mt-4 pt-4 border-t border-zinc-200 space-y-3">
                    <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-900 block">
                        رقم محفظة فودافون كاش الرسمية:
                      </span>

                      {/* Vodafone Cash Number */}
                      <div className="bg-white p-2.5 rounded-lg border border-red-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">رقم المحفظة للتحويل:</span>
                          <span className="font-mono font-bold text-red-700 text-base">
                            {settings.vodafoneCashNumber || settings.phone || '01012345678'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={copyVodafoneNumber}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-md font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {copiedVodafone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedVodafone ? 'تم النسخ' : 'نسخ الرقم'}</span>
                        </button>
                      </div>

                      {settings.paymentInstructions && (
                        <p className="text-[11px] text-red-800 leading-relaxed pt-1">
                          💡 {settings.paymentInstructions}
                        </p>
                      )}
                    </div>

                    {/* Receipt Upload Dropzone */}
                    <div className="border-2 border-dashed border-red-200 rounded-xl p-4 bg-white text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <ImageIcon className="w-5 h-5 text-red-600" />
                        <span className="text-xs font-bold text-black">
                          إرفاق سكرين شوت رسالة التحويل (SMS / Wallet Screenshot)
                        </span>
                      </div>

                      {paymentReceipt ? (
                        <div className="relative inline-block mt-2">
                          <img
                            src={paymentReceipt}
                            alt="Receipt Preview"
                            className="max-h-48 rounded-lg border border-red-200 object-contain shadow-xs bg-zinc-50"
                          />
                          <button
                            type="button"
                            onClick={() => setPaymentReceipt(null)}
                            className="absolute -top-2 -right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md cursor-pointer transition-colors"
                            title="حذف الصورة"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="block text-[11px] text-emerald-700 font-bold mt-1.5 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            تم إرفاق إيصال التحويل بنجاح
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] text-zinc-500">
                            بعد تحويل المبلغ عبر فودافون كاش، ارفع سكرين شوت رسالة التأكيد هنا لتأكيد طلبك مباشرة.
                          </p>
                          <label className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isCompressingReceipt ? 'جاري ضغط ومعالجة الصورة...' : 'اختيار صورة الإيصال'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isCompressingReceipt}
                              onChange={handleReceiptFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {receiptError && (
                        <p className="text-red-600 text-xs mt-2 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {receiptError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Order Summary) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs sticky top-28">
            <h3 className="text-base font-bold text-black mb-4 pb-3 border-b border-zinc-200">
              Order Summary ({cart.length} items)
            </h3>

            {/* Items list preview */}
            <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-xs">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.titleEn}
                    className="w-14 h-18 object-cover rounded-xs bg-[var(--mf-surface-soft)] border border-zinc-200 shrink-0"
                  />
                  <div className="flex-1">
                    <h5 className="font-semibold text-black uppercase line-clamp-1">{item.product.titleEn}</h5>
                    <p className="text-zinc-500 text-[11px]">
                      Size: {item.size} • Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-black shrink-0">
                    LE {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs text-zinc-600 border-t border-zinc-200 pt-4 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-black">LE {cartSubtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-LE {discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping ({governorate.split(' ')[0]})</span>
                <span className="font-semibold text-black">
                  {shippingFee === 0 ? 'FREE' : `LE ${shippingFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between text-sm font-bold text-black pt-3 border-t border-zinc-200">
                <span>Total</span>
                <span className="text-lg">LE {finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Primary Action: Place Order */}
            <button
              id="confirm-place-order-btn"
              type="submit"
              className="w-full py-4 bg-black hover:bg-zinc-800 text-white font-semibold text-xs rounded-full uppercase tracking-wider flex items-center justify-center gap-2 transition-all transform active:scale-98 shadow-sm mb-3"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete Order • LE {finalTotal.toFixed(2)}</span>
            </button>

            {/* Secondary Action: Order on WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppCheckout}
              className="w-full py-3 bg-[var(--molfet-maroon)]/10 hover:bg-[var(--molfet-maroon)]/20 text-[var(--molfet-maroon)] border border-[var(--molfet-maroon)]/30 font-semibold text-xs rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Order via WhatsApp</span>
            </button>

            <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-center gap-2 text-[11px] text-zinc-500 text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Open & inspect package before paying upon delivery</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
