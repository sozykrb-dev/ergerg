/**
 * MOLFET — brand constants and storefront copy.
 * Everything here comes from the brand guide: three colours, four lockups,
 * one slogan written exactly as "Style Without Limits".
 */

export const BRAND = {
  name: 'MOLFET',
  nameFull: 'MOLFET FOR FASHION',
  slogan: 'Style Without Limits',
  sloganAr: 'أسلوب بلا حدود',
  statementEn:
    'We believe elegance lives in the details. Our clothes are made with Egyptian craftsmanship, local expertise and the finest fabrics, shaped by an Italian design mindset. Clothing that goes beyond trends: comfort, quality and contemporary design that expresses the personality of the wearer.',
  statementAr:
    'نؤمن أن الأناقة تسكن في التفاصيل. تُصنع قطعنا بحرفية مصرية وخبرات محلية وأجود الأقمشة، بعقلية تصميم إيطالية. ملابس تتجاوز الموضة: راحة وجودة وتصميم معاصر يعبّر عن شخصية من يرتديها.',
  colors: {
    maroon: '#711518',
    cream: '#FAED99',
    brown: '#321E19',
  },
  // the four official lockups — never redrawn, stretched, recoloured or shadowed
  lockups: {
    wordmarkOnCream: '/brand/molfet-wordmark.png',
    wordmarkOnBrown: '/brand/molfet-wordmark-cream.png',
    iconOnMaroon: '/brand/molfet-icon-cream.png',
    iconOnCream: '/brand/molfet-icon.png',
    iconMark: '/img/brand/icon-mark.png',
  },
  whatsapp: '201012345678',
  freeShippingThreshold: 2900,
  lookDiscountPercent: 10,
} as const;

/** The brush circle: open at the lower right. Used as cursor, loader, ring. */
export const BRUSH_CIRCLE_PATH =
  'M86.5 22.5C72.4 12.8 53.4 8.9 36.2 14.6 12.9 22.4 0 44.9 4.9 67.9c4.8 22.5 27.2 37.4 50.1 33.6 3.5-.6 6.9-1.5 10.1-2.8C42 105.6 20.7 99.1 9.3 84.4 1.2 73.8-.6 59.6 3.3 46.5';

export const NAV = [
  { key: 'shop', href: '#/shop', en: 'Shop', ar: 'المتجر' },
  { key: 'mix', href: '#/mix', en: 'Limitless Mix', ar: 'تنسيق بلا حدود' },
  { key: 'about', href: '#/about', en: 'The Brand', ar: 'العلامة' },
  { key: 'track', href: '#/track', en: 'Track Order', ar: 'تتبع الطلب' },
] as const;

export const CATEGORY_SLOTS = [
  { slot: 'top', en: 'Top', ar: 'قطعة علوية' },
  { slot: 'bottom', en: 'Bottom', ar: 'قطعة سفلية' },
  { slot: 'outerwear', en: 'Outerwear', ar: 'طبقة خارجية' },
  { slot: 'accessory', en: 'Accessory', ar: 'إكسسوار' },
] as const;

export type MixSlot = (typeof CATEGORY_SLOTS)[number]['slot'];

/** Microcopy that carries the idea of limits (brand guide page 4). */
export const LIMIT_COPY = {
  shippingBar: {
    en: (threshold: string) => `No limits on style. Free shipping from ${threshold}.`,
    ar: (threshold: string) => `لا حدود للأناقة. شحن مجاني من ${threshold}.`,
  },
  emptyCart: {
    en: 'Your look has no limits yet. Start building it.',
    ar: 'إطلالتك بلا حدود بعد. ابدأ في تكوينها.',
  },
  notFound: {
    en: "You found the edge of the map. Style doesn't have one.",
    ar: 'وصلت إلى آخر الخريطة. الأناقة ليس لها نهاية.',
  },
  mixDiscount: {
    en: (n: number) => `Look of ${n} pieces — automatic discount applied at checkout.`,
    ar: (n: number) => `إطلالة من ${n} قطع — يُطبّق خصم تلقائي عند إتمام الطلب.`,
  },
} as const;

export const DETAIL_POINTS_DEFAULT = [
  {
    key: 'fabric',
    en: 'Fabric',
    ar: 'القماش',
    textEn: 'Long-staple Egyptian cotton, combed and dyed in small batches.',
    textAr: 'قطن مصري طويل التيلة، مُمشّط ومصبوغ على دفعات صغيرة.',
    macro: '/img/detail/fabric.webp',
  },
  {
    key: 'cut',
    en: 'Cut',
    ar: 'القصّة',
    textEn: 'Drafted in Italy, cut on a relaxed line with a clean shoulder.',
    textAr: 'مُصمّمة في إيطاليا، بقصّة مريحة وكتف نظيف.',
    macro: '/img/detail/cut.webp',
  },
  {
    key: 'finish',
    en: 'Finish',
    ar: 'التشطيب',
    textEn: 'Hand-finished seams, mother-of-pearl buttons, pressed edge.',
    textAr: 'حواف نهائية يدوية، أزرار صدف، وحاشية مكوّية.',
    macro: '/img/detail/finish.webp',
  },
] as const;

export const DETAILS_STRIP = [
  {
    key: 'fabric',
    en: 'Fabric',
    ar: 'القماش',
    lineEn: 'Egyptian cotton, 270 gsm',
    lineAr: 'قطن مصري ٢٧٠ جرام',
    image: '/img/detail/fabric.webp',
  },
  {
    key: 'cut',
    en: 'Cut',
    ar: 'القصّة',
    lineEn: 'Italian sketch, sharp shoulder',
    lineAr: 'رسم إيطالي، كتف حاد',
    image: '/img/detail/cut.webp',
  },
  {
    key: 'finish',
    en: 'Finish',
    ar: 'التشغيل',
    lineEn: 'Hand-checked, thread by thread',
    lineAr: 'مراجعة يدوية، خيطًا بخيط',
    image: '/img/detail/finish.webp',
  },
] as const;
