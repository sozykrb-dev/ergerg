export interface ProductColor {
  name: string;
  hex: string;
  image?: string;
}

export type MixSlot = 'top' | 'bottom' | 'outerwear' | 'accessory';

/** A detail hotspot on a product image — the metaobject `detail_point`. */
export interface DetailPoint {
  key: 'fabric' | 'cut' | 'finish';
  x: number; // %
  y: number; // %
  titleEn: string;
  titleAr: string;
  textEn: string;
  textAr: string;
  macro: string;
}

export interface Product {
  id: string;
  titleAr: string;
  titleEn: string;
  slug: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku: string;
  descriptionAr: string;
  descriptionEn: string;
  fabricDetails: string;
  gsm?: string;
  fitType: 'Oversized' | 'Regular' | 'Relaxed' | 'Boxy' | 'Slim';
  sizes: string[];
  colors: ProductColor[];
  thumbnailUrl?: string;
  images: string[];
  badge?: 'NEW' | 'SALE' | 'HOT' | 'LIMITED' | 'BESTSELLER';
  isFeatured: boolean;
  isActive?: boolean;
  rating: number;
  reviewsCount: number;
  createdAt: string;

  /* ---- MOLFET concept fields (all optional: admin-created products still work) ---- */
  slot?: MixSlot;
  /** cut-out PNG/WEBP with transparency — the layer that breaks the frame */
  cutoutUrl?: string;
  /** the Italian sketch shown inside the lens (layer A) */
  sketchUrl?: string;
  /** macro photo of the Egyptian fabric (layer B) */
  macroUrl?: string;
  details?: DetailPoint[];

  /* ---- Shopify (present only when the product comes from the Storefront API) ---- */
  /** the Shopify product gid, e.g. gid://shopify/Product/123 */
  shopifyId?: string;
  /** handle used for canonical URLs */
  handle?: string;
  /** purchasable variants with their gids, needed for the cart */
  shopifyVariants?: ShopifyVariant[];
  /** variant option names, ordered — e.g. ['Size', 'Colour'] */
  optionNames?: string[];
  /** the vendor / product type as Shopify reports them */
  vendor?: string;
  productType?: string;
  /** true when the product has no available variant */
  soldOut?: boolean;
  /** collection handles the product belongs to */
  collections?: string[];
}

/** a minimal Storefront API variant */
export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: number;
  compareAtPrice?: number | null;
  /** selected option values in the order of the product's optionNames */
  selectedOptions: { name: string; value: string }[];
  image?: string;
}

export interface CartItem {
  /** the Shopify cart line id, when the cart lives in Shopify */
  lineId?: string;
  id: string; // Unique cart item key (productId + size + color, or the Shopify line id)
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  altPhone?: string;
  governorate: string;
  city: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  appliedCoupon?: string;
  paymentMethod: 'cod' | 'instapay' | 'vodafone_cash' | 'card' | 'shopify';
  paymentReceiptUrl?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  isActive: boolean;
}

export interface HeroSlide {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  tagAr: string;
  tagEn: string;
  buttonTextAr: string;
  buttonTextEn: string;
  linkCategory: string;
  imageUrl: string;
}

export type SocialPlatform = 
  | 'facebook' 
  | 'instagram' 
  | 'tiktok' 
  | 'whatsapp' 
  | 'telegram' 
  | 'youtube' 
  | 'x' 
  | 'twitter'
  | 'snapchat' 
  | 'pinterest' 
  | 'threads' 
  | 'linkedin' 
  | 'website'
  | 'custom';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  title: string;
  url: string;
  isActive: boolean;
  openInNewTab?: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  image?: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface StoreSettings {
  version?: number;
  updatedAt?: string;
  storeName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook?: string;
  tiktok?: string;
  telegram?: string;
  youtube?: string;
  xTwitter?: string;
  snapchat?: string;
  pinterest?: string;
  threads?: string;
  socialLinks?: SocialLink[];
  categories?: Category[];
  instapayAddress?: string;
  instapayPhone?: string;
  vodafoneCashNumber?: string;
  paymentInstructions?: string;
  announcementAr: string;
  announcementEn: string;
  announcements?: string[];
  heroBannerImage?: string;
  heroButtonText?: string;
  freeShippingThreshold: number;
  defaultShippingFee: number;
  cairoGizaShipping: number;
  alexShipping: number;
  deltaShipping: number;
  upperEgyptShipping: number;
  // Mobile Phone Alerts (Telegram / Webhooks / Push)
  telegramBotToken?: string;
  telegramChatId?: string;
  mobileWebhookUrl?: string;
  enableTelegramNotifications?: boolean;
  enableWebhookNotifications?: boolean;
  /** BREAK THE FRAME — theme settings */
  slogan?: string;
  lensEnabled?: boolean;
  lookDiscountPercent?: number;
}

export type ViewMode = 'store' | 'admin' | 'product-detail' | 'track-order' | 'checkout' | 'order-success' | 'mix' | 'about' | 'cart' | 'notfound';
