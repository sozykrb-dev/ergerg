import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, RefreshCw, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  readStoredShopifyConfig,
  saveShopifyConfig,
  clearShopifyConfig,
  normaliseDomain,
  storefrontEndpoint,
} from '../lib/shopifyConfig';

/**
 * Shopify connection panel (admin → Store & Integrations).
 *
 * Server env wins. When the deployment has no SHOPIFY_* variables, a *public*
 * Storefront token can be saved here (it lives in the browser only) and the whole
 * storefront — catalogue, cart, discount codes, checkout — runs on Shopify.
 *
 * The panel verifies the connection before saving, so a typo is caught here and
 * not by a customer.
 */
type TestResult =
  | { state: 'idle' }
  | { state: 'testing' }
  | { state: 'ok'; shop: string; products: number }
  | { state: 'error'; message: string };

const ShopifyConnectionPanel: React.FC = () => {
  const { shopifyConfigured, products, showToast } = useStore();
  const stored = readStoredShopifyConfig();

  const [domain, setDomain] = useState(stored?.domain || '');
  const [token, setToken] = useState(stored?.token || '');
  const [apiVersion, setApiVersion] = useState(stored?.apiVersion || '2024-10');
  const [test, setTest] = useState<TestResult>({ state: 'idle' });
  const [serverEnv, setServerEnv] = useState<{ configured: boolean; domain: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/shopify/status')
      .then((response) => response.json())
      .then((data) => setServerEnv({ configured: Boolean(data?.configured), domain: data?.domain || null }))
      .catch(() => setServerEnv({ configured: false, domain: null }));
  }, []);

  const runTest = async () => {
    const cleanDomain = normaliseDomain(domain);
    if (!cleanDomain || !token.trim()) {
      setTest({ state: 'error', message: 'Enter the store domain and the Storefront access token first.' });
      return;
    }
    setTest({ state: 'testing' });
    try {
      const response = await fetch(storefrontEndpoint(cleanDomain, apiVersion), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Shopify-Storefront-Access-Token': token.trim(),
        },
        body: JSON.stringify({
          query: '{ shop { name } products(first: 1) { nodes { title } } }',
        }),
      });
      const payload: any = await response.json().catch(() => ({}));
      if (!response.ok || payload?.errors) {
        const message =
          payload?.errors?.[0]?.message ||
          (response.status === 401 || response.status === 403
            ? 'That token was refused. Check that it has the Storefront API scope (unauthenticated_read_product_listings, unauthenticated_write_checkouts, unauthenticated_read_checkouts).'
            : `Storefront API answered ${response.status}.`);
        setTest({ state: 'error', message });
        return;
      }
      setTest({
        state: 'ok',
        shop: payload?.data?.shop?.name || cleanDomain,
        products: payload?.data?.products?.nodes?.length || 0,
      });
    } catch (error: any) {
      setTest({
        state: 'error',
        message:
          error?.message ||
          'Could not reach the store. A private (shpat_) token only works through the server proxy: set SHOPIFY_* env variables instead.',
      });
    }
  };

  const save = () => {
    const cleanDomain = normaliseDomain(domain);
    if (!cleanDomain || !token.trim()) {
      showToast('اكتب الدومين والتوكن الأول');
      return;
    }
    saveShopifyConfig({ domain: cleanDomain, token: token.trim(), apiVersion });
    showToast('تم حفظ بيانات شوبيفاي، جاري إعادة تحميل المتجر');
    window.setTimeout(() => window.location.reload(), 700);
  };

  const disconnect = () => {
    clearShopifyConfig();
    showToast('تم فصل شوبيفاي، المتجر رجع للكتالوج المحلي');
    window.setTimeout(() => window.location.reload(), 700);
  };

  return (
    <div className="mb-6 rounded-2xl border border-[var(--mf-hairline)] bg-white p-6 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-black" />
          <div>
            <h3 className="text-base font-bold text-black">ربط شوبيفاي · Shopify</h3>
            <span className="text-[11px] text-zinc-500">
              Products, cart, discount codes and checkout all run on your Shopify store
            </span>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            shopifyConfigured
              ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
              : 'border-zinc-300 bg-zinc-100 text-zinc-600'
          }`}
        >
          {shopifyConfigured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {shopifyConfigured ? `متصل · ${products.length} منتج` : 'غير متصل — الكتالوج المحلي'}
        </span>
      </div>

      {serverEnv?.configured ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-[12px] text-emerald-900">
          الاتصال مُهيّأ من السيرفر (<code>{serverEnv.domain}</code>) — التوكن الخاص آمن ومش ظاهر في المتصفح.
          لتغييره عدّل متغيرات <code>SHOPIFY_STORE_DOMAIN</code> و <code>SHOPIFY_STOREFRONT_TOKEN</code> في
          الاستضافة.
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-black">Store domain</span>
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="molfet.myshopify.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-black">API version</span>
              <input
                value={apiVersion}
                onChange={(event) => setApiVersion(event.target.value)}
                placeholder="2024-10"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-black outline-none focus:border-black"
                dir="ltr"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase text-black">
              Storefront access token
            </span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="shpss_… (public) — private shpat_ tokens go in the server env"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm text-black outline-none focus:border-black"
              dir="ltr"
              type="password"
            />
            <span className="mt-1 block text-[11px] text-zinc-500">
              Shopify admin → Settings → Apps and sales channels → Develop apps → your app →{' '}
              <em>Storefront API access token</em>. Scopes needed: products, collections, carts and checkouts.
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={test.state === 'testing'}
              className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-black hover:border-black disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${test.state === 'testing' ? 'animate-spin' : ''}`} />
              اختبار الاتصال
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              حفظ وتفعيل شوبيفاي
            </button>
            {stored && (
              <button
                type="button"
                onClick={disconnect}
                className="flex items-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:border-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                فصل
              </button>
            )}
            <a
              href="https://shopify.dev/docs/api/storefront"
              target="_blank"
              rel="noreferrer"
              className="ms-auto flex items-center gap-1 text-[11px] text-zinc-500 underline hover:text-black"
            >
              Storefront API docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {test.state === 'ok' && (
            <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
              ✓ متصل بـ <strong>{test.shop}</strong> — المنتجات بتُقرأ من شوبيفاي.
            </p>
          )}
          {test.state === 'error' && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800">
              {test.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShopifyConnectionPanel;
