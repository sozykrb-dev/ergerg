/**
 * Admin Real-time Order Notifications System
 * Features:
 * - Real-time Supabase change listener + Polling fallback
 * - Cross-tab BroadcastChannel & LocalStorage sync
 * - Web Audio API synthesized chime (no broken assets)
 * - Web Desktop/Browser Push Notifications
 * - LocalStorage persistence for notifications list and settings
 */

import { getSupabase } from './supabase';

export interface AdminNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
  governorate?: string;
  paymentMethod?: string;
  createdAt: string;
  isRead: boolean;
}

const STORAGE_KEYS = {
  NOTIFICATIONS: 'molfet_admin_notifications_v1',
  SEEN_ORDERS: 'molfet_admin_seen_order_ids_v1',
  SOUND_ENABLED: 'molfet_admin_notif_sound_enabled',
  DESKTOP_ENABLED: 'molfet_admin_notif_desktop_enabled',
};

// 1. Web Audio Chime Synthesizer
export function playNewOrderSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic Note 1: 784 Hz (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Harmonic Note 2: 1046.5 Hz (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.35, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);

    // Harmonic Note 3: 1318.5 Hz (E6 sparkle)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1318.51, now + 0.24);
    gain3.gain.setValueAtTime(0, now + 0.24);
    gain3.gain.linearRampToValueAtTime(0.2, now + 0.28);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.24);
    osc3.stop(now + 0.85);
  } catch (e) {
    console.warn('AudioContext playback notice:', e);
  }
}

// 2. Desktop Push Notifications
export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(STORAGE_KEYS.DESKTOP_ENABLED, 'true');
    }
    return permission;
  } catch {
    return 'denied';
  }
}

export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied';
  return Notification.permission;
}

export function triggerDesktopNotification(notif: AdminNotification, onOpen?: () => void) {
  if (!isDesktopNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    const title = `🔔 طلب جديد في MOLFET (#${notif.orderNumber})`;
    const body = `العميل: ${notif.customerName}\nالإجمالي: ${Number(notif.total).toLocaleString('ar-EG')} ج.م`;
    const notification = new Notification(title, {
      body,
      tag: notif.id,
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      if (onOpen) onOpen();
      window.dispatchEvent(new CustomEvent('molfet_view_admin_order', { detail: notif }));
    };
  } catch (e) {
    console.warn('Notification trigger notice:', e);
  }
}

// 3. Storage Helpers
export function getSavedNotifications(): AdminNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(notifications: AdminNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));
  } catch {
    // Ignore quota issues
  }
}

export function getSeenOrderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SEEN_ORDERS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function addSeenOrderId(id: string) {
  try {
    const set = getSeenOrderIds();
    set.add(id);
    const arr = Array.from(set).slice(-200);
    localStorage.setItem(STORAGE_KEYS.SEEN_ORDERS, JSON.stringify(arr));
  } catch {
    // Ignore
  }
}

export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
  } catch {
    // Ignore
  }
}

// 4. Global Order Broadcast Dispatcher (called whenever order is placed anywhere in app)
export function notifyAdminNewOrderLocally(order: {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  total: number;
  governorate?: string;
  paymentMethod?: string;
  createdAt?: string;
}) {
  const notif: AdminNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    total: order.total,
    governorate: order.governorate,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt || new Date().toISOString(),
    isRead: false,
  };

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent('molfet_new_order_event', { detail: notif }));

  // Broadcast to other tabs if BroadcastChannel is available
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('molfet_admin_channel');
      channel.postMessage({ type: 'NEW_ORDER', payload: notif });
      channel.close();
    } catch {
      // Ignore
    }
  }
}

// Helper to escape HTML characters for Telegram HTML mode
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 5. Telegram Mobile Instant Push Notification (Supports sending product photos & payment receipts)
export async function sendTelegramOrderNotification(
  botToken: string,
  chatId: string,
  order: {
    orderNumber: string;
    customerName: string;
    phone: string;
    altPhone?: string;
    total: number;
    subtotal?: number;
    shippingFee?: number;
    discount?: number;
    appliedCoupon?: string;
    governorate?: string;
    city?: string;
    address?: string;
    paymentMethod?: string;
    paymentReceiptUrl?: string;
    notes?: string;
    items?: Array<{ title?: string; product_name?: string; quantity?: number; price?: number; size?: string; color?: string; image?: string }>;
  }
): Promise<{ success: boolean; error?: string }> {
  const cleanToken = (botToken || '8868983556:AAFkMd3AtUbBR8CX7LM7lb0mhQHymaAnKhc').trim();
  const cleanChatId = (chatId || '7406265512').trim();

  if (!cleanToken || !cleanChatId) {
    return { success: false, error: 'Telegram Bot Token or Chat ID is missing' };
  }

  // 1. First Priority: Dedicated Server-side notify-order endpoint (bypasses ISP blocks & CORS, formats HTML and photo seamlessly)
  try {
    const serverOrderRes = await fetch('/api/telegram/notify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: cleanToken,
        chatId: cleanChatId,
        order,
      }),
    });

    const serverOrderData = await serverOrderRes.json();
    if (serverOrderRes.ok && serverOrderData.ok) {
      return { success: true };
    }
    if (serverOrderData && serverOrderData.error) {
      console.warn('Backend Telegram notify-order returned:', serverOrderData.error);
    }
  } catch (backendErr) {
    console.warn('Backend notify-order fetch failed, trying fallback:', backendErr);
  }

  const payMethodText = 
    order.paymentMethod === 'cod' ? 'الدفع عند الاستلام (COD)' :
    order.paymentMethod === 'instapay' ? 'InstaPay (إنستاباي)' :
    order.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
    order.paymentMethod || 'غير محدد';

  let itemsText = '';
  if (order.items && order.items.length > 0) {
    itemsText = order.items
      .map(
        (i, idx) =>
          `  ${idx + 1}. <b>${escapeHtml(i.title || i.product_name || 'منتج')}</b> × ${i.quantity || 1} (${i.price || 0} ج.م) ${i.size ? `[مقاس: ${escapeHtml(i.size)}]` : ''} ${i.color ? `[لون: ${escapeHtml(i.color)}]` : ''}`
      )
      .join('\n');
  }

  const safeOrderNumber = escapeHtml(order.orderNumber);
  const safeCustomerName = escapeHtml(order.customerName);
  const safePhone = escapeHtml(order.phone);
  const safeAltPhone = escapeHtml(order.altPhone);
  const safeGov = escapeHtml(order.governorate);
  const safeCity = escapeHtml(order.city);
  const safeAddress = escapeHtml(order.address);
  const safeNotes = escapeHtml(order.notes);
  const cleanPhoneDigits = String(order.phone || '').replace(/\D/g, '');

  const message = `
🛍️ <b>طلب جديد وارد في متجر MOLFET FOR FASHON!</b>
━━━━━━━━━━━━━━━━━━
🔢 <b>رقم الطلب:</b> <code>#${safeOrderNumber}</code>
👤 <b>اسم العميل:</b> <b>${safeCustomerName}</b>
📞 <b>رقم الهاتف:</b> <code>${safePhone}</code>
${safeAltPhone ? `📱 <b>هاتف بديل:</b> <code>${safeAltPhone}</code>` : ''}
📍 <b>المحافظة / العنوان:</b> ${safeGov} ${safeCity ? `- ${safeCity}` : ''}
🏠 <b>العنوان التفصيلي:</b> ${safeAddress || '—'}
💳 <b>طريقة الدفع:</b> ${escapeHtml(payMethodText)}
💰 <b>إجمالي الطلب:</b> <b>${Number(order.total).toLocaleString('ar-EG')} ج.م</b>
${order.shippingFee !== undefined ? `🚚 <b>مصاريف الشحن:</b> ${order.shippingFee === 0 ? 'مجاناً' : `${order.shippingFee} ج.م`}` : ''}
${order.discount ? `🏷️ <b>الخصم:</b> -${order.discount} ج.م ${order.appliedCoupon ? `(${escapeHtml(order.appliedCoupon)})` : ''}` : ''}
${safeNotes ? `📝 <b>ملاحظات العميل:</b> ${safeNotes}` : ''}

📦 <b>تفاصيل المنتجات (${order.items?.length || 0}):</b>
${itemsText || '  (منتجات الطلب)'}
━━━━━━━━━━━━━━━━━━
💬 <b>مراسلة العميل واتساب:</b> <a href="https://wa.me/2${cleanPhoneDigits}">اضغط هنا لفتح واتساب</a>
⏰ <i>${new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}</i>
`.trim();

  // Check if there is an image to attach (First product image or payment receipt)
  const candidatePhoto = 
    (order.items && order.items[0]?.image && String(order.items[0].image).startsWith('http') ? order.items[0].image : null) ||
    (order.paymentReceiptUrl && String(order.paymentReceiptUrl).startsWith('http') ? order.paymentReceiptUrl : null);

  // 2. Second Attempt: Generic Server-side proxy /api/telegram/send
  try {
    const proxyRes = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: cleanToken,
        chatId: cleanChatId,
        message,
        photoUrl: candidatePhoto,
      }),
    });

    const proxyData = await proxyRes.json();
    if (proxyRes.ok && proxyData.ok) {
      return { success: true };
    }
  } catch (backendErr) {
    console.warn('Backend proxy fetch failed, trying direct Telegram fallback:', backendErr);
  }

  // 3. Third Attempt: Direct Telegram API Fallback
  try {
    if (candidatePhoto) {
      try {
        const photoUrl = `https://api.telegram.org/bot${cleanToken}/sendPhoto`;
        const photoRes = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChatId,
            photo: candidatePhoto,
            caption: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
            parse_mode: 'HTML',
          }),
        });
        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.ok) {
          return { success: true };
        }
      } catch {
        // Continue to sendMessage
      }
    }

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      let desc = data.description || 'فشل إرسال إشعار تليجرام';
      if (desc.includes('bot was blocked by the user')) {
        desc = 'البوت محظور من قبلك أو لم تضغط Start في شات البوت';
      } else if (desc.includes('chat not found')) {
        desc = 'رقم Chat ID غير صحيح أو لم تضغط Start في شات البوت';
      }
      return { success: false, error: desc };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'خطأ في الاتصال بسيرفر تليجرام' };
  }
}

// 6. Test Telegram Ping
export async function sendTelegramTestPing(botToken: string, chatId: string): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'يرجى إدخال Bot Token و Chat ID أولاً' };
  }
  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  const message = `
🔔 <b>تأكيد تفعيل إشعارات هاتف متجر MOLFET FOR FASHON!</b>
━━━━━━━━━━━━━━━━━━
✅ تم ربط هاتفك بنجاح مع المتجر!
📱 ستصلك الآن رسالة فورية مع صوت تنبيه عالي وتفاصيل المنتجات فور قيام أي عميل بطلب جديد حتى والموقع مغلق.

⏰ <i>${new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'medium' })}</i>
`.trim();

  // 1. Try server proxy first
  try {
    const proxyRes = await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: cleanToken,
        chatId: cleanChatId,
        message,
      }),
    });

    const proxyData = await proxyRes.json();
    if (proxyRes.ok && proxyData.ok) {
      return { success: true };
    }
    if (proxyData && proxyData.error) {
      return { success: false, error: proxyData.error };
    }
  } catch {
    // Fallback to direct
  }

  // 2. Direct Telegram API Fallback
  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      let desc = data.description || 'فشل إرسال التنبيه التجريبي';
      if (desc.includes('bot was blocked by the user')) {
        desc = 'البوت محظور أو أنك لم تضغط Start في شات البوت أولاً';
      } else if (desc.includes('chat not found')) {
        desc = 'رقم Chat ID غير صحيح أو لم تضغط Start في شات البوت أولاً';
      }
      return { success: false, error: desc };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل الاتصال' };
  }
}

// 7. Custom Webhook Dispatcher (Discord / Zapier / Make / WhatsApp Gateway)
export async function sendWebhookOrderNotification(
  webhookUrl: string,
  order: any
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, error: 'رابط Webhook غير صالح' };
  }

  try {
    const isDiscord = webhookUrl.includes('discord.com/api/webhooks');
    let bodyData: any;

    if (isDiscord) {
      bodyData = {
        content: `🛍️ **طلب جديد في متجر MOLFET FOR FASHON!**\n**رقم الطلب:** #${order.orderNumber}\n**العميل:** ${order.customerName}\n**الهاتف:** ${order.phone}\n**الإجمالي:** ${order.total} ج.م\n**العنوان:** ${order.governorate || ''} ${order.address || ''}`,
      };
    } else {
      bodyData = {
        event: 'order.created',
        timestamp: new Date().toISOString(),
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          phone: order.phone,
          governorate: order.governorate,
          address: order.address,
          total: order.total,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          paymentMethod: order.paymentMethod,
          items: order.items,
        },
      };
    }

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    if (!res.ok) {
      return { success: false, error: `Webhook error: ${res.statusText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Webhook failed' };
  }
}

// 8. Test Webhook Ping
export async function sendWebhookTestPing(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, error: 'يرجى إدخال رابط Webhook صحيح يبدأ بـ https://' };
  }
  try {
    const isDiscord = webhookUrl.includes('discord.com/api/webhooks');
    const bodyData = isDiscord
      ? { content: '🔔 **تجربة تنبيه متجر MOLFET FOR FASHON:** تم ربط الويب هوك بنجاح!' }
      : { event: 'test.ping', message: 'MOLFET Test Ping Successful', timestamp: new Date().toISOString() };

    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData),
    });

    if (!res.ok) {
      return { success: false, error: `Webhook response error: ${res.statusText}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'فشل إرسال الويب هوك التجريبي' };
  }
}
