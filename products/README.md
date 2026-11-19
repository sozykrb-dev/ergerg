# ملف المنتجات — MOLFET

`molfet-products.csv` — ٨ منتجات، ٣٦ صف (كل صف = مقاس واحد).

## إزاي ترفعه

1. Shopify admin → **Products** → **Import**.
2. اختار `molfet-products.csv`.
3. سيب الخيارات على وضعها الافتراضي واضغط **Upload and preview**.
4. راجع العدد (٨ منتجات / ٣١ variant) وبعدها **Import products**.

## اللي جوه

| المنتج | النوع | المقاسات | السعر | قبل الخصم | slot |
| --- | --- | --- | --- | --- | --- |
| BABY BLUE CLASSIC POPLIN SHIRT | Shirts | S–2XL | 650 | 850 | `top` |
| BLACK CLASSIC POPLIN SHIRT | Shirts | S–2XL | 750 | 950 | `top` |
| BLACK HEAVYWEIGHT COTTON T-SHIRT | T-Shirts | S–2XL | 600 | 950 | `top` |
| CREAM HEAVYWEIGHT COTTON T-SHIRT | T-Shirts | S–2XL | 600 | 950 | `top` |
| BLACK FRENCH TERRY PANTS | Pants | S–2XL | 999 | 1200 | `bottom` |
| GRAY FRENCH TERRY PANTS | Pants | S–2XL | 999 | 1200 | `bottom` |
| MAROON WOOL-BLEND OVERSHIRT | Outerwear | S–2XL | 1450 | 1800 | `outerwear` |
| CREAM CANVAS TOTE | Accessories | One Size | 390 | 490 | `accessory` |

الأسعار بالجنيه المصري. الوصف إنجليزي وعربي في نفس الخانة (العربي في `<p dir="rtl">`).

## حاجة مهمة — الـ metafields

العمود الأخير `Metafield: molfet.slot` بيكتب خانة **Rack View**: بيفرّق بين
`top` / `bottom` / `outerwear` (بيتعلّقوا على الرف) و`accessory` (بيتساب برّه).

**قبل الاستيراد** لازم تكون الخانة دي موجودة:

Settings → Custom data → **Products** → Add definition →

- Namespace and key: `molfet.slot`
- Type: **Single line text**
- List of values: لا

لو مش موجودة، Shopify هيتجاهل العمود ده والـ Rack هيعامل كل حاجة كـ `top`،
يعني الشنطة هتظهر معلّقة على الرف غلط.

## الصور

كل صورة رابط مباشر على GitHub من الكوميت المثبّت:

```
https://cdn.jsdelivr.net/gh/sozykrb-dev/ergerg@fc6ca6497ae4a48.../public/img/products/
```

Shopify **بينزّل الصور** ويحفظها في المتجر وقت الاستيراد، فمش هتحتاج الإنترنت
بعد كده ومش هتحتاج ترفع حاجة يدوي.

## الحاجات اللي مش في الملف

- **صور الـ cut-out الشفافة** (`*-cut.webp`) — دي بتتقرأ من `molfet.cutout` اللي
  نوعه **File**، والـ CSV مابيدعمش رفع ملفات في الـ metafields. لو عايز الـ Lens
  والـ Rack يستخدموها: Products → المنتج → Metafields → `molfet.cutout` → اختار
  الصورة الشفافة. الثيم بيرجع لصورة المنتج العادية لو الحقل فاضي.
- **صور الـ Lens** (`molfet.sketch_image` / `molfet.macro_image`) — نفس السبب.
- **الـ detail points** — دي metaobjects، بتتعمل من Settings → Custom data.
