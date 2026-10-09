import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, isConfiguredInFile } from './supabaseConfig';

// Environment variables fallback (if provided via .env)
const metaEnv = (import.meta as any).env || {};
const envUrl = metaEnv.VITE_SUPABASE_URL || '';
const envAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Storage keys for custom admin-configured credentials if set via UI
const CUSTOM_URL_KEY = 'https://pfooyjukjytdspnkuzoc.supabase.co';
const CUSTOM_KEY_KEY = 'sb_publishable_DEJ9fClX9FJlUUxzpYIjrg_hpepTO2e';

let customUrl: string | null = null;
let customKey: string | null = null;

try {
  customUrl = localStorage.getItem(CUSTOM_URL_KEY);
  customKey = localStorage.getItem(CUSTOM_KEY_KEY);
} catch {
  // SSR or private storage fallback
}

export type ConfigSource = 'file' | 'env' | 'storage' | 'none';

export const getSupabaseConfig = () => {
  // Priority 1: Permanent Config File (src/lib/supabaseConfig.ts)
  if (isConfiguredInFile()) {
    const fileUrl = (SUPABASE_CONFIG.supabaseUrl || '').trim().replace(/\/+$/, '');
    const fileKey = (SUPABASE_CONFIG.supabaseAnonKey || '').trim();
    return {
      url: fileUrl,
      anonKey: fileKey,
      isConfigured: true,
      source: 'file' as ConfigSource,
      bucket: SUPABASE_CONFIG.storageBucket || 'product-images',
    };
  }

  // Priority 2: Environment variables (.env file / Vite)
  if (envUrl && envAnonKey && envUrl.trim().startsWith('http')) {
    return {
      url: envUrl.trim().replace(/\/+$/, ''),
      anonKey: envAnonKey.trim(),
      isConfigured: true,
      source: 'env' as ConfigSource,
      bucket: SUPABASE_CONFIG.storageBucket || 'product-images',
    };
  }

  // Priority 3: Browser local storage (if configured in Admin UI)
  const url = (customUrl || '').trim().replace(/\/+$/, '');
  const anonKey = (customKey || '').trim();
  const isConfigured = Boolean(url && anonKey && url.startsWith('http'));

  return {
    url,
    anonKey,
    isConfigured,
    source: isConfigured ? ('storage' as ConfigSource) : ('none' as ConfigSource),
    bucket: SUPABASE_CONFIG.storageBucket || 'product-images',
  };
};

export const saveCustomSupabaseConfig = (url: string, key: string) => {
  try {
    const cleanUrl = (url || '').trim().replace(/\/+$/, '');
    const cleanKey = (key || '').trim();

    if (cleanUrl && cleanKey) {
      localStorage.setItem(CUSTOM_URL_KEY, cleanUrl);
      localStorage.setItem(CUSTOM_KEY_KEY, cleanKey);
      customUrl = cleanUrl;
      customKey = cleanKey;
      supabaseInstance = null; // Reset client instance
    } else {
      localStorage.removeItem(CUSTOM_URL_KEY);
      localStorage.removeItem(CUSTOM_KEY_KEY);
      customUrl = null;
      customKey = null;
      supabaseInstance = null;
    }
  } catch (e) {
    console.error('Failed to save custom supabase config', e);
  }
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          headers: {
            'x-application-name': 'molfet-store',
          },
        },
      });
    } catch (e) {
      console.error('Error initializing Supabase client:', e);
      return null;
    }
  }

  return supabaseInstance;
};

/**
 * Diagnostic helper to test the Supabase connection and check table permissions
 */
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  source: ConfigSource;
  tables: {
    products: boolean;
    orders: boolean;
    coupons: boolean;
    store_settings: boolean;
  };
}> => {
  const config = getSupabaseConfig();
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      message: 'لم يتم إدخال رابط أو مفتاح Supabase بعد (Missing URL or Key)',
      source: 'none',
      tables: { products: false, orders: false, coupons: false, store_settings: false },
    };
  }

  const tableStatus = {
    products: false,
    orders: false,
    coupons: false,
    store_settings: false,
  };

  try {
    // 1. Test products table
    const { error: pErr } = await supabase.from('products').select('id').limit(1);
    tableStatus.products = !pErr;

    // 2. Test orders table
    const { error: oErr } = await supabase.from('orders').select('id').limit(1);
    tableStatus.orders = !oErr;

    // 3. Test coupons table
    const { error: cErr } = await supabase.from('coupons').select('id').limit(1);
    tableStatus.coupons = !cErr;

    // 4. Test store_settings table
    const { error: sErr } = await supabase.from('store_settings').select('id').limit(1);
    tableStatus.store_settings = !sErr;

    const allGood = tableStatus.products && tableStatus.orders;

    if (allGood) {
      return {
        success: true,
        message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح وجميع الجداول جاهزة للحفظ!',
        source: config.source,
        tables: tableStatus,
      };
    } else {
      const missing = Object.entries(tableStatus)
        .filter(([_, ok]) => !ok)
        .map(([name]) => name)
        .join(', ');
      return {
        success: false,
        message: `تم الاتصال ولكن الجداول التالية غير موجودة أو ينقصها صلاحيات: ${missing}. يرجى تشغيل كود schema.sql في Supabase SQL Editor.`,
        source: config.source,
        tables: tableStatus,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `خطأ في الاتصال: ${err?.message || 'تعذر الوصول إلى Supabase'}`,
      source: config.source,
      tables: tableStatus,
    };
  }
};
