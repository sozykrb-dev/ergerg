/**
 * Where the Shopify connection is configured, in one place.
 *
 * 1. Server env (recommended — the token never reaches the browser):
 *      SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
 *      SHOPIFY_STOREFRONT_TOKEN=shpat_…        (private app token, Storefront API scope)
 *      SHOPIFY_API_VERSION=2024-10             (optional)
 *
 * 2. Browser fallback for a *public* token only (Environment settings in the
 *    admin dashboard, stored in localStorage). A private token is refused here.
 *
 * 3. Nothing configured → the storefront runs on its local catalogue, cart and
 *    checkout exactly as before. No crash, no empty page.
 */
export const SHOPIFY_ENV_KEYS = {
  domain: 'SHOPIFY_STORE_DOMAIN',
  token: 'SHOPIFY_STOREFRONT_TOKEN',
  apiVersion: 'SHOPIFY_API_VERSION',
} as const;

export const SHOPIFY_KEYS = {
  domain: 'molfet_shopify_domain',
  token: 'molfet_shopify_token',
  apiVersion: 'molfet_shopify_api_version',
} as const;

export interface StoredShopifyConfig {
  domain: string;
  token: string;
  apiVersion: string;
}

export const readStoredShopifyConfig = (): StoredShopifyConfig | null => {
  try {
    const domain = localStorage.getItem(SHOPIFY_KEYS.domain) || '';
    const token = localStorage.getItem(SHOPIFY_KEYS.token) || '';
    const apiVersion = localStorage.getItem(SHOPIFY_KEYS.apiVersion) || '2024-10';
    if (!domain || !token) return null;
    return { domain, token, apiVersion };
  } catch {
    return null;
  }
};

export const saveShopifyConfig = (config: StoredShopifyConfig) => {
  try {
    localStorage.setItem(SHOPIFY_KEYS.domain, config.domain.trim());
    localStorage.setItem(SHOPIFY_KEYS.token, config.token.trim());
    localStorage.setItem(SHOPIFY_KEYS.apiVersion, config.apiVersion.trim() || '2024-10');
  } catch {
    /* storage disabled */
  }
};

export const clearShopifyConfig = () => {
  try {
    Object.values(SHOPIFY_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage disabled */
  }
};

/** Normalise a store domain: strip protocol, trailing slash, keep the host. */
export const normaliseDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
    .replace(/\/admin.*$/, '');

export const storefrontEndpoint = (domain: string, apiVersion: string) =>
  `https://${normaliseDomain(domain)}/api/${apiVersion || '2024-10'}/graphql.json`;
