import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Product, CartItem, Category } from '../types';
import { INITIAL_PRODUCTS, CATEGORIES } from '../data/constants';
import {
  ShopifyCart,
  ShopifyEnv,
  isShopifyConfigured,
  loadShopifyEnv,
  fetchShopifyProducts,
  fetchShopifyCollections,
  createShopifyCart,
  getShopifyCart,
  addShopifyCartLines,
  updateShopifyCartLines,
  removeShopifyCartLines,
  applyShopifyDiscounts,
  setShopifyBuyerIdentity,
  peekShopifyEnv,
} from '../lib/shopify';

/**
 * THE SHOPIFY LAYER
 *
 * One provider that owns everything Shopify: the environment, the catalogue, the
 * cart and the checkout hand-off. It is deliberately *additive* — when Shopify is
 * not configured (or the API hiccups) every call returns a "not handled" result
 * and the store keeps working on its local catalogue and local cart.
 *
 *   products        Storefront API products → mapped Product[]
 *   collections     handle → products, for Shop / Mix / Rack filtering
 *   addToCart       optional variant gid → cartLinesAdd (falls back to local)
 *   checkout        cart.checkoutUrl → Shopify's hosted, PCI-compliant checkout
 */
const CART_KEY = 'molfet_shopify_cart_id';
const CART_SNAPSHOT = 'molfet_shopify_cart_v1';

interface ShopifyState {
  /** the environment is configured and reachable */
  ready: boolean;
  loading: boolean;
  configured: boolean;
  error: string | null;
  domain: string | null;

  products: Product[];
  collections: Record<string, Product[]>;
  categories: Category[];

  cart: ShopifyCart | null;
  cartLines: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  /** true while a cart mutation is in flight */
  busy: boolean;

  /** the product was added to the Shopify cart (false → caller uses the local cart) */
  addToCart: (product: Product, size: string, color: string, quantity?: number) => Promise<boolean>;
  /** add several pieces in one request (the Look / Mix) */
  addLook: (items: { product: Product; size: string; color: string; quantity: number }[]) => Promise<boolean>;
  updateQuantity: (lineId: string, quantity: number) => Promise<boolean>;
  removeLine: (lineId: string) => Promise<boolean>;
  applyDiscounts: (codes: string[]) => Promise<boolean>;
  attachBuyer: (identity: { email?: string; phone?: string; countryCode?: string }) => Promise<boolean>;
  /** go to Shopify checkout; returns false when there is nothing to check out */
  checkout: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const ShopifyCtx = createContext<ShopifyState | undefined>(undefined);

/** find the purchasable variant that matches size + colour */
const resolveVariant = (product: Product, size: string, color: string) => {
  const variants = product.shopifyVariants || [];
  if (!variants.length) return null;
  const match = variants.find((variant) => {
    const sizeOk = !size || variant.selectedOptions.some((option) => option.value === size);
    const colorOk = !color || color === 'Standard' || variant.selectedOptions.some((option) => option.value === color);
    return sizeOk && colorOk;
  });
  const available = match?.availableForSale ? match : variants.find((variant) => variant.availableForSale);
  return available || match || variants[0] || null;
};

const readStoredId = (): string | null => {
  try {
    return localStorage.getItem(CART_KEY);
  } catch {
    return null;
  }
};

const storeCartId = (id: string | null) => {
  try {
    if (id) localStorage.setItem(CART_KEY, id);
    else localStorage.removeItem(CART_KEY);
  } catch {
    /* storage can be disabled; the in-memory cart still works */
  }
};

const toCartItem = (line: ShopifyCart['lines'][number], products: Product[]): CartItem => {
  const product =
    products.find((candidate) => candidate.shopifyId && line.productId && candidate.shopifyId.endsWith(String(line.productId))) ||
    products.find((candidate) => candidate.id === (line.productId as string)) ||
    ({
      id: line.productId || line.variantId,
      titleEn: line.title,
      titleAr: line.title,
      slug: line.productId || '',
      category: '',
      price: line.price,
      stock: 99,
      sku: '',
      descriptionAr: '',
      descriptionEn: '',
      fabricDetails: '',
      fitType: 'Regular',
      sizes: [],
      colors: [],
      images: line.image ? [line.image] : [],
      thumbnailUrl: line.image,
      isFeatured: false,
      rating: 5,
      reviewsCount: 0,
      createdAt: new Date().toISOString(),
    } as Product);

  return {
    id: line.id,
    lineId: line.id,
    product: { ...product, price: line.price, thumbnailUrl: line.image || product.thumbnailUrl },
    size: line.variantTitle?.split(' / ')[0] || '',
    color: line.variantTitle?.split(' / ')[1] || '',
    quantity: line.quantity,
  };
};

export const ShopifyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [env, setEnv] = useState<ShopifyEnv | null>(peekShopifyEnv());
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Record<string, Product[]>>({});
  const [cart, setCart] = useState<ShopifyCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cartIdRef = useRef<string | null>(readStoredId());
  const envRef = useRef<ShopifyEnv | null>(env);

  const configured = isShopifyConfigured(env);
  const ready = configured && products.length > 0;

  envRef.current = env;

  /* ---------------- boot: env, catalogue, existing cart ---------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const loadedEnv = await loadShopifyEnv();
      if (cancelled) return;
      setEnv(loadedEnv);

      if (!isShopifyConfigured(loadedEnv)) {
        setLoading(false);
        return;
      }

      try {
        const [catalogue, groups] = await Promise.all([
          fetchShopifyProducts(loadedEnv, { first: 100, sortKey: 'BEST_SELLING' }),
          fetchShopifyCollections(loadedEnv, 20).catch(() => []),
        ]);
        if (cancelled) return;

        setProducts(catalogue);
        const map: Record<string, Product[]> = {};
        groups.forEach((group) => {
          map[group.handle] = group.products;
        });
        map['all'] = catalogue;
        setCollections(map);
      } catch (apiError: any) {
        console.warn('Shopify catalogue unavailable, keeping the local catalogue:', apiError?.message);
        setError(apiError?.message || 'Shopify catalogue unavailable');
      }

      // restore the cart that the browser already owns
      if (cartIdRef.current) {
        try {
          const restored = await getShopifyCart(loadedEnv, cartIdRef.current);
          if (cancelled) return;
          if (restored) setCart(restored);
          else {
            cartIdRef.current = null;
            storeCartId(null);
          }
        } catch {
          cartIdRef.current = null;
          storeCartId(null);
        }
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* keep a small snapshot so the drawer shows the last known cart instantly */
  useEffect(() => {
    if (!cart) return;
    try {
      localStorage.setItem(CART_SNAPSHOT, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  const commitCart = useCallback((next: ShopifyCart) => {
    setCart(next);
    if (next?.id) {
      cartIdRef.current = next.id;
      storeCartId(next.id);
    }
  }, []);

  /* ---------------- cart operations ---------------- */
  const ensureCart = useCallback(
    async (lines: { variantId: string; quantity: number }[]): Promise<ShopifyCart> => {
      const currentEnv = envRef.current!;
      if (cartIdRef.current) {
        try {
          return await addShopifyCartLines(currentEnv, cartIdRef.current, lines);
        } catch {
          // the cart may have expired: fall through and make a new one
          cartIdRef.current = null;
          storeCartId(null);
        }
      }
      return createShopifyCart(currentEnv, lines);
    },
    [],
  );

  const addToCart = useCallback(
    async (product: Product, size: string, color: string, quantity = 1): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv) || !product.shopifyVariants?.length) return false;
      const variant = resolveVariant(product, size, color);
      if (!variant) return false;

      setBusy(true);
      try {
        const next = await ensureCart([{ variantId: variant.id, quantity }]);
        commitCart(next);
        return true;
      } catch (addError: any) {
        setError(addError?.message || 'Could not add to the Shopify cart');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [commitCart, ensureCart],
  );

  const addLook = useCallback(
    async (items: { product: Product; size: string; color: string; quantity: number }[]): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv)) return false;
      const lines = items
        .map((item) => {
          const variant = resolveVariant(item.product, item.size, item.color);
          return variant ? { variantId: variant.id, quantity: Math.max(1, item.quantity) } : null;
        })
        .filter(Boolean) as { variantId: string; quantity: number }[];
      if (!lines.length) return false;

      setBusy(true);
      try {
        const next = await ensureCart(lines);
        commitCart(next);
        return true;
      } catch (lookError: any) {
        setError(lookError?.message || 'Could not add the look');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [commitCart, ensureCart],
  );

  const updateQuantity = useCallback(
    async (lineId: string, quantity: number): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return false;
      setBusy(true);
      try {
        const next =
          quantity <= 0
            ? await removeShopifyCartLines(currentEnv, cartIdRef.current, [lineId])
            : await updateShopifyCartLines(currentEnv, cartIdRef.current, [{ id: lineId, quantity }]);
        commitCart(next);
        return true;
      } catch (updateError: any) {
        setError(updateError?.message || 'Could not update the quantity');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [commitCart],
  );

  const removeLine = useCallback(
    async (lineId: string): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return false;
      setBusy(true);
      try {
        const next = await removeShopifyCartLines(currentEnv, cartIdRef.current, [lineId]);
        commitCart(next);
        return true;
      } catch (removeError: any) {
        setError(removeError?.message || 'Could not remove the piece');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [commitCart],
  );

  const applyDiscounts = useCallback(
    async (codes: string[]): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return false;
      setBusy(true);
      try {
        const next = await applyShopifyDiscounts(currentEnv, cartIdRef.current, codes);
        commitCart(next);
        return true;
      } catch (discountError: any) {
        setError(discountError?.message || 'Could not apply the code');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [commitCart],
  );

  const attachBuyer = useCallback(
    async (identity: { email?: string; phone?: string; countryCode?: string }): Promise<boolean> => {
      const currentEnv = envRef.current;
      if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return false;
      try {
        const next = await setShopifyBuyerIdentity(currentEnv, cartIdRef.current, identity);
        commitCart(next);
        return true;
      } catch {
        return false;
      }
    },
    [commitCart],
  );

  const checkout = useCallback(async (): Promise<boolean> => {
    const currentEnv = envRef.current;
    if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return false;
    try {
      const fresh = await getShopifyCart(currentEnv, cartIdRef.current);
      if (!fresh || fresh.totalQuantity === 0) return false;
      commitCart(fresh);
      // Shopify's hosted checkout: PCI-compliant, supports COD + local gateways
      window.location.href = fresh.checkoutUrl;
      return true;
    } catch {
      return false;
    }
  }, [commitCart]);

  const refresh = useCallback(async () => {
    const currentEnv = envRef.current;
    if (!isShopifyConfigured(currentEnv) || !cartIdRef.current) return;
    try {
      const fresh = await getShopifyCart(currentEnv, cartIdRef.current);
      if (fresh) commitCart(fresh);
    } catch {
      /* keep the last known cart */
    }
  }, [commitCart]);

  /* ---------------- derived values ---------------- */
  const cartLines = useMemo(
    () => (cart?.lines || []).map((line) => toCartItem(line, products)),
    [cart, products],
  );

  const cartCount = useMemo(
    () => (cart?.lines || []).reduce((total, line) => total + line.quantity, 0),
    [cart],
  );

  const cartSubtotal = useMemo(
    () => (cart?.lines || []).reduce((total, line) => total + line.price * line.quantity, 0),
    [cart],
  );

  /* Collections double as categories: if Shopify has collections, use them. */
  const categories = useMemo<Category[]>(() => {
    const handles = Object.keys(collections).filter((handle) => handle !== 'all');
    if (!handles.length) return CATEGORIES;
    return handles.map((handle) => ({
      id: handle,
      slug: handle,
      nameEn: handle.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      nameAr: handle,
      descriptionEn: '',
      descriptionAr: '',
      image: collections[handle]?.[0]?.thumbnailUrl || '',
    } as Category));
  }, [collections]);

  const value: ShopifyState = {
    ready,
    loading,
    configured,
    error,
    domain: env?.domain || null,
    products,
    collections,
    categories,
    cart,
    cartLines,
    cartCount,
    cartSubtotal,
    busy,
    addToCart,
    addLook,
    updateQuantity,
    removeLine,
    applyDiscounts,
    attachBuyer,
    checkout,
    refresh,
  };

  return <ShopifyCtx.Provider value={value}>{children}</ShopifyCtx.Provider>;
};

/** Safe hook: outside the provider it reports "not configured" instead of throwing. */
export const useShopify = (): ShopifyState => {
  const context = useContext(ShopifyCtx);
  if (context) return context;

  const noop = async () => false;
  return {
    ready: false,
    loading: false,
    configured: false,
    error: null,
    domain: null,
    products: INITIAL_PRODUCTS,
    collections: { all: INITIAL_PRODUCTS },
    categories: CATEGORIES,
    cart: null,
    cartLines: [],
    cartCount: 0,
    cartSubtotal: 0,
    busy: false,
    addToCart: noop as ShopifyState['addToCart'],
    addLook: noop as ShopifyState['addLook'],
    updateQuantity: noop as ShopifyState['updateQuantity'],
    removeLine: noop as ShopifyState['removeLine'],
    applyDiscounts: noop as ShopifyState['applyDiscounts'],
    attachBuyer: noop as ShopifyState['attachBuyer'],
    checkout: noop as ShopifyState['checkout'],
    refresh: async () => {},
  };
};

export default ShopifyProvider;
