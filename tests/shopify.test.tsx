import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import App from '../src/App';
import {
  mapShopifyProduct,
  isShopifyConfigured,
  fetchShopifyProducts,
  createShopifyCart,
  addShopifyCartLines,
} from '../src/lib/shopify';
import { normaliseDomain, storefrontEndpoint, readStoredShopifyConfig, saveShopifyConfig } from '../src/lib/shopifyConfig';

const productNode = {
  id: 'gid://shopify/Product/1',
  handle: 'black-poplin-shirt',
  title: 'Black Classic Poplin Shirt',
  description: 'Italian poplin, cut in Cairo.',
  vendor: 'MOLFET',
  productType: 'Shirts',
  availableForSale: true,
  featuredImage: { url: 'https://cdn.shopify.com/shirt.webp', altText: 'shirt' },
  images: { nodes: [{ url: 'https://cdn.shopify.com/shirt.webp' }] },
  options: [
    { name: 'Size', values: ['S', 'M', 'L'] },
    { name: 'Colour', values: ['Black'] },
  ],
  priceRange: { minVariantPrice: { amount: '1450.0', currencyCode: 'EGP' } },
  compareAtPriceRange: { minVariantPrice: { amount: '1800.0' } },
  metafields: [
    { namespace: 'molfet', key: 'cutout', type: 'file_reference', value: '', reference: { image: { url: 'https://cdn.shopify.com/cut.webp' } } },
    { namespace: 'molfet', key: 'slot', type: 'single_line_text_field', value: 'top' },
    { namespace: 'molfet', key: 'title_ar', type: 'single_line_text_field', value: 'قميص بوبلين أسود' },
    { namespace: 'molfet', key: 'details', type: 'json', value: JSON.stringify([{ key: 'fabric', x: 30, y: 40, titleEn: 'Fabric', textEn: 'Egyptian cotton' }]) },
  ],
  variants: {
    nodes: [
      { id: 'gid://shopify/ProductVariant/11', title: 'S / Black', availableForSale: true, quantityAvailable: 4, selectedOptions: [{ name: 'Size', value: 'S' }, { name: 'Colour', value: 'Black' }], price: { amount: '1450.0' }, compareAtPrice: { amount: '1800.0' } },
      { id: 'gid://shopify/ProductVariant/12', title: 'M / Black', availableForSale: true, quantityAvailable: 7, selectedOptions: [{ name: 'Size', value: 'M' }, { name: 'Colour', value: 'Black' }], price: { amount: '1450.0' }, compareAtPrice: null },
    ],
  },
};

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  })) as any;
  window.scrollTo = (() => {}) as any;
  (globalThis as any).IntersectionObserver = class {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  };
});
beforeEach(() => { cleanup(); localStorage.clear(); window.location.hash = ''; });

describe('shopify mapping', () => {
  it('maps a Storefront product into the app model with EGP cents', () => {
    const product = mapShopifyProduct(productNode);
    expect(product.id).toBe('black-poplin-shirt');
    expect(product.shopifyId).toBe('gid://shopify/Product/1');
    expect(product.price).toBe(145000);            // 1,450.00 EGP in piastres
    expect(product.compareAtPrice).toBe(180000);
    expect(product.sizes).toEqual(['S', 'M', 'L']);
    expect(product.colors.map((colour) => colour.name)).toEqual(['Black']);
    expect(product.slot).toBe('top');
    expect(product.titleAr).toBe('قميص بوبلين أسود');
    expect(product.cutoutUrl).toBe('https://cdn.shopify.com/cut.webp');
    expect(product.details?.[0]).toMatchObject({ key: 'fabric', x: 30, y: 40 });
    expect(product.shopifyVariants?.[0].id).toBe('gid://shopify/ProductVariant/11');
    expect(product.soldOut).toBe(false);
  });

  it('reads the connection from the environment', async () => {
    expect(isShopifyConfigured(null)).toBe(false);
    expect(isShopifyConfigured({ domain: 'x.myshopify.com', token: 'shpss_x', apiVersion: '2024-10', storefrontUrl: 'https://x/graphql.json', publicToken: true })).toBe(true);
    expect(isShopifyConfigured({ domain: '', token: '', apiVersion: '', storefrontUrl: '', publicToken: true })).toBe(false);
  });

  it('normalises domains and builds the endpoint', () => {
    expect(normaliseDomain('https://molfet.myshopify.com/')).toBe('molfet.myshopify.com');
    expect(normaliseDomain('molfet.myshopify.com/admin')).toBe('molfet.myshopify.com');
    expect(storefrontEndpoint('molfet.myshopify.com', '2024-10')).toBe(
      'https://molfet.myshopify.com/api/2024-10/graphql.json',
    );
  });

  it('remembers a browser-saved public connection', () => {
    saveShopifyConfig({ domain: 'molfet.myshopify.com', token: 'shpss_test', apiVersion: '2024-10' });
    expect(readStoredShopifyConfig()).toMatchObject({ domain: 'molfet.myshopify.com', token: 'shpss_test' });
  });
});

describe('shopify api client', () => {
  const env = {
    domain: 'molfet.myshopify.com',
    token: 'shpss_test',
    apiVersion: '2024-10',
    storefrontUrl: 'https://molfet.myshopify.com/api/2024-10/graphql.json',
    publicToken: true,
  };

  it('queries products through the proxy and maps them', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { products: { nodes: [productNode] } } }),
    }));
    (globalThis as any).fetch = fetchMock;

    const products = await fetchShopifyProducts(env, { first: 10 });
    expect(products).toHaveLength(1);
    expect(products[0].handle).toBe('black-poplin-shirt');
    expect(fetchMock).toHaveBeenCalledWith('/api/shopify', expect.objectContaining({ method: 'POST' }));
  });

  it('creates a cart and returns its checkout URL', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: {
          cartCreate: {
            cart: {
              id: 'gid://shopify/Cart/1',
              checkoutUrl: 'https://molfet.myshopify.com/cart/c/abc',
              totalQuantity: 2,
              discountCodes: [{ code: 'MOLFET10', applicable: true }],
              cost: { subtotalAmount: { amount: '2900.0', currencyCode: 'EGP' }, totalAmount: { amount: '2900.0', currencyCode: 'EGP' } },
              lines: { nodes: [] },
            },
            userErrors: [],
          },
        },
      }),
    }));

    const cart = await createShopifyCart(env, [{ variantId: 'gid://shopify/ProductVariant/11', quantity: 2 }]);
    expect(cart.checkoutUrl).toContain('/cart/c/');
    expect(cart.discountCodes).toEqual(['MOLFET10']);
    expect(cart.subtotal).toBe(290000);
  });

  it('surfaces Shopify userErrors instead of failing silently', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { cartLinesAdd: { cart: null, userErrors: [{ message: 'Not enough stock' }] } } }),
    }));

    await expect(
      addShopifyCartLines(env, 'gid://shopify/Cart/1', [{ variantId: 'gid://shopify/ProductVariant/11', quantity: 9 }]),
    ).rejects.toThrow(/Not enough stock/);
  });
});

describe('storefront without shopify', () => {
  it('still renders the local catalogue and cart', async () => {
    (globalThis as any).fetch = async (input: any) => {
      if (String(input).includes('/api/shopify/env')) {
        return { ok: true, json: async () => ({ configured: false, storefrontUrl: '', token: '' }) };
      }
      return { ok: true, json: async () => ({}) };
    };

    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));
    // products are visible and nothing threw
    expect(screen.getAllByText(/BABY BLUE CLASSIC POPLIN SHIRT/i).length).toBeGreaterThan(0);
  });

  it('opens the cart drawer from the header', async () => {
    (globalThis as any).fetch = async () => ({ ok: true, json: async () => ({ configured: false }) });
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/Break the frame/i).length).toBeGreaterThan(0));

    const cartButtons = screen.getAllByRole('button', { name: /Cart,/i });
    fireEvent.click(cartButtons[0]);
    await waitFor(() => expect(screen.getAllByText(/Your look has no limits yet/i).length).toBeGreaterThan(0));
  });
});
