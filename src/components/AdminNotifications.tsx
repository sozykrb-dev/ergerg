import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  CheckCheck, 
  Trash2, 
  ShoppingBag, 
  ExternalLink, 
  X, 
  Smartphone, 
  Clock, 
  Phone, 
  MapPin, 
  Sparkles,
  Play
} from 'lucide-react';
import { 
  AdminNotification, 
  getSavedNotifications, 
  saveNotifications, 
  getSeenOrderIds, 
  addSeenOrderId, 
  isSoundEnabled, 
  setSoundEnabled, 
  playNewOrderSound, 
  requestDesktopNotificationPermission, 
  getDesktopNotificationPermission, 
  triggerDesktopNotification,
  isDesktopNotificationSupported
} from '../lib/orderNotifications';
import { getSupabase } from '../lib/supabase';

interface AdminNotificationsProps {
  onSelectOrder?: (orderNumber: string) => void;
  onRefreshOrders?: () => void;
  onOpenSettings?: () => void;
}

export const AdminNotifications: React.FC<AdminNotificationsProps> = ({ 
  onSelectOrder, 
  onRefreshOrders,
  onOpenSettings
}) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>(getSavedNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled);
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission>(getDesktopNotificationPermission);
  const [activeBanner, setActiveBanner] = useState<AdminNotification | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bannerTimeoutRef = useRef<any>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Save changes to localStorage
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle incoming notification
  const handleIncomingNotification = useCallback((notif: AdminNotification) => {
    const seen = getSeenOrderIds();
    if (seen.has(notif.orderId) || seen.has(notif.orderNumber)) {
      return;
    }
    addSeenOrderId(notif.orderId);
    addSeenOrderId(notif.orderNumber);

    setNotifications(prev => [notif, ...prev.filter(n => n.orderId !== notif.orderId)].slice(0, 50));

    // Play Sound if enabled
    if (soundOn) {
      playNewOrderSound();
    }

    // Trigger Desktop Push notification
    triggerDesktopNotification(notif, () => {
      if (onSelectOrder) onSelectOrder(notif.orderNumber);
    });

    // Show floating in-app banner for 8 seconds
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setActiveBanner(notif);
    bannerTimeoutRef.current = setTimeout(() => {
      setActiveBanner(null);
    }, 8000);

    // Refresh orders list if parent provided callback
    if (onRefreshOrders) {
      onRefreshOrders();
    }
  }, [soundOn, onSelectOrder, onRefreshOrders]);

  // 1. Listen for Local Window Custom Events & Cross-tab BroadcastChannel
  useEffect(() => {
    const handleLocalEvent = (e: any) => {
      if (e.detail) {
        handleIncomingNotification(e.detail);
      }
    };
    window.addEventListener('molfet_new_order_event', handleLocalEvent);

    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('molfet_admin_channel');
        broadcastChannel.onmessage = (ev) => {
          if (ev.data && ev.data.type === 'NEW_ORDER' && ev.data.payload) {
            handleIncomingNotification(ev.data.payload);
          }
        };
      } catch {
        // Ignore
      }
    }

    return () => {
      window.removeEventListener('molfet_new_order_event', handleLocalEvent);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [handleIncomingNotification]);

  // 2. Real-time Supabase Postgres Changes Subscription + Periodic Polling (every 12s)
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Track existing orders on mount to prevent alerting old existing orders
    const initialInit = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number')
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) {
          data.forEach((o: any) => {
            addSeenOrderId(o.id);
            addSeenOrderId(o.order_number);
          });
        }
      } catch {
        // Ignore
      }
    };
    initialInit();

    // Supabase Realtime channel
    const channel = supabase
      .channel('admin_live_orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload: any) => {
          const row = payload.new;
          if (row && row.id && row.order_number) {
            const notif: AdminNotification = {
              id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              orderId: row.id,
              orderNumber: row.order_number,
              customerName: row.customer_name || 'عميل مجهول',
              phone: row.phone || '',
              total: Number(row.total) || 0,
              governorate: row.governorate,
              paymentMethod: row.payment_method,
              createdAt: row.created_at || new Date().toISOString(),
              isRead: false,
            };
            handleIncomingNotification(notif);
          }
        }
      )
      .subscribe();

    // Periodic Polling Fallback (every 12 seconds)
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, phone, total, governorate, payment_method, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (data && data.length > 0) {
          const seen = getSeenOrderIds();
          for (const row of data) {
            if (!seen.has(row.id) && !seen.has(row.order_number)) {
              const notif: AdminNotification = {
                id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                orderId: row.id,
                orderNumber: row.order_number,
                customerName: row.customer_name || 'عميل',
                phone: row.phone || '',
                total: Number(row.total) || 0,
                governorate: row.governorate,
                paymentMethod: row.payment_method,
                createdAt: row.created_at || new Date().toISOString(),
                isRead: false,
              };
              handleIncomingNotification(notif);
            }
          }
        }
      } catch {
        // Polling failure silent fallback
      }
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [handleIncomingNotification]);

  // Toggle Sound Preference
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) {
      playNewOrderSound();
    }
  };

  // Test Sound
  const handleTestSound = () => {
    playNewOrderSound();
  };

  // Request Desktop Permission
  const handleEnableDesktop = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPerm(perm);
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Clear all notifications
  const handleClearAll = () => {
    setNotifications([]);
  };

  // Open specific order
  const handleOpenNotification = (notif: AdminNotification) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);
    setActiveBanner(null);
    if (onSelectOrder) {
      onSelectOrder(notif.orderNumber);
    }
  };

  // Format relative time in Arabic
  const formatTimeAgo = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 45) return 'الآن';
      if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
      if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
      return new Date(isoString).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* 1. Floating In-App New Order Banner Popup */}
      {activeBanner && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-70 w-[92vw] max-w-[480px] bg-black text-white rounded-2xl p-4 shadow-2xl border border-zinc-700 animate-in fade-in slide-in-from-top-6 duration-300"
          dir="rtl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 animate-pulse">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    طلب جديد وارد الآن!
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    #{activeBanner.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 truncate">
                  العميل: <strong className="text-white">{activeBanner.customerName}</strong>
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                  <span>الإجمالي: <strong className="text-emerald-400">{Number(activeBanner.total).toLocaleString('ar-EG')} ج.م</strong></span>
                  {activeBanner.governorate && (
                    <span className="truncate max-w-[140px]">📍 {activeBanner.governorate}</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveBanner(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveBanner(null)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              تجاهل
            </button>
            <button
              type="button"
              onClick={() => handleOpenNotification(activeBanner)}
              className="px-4 py-1.5 bg-white hover:bg-zinc-100 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>عرض تفاصيل الطلب</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. Admin Header Bell Icon & Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`relative p-2.5 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
            unreadCount > 0 
              ? 'bg-zinc-900 border-zinc-700 text-white hover:bg-black' 
              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
          }`}
          title="إشعارات الطلبات الجديدة"
          aria-label="Order Notifications"
        >
          <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400 animate-bounce' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Container */}
        {isOpen && (
          <div
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[340px] sm:w-[390px] bg-white border border-zinc-200 rounded-2xl shadow-2xl z-60 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            {/* Dropdown Header */}
            <div className="p-3.5 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">إشعارات الطلبات</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-bold rounded-full border border-red-500/30">
                    {unreadCount} جديد
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Sound Toggle */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                    soundOn ? 'bg-zinc-800 text-emerald-400 hover:bg-zinc-700' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                  title={soundOn ? 'الصوت مفعّل (انقر للكتم)' : 'الصوت مكتوم (انقر للتفعيل)'}
                >
                  {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Test Sound */}
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors cursor-pointer text-[10px] flex items-center gap-1"
                  title="تجربة صوت الرنين"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px]">تجربة</span>
                </button>
              </div>
            </div>

            {/* Desktop Notification Banner Setup if not granted */}
            {isDesktopNotificationSupported() && desktopPerm !== 'granted' && (
              <div className="px-3.5 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-tight">تفعيل إشعارات سطح المكتب لتنبيهك حتى لو كنت خارج التاب</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnableDesktop}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  تفعيل
                </button>
              </div>
            )}

            {/* Quick Actions Bar */}
            {notifications.length > 0 && (
              <div className="px-3.5 py-2 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>تحديد الكل كمقروء</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-700">لا توجد إشعارات حالياً</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    سيتم تنبيهك بصوت وإشعار فوري عند قيام أي عميل بطلب جديد
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleOpenNotification(notif)}
                    className={`p-3.5 hover:bg-zinc-50 transition-colors cursor-pointer flex items-start gap-3 ${
                      !notif.isRead ? 'bg-amber-50/50' : 'bg-white'
                    }`}
                  >
                    {/* Status Dot */}
                    <div className="mt-1 shrink-0">
                      {!notif.isRead ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 inline-block" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-black">
                          #{notif.orderNumber}
                        </span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-zinc-800 truncate">
                        {notif.customerName}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1.5">
                        <span className="font-bold text-black">
                          {Number(notif.total).toLocaleString('ar-EG')} ج.م
                        </span>
                        {notif.phone && (
                          <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1" dir="ltr">
                            <Phone className="w-3 h-3" /> {notif.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Dropdown Footer info & Mobile Setup */}
            <div className="p-2.5 bg-zinc-50 border-t border-zinc-200 flex flex-col items-center gap-1.5 text-center">
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span>ضبط تنبيهات الموبايل حتى والموقع مغلق (Telegram / Push)</span>
                </button>
              )}
              <span className="text-[10px] text-zinc-400">
                التنبيهات تعمل تلقائياً عبر Supabase Realtime مع دعم الإشعارات الصوتية
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
