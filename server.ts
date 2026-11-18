import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8868983556:AAFkMd3AtUbBR8CX7LM7lb0mhQHymaAnKhc';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7406265512';

function escapeHtml(str: any): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Telegram Send Notification Proxy Endpoint (Guarantees bypass of client ISP / CORS / adblocker issues)
  app.post('/api/telegram/send', async (req, res) => {
    const { botToken, chatId, message, photoUrl } = req.body;
    const cleanToken = String(botToken || DEFAULT_BOT_TOKEN).trim();
    const cleanChatId = String(chatId || DEFAULT_CHAT_ID).trim();

    if (!cleanToken || !cleanChatId || !message) {
      return res.status(400).json({ ok: false, error: 'يرجى إدخال Bot Token و Chat ID ونص الرسالة' });
    }

    try {
      // If photoUrl provided, try sending with photo
      if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
        try {
          const photoApiUrl = `https://api.telegram.org/bot${cleanToken}/sendPhoto`;
          const photoResponse = await fetch(photoApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cleanChatId,
              photo: photoUrl,
              caption: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
              parse_mode: 'HTML',
            }),
          });
          const photoData = (await photoResponse.json()) as any;
          if (photoResponse.ok && photoData.ok) {
            return res.json({ ok: true, result: photoData.result });
          }
          console.warn('sendPhoto returned error, falling back to sendMessage:', photoData?.description);
        } catch (photoErr) {
          console.warn('Backend sendPhoto failed, falling back to sendMessage:', photoErr);
        }
      }

      // Fallback or Standard sendMessage
      const sendApiUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
      const msgResponse = await fetch(sendApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const msgData = (await msgResponse.json()) as any;
      if (!msgResponse.ok || !msgData.ok) {
        let friendlyError = msgData.description || 'فشل إرسال رسالة تيليجرام';
        if (friendlyError.includes('bot was blocked by the user')) {
          friendlyError = 'البوت محظور من قبلك أو لم تضغط Start في شات البوت أولاً';
        } else if (friendlyError.includes('chat not found')) {
          friendlyError = 'رقم Chat ID غير صحيح أو أنك لم تبدأ محادثة مع البوت بالضغط على Start';
        } else if (friendlyError.includes('Unauthorized') || friendlyError.includes('Not Found')) {
          friendlyError = 'Bot Token غير صحيح، يرجى التأكد من نسخه كاملاً من BotFather';
        }
        return res.status(400).json({
          ok: false,
          error: friendlyError,
          rawError: msgData.description,
        });
      }

      return res.json({ ok: true, result: msgData.result });
    } catch (err: any) {
      console.error('Server Telegram API error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'خطأ في الاتصال بسيرفر تيليجرام' });
    }
  });

  // Dedicated instant order notification endpoint
  app.post('/api/telegram/notify-order', async (req, res) => {
    const { order, botToken, chatId } = req.body;
    if (!order) {
      return res.status(400).json({ ok: false, error: 'بيانات الطلب مفقودة' });
    }

    const cleanToken = String(botToken || DEFAULT_BOT_TOKEN).trim();
    const cleanChatId = String(chatId || DEFAULT_CHAT_ID).trim();

    const payMethodText = 
      order.paymentMethod === 'cod' ? 'الدفع عند الاستلام (COD)' :
      order.paymentMethod === 'instapay' ? 'InstaPay (إنستاباي)' :
      order.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' :
      order.paymentMethod || 'غير محدد';

    let itemsText = '';
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      itemsText = order.items
        .map(
          (i: any, idx: number) =>
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
📍 <b>المحافظة / المنطقة:</b> ${safeGov} ${safeCity ? `- ${safeCity}` : ''}
🏠 <b>العنوان التفصيلي:</b> ${safeAddress || '—'}
💳 <b>طريقة الدفع:</b> ${escapeHtml(payMethodText)}
💰 <b>إجمالي الطلب:</b> <b>${Number(order.total || 0).toLocaleString('ar-EG')} ج.م</b>
${order.shippingFee !== undefined ? `🚚 <b>مصاريف الشحن:</b> ${order.shippingFee === 0 ? 'مجاناً' : `${order.shippingFee} ج.م`}` : ''}
${order.discount ? `🏷️ <b>الخصم:</b> -${order.discount} ج.م ${order.appliedCoupon ? `(${escapeHtml(order.appliedCoupon)})` : ''}` : ''}
${safeNotes ? `📝 <b>ملاحظات العميل:</b> ${safeNotes}` : ''}

📦 <b>تفاصيل المنتجات (${order.items?.length || 0}):</b>
${itemsText || '  (منتجات الطلب)'}
━━━━━━━━━━━━━━━━━━
💬 <b>مراسلة العميل واتساب:</b> <a href="https://wa.me/2${cleanPhoneDigits}">اضغط هنا لفتح واتساب</a>
⏰ <i>${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'full', timeStyle: 'short' })}</i>
`.trim();

    const candidatePhoto = 
      (order.items && order.items[0]?.image && String(order.items[0].image).startsWith('http') ? order.items[0].image : null) ||
      (order.paymentReceiptUrl && String(order.paymentReceiptUrl).startsWith('http') ? order.paymentReceiptUrl : null);

    try {
      if (candidatePhoto) {
        try {
          const photoApiUrl = `https://api.telegram.org/bot${cleanToken}/sendPhoto`;
          const photoResponse = await fetch(photoApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cleanChatId,
              photo: candidatePhoto,
              caption: message.length > 1024 ? message.substring(0, 1020) + '...' : message,
              parse_mode: 'HTML',
            }),
          });
          const photoData = (await photoResponse.json()) as any;
          if (photoResponse.ok && photoData.ok) {
            return res.json({ ok: true, result: photoData.result });
          }
          console.warn('sendPhoto fallback to sendMessage:', photoData?.description);
        } catch (photoErr) {
          console.warn('Backend sendPhoto error, fallback to sendMessage:', photoErr);
        }
      }

      const sendApiUrl = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
      const msgResponse = await fetch(sendApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const msgData = (await msgResponse.json()) as any;
      if (!msgResponse.ok || !msgData.ok) {
        return res.status(400).json({
          ok: false,
          error: msgData.description || 'فشل إرسال رسالة تيليجرام',
        });
      }

      return res.json({ ok: true, result: msgData.result });
    } catch (err: any) {
      console.error('Server notify-order Telegram error:', err);
      return res.status(500).json({ ok: false, error: err.message || 'خطأ في الاتصال بسيرفر تيليجرام' });
    }
  });

  // Vite middleware for development / static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        // the platform serves the app under a proxied preview host
        allowedHosts: true as any,
        hmr: { port: 24678, host: '0.0.0.0', clientPort: 443, protocol: 'wss' },
        // the Shopify theme is a separate deliverable: editing it should not
        // reload the React preview
        watch: { ignored: ['**/shopify/**', '**/*.zip'] },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

