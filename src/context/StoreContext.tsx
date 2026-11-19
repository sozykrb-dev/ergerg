import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Product, CartItem, Order, Coupon, StoreSettings, ViewMode, HeroSlide, Category } from '../types';
import { DEFAULT_STORE_SETTINGS, DEFAULT_SOCIAL_LINKS, INITIAL_COUPONS, INITIAL_HERO_SLIDES, CATEGORIES, INITIAL_PRODUCTS } from '../data/constants';
import { 
  fetchProductsListing, 
  fetchProductDetails, 
  createOrderDb, 
  updateOrderStatusDb, 
  deleteOrderDb,
  deleteOrdersBulkDb,
  deleteAllOrdersDb,
  addProductDb,
  updateProductDb,
  deleteProductDb,
  deleteProductsBulkDb,
  deleteAllProductsDb,
  fetchCouponsDb,
  addCouponDb,
  deleteCouponDb,
  deleteCouponsBulkDb,
  deleteAllCouponsDb,
  trackOrderDb,
  fetchStoreSettingsDb,
  updateStoreSettingsDb,
} from '../lib/db';
import { getSupabaseConfig, saveCustomSupabaseConfig } from '../lib/supabase';
import { navigate, parseRoute, Route } from '../lib/router';
import { ShopifyProvider, useShopify } from './ShopifyContext';
import { 
  notifyAdminNewOrderLocally, 
  sendTelegramOrderNotification, 
  sendWebhookOrderNotification 
} from '../lib/orderNotifications';

interface StoreContextType {
  // Products
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;
  loadProducts: (options?: { category?: string; force?: boolean }) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'slug' | 'rating' | 'reviewsCount'>) => Promise<Product | null>;
  updateProduct: (id: string, updated: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  deleteProductsBulk: (ids: string[]) => Promise<boolean>;
  clearAllProducts: () => Promise<boolean>;

  // Active Selected Product for detail view
  selectedProduct: Product | null;
  isLoadingProductDetails: boolean;
  setSelectedProduct: (product: Product | null) => void;
  openProductModal: (product: Product) => Promise<void>;
  closeProductModal: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartCount: number;
  cartSubtotal: number;
  /** hand the basket to Shopify's hosted checkout; false when Shopify is off */
  redirectToShopifyCheckout: () => Promise<boolean>;
  shopifyConfigured: boolean;
  shopifyBusy: boolean;
  shopifyCheckoutUrl: string | null;
  /** one request for a whole look (Shopify cartLinesAdd, batched) */
  shopifyAddLook: (
    items: { product: Product; size: string; color: string; quantity: number }[]
  ) => Promise<boolean>;

  // Coupons
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  couponError: string | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  deleteCouponsBulk: (ids: string[]) => Promise<void>;
  clearAllCoupons: () => Promise<void>;
  discountAmount: number;

  // Orders
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteOrdersBulk: (ids: string[]) => Promise<void>;
  clearAllOrders: () => Promise<void>;
  lastPlacedOrder: Order | null;
  setLastPlacedOrder: (order: Order | null) => void;
  trackSingleOrder: (query: string) => Promise<Order | null>;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (productId: string) => void;

  // Categories
  categories: Category[];
  addCategory: (cat: Omit<Category, 'id' | 'slug'> & { id?: string; slug?: string }) => Promise<Category | null>;
  updateCategory: (id: string, updated: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  reorderCategories: (categories: Category[]) => Promise<boolean>;

  // Store Settings & Banners
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
  heroSlides: HeroSlide[];
  updateHeroSlides: (slides: HeroSlide[]) => void;

  // Navigation & View
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Admin Auth & Supabase Config
  isAdminAuthenticated: boolean;
  setIsAdminAuthenticated: (auth: boolean) => void;
  isSupabaseConfigured: boolean;
  configureSupabase: (url: string, key: string) => void;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const LOCAL_STORAGE_KEYS = {
  CART: 'molfet_cart_session_v2',
  SETTINGS: 'molfet_settings_cache_v2',
  WISHLIST: 'molfet_wishlist_cache_v2',
  LAST_ORDER: 'molfet_last_order_cache_v2',
};

const StoreProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Shopify (products, cart, checkout). When it is not configured every call
  // below returns false and this provider behaves exactly as before.
  const shopify = useShopify();

  // Supabase Configuration State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig);

  // Products State (Loaded from Supabase)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState<boolean>(false);

  // Cart State (Lightweight local session)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.CART);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading cart from storage', e);
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ORDER);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return null;
  });

  // Wishlist State
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.WISHLIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return [];
  });

  // Store Settings & Hero Slides (saved permanently in Supabase Database - No localStorage)
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(INITIAL_HERO_SLIDES);

  // Navigation & UI state — viewMode is a thin projection of the hash route so
  // deep links (#/product/x, #/mix, #/checkout) are shareable.
  const routeToViewMode = (route: Route): ViewMode => {
    switch (route.name) {
      case 'admin': return 'admin';
      case 'checkout': return 'checkout';
      case 'success': return 'order-success';
      case 'track': return 'track-order';
      case 'mix': return 'mix';
      case 'about': return 'about';
      case 'cart': return 'cart';
      case 'notfound': return 'notfound';
      case 'product': return 'product-detail';
      default: return 'store';
    }
  };

  const [viewMode, setViewModeState] = useState<ViewMode>(() => routeToViewMode(parseRoute(window.location.hash)));

  useEffect(() => {
    const sync = () => setViewModeState(routeToViewMode(parseRoute(window.location.hash)));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const setViewMode = (mode: ViewMode) => {
    const map: Record<string, string> = {
      store: '#/',
      admin: '#/admin',
      checkout: '#/checkout',
      'order-success': '#/success',
      'track-order': '#/track',
      mix: '#/mix',
      about: '#/about',
      cart: '#/cart',
      notfound: '#/404',
    };
    if (mode === 'product-detail') return;
    navigate(map[mode] || '#/');
    setViewModeState(mode);
  };
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Save Cart to local session on updates
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    } catch {
      // Ignore
    }
  }, [wishlist]);

  // Load Products from Supabase, with the local catalogue as a resilient base.
  // The local catalogue carries the concept layers (cut-out, sketch, macro,
  // hotspots) and is also used to fill any of those that the database row omits.
  const loadProducts = useCallback(async (options: { category?: string; force?: boolean } = {}) => {
    setIsLoadingProducts(true);
    setProductsError(null);

    const mergeWithLocal = (remote: Product[]): Product[] => {
      if (!remote || remote.length === 0) return INITIAL_PRODUCTS;
      const localById = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
      const bySku = new Map(INITIAL_PRODUCTS.map((p) => [p.sku, p]));
      const merged = remote.map((product) => {
        const local = localById.get(product.id) || (product.sku ? bySku.get(product.sku) : undefined);
        if (!local) return product;
        return {
          ...local,
          ...Object.fromEntries(Object.entries(product).filter(([, v]) => v !== undefined && v !== null && v !== '')),
          slot: product.slot || local.slot,
          cutoutUrl: product.cutoutUrl || local.cutoutUrl,
          sketchUrl: product.sketchUrl || local.sketchUrl,
          macroUrl: product.macroUrl || local.macroUrl,
          details: product.details && product.details.length ? product.details : local.details,
        } as Product;
      });
      const seen = new Set(merged.map((p) => p.id));
      const extras = INITIAL_PRODUCTS.filter((p) => !seen.has(p.id) && !remote.some((r) => r.sku === p.sku));
      return [...merged, ...extras];
    };

    try {
      const { products: fetchedProducts } = await fetchProductsListing({
        category: options.category || 'all',
        limit: 50,
        forceRefresh: options.force || false,
      });

      setProducts(mergeWithLocal(fetchedProducts));
    } catch (err: any) {
      console.warn('Falling back to the local MOLFET catalogue:', err?.message || err);
      setProducts(INITIAL_PRODUCTS);
      setProductsError(null);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Initial load on mount or when category changes
  useEffect(() => {
    loadProducts({ category: activeCategory });
  }, [activeCategory, loadProducts]);

  /* Shopify is the source of truth when it is configured and has products.
     The local catalogue stays underneath as the fallback for an empty store,
     a network hiccup or an unconfigured deployment. */
  const remoteProducts = shopify.configured && shopify.products.length > 0 ? shopify.products : null;
  useEffect(() => {
    if (!remoteProducts) return;
    setProducts(remoteProducts);
    setProductsError(null);
    setIsLoadingProducts(false);
  }, [remoteProducts]);

  const effectiveProducts = remoteProducts || products;

  // Load Coupons and Settings from Supabase on mount
  useEffect(() => {
    fetchCouponsDb().then((dbCoupons) => {
      if (dbCoupons.length > 0) {
        setCoupons(dbCoupons);
      }
    }).catch(console.warn);

    fetchStoreSettingsDb().then((dbSettings) => {
      if (dbSettings) {
        setSettings(dbSettings);
      }
    }).catch(console.warn);
  }, []);

  // Configure Supabase credentials
  const configureSupabase = (url: string, key: string) => {
    saveCustomSupabaseConfig(url, key);
    const updated = getSupabaseConfig();
    setSupabaseConfig(updated);
    showToast('تم حفظ بيانات الاتصال بـ Supabase بنجاح');
    loadProducts({ force: true });
    
    // Re-fetch settings & coupons directly from database
    fetchCouponsDb().then((dbCoupons) => {
      if (dbCoupons.length > 0) setCoupons(dbCoupons);
    }).catch(console.warn);
    fetchStoreSettingsDb().then((dbSettings) => {
      if (dbSettings) setSettings(dbSettings);
    }).catch(console.warn);
  };

  // Open Product Modal
  const openProductModal = async (product: Product) => {
    setSelectedProduct(product);
    setIsLoadingProductDetails(true);
    try {
      const fullProduct = await fetchProductDetails(product.id);
      if (fullProduct) {
        setSelectedProduct(fullProduct);
      }
    } catch (e) {
      console.warn('Could not fetch full details, using preview:', e);
    } finally {
      setIsLoadingProductDetails(false);
    }
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
  };

  // Product Operations
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt' | 'slug' | 'rating' | 'reviewsCount'>): Promise<Product | null> => {
    const productId = `mlft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanTitle = (data.titleEn || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = `${cleanTitle}-${Date.now().toString().slice(-5)}`;

    const newProduct: Product = {
      ...data,
      id: productId,
      slug,
      rating: 5.0,
      reviewsCount: 1,
      createdAt: new Date().toISOString(),
      thumbnailUrl: data.thumbnailUrl || (data.images && data.images[0]) || '',
      isActive: true,
    };

    const res = await addProductDb(newProduct);
    if (res.success) {
      setProducts((prev) => [newProduct, ...prev]);
      showToast('تم حفظ المنتج بنجاح في Supabase');
      return newProduct;
    } else {
      // Optimistic addition if DB has temporary issue
      setProducts((prev) => [newProduct, ...prev]);
      showToast(res.error ? `تنبيه: ${res.error}` : 'تم حفظ المنتج محلياً (يرجى التأكد من تشغيل schema.sql في Supabase)');
      return newProduct;
    }
  };

  const updateProduct = async (id: string, updated: Partial<Product>): Promise<boolean> => {
    const res = await updateProductDb(id, updated);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct((prev) => (prev ? { ...prev, ...updated } : null));
    }
    if (res.success) {
      showToast('تم تحديث المنتج بنجاح في Supabase');
    } else {
      showToast(res.error ? `تنبيه: ${res.error}` : 'تم التحديث محلياً');
    }
    return res.success;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    const success = await deleteProductDb(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(null);
    }
    showToast(success ? 'تم حذف المنتج من قاعدة البيانات' : 'تم حذف المنتج');
    return success;
  };

  const deleteProductsBulk = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return true;
    const success = await deleteProductsBulkDb(ids);
    const idSet = new Set(ids);
    setProducts((prev) => prev.filter((p) => !idSet.has(p.id)));
    setCart((prev) => prev.filter((item) => !idSet.has(item.product.id)));
    if (selectedProduct && idSet.has(selectedProduct.id)) {
      setSelectedProduct(null);
    }
    showToast(`تم حذف ${ids.length} منتج بنجاح`);
    return success;
  };

  const clearAllProducts = async (): Promise<boolean> => {
    const success = await deleteAllProductsDb();
    setProducts([]);
    setCart([]);
    setSelectedProduct(null);
    showToast('تم مسح جميع المنتجات من المتجر وقاعدة البيانات');
    return success;
  };

  // Cart Operations
  const addToCart = (product: Product, size: string, color: string, quantity = 1) => {
    // Shopify owns the cart when it is configured: one request, real inventory.
    if (shopify.configured && product.shopifyVariants?.length) {
      void shopify.addToCart(product, size, color, quantity).then((added) => {
        if (added) {
          setIsCartOpen(true);
          showToast(`تمت إضافة ${product.titleAr || product.titleEn} إلى السلة`);
        } else {
          showToast('تعذر إضافة القطعة إلى سلة شوبيفاي، حاول مرة أخرى.');
        }
      });
      return;
    }

    const cartItemId = `${product.id}-${size}-${color}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === cartItemId);
      if (existing) {
        return prev.map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: cartItemId, product, size, color, quantity }];
    });
    setIsCartOpen(true);
    showToast(`تمت إضافة ${product.titleAr || product.titleEn} إلى السلة`);
  };

  const removeFromCart = (cartItemId: string) => {
    if (shopify.configured) {
      const line = shopify.cartLines.find((item) => item.id === cartItemId || item.lineId === cartItemId);
      if (line?.lineId) {
        void shopify.removeLine(line.lineId);
        return;
      }
    }
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    if (shopify.configured) {
      const line = shopify.cartLines.find((item) => item.id === cartItemId || item.lineId === cartItemId);
      if (line?.lineId) {
        void shopify.updateQuantity(line.lineId, line.quantity + delta);
        return;
      }
    }
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    if (shopify.configured) {
      shopify.cartLines.forEach((line) => {
        if (line.lineId) void shopify.removeLine(line.lineId);
      });
      return;
    }
    setCart([]);
  };

  /* The effective cart: Shopify's when configured, the local one otherwise. */
  const shopifyCartActive = shopify.configured && (shopify.cart?.totalQuantity || 0) >= 0 && Boolean(shopify.cart);
  const effectiveCart: CartItem[] = shopifyCartActive ? shopify.cartLines : cart;
  const cartCount = shopifyCartActive
    ? shopify.cartCount
    : cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = shopifyCartActive
    ? shopify.cartSubtotal
    : cart.reduce((total, item) => total + item.product.price * item.quantity, 0);

  // Coupon Logic
  const applyCoupon = (code: string) => {
    setCouponError(null);
    // Shopify validates the code at checkout: pass it to the cart and let
    // Shopify answer. The local list is only used in the offline mode.
    if (shopify.configured) {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) return false;
      void shopify.applyDiscounts([trimmedCode]).then((applied) => {
        if (!applied) {
          setCouponError('كود الخصم غير صحيح أو منتهي الصلاحية');
          return;
        }
        const known = coupons.find((coupon) => coupon.code.toUpperCase() === trimmedCode);
        setAppliedCoupon(
          known || {
            id: `shopify-${trimmedCode}`,
            code: trimmedCode,
            discountType: 'percentage',
            value: 0,
            minOrder: 0,
            isActive: true,
          },
        );
      });
      return true;
    }
    const trimmed = code.trim().toUpperCase();
    const found = coupons.find(
      (c) => c.code.toUpperCase() === trimmed && c.isActive
    );
    if (!found) {
      setCouponError('كود الخصم غير صحيح أو منتهي الصلاحية');
      return false;
    }
    if (cartSubtotal < found.minOrder) {
      setCouponError(`الحد الأدنى للطلب لاستخدام هذا الكوبون هو ${found.minOrder} ج.م`);
      return false;
    }
    setAppliedCoupon(found);
    showToast(`تم تفعيل كود الخصم (${found.code}) بنجاح!`);
    return true;
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const addCoupon = async (newCoupon: Omit<Coupon, 'id'>) => {
    const coupon: Coupon = {
      ...newCoupon,
      id: `c-${Date.now()}`,
      code: newCoupon.code.trim().toUpperCase(),
    };
    const res = await addCouponDb(coupon);
    setCoupons((prev) => [...prev, coupon]);
    showToast(res.success ? 'تم حفظ كود الخصم في Supabase' : 'تمت إضافة الكوبون');
  };

  const deleteCoupon = async (id: string) => {
    await deleteCouponDb(id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    if (appliedCoupon?.id === id) setAppliedCoupon(null);
    showToast('تم حذف كود الخصم');
  };

  const deleteCouponsBulk = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    await deleteCouponsBulkDb(ids);
    const idSet = new Set(ids);
    setCoupons((prev) => prev.filter((c) => !idSet.has(c.id)));
    if (appliedCoupon && idSet.has(appliedCoupon.id)) setAppliedCoupon(null);
    showToast(`تم حذف ${ids.length} كود خصم`);
  };

  const clearAllCoupons = async () => {
    await deleteAllCouponsDb();
    setCoupons([]);
    setAppliedCoupon(null);
    showToast('تم مسح جميع الكوبونات');
  };

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percentage'
      ? Math.round((cartSubtotal * appliedCoupon.value) / 100)
      : Math.min(appliedCoupon.value, cartSubtotal)
    : 0;

  /**
   * Shopify checkout. The whole basket (and any discount code) goes to Shopify's
   * hosted checkout, which is where COD, InstaPay, wallets and cards are
   * configured in the admin. Returns false when there is nothing to check out,
   * so the caller can keep the legacy local checkout.
   */
  const redirectToShopifyCheckout = async (): Promise<boolean> => {
    if (!shopify.configured) return false;
    return shopify.checkout();
  };

  // Order Operations
  const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order | null> => {
    let createdOrder = await createOrderDb(orderData);

    // If DB returned null (e.g. Supabase temporary issue or table not created), generate local order as resilient fallback
    if (!createdOrder) {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const orderNumber = `MLF-${Math.floor(100000 + Math.random() * 900000)}`;
      createdOrder = {
        ...orderData,
        id: orderId,
        orderNumber,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
    }

    if (createdOrder) {
      setOrders((prev) => [createdOrder!, ...prev]);
      setLastPlacedOrder(createdOrder);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ORDER, JSON.stringify(createdOrder));
        // Append to recent orders list
        const existingRecentRaw = localStorage.getItem('molfet_recent_orders_v2');
        const recentList: Order[] = existingRecentRaw ? JSON.parse(existingRecentRaw) : [];
        const updatedList = [createdOrder, ...recentList.filter(o => o.id !== createdOrder!.id)].slice(0, 20);
        localStorage.setItem('molfet_recent_orders_v2', JSON.stringify(updatedList));
      } catch {
        // Ignore
      }
      // Notify admin listener
      try {
        notifyAdminNewOrderLocally({
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          customerName: createdOrder.customerName,
          phone: createdOrder.phone,
          total: createdOrder.total,
          governorate: createdOrder.governorate,
          paymentMethod: createdOrder.paymentMethod,
          createdAt: createdOrder.createdAt,
        });
      } catch {
        // Ignore
      }

      // External Mobile Phone Alerts (Telegram & Webhook)
      try {
        const storedTgBot = typeof window !== 'undefined' ? localStorage.getItem('molfet_tg_bot_token') : null;
        const storedTgChat = typeof window !== 'undefined' ? localStorage.getItem('molfet_tg_chat_id') : null;
        const tBot = (settings?.telegramBotToken || storedTgBot || DEFAULT_STORE_SETTINGS.telegramBotToken || '8868983556:AAFkMd3AtUbBR8CX7LM7lb0mhQHymaAnKhc').trim();
        const tChat = (settings?.telegramChatId || storedTgChat || DEFAULT_STORE_SETTINGS.telegramChatId || '7406265512').trim();

        // Always trigger instant Telegram notification immediately for every new order
        sendTelegramOrderNotification(tBot, tChat, createdOrder).then((res) => {
          if (!res.success) {
            console.error('Telegram order notification issue:', res.error);
          } else {
            console.log('✅ Telegram order alert sent instantly for order #' + createdOrder!.orderNumber);
          }
        }).catch((e) => {
          console.error('Telegram notification background dispatch error:', e);
        });

        const storedWb = typeof window !== 'undefined' ? localStorage.getItem('molfet_wb_url') : null;
        const wbUrl = (settings?.mobileWebhookUrl || storedWb || '').trim();
        if (settings?.enableWebhookNotifications !== false && wbUrl) {
          sendWebhookOrderNotification(wbUrl, createdOrder).catch((e) => {
            console.warn('Webhook notification background dispatch notice:', e);
          });
        }
      } catch (err) {
        console.error('Mobile alerts dispatch error:', err);
      }

      clearCart();
      setAppliedCoupon(null);
      setViewMode('order-success');
      showToast(`تم تأكيد الطلب #${createdOrder.orderNumber} وحفظه بنجاح!`);
      // Reload products to reflect stock decrement
      loadProducts({ force: true });
      return createdOrder;
    } else {
      showToast('تعذر حفظ الطلب، يرجى المحاولة مرة أخرى.');
      return null;
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    await updateOrderStatusDb(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    showToast('تم تحديث حالة الطلب في Supabase');
  };

  const deleteOrder = async (orderId: string) => {
    await deleteOrderDb(orderId);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    showToast('تم حذف الطلب بنجاح');
  };

  const deleteOrdersBulk = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    await deleteOrdersBulkDb(ids);
    const idSet = new Set(ids);
    setOrders((prev) => prev.filter((o) => !idSet.has(o.id)));
    showToast(`تم حذف ${ids.length} طلب بنجاح`);
  };

  const clearAllOrders = async () => {
    await deleteAllOrdersDb();
    setOrders([]);
    showToast('تم مسح جميع الطلبات من قاعدة البيانات');
  };

  const trackSingleOrder = async (query: string): Promise<Order | null> => {
    if (!query || !query.trim()) return null;

    // 1. First try Supabase DB lookup
    try {
      const dbResult = await trackOrderDb(query.trim());
      if (dbResult) return dbResult;
    } catch (e) {
      console.warn('DB tracking query exception:', e);
    }

    // 2. Fallback to local state and localStorage cached orders
    const rawClean = query.trim().toLowerCase();
    const cleanNoHash = rawClean.replace(/^#/, '');
    const cleanDigits = rawClean.replace(/\D/g, '');

    const orderMatches = (o: Order) => {
      if (!o) return false;
      const oNum = (o.orderNumber || '').toLowerCase();
      const oId = (o.id || '').toLowerCase();
      const oPhoneDigits = (o.phone || '').replace(/\D/g, '');
      const oAltPhoneDigits = (o.altPhone || '').replace(/\D/g, '');
      const oName = (o.customerName || '').toLowerCase();

      if (oNum.includes(rawClean) || oNum.includes(cleanNoHash) || oId.includes(rawClean)) return true;
      if (cleanDigits.length >= 4) {
        if (oPhoneDigits.includes(cleanDigits) || cleanDigits.includes(oPhoneDigits)) return true;
        if (oAltPhoneDigits && (oAltPhoneDigits.includes(cleanDigits) || cleanDigits.includes(oAltPhoneDigits))) return true;
        if (oNum.replace(/\D/g, '').includes(cleanDigits)) return true;
      }
      if (rawClean.length >= 3 && oName.includes(rawClean)) return true;
      return false;
    };

    // Check state orders
    const foundInState = orders.find(orderMatches);
    if (foundInState) return foundInState;

    // Check lastPlacedOrder
    if (lastPlacedOrder && orderMatches(lastPlacedOrder)) {
      return lastPlacedOrder;
    }

    // Check local storage recent orders list
    try {
      const savedRecent = localStorage.getItem('molfet_recent_orders_v2');
      if (savedRecent) {
        const recentList: Order[] = JSON.parse(savedRecent);
        const found = recentList.find(orderMatches);
        if (found) return found;
      }

      const savedLast = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ORDER);
      if (savedLast) {
        const parsedLast: Order = JSON.parse(savedLast);
        if (orderMatches(parsedLast)) return parsedLast;
      }
    } catch {
      // Ignore
    }

    return null;
  };

  // Wishlist
  const toggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('تم الحذف من قائمة الرغبات');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('تمت الإضافة إلى قائمة الرغبات');
        return [...prev, productId];
      }
    });
  };

  // Categories Management (derived from settings.categories or DEFAULT CATEGORIES)
  const categoriesCache: Category[] = useMemo(() => {
    if (settings?.categories && Array.isArray(settings.categories) && settings.categories.length > 0) {
      return settings.categories;
    }
    return CATEGORIES;
  }, [settings?.categories]);

  const addCategory = async (catData: Omit<Category, 'id' | 'slug'> & { id?: string; slug?: string }): Promise<Category | null> => {
    const nameAr = (catData.nameAr || '').trim();
    const nameEn = (catData.nameEn || '').trim() || nameAr;
    const arabicToSlugMap: Record<string, string> = {
      'تيشيرت': 't-shirts',
      'تي شيرت': 't-shirts',
      'تيشيرتات': 't-shirts',
      'قميص': 'shirts',
      'قمصان': 'shirts',
      'بنطلون': 'pants',
      'بناطيل': 'pants',
      'شورت': 'shorts',
      'شورتات': 'shorts',
      'هودي': 'hoodies',
      'هوديز': 'hoodies',
      'جاكيت': 'jackets',
      'جاكيتات': 'jackets',
      'سويت شيرت': 'sweatshirts',
      'اكسسوارات': 'accessories',
      'إكسسوارات': 'accessories',
    };

    let baseSlug = (catData.slug || '').toLowerCase().trim();
    if (!baseSlug) {
      if (catData.nameEn && catData.nameEn.trim()) {
        baseSlug = catData.nameEn.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      } else if (nameAr) {
        const lowerAr = nameAr.toLowerCase();
        for (const [key, val] of Object.entries(arabicToSlugMap)) {
          if (lowerAr.includes(key)) {
            baseSlug = val;
            break;
          }
        }
      }
    }

    if (!baseSlug) {
      baseSlug = `cat-${Date.now().toString().slice(-4)}`;
    }

    const currentCats = settings.categories && settings.categories.length > 0 ? settings.categories : CATEGORIES;
    let cleanSlug = baseSlug;
    let catId = cleanSlug;
    let counter = 1;

    while (currentCats.some((c) => c.id.toLowerCase() === catId || c.slug?.toLowerCase() === cleanSlug)) {
      cleanSlug = `${baseSlug}-${counter}`;
      catId = cleanSlug;
      counter++;
    }

    const newCat: Category = {
      id: catId,
      slug: cleanSlug,
      nameEn: nameEn,
      nameAr: nameAr || nameEn,
      image: '',
      descriptionAr: catData.descriptionAr?.trim() || '',
      descriptionEn: catData.descriptionEn?.trim() || '',
    };

    const updatedCategories = [...currentCats, newCat];
    const success = await updateSettings({ categories: updatedCategories });
    if (success) {
      showToast(`تمت إضافة التصنيف "${newCat.nameAr || newCat.nameEn}" بنجاح`);
      return newCat;
    }
    return null;
  };

  const updateCategory = async (id: string, updated: Partial<Category>): Promise<boolean> => {
    const currentCats = settings.categories && settings.categories.length > 0 ? settings.categories : CATEGORIES;
    const updatedCategories = currentCats.map((c) => (c.id === id ? { ...c, ...updated } : c));
    const success = await updateSettings({ categories: updatedCategories });
    if (success) {
      showToast('تم حفظ تعديلات التصنيف بنجاح');
      return true;
    }
    return false;
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (id === 'all') {
      showToast('لا يمكن حذف تصنيف "جميع المنتجات" الرئيسي');
      return false;
    }
    const currentCats = settings.categories && settings.categories.length > 0 ? settings.categories : CATEGORIES;
    const updatedCategories = currentCats.filter((c) => c.id !== id);
    const success = await updateSettings({ categories: updatedCategories });
    if (success) {
      showToast('تم حذف التصنيف بنجاح');
      if (activeCategory === id) {
        setActiveCategory('all');
      }
      return true;
    }
    return false;
  };

  const reorderCategories = async (newOrder: Category[]): Promise<boolean> => {
    const success = await updateSettings({ categories: newOrder });
    if (success) {
      showToast('تم تحديث ترتيب التصنيفات');
      return true;
    }
    return false;
  };

  // Settings & Hero Management - Pure Database Single Source of Truth
  const updateSettings = async (newSettings: Partial<StoreSettings>): Promise<boolean> => {
    const res = await updateStoreSettingsDb(newSettings);
    if (res.success && res.data) {
      setSettings(res.data);
      showToast('تم حفظ وتحديث الإعدادات بنجاح في قاعدة البيانات');
      return true;
    } else if (res.success) {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      showToast('تم حفظ وتحديث الإعدادات بنجاح');
      return true;
    } else {
      showToast(res.error ? `فشل الحفظ: ${res.error}` : 'تعذر حفظ الإعدادات في قاعدة البيانات');
      return false;
    }
  };

  const updateHeroSlides = (slides: HeroSlide[]) => {
    setHeroSlides(slides);
    showToast('Hero slides updated');
  };

  const shopifyConfiguredCategories =
    shopify.configured && shopify.products.length > 0 ? shopify.categories : categoriesCache;

  return (
    <StoreContext.Provider
      value={{
        products: effectiveProducts,
        isLoadingProducts,
        productsError,
        loadProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteProductsBulk,
        clearAllProducts,
        selectedProduct,
        isLoadingProductDetails,
        setSelectedProduct,
        openProductModal,
        closeProductModal,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cart: effectiveCart,
        cartCount,
        cartSubtotal,
        redirectToShopifyCheckout,
        shopifyConfigured: shopify.configured,
        shopifyBusy: shopify.busy,
        shopifyCheckoutUrl: shopify.cart?.checkoutUrl || null,
        shopifyAddLook: shopify.addLook,
        coupons,
        appliedCoupon,
        couponError,
        applyCoupon,
        removeCoupon,
        addCoupon,
        deleteCoupon,
        deleteCouponsBulk,
        clearAllCoupons,
        discountAmount,
        orders,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        deleteOrdersBulk,
        clearAllOrders,
        lastPlacedOrder,
        setLastPlacedOrder,
        trackSingleOrder,
        wishlist,
        toggleWishlist,
        categories: shopifyConfiguredCategories,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        settings,
        updateSettings,
        heroSlides,
        updateHeroSlides,
        viewMode,
        setViewMode,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        isAdminAuthenticated,
        setIsAdminAuthenticated,
        isSupabaseConfigured: supabaseConfig.isConfigured,
        configureSupabase,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ShopifyProvider>
    <StoreProviderInner>{children}</StoreProviderInner>
  </ShopifyProvider>
);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
