import { SocialLink } from '../types';

/**
 * =========================================================================
 * 📁 ملف روابط وأزرار السوشيال ميديا الدائم للموقع (Permanent Social Links Config)
 * مسار الملف: src/data/socialLinksConfig.ts
 * =========================================================================
 * 
 * جميع روابط أزرار التواصل الاجتماعي محفوطة هنا مباشرة بداخل كود وملفات المتجر:
 * - يتم قراءتها تلقائياً في الفوتر (Footer)، الهيدر (Header)، والقائمة الجانبية.
 * - يمكنك تعديل أي رابط، إضافة منصة جديدة، أو إيقاف تفعيل أي زر من هنا مباشرة
 *   أو من خلال لوحة تحكم الأدمن (Admin Dashboard).
 */

export const SOCIAL_LINKS_CONFIG: SocialLink[] = [
  {
    id: 'soc_whatsapp',
    platform: 'whatsapp',
    title: 'WhatsApp Support',
    url: 'https://wa.me/201012345678',
    isActive: true,
    openInNewTab: true,
  },
  {
    id: 'soc_instagram',
    platform: 'instagram',
    title: 'Instagram',
    url: 'https://www.instagram.com/molfet.eg',
    isActive: true,
    openInNewTab: true,
  },
  {
    id: 'soc_tiktok',
    platform: 'tiktok',
    title: 'TikTok',
    url: 'https://www.tiktok.com/@molfet.eg',
    isActive: true,
    openInNewTab: true,
  },
  {
    id: 'soc_facebook',
    platform: 'facebook',
    title: 'Facebook',
    url: 'https://www.facebook.com/share/196NnLNFU4/?mibextid=wwXIfr',
    isActive: true,
    openInNewTab: true,
  },
];

export default SOCIAL_LINKS_CONFIG;
