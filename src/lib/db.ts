import { getSupabase } from './supabase';
import { Product, Order, OrderItem, Coupon, StoreSettings, SocialLink, Category } from '../types';
import { DEFAULT_SOCIAL_LINKS, DEFAULT_STORE_SETTINGS, CATEGORIES } from '../data/constants';
import { deleteProductImagesFromStorage } from './imageOptimizer';

// Cache completely disabled - Always fetch fresh data directly without any caching
export function getCached<T>(_key: string): T | null {
  return null; // Always return null to bypass cache
}

export function setCached<T>(_key: string, _data: T): void {
  // No-op - caching disabled
}

export function invalidateCachePrefix(_prefix: string): void {
  // No-op
}

export function clearAllDbCache(): void {
  // No-op
}

/**
 * Converts Supabase snake_case product row to Frontend Product object
 */
export function mapProductRowToProduct(row: any): Product {
  return {
    id: row.id,
    titleEn: row.title_en || '',
    titleAr: row.title_ar || row.title_en || '',
    slug: row.slug || `product-${row.id}`,
    category: row.category || 'shirts',
    price: Number(row.price) || 0,
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    stock: typeof row.stock === 'number' ? row.stock : 10,
    sku: row.sku || `MLFT-${row.id}`,
    descriptionEn: row.description_en || '',
    descriptionAr: row.description_ar || '',
    fabricDetails: row.fabric_details || '100% Egyptian Cotton',
    gsm: row.gsm || '270 GSM',
    fitType: row.fit_type || 'Relaxed',
    sizes: Array.isArray(row.sizes) ? row.sizes : ['S', 'M', 'L', 'XL', '2XL'],
    colors: Array.isArray(row.colors) ? row.colors : [{ name: 'Standard', hex: '#000000' }],
    thumbnailUrl: row.thumbnail_url || (Array.isArray(row.images) && row.images[0]) || '',
    images: Array.isArray(row.images) && row.images.length > 0
      ? row.images
      : row.thumbnail_url
      ? [row.thumbnail_url]
      : [],
    badge: row.badge || undefined,
    isFeatured: Boolean(row.is_featured),
    isActive: row.is_active !== false,
    rating: Number(row.rating) || 5.0,
    reviewsCount: Number(row.reviews_count) || 1,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Converts Frontend Product to Supabase snake_case product row
 */
export function mapProductToRow(p: Partial<Product>): any {
  const row: any = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.titleEn !== undefined) row.title_en = p.titleEn;
  if (p.titleAr !== undefined) row.title_ar = p.titleAr;
  if (p.slug !== undefined) row.slug = p.slug;
  if (p.category !== undefined) row.category = p.category;
  if (p.price !== undefined) row.price = Number(p.price) || 0;
  if (p.compareAtPrice !== undefined) row.compare_at_price = p.compareAtPrice ? Number(p.compareAtPrice) : null;
  if (p.stock !== undefined) row.stock = Number(p.stock) || 0;
  if (p.sku !== undefined) row.sku = p.sku;
  if (p.descriptionEn !== undefined) row.description_en = p.descriptionEn;
  if (p.descriptionAr !== undefined) row.description_ar = p.descriptionAr;
  if (p.fabricDetails !== undefined) row.fabric_details = p.fabricDetails;
  if (p.gsm !== undefined) row.gsm = p.gsm;
  if (p.fitType !== undefined) row.fit_type = p.fitType;
  if (p.sizes !== undefined) row.sizes = p.sizes;
  if (p.colors !== undefined) row.colors = p.colors;
  if (p.thumbnailUrl !== undefined) row.thumbnail_url = p.thumbnailUrl;
  if (p.images !== undefined) row.images = p.images;
  if (p.badge !== undefined) row.badge = p.badge || null;
  if (p.isFeatured !== undefined) row.is_featured = Boolean(p.isFeatured);
  if (p.isActive !== undefined) row.is_active = p.isActive !== false;
  if (p.rating !== undefined) row.rating = Number(p.rating) || 5.0;
  if (p.reviewsCount !== undefined) row.reviews_count = Number(p.reviewsCount) || 1;
  return row;
}

/**
 * Maps Supabase store_settings row to StoreSettings object
 */
export function mapStoreSettingsRowToSettings(row: any): StoreSettings {
  if (!row) {
    return { ...DEFAULT_STORE_SETTINGS };
  }

  // 1. Extract embedded metadata comment if present in tagline or announcements
  let meta: any = {};
  let cleanTagline = row.tagline || '';
  if (typeof row.tagline === 'string' && row.tagline.includes('<!--MOLFET_META:')) {
    const match = row.tagline.match(/<!--MOLFET_META:(.*?)-->/s);
    if (match) {
      try {
        meta = JSON.parse(match[1]);
      } catch {
        // ignore
      }
      cleanTagline = row.tagline.replace(/\n?<!--MOLFET_META:.*?-->/s, '').trim();
    }
  }

  // 2. Parse announcements
  let announcementsList = [
    'Shop our latest arrivals!',
    'FREE SHIPPING FOR ORDERS OVER 2900 LE',
    '20% Discount'
  ];

  if (Array.isArray(row.announcements) && row.announcements.length > 0) {
    announcementsList = row.announcements;
  } else if (Array.isArray(meta.announcements) && meta.announcements.length > 0) {
    announcementsList = meta.announcements;
  } else if (typeof row.announcements === 'string') {
    try {
      const parsed = JSON.parse(row.announcements);
      if (Array.isArray(parsed) && parsed.length > 0) announcementsList = parsed;
    } catch {
      const split = row.announcements.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (split.length > 0) announcementsList = split;
    }
  }

  // 3. Parse social links
  let socialLinksList: SocialLink[] = [];
  if (Array.isArray(row.social_links) && row.social_links.length > 0) {
    socialLinksList = row.social_links;
  } else if (Array.isArray(meta.socialLinks) && meta.socialLinks.length > 0) {
    socialLinksList = meta.socialLinks;
  } else if (typeof row.social_links === 'string') {
    try {
      const parsed = JSON.parse(row.social_links);
      if (Array.isArray(parsed) && parsed.length > 0) socialLinksList = parsed;
    } catch {
      // ignore
    }
  }

  // Fallback: If social_links is not populated as JSON, construct from explicit columns
  if (socialLinksList.length === 0 && (row.facebook || row.instagram || row.tiktok || row.whatsapp || row.telegram || row.youtube || row.x_twitter || row.snapchat || row.pinterest || row.threads)) {
    socialLinksList = [
      ...(row.whatsapp ? [{ id: 'soc_wa', platform: 'whatsapp' as const, title: 'WhatsApp Support', url: row.whatsapp.startsWith('http') ? row.whatsapp : `https://wa.me/${row.whatsapp.replace(/\D/g, '')}`, isActive: true, openInNewTab: true }] : []),
      ...(row.instagram ? [{ id: 'soc_ig', platform: 'instagram' as const, title: 'Instagram', url: row.instagram.startsWith('http') ? row.instagram : `https://www.instagram.com/${row.instagram.replace('@', '')}`, isActive: true, openInNewTab: true }] : []),
      ...(row.tiktok ? [{ id: 'soc_tt', platform: 'tiktok' as const, title: 'TikTok', url: row.tiktok.startsWith('http') ? row.tiktok : `https://www.tiktok.com/@${row.tiktok.replace('@', '')}`, isActive: true, openInNewTab: true }] : []),
      ...(row.facebook ? [{ id: 'soc_fb', platform: 'facebook' as const, title: 'Facebook', url: row.facebook, isActive: true, openInNewTab: true }] : []),
      ...(row.telegram ? [{ id: 'soc_tg', platform: 'telegram' as const, title: 'Telegram', url: row.telegram.startsWith('http') ? row.telegram : `https://t.me/${row.telegram.replace('@', '')}`, isActive: true, openInNewTab: true }] : []),
      ...(row.youtube ? [{ id: 'soc_yt', platform: 'youtube' as const, title: 'YouTube', url: row.youtube, isActive: true, openInNewTab: true }] : []),
      ...(row.x_twitter ? [{ id: 'soc_tw', platform: 'twitter' as const, title: 'X (Twitter)', url: row.x_twitter, isActive: true, openInNewTab: true }] : []),
      ...(row.snapchat ? [{ id: 'soc_sc', platform: 'snapchat' as const, title: 'Snapchat', url: row.snapchat.startsWith('http') ? row.snapchat : `https://www.snapchat.com/add/${row.snapchat.replace('@', '')}`, isActive: true, openInNewTab: true }] : []),
      ...(row.pinterest ? [{ id: 'soc_pin', platform: 'pinterest' as const, title: 'Pinterest', url: row.pinterest, isActive: true, openInNewTab: true }] : []),
      ...(row.threads ? [{ id: 'soc_th', platform: 'threads' as const, title: 'Threads', url: row.threads.startsWith('http') ? row.threads : `https://www.threads.net/@${row.threads.replace('@', '')}`, isActive: true, openInNewTab: true }] : []),
    ];
  }

  if (socialLinksList.length === 0) {
    socialLinksList = DEFAULT_SOCIAL_LINKS;
  }

  // 4. Parse categories
  let categoriesList: Category[] = CATEGORIES;
  if (Array.isArray(row.categories) && row.categories.length > 0) {
    categoriesList = row.categories;
  } else if (Array.isArray(meta.categories) && meta.categories.length > 0) {
    categoriesList = meta.categories;
  } else if (typeof row.categories === 'string') {
    try {
      const parsed = JSON.parse(row.categories);
      if (Array.isArray(parsed) && parsed.length > 0) categoriesList = parsed;
    } catch {
      // ignore
    }
  }

  const fbLink = socialLinksList.find((l) => l.platform === 'facebook' && l.isActive)?.url || row.facebook || 'https://www.facebook.com/share/196NnLNFU4/?mibextid=wwXIfr';
  const igLink = socialLinksList.find((l) => l.platform === 'instagram' && l.isActive)?.url || row.instagram || 'molfet.eg';
  const ttLink = socialLinksList.find((l) => l.platform === 'tiktok' && l.isActive)?.url || row.tiktok || 'https://www.tiktok.com/@molfet.eg';
  const waLink = socialLinksList.find((l) => l.platform === 'whatsapp' && l.isActive)?.url || row.whatsapp || '201012345678';

  return {
    version: Number(meta.version || row.version) || 1,
    updatedAt: row.updated_at || meta.updatedAt || new Date().toISOString(),
    storeName: row.store_name || 'MOLFET FOR FASHON',
    tagline: cleanTagline,
    phone: row.phone || '+201012345678',
    whatsapp: waLink,
    instagram: igLink,
    facebook: fbLink,
    tiktok: ttLink,
    telegram: row.telegram || meta.telegram || undefined,
    youtube: row.youtube || meta.youtube || undefined,
    xTwitter: row.x_twitter || meta.xTwitter || undefined,
    snapchat: row.snapchat || meta.snapchat || undefined,
    pinterest: row.pinterest || meta.pinterest || undefined,
    threads: row.threads || meta.threads || undefined,
    socialLinks: socialLinksList,
    categories: categoriesList,
    instapayAddress: row.instapay_address || row.instapay_username || meta.instapayAddress || 'molfet@instapay',
    instapayPhone: row.instapay_phone || meta.instapayPhone || '01012345678',
    vodafoneCashNumber: row.vodafone_cash_number || row.vodafone_cash || meta.vodafoneCashNumber || '01012345678',
    paymentInstructions: row.payment_instructions || meta.paymentInstructions || 'يرجى تحويل المبلغ الإجمالي إلى العنوان أو الرقم أعلاه ورفع سكرين شوت بالتحويل لتأكيد الطلب فوراً.',
    announcementAr: row.announcement_ar || 'توصيل سريع داخل الإسكندرية | شحن مجاني للطلبات فوق 2900 جنيه',
    announcementEn: row.announcement_en || 'FAST ALEXANDRIA DELIVERY • FREE SHIPPING FOR ORDERS OVER 2900 LE',
    announcements: announcementsList,
    heroBannerImage: row.hero_banner_image || meta.heroBannerImage || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop',
    heroButtonText: row.hero_button_text || meta.heroButtonText || 'New Arrivals',
    freeShippingThreshold: Number(row.free_shipping_threshold) || 2900,
    defaultShippingFee: Number(row.default_shipping_fee) || 50,
    cairoGizaShipping: Number(row.cairo_giza_shipping) || 50,
    alexShipping: Number(row.alex_shipping) || 50,
    deltaShipping: Number(row.delta_shipping) || 50,
    upperEgyptShipping: Number(row.upper_egypt_shipping) || 60,
    telegramBotToken: row.telegram_bot_token || meta.telegramBotToken || undefined,
    telegramChatId: row.telegram_chat_id || meta.telegramChatId || undefined,
    mobileWebhookUrl: row.mobile_webhook_url || meta.mobileWebhookUrl || undefined,
    enableTelegramNotifications: meta.enableTelegramNotifications ?? (meta.telegramBotToken && meta.telegramChatId ? true : false),
    enableWebhookNotifications: meta.enableWebhookNotifications ?? (meta.mobileWebhookUrl ? true : false),
  };
}

/**
 * Maps StoreSettings object to Supabase store_settings row with resilient schema support
 */
export function mapSettingsToRow(s: Partial<StoreSettings>, currentSettings?: StoreSettings): any {
  const merged: StoreSettings = {
    ...DEFAULT_STORE_SETTINGS,
    ...(currentSettings || {}),
    ...s,
  };

  const nextVersion = ((currentSettings?.version || s.version || 0) + 1);
  const nowIso = new Date().toISOString();

  const meta = {
    version: nextVersion,
    updatedAt: nowIso,
    categories: merged.categories || CATEGORIES,
    socialLinks: merged.socialLinks || DEFAULT_SOCIAL_LINKS,
    announcements: merged.announcements,
    heroBannerImage: merged.heroBannerImage,
    heroButtonText: merged.heroButtonText,
    instapayAddress: merged.instapayAddress,
    instapayPhone: merged.instapayPhone,
    vodafoneCashNumber: merged.vodafoneCashNumber,
    paymentInstructions: merged.paymentInstructions,
    telegram: merged.telegram,
    youtube: merged.youtube,
    xTwitter: merged.xTwitter,
    snapchat: merged.snapchat,
    pinterest: merged.pinterest,
    threads: merged.threads,
    telegramBotToken: merged.telegramBotToken,
    telegramChatId: merged.telegramChatId,
    mobileWebhookUrl: merged.mobileWebhookUrl,
    enableTelegramNotifications: merged.enableTelegramNotifications,
    enableWebhookNotifications: merged.enableWebhookNotifications,
  };

  // Clean raw tagline and append metadata block
  const rawTagline = (merged.tagline || '')
    .replace(/\n?<!--MOLFET_META:.*?-->/s, '')
    .trim();
  const taglineWithMeta = `${rawTagline}\n<!--MOLFET_META:${JSON.stringify(meta)}-->`;

  const row: any = {
    id: 'default',
    store_name: merged.storeName || 'MOLFET FOR FASHON',
    tagline: taglineWithMeta,
    phone: merged.phone || '+201012345678',
    whatsapp: merged.whatsapp || '201012345678',
    instagram: merged.instagram || 'molfet.eg',
    announcement_ar: merged.announcementAr || 'توصيل سريع داخل الإسكندرية | شحن مجاني للطلبات فوق 2900 جنيه',
    announcement_en: merged.announcementEn || 'FAST ALEXANDRIA DELIVERY • FREE SHIPPING FOR ORDERS OVER 2900 LE',
    free_shipping_threshold: Number(merged.freeShippingThreshold) || 2900,
    default_shipping_fee: Number(merged.defaultShippingFee) || 50,
    cairo_giza_shipping: Number(merged.cairoGizaShipping) || 50,
    alex_shipping: Number(merged.alexShipping) || 50,
    delta_shipping: Number(merged.deltaShipping) || 50,
    upper_egypt_shipping: Number(merged.upperEgyptShipping) || 60,
    updated_at: nowIso,
  };

  // Also populate explicit columns for databases with full schema
  if (merged.facebook !== undefined) row.facebook = merged.facebook;
  if (merged.tiktok !== undefined) row.tiktok = merged.tiktok;
  if (merged.telegram !== undefined) row.telegram = merged.telegram;
  if (merged.youtube !== undefined) row.youtube = merged.youtube;
  if (merged.xTwitter !== undefined) row.x_twitter = merged.xTwitter;
  if (merged.snapchat !== undefined) row.snapchat = merged.snapchat;
  if (merged.pinterest !== undefined) row.pinterest = merged.pinterest;
  if (merged.threads !== undefined) row.threads = merged.threads;
  if (merged.socialLinks !== undefined) row.social_links = merged.socialLinks;
  if (merged.announcements !== undefined) row.announcements = merged.announcements;
  if (merged.heroBannerImage !== undefined) row.hero_banner_image = merged.heroBannerImage;
  if (merged.heroButtonText !== undefined) row.hero_button_text = merged.heroButtonText;
  if (merged.instapayAddress !== undefined) row.instapay_address = merged.instapayAddress;
  if (merged.instapayPhone !== undefined) row.instapay_phone = merged.instapayPhone;
  if (merged.vodafoneCashNumber !== undefined) row.vodafone_cash_number = merged.vodafoneCashNumber;
  if (merged.paymentInstructions !== undefined) row.payment_instructions = merged.paymentInstructions;

  return row;
}

/**
 * 1. Fetch Products Listing
 */
export async function fetchProductsListing(options: {
  category?: string;
  page?: number;
  limit?: number;
  featuredOnly?: boolean;
  searchQuery?: string;
  forceRefresh?: boolean;
} = {}): Promise<{ products: Product[]; totalCount: number; hasMore: boolean }> {
  const {
    category = 'all',
    page = 1,
    limit = 50,
    featuredOnly = false,
    searchQuery = '',
    forceRefresh = false,
  } = options;

  const cacheKey = `products_${category}_${page}_${limit}_${featuredOnly}_${searchQuery}`;
  if (!forceRefresh) {
    const cached = getCached<{ products: Product[]; totalCount: number; hasMore: boolean }>(cacheKey);
    if (cached) return cached;
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { products: [], totalCount: 0, hasMore: false };
  }

  const selectColumns = `
    id, title_en, title_ar, slug, category, price, compare_at_price,
    stock, sku, thumbnail_url, images, sizes, colors, badge,
    is_featured, is_active, rating, reviews_count, created_at
  `;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('products')
    .select(selectColumns, { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  if (featuredOnly) {
    query = query.eq('is_featured', true);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`title_en.ilike.%${q}%,title_ar.ilike.%${q}%,sku.ilike.%${q}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching products listing from Supabase:', error);
    return { products: [], totalCount: 0, hasMore: false };
  }

  const products = (data || []).map(mapProductRowToProduct);
  const totalCount = count || products.length;
  const hasMore = to < totalCount - 1;

  const result = { products, totalCount, hasMore };
  setCached(cacheKey, result);
  return result;
}

/**
 * 2. Fetch Full Product Details
 */
export async function fetchProductDetails(id: string): Promise<Product | null> {
  const cacheKey = `product_detail_${id}`;
  const cached = getCached<Product>(cacheKey);
  if (cached) return cached;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching product details from Supabase:', error);
    return null;
  }

  const product = mapProductRowToProduct(data);
  setCached(cacheKey, product);
  return product;
}

/**
 * 3. Search Products in Supabase
 */
export async function searchProductsDb(queryText: string): Promise<Product[]> {
  if (!queryText.trim()) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const q = queryText.trim();
  const { data, error } = await supabase
    .from('products')
    .select('id, title_en, title_ar, category, price, compare_at_price, thumbnail_url, images, sku')
    .eq('is_active', true)
    .or(`title_en.ilike.%${q}%,title_ar.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(10);

  if (error || !data) return [];
  return data.map(mapProductRowToProduct);
}

/**
 * 4. Add Product to Supabase (Admin)
 */
export async function addProductDb(product: Product): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured yet.' };
  }

  const row = mapProductToRow(product);
  const { error } = await supabase.from('products').insert([row]);

  if (error) {
    console.error('Error adding product to Supabase:', error);
    return { success: false, error: error.message || 'Database insert failed' };
  }

  invalidateCachePrefix('products_');
  return { success: true };
}

/**
 * 5. Update Product in Supabase (Admin)
 */
export async function updateProductDb(id: string, updates: Partial<Product>): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const row = mapProductToRow(updates);
  delete row.id; // don't update ID

  const { error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id);

  if (error) {
    console.error('Error updating product in Supabase:', error);
    return { success: false, error: error.message || 'Database update failed' };
  }

  invalidateCachePrefix('products_');
  return { success: true };
}

/**
 * 6. Delete Product from Supabase & cleanup Storage
 */
export async function deleteProductDb(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product from Supabase:', error);
    return false;
  }

  // Cleanup storage images
  deleteProductImagesFromStorage(id).catch(console.warn);

  invalidateCachePrefix('products_');
  return true;
}

/**
 * 6b. Delete Multiple Products in Bulk
 */
export async function deleteProductsBulkDb(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting multiple products from Supabase:', error);
    return false;
  }

  for (const id of ids) {
    deleteProductImagesFromStorage(id).catch(console.warn);
  }

  invalidateCachePrefix('products_');
  return true;
}

/**
 * 6c. Delete All Products from Supabase
 */
export async function deleteAllProductsDb(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('products')
    .delete()
    .neq('id', '___NEVER_MATCH___'); // Supabase requires a filter for bulk delete

  if (error) {
    console.error('Error clearing all products from Supabase:', error);
    return false;
  }

  invalidateCachePrefix('products_');
  return true;
}

/**
 * 7. Create Order with Atomic Stock Verification
 */
export async function createOrderDb(
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>
): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const orderNumber = `MLF-${Math.floor(100000 + Math.random() * 900000)}`;
  const createdAt = new Date().toISOString();

  const newOrder: Order = {
    ...orderData,
    id: orderId,
    orderNumber,
    createdAt,
  };

  const orderPayload: any = {
    id: orderId,
    order_number: orderNumber,
    customer_name: orderData.customerName,
    phone: orderData.phone,
    alt_phone: orderData.altPhone || null,
    governorate: orderData.governorate,
    city: orderData.city,
    address: orderData.address,
    notes: orderData.notes || null,
    subtotal: orderData.subtotal,
    shipping_fee: orderData.shippingFee,
    discount: orderData.discount,
    total: orderData.total,
    applied_coupon: orderData.appliedCoupon || null,
    payment_method: orderData.paymentMethod || 'cod',
    status: 'pending',
  };

  // If receipt is present and needed
  if (orderData.paymentReceiptUrl) {
    orderPayload.payment_receipt_url = orderData.paymentReceiptUrl;
  }

  const itemsPayload = orderData.items.map((i) => ({
    product_id: i.productId,
    product_name: i.title,
    price: i.price,
    size: i.size,
    color: i.color,
    quantity: i.quantity,
    thumbnail_url: i.image,
  }));

  try {
    // 1. Try RPC for atomic transaction
    const { data: rpcData, error: rpcError } = await supabase.rpc('place_order_atomic', {
      p_order: orderPayload,
      p_items: itemsPayload,
    });

    if (!rpcError && rpcData?.success) {
      invalidateCachePrefix('orders_');
      invalidateCachePrefix('products_');
      return newOrder;
    }

    // 2. Direct inserts with fallback
    let { error: orderError } = await supabase.from('orders').insert([orderPayload]);
    if (orderError && orderPayload.payment_receipt_url && orderError.message?.includes('payment_receipt_url')) {
      const fallbackPayload = { ...orderPayload };
      delete fallbackPayload.payment_receipt_url;
      if (orderData.paymentReceiptUrl) {
        fallbackPayload.notes = fallbackPayload.notes 
          ? `${fallbackPayload.notes} | إيصال التحويل: ${orderData.paymentReceiptUrl}`
          : `إيصال التحويل: ${orderData.paymentReceiptUrl}`;
      }
      const retryRes = await supabase.from('orders').insert([fallbackPayload]);
      orderError = retryRes.error;
    }

    if (orderError) {
      console.error('Order insert error in Supabase:', orderError);
      return null;
    }

    const orderItemsRows = itemsPayload.map((item) => ({
      order_id: orderId,
      ...item,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItemsRows);
    if (itemsError) {
      console.warn('Order items insert notice:', itemsError);
    }

    // Decrement stocks
    for (const item of orderData.items) {
      try {
        const { data: p } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.productId)
          .single();
        if (p && typeof p.stock === 'number') {
          const newStock = Math.max(0, p.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
        }
      } catch {
        // Stock update best effort
      }
    }

    invalidateCachePrefix('orders_');
    invalidateCachePrefix('products_');
    return newOrder;
  } catch (e) {
    console.error('Exception creating order in Supabase:', e);
    return null;
  }
}

/**
 * 8. Fetch Admin Orders (Robust with fallback)
 */
export async function fetchAdminOrdersDb(options: {
  page?: number;
  limit?: number;
  status?: string;
  searchQuery?: string;
} = {}): Promise<{ orders: Order[]; totalCount: number; hasMore: boolean }> {
  const {
    page = 1,
    limit = 25,
    status = 'all',
    searchQuery = '',
  } = options;

  const supabase = getSupabase();
  if (!supabase) return { orders: [], totalCount: 0, hasMore: false };

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 1. First attempt: Query with joined order_items using standard existing columns
  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, phone, alt_phone,
      governorate, city, address, notes, subtotal, shipping_fee,
      discount, total, applied_coupon, payment_method, status, created_at,
      order_items (
        product_id, product_name, price, size, color, quantity, thumbnail_url
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.trim();
    query = query.or(`order_number.ilike.%${q}%,phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
  }

  let { data, error, count } = await query;

  // 2. Fallback: If joined query failed, query orders table directly and batch-fetch order_items
  if (error || !data) {
    console.warn('Joined orders query notice, using robust direct query:', error?.message);
    let fallbackQuery = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      fallbackQuery = fallbackQuery.eq('status', status);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim();
      fallbackQuery = fallbackQuery.or(`order_number.ilike.%${q}%,phone.ilike.%${q}%,customer_name.ilike.%${q}%`);
    }

    const fallbackRes = await fallbackQuery;
    if (fallbackRes.error) {
      console.error('Error fetching admin orders fallback:', fallbackRes.error);
      return { orders: [], totalCount: 0, hasMore: false };
    }

    data = fallbackRes.data || [];
    count = fallbackRes.count;

    if (data.length > 0) {
      const orderIds = data.map((o: any) => o.id);
      try {
        const { data: allItems } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);

        const itemsByOrderId: Record<string, any[]> = {};
        (allItems || []).forEach((item: any) => {
          if (!itemsByOrderId[item.order_id]) {
            itemsByOrderId[item.order_id] = [];
          }
          itemsByOrderId[item.order_id].push(item);
        });

        data.forEach((o: any) => {
          o.order_items = itemsByOrderId[o.id] || [];
        });
      } catch (errItems) {
        console.warn('Error fetching order items in fallback:', errItems);
      }
    }
  }

  const orders: Order[] = (data || []).map((row: any) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    phone: row.phone,
    altPhone: row.alt_phone || undefined,
    governorate: row.governorate,
    city: row.city,
    address: row.address,
    notes: row.notes || undefined,
    subtotal: Number(row.subtotal) || 0,
    shippingFee: Number(row.shipping_fee) || 0,
    discount: Number(row.discount) || 0,
    total: Number(row.total) || 0,
    appliedCoupon: row.applied_coupon || undefined,
    paymentMethod: row.payment_method || 'cod',
    paymentReceiptUrl: row.payment_receipt_url || undefined,
    status: row.status || 'pending',
    createdAt: row.created_at,
    items: Array.isArray(row.order_items)
      ? row.order_items.map((i: any) => ({
          productId: i.product_id,
          title: i.product_name || i.title || 'Product',
          price: Number(i.price) || 0,
          size: i.size || 'Standard',
          color: i.color || 'Standard',
          quantity: Number(i.quantity) || 1,
          image: i.thumbnail_url || i.image || '',
        }))
      : [],
  }));

  const totalCount = count !== null && count !== undefined ? count : orders.length;
  const hasMore = to < totalCount - 1;

  return { orders, totalCount, hasMore };
}

/**
 * 9. Fetch Dashboard Statistics
 */
export async function fetchDashboardStatsDb(): Promise<{
  productsCount: number;
  totalOrdersCount: number;
  pendingOrdersCount: number;
  totalSalesRevenue: number;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { productsCount: 0, totalOrdersCount: 0, pendingOrdersCount: 0, totalSalesRevenue: 0 };
  }

  try {
    const { count: pCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { data: ordersData, count: oCount } = await supabase
      .from('orders')
      .select('status, total', { count: 'exact' });

    let revenue = 0;
    let pending = 0;

    if (ordersData) {
      for (const o of ordersData) {
        if (o.status !== 'cancelled') {
          revenue += Number(o.total) || 0;
        }
        if (o.status === 'pending') {
          pending += 1;
        }
      }
    }

    return {
      productsCount: pCount || 0,
      totalOrdersCount: oCount || (ordersData?.length || 0),
      pendingOrdersCount: pending,
      totalSalesRevenue: revenue,
    };
  } catch (e) {
    console.error('Error calculating dashboard stats:', e);
    return { productsCount: 0, totalOrdersCount: 0, pendingOrdersCount: 0, totalSalesRevenue: 0 };
  }
}

/**
 * 10. Update Order Status in Supabase
 */
export async function updateOrderStatusDb(orderId: string, status: Order['status']): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error('Error updating order status in Supabase:', error);
    return false;
  }

  invalidateCachePrefix('orders_');
  return true;
}

/**
 * 11. Delete Order in Supabase
 */
export async function deleteOrderDb(orderId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId);

  if (error) {
    console.error('Error deleting order from Supabase:', error);
    return false;
  }

  invalidateCachePrefix('orders_');
  return true;
}

/**
 * 11b. Delete Multiple Orders in Bulk
 */
export async function deleteOrdersBulkDb(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('orders')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting multiple orders from Supabase:', error);
    return false;
  }

  invalidateCachePrefix('orders_');
  return true;
}

/**
 * 11c. Delete All Orders from Supabase
 */
export async function deleteAllOrdersDb(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase
    .from('orders')
    .delete()
    .neq('id', '___NEVER_MATCH___');

  if (error) {
    console.error('Error clearing all orders from Supabase:', error);
    return false;
  }

  invalidateCachePrefix('orders_');
  return true;
}

/**
 * 12. Track Single Order by Order Number or Phone (Public)
 */
export async function trackOrderDb(queryText: string): Promise<Order | null> {
  const supabase = getSupabase();
  if (!supabase || !queryText.trim()) return null;

  const rawClean = queryText.trim();
  const clean = rawClean.replace(/^#/, '').trim();
  const cleanDigits = rawClean.replace(/\D/g, '');

  try {
    // Build flexible OR condition
    const orConditions: string[] = [
      `order_number.ilike.%${clean}%`,
      `phone.ilike.%${clean}%`,
      `id.eq.${clean}`
    ];

    if (cleanDigits && cleanDigits.length >= 4) {
      orConditions.push(`phone.ilike.%${cleanDigits}%`);
      orConditions.push(`alt_phone.ilike.%${cleanDigits}%`);
      orConditions.push(`order_number.ilike.%${cleanDigits}%`);
    }

    const orQueryString = orConditions.join(',');

    // 1. Try with nested order_items
    let orderRow: any = null;
    let itemsRows: any[] = [];

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, order_number, customer_name, phone, alt_phone,
        governorate, city, address, notes, subtotal, shipping_fee,
        discount, total, applied_coupon, payment_method, status, created_at,
        order_items (
          product_id, product_name, price, size, color, quantity, thumbnail_url
        )
      `)
      .or(orQueryString)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      orderRow = data;
      itemsRows = Array.isArray(data.order_items) ? data.order_items : [];
    } else {
      // 2. Fallback: Query orders without nested relationship in case foreign key is not defined
      const { data: fallbackOrder, error: fallbackError } = await supabase
        .from('orders')
        .select('*')
        .or(orQueryString)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError || !fallbackOrder) {
        return null;
      }

      orderRow = fallbackOrder;

      // Fetch items separately
      try {
        const { data: fetchedItems } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderRow.id);
        if (fetchedItems) {
          itemsRows = fetchedItems;
        }
      } catch {
        itemsRows = [];
      }
    }

    if (!orderRow) return null;

    return {
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      customerName: orderRow.customer_name,
      phone: orderRow.phone,
      altPhone: orderRow.alt_phone || undefined,
      governorate: orderRow.governorate,
      city: orderRow.city,
      address: orderRow.address,
      notes: orderRow.notes || undefined,
      subtotal: Number(orderRow.subtotal) || 0,
      shippingFee: Number(orderRow.shipping_fee) || 0,
      discount: Number(orderRow.discount) || 0,
      total: Number(orderRow.total) || 0,
      appliedCoupon: orderRow.applied_coupon || undefined,
      paymentMethod: orderRow.payment_method || 'cod',
      paymentReceiptUrl: orderRow.payment_receipt_url || undefined,
      status: orderRow.status || 'pending',
      createdAt: orderRow.created_at,
      items: itemsRows.map((i: any) => ({
        productId: i.product_id,
        title: i.product_name || i.title || 'Product',
        price: Number(i.price) || 0,
        size: i.size || 'Standard',
        color: i.color || 'Standard',
        quantity: Number(i.quantity) || 1,
        image: i.thumbnail_url || i.image || '',
      })),
    };
  } catch (err) {
    console.error('Error tracking order in Supabase:', err);
    return null;
  }
}

/**
 * 13. Fetch Coupons from Supabase
 */
export async function fetchCouponsDb(): Promise<Coupon[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true);

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discount_type,
    value: Number(c.value),
    minOrder: Number(c.min_order) || 0,
    isActive: c.is_active !== false,
  }));
}

/**
 * 14. Add Coupon in Supabase
 */
export async function addCouponDb(coupon: Coupon): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase not connected' };

  const { error } = await supabase.from('coupons').insert([{
    id: coupon.id,
    code: coupon.code.toUpperCase(),
    discount_type: coupon.discountType,
    value: coupon.value,
    min_order: coupon.minOrder,
    is_active: coupon.isActive,
  }]);

  if (error) {
    console.error('Error adding coupon to Supabase:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * 15. Delete Coupon in Supabase
 */
export async function deleteCouponDb(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('coupons').delete().eq('id', id);
  return !error;
}

/**
 * 15b. Delete Multiple Coupons in Bulk
 */
export async function deleteCouponsBulkDb(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('coupons').delete().in('id', ids);
  return !error;
}

/**
 * 15c. Delete All Coupons from Supabase
 */
export async function deleteAllCouponsDb(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from('coupons').delete().neq('id', '___NEVER_MATCH___');
  return !error;
}

/**
 * 16. Fetch Store Settings from Supabase
 */
export async function fetchStoreSettingsDb(): Promise<StoreSettings | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapStoreSettingsRowToSettings(data);
}

/**
 * 17. Update Store Settings in Supabase
 */
export async function updateStoreSettingsDb(
  settings: Partial<StoreSettings>
): Promise<{ success: boolean; error?: string; data?: StoreSettings }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة بيانات Supabase' };

  try {
    // 1. Fetch current settings from DB first to merge safely without loss
    const current = await fetchStoreSettingsDb();
    const row = mapSettingsToRow(settings, current || undefined);

    // 2. Primary Attempt: Upsert full row with all columns
    const { error: err1 } = await supabase
      .from('store_settings')
      .upsert([row], { onConflict: 'id' });

    if (!err1) {
      const fresh = await fetchStoreSettingsDb();
      return { success: true, data: fresh || undefined };
    }

    console.warn('Initial store_settings upsert with extra columns failed, attempting core columns fallback:', err1.message);

    // 3. Fallback: Save to core known columns with structured metadata preserved inside tagline
    const coreRow = {
      id: 'default',
      store_name: row.store_name,
      tagline: row.tagline,
      phone: row.phone,
      whatsapp: row.whatsapp,
      instagram: row.instagram,
      announcement_ar: row.announcement_ar,
      announcement_en: row.announcement_en,
      free_shipping_threshold: row.free_shipping_threshold,
      default_shipping_fee: row.default_shipping_fee,
      cairo_giza_shipping: row.cairo_giza_shipping,
      alex_shipping: row.alex_shipping,
      delta_shipping: row.delta_shipping,
      upper_egypt_shipping: row.upper_egypt_shipping,
      updated_at: row.updated_at,
    };

    const { error: err2 } = await supabase
      .from('store_settings')
      .upsert([coreRow], { onConflict: 'id' });

    if (!err2) {
      const fresh = await fetchStoreSettingsDb();
      return { success: true, data: fresh || undefined };
    }

    console.error('Error updating store settings in Supabase:', err2);
    return { success: false, error: err2.message };
  } catch (err: any) {
    console.error('Exception updating store settings:', err);
    return { success: false, error: err?.message || 'Database error occurred' };
  }
}
