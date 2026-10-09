-- ==============================================================================
-- MOLFET FOR FASHON - SUPABASE DATABASE SCHEMA (كود قاعدة البيانات الكامل لـ Supabase)
-- ==============================================================================
-- قم بنسخ هذا الكود بالكامل ولصقه في Supabase SQL Editor ثم اضغط RUN.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table (جدول المنتجات)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    title_en TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'shirts',
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    compare_at_price NUMERIC(10, 2),
    stock INTEGER NOT NULL DEFAULT 10,
    sku TEXT,
    description_en TEXT,
    description_ar TEXT,
    fabric_details TEXT DEFAULT '100% Egyptian Cotton',
    gsm TEXT DEFAULT '270 GSM',
    fit_type TEXT DEFAULT 'Relaxed',
    sizes JSONB DEFAULT '["S", "M", "L", "XL", "2XL"]'::jsonb,
    colors JSONB DEFAULT '[{"name": "Standard", "hex": "#000000"}]'::jsonb,
    thumbnail_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    badge TEXT,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Orders Table (جدول الطلبات)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alt_phone TEXT,
    governorate TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    applied_coupon TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cod',
    payment_receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Order Items Table (تفاصيل عناصر الطلب)
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Coupons Table (جدول كوبونات الخصم)
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    value NUMERIC(10, 2) NOT NULL DEFAULT 10,
    min_order NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Store Settings Table (جدول إعدادات المتجر والشحن وروابط السوشيال ميديا)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT DEFAULT 'MOLFET FOR FASHON',
    tagline TEXT DEFAULT 'Style Without Limits',
    phone TEXT DEFAULT '+201012345678',
    whatsapp TEXT DEFAULT '201012345678',
    instagram TEXT DEFAULT 'molfet.eg',
    facebook TEXT DEFAULT 'https://www.facebook.com/share/196NnLNFU4/?mibextid=wwXIfr',
    tiktok TEXT DEFAULT 'https://www.tiktok.com/@molfet.eg',
    social_links JSONB DEFAULT '[{"id":"soc_facebook","platform":"facebook","title":"Facebook","url":"https://www.facebook.com/share/196NnLNFU4/?mibextid=wwXIfr","isActive":true},{"id":"soc_instagram","platform":"instagram","title":"Instagram","url":"https://www.instagram.com/molfet.eg","isActive":true},{"id":"soc_tiktok","platform":"tiktok","title":"TikTok","url":"https://www.tiktok.com/@molfet.eg","isActive":true},{"id":"soc_whatsapp","platform":"whatsapp","title":"WhatsApp","url":"https://wa.me/201012345678","isActive":true}]'::jsonb,
    instapay_address TEXT DEFAULT 'molfet@instapay',
    instapay_phone TEXT DEFAULT '01012345678',
    vodafone_cash_number TEXT DEFAULT '01012345678',
    payment_instructions TEXT,
    announcement_ar TEXT DEFAULT 'توصيل سريع داخل الإسكندرية | شحن مجاني للطلبات فوق 2900 جنيه',
    announcement_en TEXT DEFAULT 'FAST ALEXANDRIA DELIVERY • FREE SHIPPING FOR ORDERS OVER 2900 LE',
    announcements JSONB DEFAULT '["Shop our latest arrivals in Alexandria!", "FREE SHIPPING FOR ORDERS OVER 2900 LE"]'::jsonb,
    hero_banner_image TEXT,
    hero_button_text TEXT DEFAULT 'New Arrivals',
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 2900,
    default_shipping_fee NUMERIC(10, 2) DEFAULT 50,
    cairo_giza_shipping NUMERIC(10, 2) DEFAULT 50,
    alex_shipping NUMERIC(10, 2) DEFAULT 50,
    delta_shipping NUMERIC(10, 2) DEFAULT 50,
    upper_egypt_shipping NUMERIC(10, 2) DEFAULT 60,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Insert default settings if not exists
INSERT INTO public.store_settings (id, store_name, whatsapp, free_shipping_threshold, default_shipping_fee)
VALUES ('default', 'MOLFET FOR FASHON', '201012345678', 2900, 50)
ON CONFLICT (id) DO NOTHING;

-- 8. Insert sample initial coupon
INSERT INTO public.coupons (id, code, discount_type, value, min_order, is_active)
VALUES ('c_welcome10', 'WELCOME10', 'percentage', 10, 500, true)
ON CONFLICT (id) DO NOTHING;

-- 9. Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous/Public Policies
DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update products" ON public.products;
CREATE POLICY "Public insert/update products" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read orders" ON public.orders;
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update orders" ON public.orders;
CREATE POLICY "Public insert/update orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read order_items" ON public.order_items;
CREATE POLICY "Public read order_items" ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update order_items" ON public.order_items;
CREATE POLICY "Public insert/update order_items" ON public.order_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert/update coupons" ON public.coupons;
CREATE POLICY "Public insert/update coupons" ON public.coupons FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update settings" ON public.store_settings;
CREATE POLICY "Public update settings" ON public.store_settings FOR ALL USING (true);

-- 10. Storage Bucket Setup (إعداد مساحة تخزين الصور)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access product images" ON storage.objects;
CREATE POLICY "Public access product images" ON storage.objects
FOR ALL USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');
