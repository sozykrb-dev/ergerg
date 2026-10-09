import { Product, StoreSettings, Coupon, HeroSlide, SocialLink, Category } from '../types';
import { SOCIAL_LINKS_CONFIG } from './socialLinksConfig';

export const CATEGORIES: Category[] = [
  { id: 'all', nameAr: 'جميع المنتجات', nameEn: 'Shop All', slug: 'all' },
  { id: 'shirts', nameAr: 'قمصان', nameEn: 'SHIRTS', slug: 'shirts', image: 'https://sole-eg.net/cdn/shop/files/0B8448E8-CC72-40E2-B2E6-D4ACF518116D.png?v=1786064994&width=800' },
  { id: 't-shirts', nameAr: 'تيشرتات', nameEn: 'T-Shirts', slug: 't-shirts', image: 'https://sole-eg.net/cdn/shop/files/7D24F74A-3C73-4FCF-9611-9D7E0EC24EEB.jpg?v=1786022054&width=800' },
  { id: 'pants', nameAr: 'بناطيل', nameEn: 'PANTS', slug: 'pants', image: 'https://sole-eg.net/cdn/shop/files/4BF0AAF0-AF40-4811-88F9-C81B83717C7C.png?v=1786063991&width=800' },
  { id: 'sale', nameAr: 'تخفيضات', nameEn: 'Sale', slug: 'sale', image: 'https://sole-eg.net/cdn/shop/files/324EB0C2-E4F8-4E39-A39C-68AD6EB82411.png?v=1786018130&width=800' },
];

export const EGYPT_GOVERNORATES: { name: string; region: 'cairo_giza' | 'alex' | 'delta' | 'canal' | 'upper_egypt' | 'frontier'; defaultFee: number }[] = [
  { name: 'القاهرة (Cairo)', region: 'cairo_giza', defaultFee: 50 },
  { name: 'الجيزة (Giza)', region: 'cairo_giza', defaultFee: 50 },
  { name: 'الإسكندرية (Alexandria)', region: 'alex', defaultFee: 50 },
  { name: 'القليوبية (Qalyubia)', region: 'cairo_giza', defaultFee: 50 },
  { name: 'الشرقية (Sharqia)', region: 'delta', defaultFee: 55 },
  { name: 'الدقهلية - المنصورة (Dakahlia)', region: 'delta', defaultFee: 55 },
  { name: 'الغربية - طنطا والمحلة (Gharbia)', region: 'delta', defaultFee: 55 },
  { name: 'المنوفية (Monufia)', region: 'delta', defaultFee: 55 },
  { name: 'البحيرة - دمنهور (Beheira)', region: 'delta', defaultFee: 55 },
  { name: 'كفر الشيخ (Kafr El Sheikh)', region: 'delta', defaultFee: 55 },
  { name: 'دمياط (Damietta)', region: 'delta', defaultFee: 55 },
  { name: 'بورسعيد (Port Said)', region: 'canal', defaultFee: 55 },
  { name: 'الإسماعيلية (Ismailia)', region: 'canal', defaultFee: 55 },
  { name: 'السويس (Suez)', region: 'canal', defaultFee: 55 },
  { name: 'الفيوم (Fayoum)', region: 'upper_egypt', defaultFee: 65 },
  { name: 'بني سويف (Beni Suef)', region: 'upper_egypt', defaultFee: 65 },
  { name: 'المنيا (Minya)', region: 'upper_egypt', defaultFee: 65 },
  { name: 'أسيوط (Asyut)', region: 'upper_egypt', defaultFee: 70 },
  { name: 'سوهاج (Sohag)', region: 'upper_egypt', defaultFee: 70 },
  { name: 'قنا (Qena)', region: 'upper_egypt', defaultFee: 75 },
  { name: 'الأقصر (Luxor)', region: 'upper_egypt', defaultFee: 75 },
  { name: 'أسوان (Aswan)', region: 'upper_egypt', defaultFee: 75 },
  { name: 'البحر الأحمر - الغردقة (Red Sea)', region: 'frontier', defaultFee: 80 },
  { name: 'جنوب سيناء - شرم الشيخ (South Sinai)', region: 'frontier', defaultFee: 85 },
  { name: 'شمال سيناء (North Sinai)', region: 'frontier', defaultFee: 85 },
  { name: 'مطروح والساحل الشمالي (Matrouh)', region: 'frontier', defaultFee: 75 },
  { name: 'الوادي الجديد (New Valley)', region: 'frontier', defaultFee: 85 },
];

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = SOCIAL_LINKS_CONFIG;

export const BRAND_COLORS = {
  main: '#4F2C0A',      // Main Color  — RGB 79 44 10 / CMYK 25 75 100 60
  secondary: '#F0E8D4', // Secondary   — RGB 240 232 212 / CMYK 5 6 17 0
  contrast: '#6A7743',  // Contrast    — RGB 106 119 67 / CMYK 70 50 100 0
} as const;

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'MOLFET FOR FASHON',
  tagline: 'Style Without Limits',
  phone: '+201012345678',
  whatsapp: '201012345678',
  instagram: 'molfet.eg',
  facebook: 'https://www.facebook.com/share/196NnLNFU4/?mibextid=wwXIfr',
  tiktok: 'https://www.tiktok.com/@molfet.eg',
  socialLinks: DEFAULT_SOCIAL_LINKS,
  categories: CATEGORIES,
  instapayAddress: 'molfet@instapay',
  instapayPhone: '01012345678',
  vodafoneCashNumber: '01012345678',
  paymentInstructions: 'يرجى تحويل المبلغ الإجمالي إلى العنوان أو الرقم أعلاه ورفع سكرين شوت بالتحويل لتأكيد الطلب فوراً.',
  announcementAr: 'توصيل سريع داخل الإسكندرية | شحن مجاني للطلبات فوق 2900 جنيه',
  announcementEn: 'Style Without Limits • FREE SHIPPING FOR ORDERS OVER 2900 LE',
  announcements: [
    'MOLFET FOR FASHON — Style Without Limits',
    'FREE SHIPPING IN ALEXANDRIA FOR ORDERS OVER 2900 LE',
    '20% Discount • توصيل فوري داخل الإسكندرية'
  ],
  heroBannerImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop',
  heroButtonText: 'New Arrivals',
  freeShippingThreshold: 2900,
  defaultShippingFee: 50,
  cairoGizaShipping: 50,
  alexShipping: 50,
  deltaShipping: 50,
  upperEgyptShipping: 60,
  telegramBotToken: '8868983556:AAFkMd3AtUbBR8CX7LM7lb0mhQHymaAnKhc',
  telegramChatId: '7406265512',
  enableTelegramNotifications: true,
};

export const ANNOUNCEMENT_SLIDES = [
  'MOLFET FOR FASHON — Style Without Limits',
  'FREE SHIPPING IN ALEXANDRIA FOR ORDERS OVER 2900 LE',
  '20% Discount • توصيل فوري داخل الإسكندرية'
];

export const INITIAL_COUPONS: Coupon[] = [
  { id: 'c1', code: 'MOLFET20', discountType: 'percentage', value: 20, minOrder: 1000, isActive: true },
  { id: 'c2', code: 'ALEX10', discountType: 'percentage', value: 10, minOrder: 500, isActive: true },
  { id: 'c3', code: 'FREESHIP', discountType: 'fixed', value: 50, minOrder: 1500, isActive: true },
];

export const INITIAL_HERO_SLIDES: HeroSlide[] = [
  {
    id: 's1',
    titleAr: 'كولكشن MOLFET الجديد',
    titleEn: 'MOLFET — STYLE WITHOUT LIMITS',
    subtitleAr: 'عقلية إيطالية بحرفية مصرية — أناقة وجودة وتفرد في كل قطعة',
    subtitleEn: 'Italian mindset meets Egyptian craftsmanship',
    tagAr: 'وصل حديثاً',
    tagEn: 'NEW ARRIVALS',
    buttonTextAr: 'تسوق الآن',
    buttonTextEn: 'New Arrivals',
    linkCategory: 'all',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  // 1. SHIRTS
  {
    id: 'molfet-p1',
    titleAr: 'قميص بوبلين كلاسيك بيبي بلو',
    titleEn: 'BABY BLUE CLASSIC POPLIN SHIRT',
    slug: 'baby-blue-classic-poplin-shirt',
    category: 'shirts',
    price: 650,
    compareAtPrice: 850,
    stock: 25,
    sku: 'MLFT-SHIRT-01',
    descriptionAr: 'قميص بوبلين كلاسيك بقصة ريلاكسد مريحة وخامة قطن بوبلين فاخرة ناعمة وقابلة للتنفس. تصميم أنيق بأزرار متناسقة وجيب أمامي.',
    descriptionEn: 'Crisp and breathable classic poplin shirt in baby blue. Tailored with a relaxed modern streetwear cut and tonal buttons.',
    fabricDetails: '100% Cotton Poplin Premium Fabric - معالج ضد الانكماش',
    gsm: '190 GSM Cotton Poplin',
    fitType: 'Relaxed',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Baby Blue', hex: '#9ec4db' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/0B8448E8-CC72-40E2-B2E6-D4ACF518116D.png?v=1786064994&width=1200',
      'https://sole-eg.net/cdn/shop/files/660BAFB3-78F5-40DC-A40F-5F7F7CF506E6.jpg?v=1786024435&width=1200',
      'https://sole-eg.net/cdn/shop/files/26.jpg?v=1786024421&width=1200',
      'https://sole-eg.net/cdn/shop/files/IMG_1156.jpg?v=1786024421&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 38,
    createdAt: '2026-08-01'
  },
  {
    id: 'molfet-p2',
    titleAr: 'قميص بوبلين كلاسيك أسود',
    titleEn: 'Black CLASSIC POPLIN SHIRT',
    slug: 'black-classic-poplin-shirt',
    category: 'shirts',
    price: 750,
    compareAtPrice: 950,
    stock: 20,
    sku: 'MLFT-SHIRT-02',
    descriptionAr: 'قميص بوبلين كلاسيك أسود فاخر، بقصة انسيابية ومظهر راقي للارتداء اليومي أو المناسبات الخاصة.',
    descriptionEn: 'Black classic relaxed poplin shirt with fine stitching and durable luxury finish.',
    fabricDetails: '100% Cotton Poplin High Thread Count',
    gsm: '190 GSM Cotton Poplin',
    fitType: 'Relaxed',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Black', hex: '#111111' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/IMG_1152.jpg?v=1786024156&width=1200',
      'https://sole-eg.net/cdn/shop/files/24.jpg?v=1786024157&width=1200',
      'https://sole-eg.net/cdn/shop/files/B3E35394-7CED-465E-8367-02CFC10157A8.png?v=1786064659&width=1200',
      'https://sole-eg.net/cdn/shop/files/BDC7B533-4950-4AFF-ACE6-9F9F6358EC4F.jpg?v=1786064658&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 29,
    createdAt: '2026-08-02'
  },

  // 2. T-SHIRTS
  {
    id: 'molfet-p3',
    titleAr: 'تيشرت قطن ثقيل أسود',
    titleEn: 'Black HEAVYWEIGHT COTTON T-SHIRT',
    slug: 'black-heavyweight-cotton-t-shirt',
    category: 't-shirts',
    price: 600,
    compareAtPrice: 950,
    stock: 35,
    sku: 'MLFT-TEE-01',
    descriptionAr: 'تيشرت قطن مصري 100% ثقيل بقصة أوفر سايز عصرية وأكمام واسعة. متين ومريح ومناسب للإطلالات اليومية.',
    descriptionEn: 'Black heavyweight cotton t-shirt with drop shoulders and structured ribbed collar.',
    fabricDetails: '100% Pure Egyptian Heavyweight Cotton',
    gsm: '270 GSM Heavyweight Cotton',
    fitType: 'Oversized',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Black', hex: '#111111' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/7D24F74A-3C73-4FCF-9611-9D7E0EC24EEB.jpg?v=1786022054&width=1200',
      'https://sole-eg.net/cdn/shop/files/1.jpg?v=1786064786&width=1200',
      'https://sole-eg.net/cdn/shop/files/67B734BF-F5ED-476F-8EF7-33E0C5380C5C.jpg?v=1786064772&width=1200',
      'https://sole-eg.net/cdn/shop/files/15.jpg?v=1786022054&width=1200',
      'https://sole-eg.net/cdn/shop/files/69520A61-D17D-4527-910A-1111A47947B8.jpg?v=1786025529&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 52,
    createdAt: '2026-08-03'
  },
  {
    id: 'molfet-p4',
    titleAr: 'تيشرت قطن ثقيل أبيض',
    titleEn: 'WHITE HEAVY WEIGHT COTTON T-SHIRT',
    slug: 'heavyweight-cotton-t-shirt-pullover',
    category: 't-shirts',
    price: 600,
    compareAtPrice: 950,
    stock: 30,
    sku: 'MLFT-TEE-02',
    descriptionAr: 'تيشرت قطن مصري أبيض ثقيل بجودة تصنيع فائقة وقصة بوكسي أوفر سايز راقية.',
    descriptionEn: 'Clean white heavyweight premium cotton tee designed for supreme comfort and effortless style.',
    fabricDetails: '100% Pure Egyptian Heavyweight Cotton',
    gsm: '270 GSM Heavyweight Cotton',
    fitType: 'Oversized',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'White', hex: '#ffffff' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/324EB0C2-E4F8-4E39-A39C-68AD6EB82411.png?v=1786018130&width=1200',
      'https://sole-eg.net/cdn/shop/files/IMG_1144.jpg?v=1786018150&width=1200',
      'https://sole-eg.net/cdn/shop/files/IMG_1143.jpg?v=1786018152&width=1200',
      'https://sole-eg.net/cdn/shop/files/IMG_1147.jpg?v=1786018150&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 41,
    createdAt: '2026-08-04'
  },

  // 3. PANTS
  {
    id: 'molfet-p5',
    titleAr: 'بنطلون فرينش تيري أسود',
    titleEn: 'BLACK FRENCH TERRY PANTS',
    slug: 'black-french-terry-pants',
    category: 'pants',
    price: 999,
    compareAtPrice: 1200,
    stock: 22,
    sku: 'MLFT-PNT-01',
    descriptionAr: 'بنطلون فرينش تيري قطني مريح وأنيق، بقصة واسعة مستقيمة وحزام خصر مطاطي برباط وجيوب عميقة.',
    descriptionEn: 'Black French Terry relaxed pants featuring an elastic drawstring waistband and clean silhouette.',
    fabricDetails: '100% Heavy French Terry Cotton 350 GSM',
    gsm: '350 GSM French Terry',
    fitType: 'Relaxed',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Black', hex: '#111111' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/4BF0AAF0-AF40-4811-88F9-C81B83717C7C.png?v=1786063991&width=1200',
      'https://sole-eg.net/cdn/shop/files/2_679c69e8-f3a6-4e4e-94ca-98fc6028e43c.jpg?v=1786064944&width=1200',
      'https://sole-eg.net/cdn/shop/files/01.jpg?v=1786063992&width=1200',
      'https://sole-eg.net/cdn/shop/files/A743F556-788B-43E8-B313-6BC7EFEB5F1B_13328ec5-0e0b-4256-afff-944ecbd95609.jpg?v=1786064920&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 5.0,
    reviewsCount: 34,
    createdAt: '2026-08-05'
  },
  {
    id: 'molfet-p6',
    titleAr: 'بنطلون فرينش تيري رمادي',
    titleEn: 'GRAY FRENCH TERRY PANTS',
    slug: 'french-terry-pants',
    category: 'pants',
    price: 999,
    compareAtPrice: 1200,
    stock: 18,
    sku: 'MLFT-PNT-02',
    descriptionAr: 'بنطلون فرينش تيري رمادي هيذر ناعم، مصمم لأقصى درجات الراحة مع الحفاظ على الأناقة العصرية.',
    descriptionEn: 'Gray heather French Terry cotton pants with comfortable stretch and modern fit.',
    fabricDetails: '100% Heavy French Terry Cotton 350 GSM',
    gsm: '350 GSM French Terry',
    fitType: 'Relaxed',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: [
      { name: 'Heather Gray', hex: '#8a8d91' }
    ],
    images: [
      'https://sole-eg.net/cdn/shop/files/AF4DF890-8A0D-4A44-871E-CB106D2FFD36.png?v=1786025643&width=1200',
      'https://sole-eg.net/cdn/shop/files/1AA250F4-C73D-4602-98DF-EC154AB84F7E_413b447c-fe68-4dc3-8c28-579b976992b4.png?v=1786025794&width=1200',
      'https://sole-eg.net/cdn/shop/files/9.jpg?v=1786025643&width=1200',
      'https://sole-eg.net/cdn/shop/files/324EB0C2-E4F8-4E39-A39C-68AD6EB82411_95f191b5-e38f-466b-b8c9-3a61030cd974.png?v=1786064865&width=1200'
    ],
    badge: 'SALE',
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 27,
    createdAt: '2026-08-06'
  }
];

export const PRESET_IMAGE_GALLERY = [
  { label: 'Baby Blue Poplin Shirt', url: 'https://sole-eg.net/cdn/shop/files/0B8448E8-CC72-40E2-B2E6-D4ACF518116D.png?v=1786064994&width=1200' },
  { label: 'Black Poplin Shirt', url: 'https://sole-eg.net/cdn/shop/files/IMG_1152.jpg?v=1786024156&width=1200' },
  { label: 'Black Heavyweight Tee', url: 'https://sole-eg.net/cdn/shop/files/7D24F74A-3C73-4FCF-9611-9D7E0EC24EEB.jpg?v=1786022054&width=1200' },
  { label: 'White Heavyweight Tee', url: 'https://sole-eg.net/cdn/shop/files/324EB0C2-E4F8-4E39-A39C-68AD6EB82411.png?v=1786018130&width=1200' },
  { label: 'Black French Terry Pants', url: 'https://sole-eg.net/cdn/shop/files/4BF0AAF0-AF40-4811-88F9-C81B83717C7C.png?v=1786063991&width=1200' },
  { label: 'Gray French Terry Pants', url: 'https://sole-eg.net/cdn/shop/files/AF4DF890-8A0D-4A44-871E-CB106D2FFD36.png?v=1786025643&width=1200' },
];
