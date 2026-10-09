/**
 * @file src/lib/supabaseConfig.ts
 * @description ملف الإعدادات الدائم للربط مع Supabase (Permanent Supabase Configuration)
 * 
 * يمكنك كتابة رابط المشروع ومفتاح الـ Anon مباشرة في هذا الملف
 * ليبقى محفوظاً دائماً في المشروع دون الحاجة لإدخاله كل مرة!
 */

export interface SupabaseConfigFile {
  /**
   * رابط مشروع Supabase الخاص بك
   * مثال: https://xyzcompany.supabase.co
   */
  supabaseUrl: string;

  /**
   * مفتاح Anon / Public Key الخاص بمشروع Supabase
   * مثال: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  supabaseAnonKey: string;

  /**
   * اسم الـ Storage Bucket للصور والملفات (افتراضي: product-images)
   */
  storageBucket: string;
}

/**
 * 🔒 الإعدادات الدائمة (Permanent Configuration)
 * يتم حفظ الرابط والمفتاح هنا بحيث يشتغل المتجر تلقائياً في أي وقت وفي أي متصفح
 */
export const SUPABASE_CONFIG: SupabaseConfigFile = {
  // 🔹 ضع رابط Supabase الخاص بمشروعك هنا:
  supabaseUrl: 'https://pfooyjukjytdspnkuzoc.supabase.co',

  // 🔹 ضع مفتاح الـ Anon Key هنا:
  supabaseAnonKey: 'sb_publishable_DEJ9fClX9FJlUUxzpYIjrg_hpepTO2e',

  // 🔹 اسم الـ Storage Bucket:
  storageBucket: 'product-images',
};

/**
 * Helper to check if file has hardcoded credentials
 */
export const isConfiguredInFile = (): boolean => {
  return Boolean(
    SUPABASE_CONFIG.supabaseUrl &&
    SUPABASE_CONFIG.supabaseAnonKey &&
    SUPABASE_CONFIG.supabaseUrl.trim().startsWith('http') &&
    !SUPABASE_CONFIG.supabaseUrl.includes('your-project')
  );
};
