import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, ProductColor, Order, SocialLink, SocialPlatform, StoreSettings, Category } from '../types';
import { CATEGORIES, EGYPT_GOVERNORATES, INITIAL_PRODUCTS, DEFAULT_SOCIAL_LINKS } from '../data/constants';
import { SocialIcon } from './SocialIcon';
import { 
  Plus, 
  Trash2, 
  Trash,
  Edit3, 
  Package, 
  ShoppingBag, 
  Tag, 
  Sliders, 
  Eye, 
  RefreshCw, 
  Save,
  Search,
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCode,
  Copy,
  ChevronLeft,
  ChevronRight,
  Clock,
  Truck,
  XCircle,
  Sparkles,
  Fingerprint,
  Key,
  ShieldCheck,
  Lock,
  CheckSquare,
  Square,
  X,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Star,
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  MessageCircle,
  User,
  CreditCard,
  Receipt,
  ExternalLink,
  MapPin,
  Share2,
  Globe,
  Link2,
  GripVertical,
  Smartphone,
  Send,
  Radio,
  HelpCircle,
  Volume2,
  Layers,
  FolderPlus
} from 'lucide-react';
import { optimizeProductImages, uploadProductImageToStorage } from '../lib/imageOptimizer';
import { AdminNotifications } from './AdminNotifications';
import { 
  sendTelegramTestPing, 
  sendWebhookTestPing,
  sendTelegramOrderNotification 
} from '../lib/orderNotifications';
import { 
  fetchAdminOrdersDb, 
  fetchDashboardStatsDb, 
  updateOrderStatusDb, 
  deleteOrderDb, 
  deleteOrdersBulkDb,
  deleteAllOrdersDb,
  addProductDb,
  deleteProductsBulkDb,
  deleteAllProductsDb
} from '../lib/db';
import { getSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import ShopifyConnectionPanel from './ShopifyConnectionPanel';

interface DeleteModalConfig {
  type: 
    | 'single_product' 
    | 'bulk_products' 
    | 'all_products' 
    | 'single_order' 
    | 'bulk_orders' 
    | 'all_orders' 
    | 'cancelled_orders' 
    | 'single_coupon' 
    | 'bulk_coupons' 
    | 'all_coupons'
    | 'single_category';
  title: string;
  message: string;
  itemCount?: number;
  targetId?: string;
}

export const AdminDashboard: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    deleteProductsBulk,
    clearAllProducts, 
    loadProducts,
    coupons,
    addCoupon,
    deleteCoupon,
    deleteCouponsBulk,
    clearAllCoupons,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    settings,
    updateSettings,
    deleteOrdersBulk,
    clearAllOrders,
    setViewMode,
    isSupabaseConfigured,
    configureSupabase,
    showToast
  } = useStore();

  const [activeTab, setActiveTab] = useState<'add-product' | 'products-list' | 'orders' | 'coupons' | 'banners' | 'social' | 'categories' | 'settings'>('add-product');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Social Media Links Management State
  const [socialLinksList, setSocialLinksList] = useState<SocialLink[]>(() => {
    if (settings?.socialLinks && settings.socialLinks.length > 0) {
      return settings.socialLinks;
    }
    return DEFAULT_SOCIAL_LINKS;
  });
  const [editingSocialLinkId, setEditingSocialLinkId] = useState<string | null>(null);
  const [socialFormPlatform, setSocialFormPlatform] = useState<SocialPlatform>('instagram');
  const [socialFormTitle, setSocialFormTitle] = useState('');
  const [socialFormUrl, setSocialFormUrl] = useState('');
  const [socialFormIsActive, setSocialFormIsActive] = useState(true);
  const [socialFormOpenInNewTab, setSocialFormOpenInNewTab] = useState(true);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  // Multi-Selection State for Deletions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedCouponIds, setSelectedCouponIds] = useState<string[]>([]);

  // Safe In-App Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<DeleteModalConfig | null>(null);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Form State for Add / Edit Product
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [category, setCategory] = useState('shirts');
  const [price, setPrice] = useState<number | ''>(650);
  const [compareAtPrice, setCompareAtPrice] = useState<number | ''>(850);
  const [stock, setStock] = useState<number | ''>(30);
  const [sku, setSku] = useState(`MLFT-${Math.floor(100 + Math.random() * 900)}`);
  const [descriptionEn, setDescriptionEn] = useState('Classic cut made with premium fabric. Relaxed fit for daily comfort.');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [fabricDetails, setFabricDetails] = useState('100% Egyptian Cotton / Premium Poplin');
  const [gsm, setGsm] = useState('270 GSM');
  const [fitType, setFitType] = useState<Product['fitType']>('Relaxed');
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L', 'XL', '2XL']);
  const [colors, setColors] = useState<ProductColor[]>([
    { name: 'Black', hex: 'var(--molfet-brown)' },
    { name: 'White', hex: 'var(--molfet-cream)' }
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [badge, setBadge] = useState<Product['badge']>('NEW');
  const [isFeatured, setIsFeatured] = useState(true);

  // Image Upload Optimization State
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);

  // Helper color input
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('var(--molfet-brown)');

  // Coupon form
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState<number | ''>(10);
  const [newCouponMin, setNewCouponMin] = useState<number | ''>(500);

  // Category Management State
  const [categoryFormNameEn, setCategoryFormNameEn] = useState('');
  const [categoryFormNameAr, setCategoryFormNameAr] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Quick Add Category Modal (inside Product Form)
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [quickCategoryNameEn, setQuickCategoryNameEn] = useState('');
  const [quickCategoryNameAr, setQuickCategoryNameAr] = useState('');
  const [isSavingQuickCategory, setIsSavingQuickCategory] = useState(false);

  // Banner & Top Announcements State
  const [heroBannerImageInput, setHeroBannerImageInput] = useState(settings?.heroBannerImage || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop');
  const [heroButtonTextInput, setHeroButtonTextInput] = useState(settings?.heroButtonText || 'New Arrivals');
  const [announcementsList, setAnnouncementsList] = useState<string[]>(() => {
    if (settings?.announcements && settings.announcements.length > 0) {
      return settings.announcements;
    }
    return [
      'Shop our latest arrivals!',
      'FREE SHIPPING FOR ORDERS OVER 2900 LE',
      '20% Discount'
    ];
  });
  const [newAnnouncementInput, setNewAnnouncementInput] = useState('');
  const [editingAnnouncementIdx, setEditingAnnouncementIdx] = useState<number | null>(null);
  const [editingAnnouncementText, setEditingAnnouncementText] = useState('');
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadStatus, setBannerUploadStatus] = useState('');

  // Settings form & Supabase config form
  const [settingsForm, setSettingsForm] = useState(settings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(getSupabaseConfig().url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(getSupabaseConfig().anonKey);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    tables?: { products: boolean; orders: boolean; coupons: boolean; store_settings: boolean };
  } | null>(null);

  // Sync state when settings change
  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
      if (settings.heroBannerImage) setHeroBannerImageInput(settings.heroBannerImage);
      if (settings.heroButtonText) setHeroButtonTextInput(settings.heroButtonText);
      if (settings.announcements && settings.announcements.length > 0) {
        setAnnouncementsList(settings.announcements);
      }
      if (settings.socialLinks && settings.socialLinks.length > 0) {
        setSocialLinksList(settings.socialLinks);
      }
    }
  }, [settings]);

  // Passkey Management State in Settings
  const [adminPasskeyInput, setAdminPasskeyInput] = useState('');
  const [confirmAdminPasskeyInput, setConfirmAdminPasskeyInput] = useState('');
  const [passkeyMsg, setPasskeyMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isRegisteringDevicePasskey, setIsRegisteringDevicePasskey] = useState(false);
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState(() => !!localStorage.getItem('molfet_webauthn_passkey'));

  // Search in products list
  const [searchInList, setSearchInList] = useState('');
  const [filterCatInList, setFilterCatInList] = useState('all');

  // Orders Tab State (Server-side paginated & filtered)
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalCount, setOrdersTotalCount] = useState(0);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Real Aggregate Stats State
  const [stats, setStats] = useState({
    productsCount: products.length,
    totalOrdersCount: 0,
    pendingOrdersCount: 0,
    totalSalesRevenue: 0,
  });

  // Mobile Notifications Test State
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);

  // Load Dashboard Aggregate Stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchDashboardStatsDb();
      setStats(data);
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, products.length]);

  // Load Orders with Pagination & Filters
  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const { orders: fetchedOrders, totalCount } = await fetchAdminOrdersDb({
        page: ordersPage,
        limit: 15,
        status: ordersStatusFilter,
        searchQuery: ordersSearchQuery,
      });
      setOrdersList(fetchedOrders);
      setOrdersTotalCount(totalCount);
    } catch (e) {
      console.error('Error loading admin orders:', e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [ordersPage, ordersStatusFilter, ordersSearchQuery]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Handle Admin Notification Actions
  const handleNotificationSelectOrder = useCallback((orderNumber: string) => {
    setActiveTab('orders');
    setOrdersSearchQuery(orderNumber);
    setOrdersStatusFilter('all');
    setOrdersPage(1);
    fetchAdminOrdersDb({
      page: 1,
      limit: 15,
      status: 'all',
      searchQuery: orderNumber,
    }).then(({ orders, totalCount }) => {
      setOrdersList(orders);
      setOrdersTotalCount(totalCount);
    }).catch(console.error);
    loadStats();
  }, [loadStats]);

  const handleNotificationRefreshOrders = useCallback(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
    loadStats();
  }, [activeTab, loadOrders, loadStats]);

  // Reset Product Form
  const resetForm = () => {
    setTitleEn('');
    setTitleAr('');
    setCategory('shirts');
    setPrice(650);
    setCompareAtPrice(850);
    setStock(30);
    setSku(`MLFT-${Math.floor(100 + Math.random() * 900)}`);
    setDescriptionEn('Classic cut made with premium fabric. Relaxed fit for daily comfort.');
    setDescriptionAr('');
    setFabricDetails('100% Egyptian Cotton');
    setGsm('270 GSM');
    setFitType('Relaxed');
    setSizes(['S', 'M', 'L', 'XL', '2XL']);
    setColors([
      { name: 'Black', hex: 'var(--molfet-brown)' },
      { name: 'White', hex: 'var(--molfet-cream)' }
    ]);
    setImages([]);
    setThumbnailUrl('');
    setBadge('NEW');
    setIsFeatured(true);
    setEditingProductId(null);
  };

  // Populate form for editing
  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setTitleEn(p.titleEn);
    setTitleAr(p.titleAr);
    setCategory(p.category);
    setPrice(p.price);
    setCompareAtPrice(p.compareAtPrice || '');
    setStock(p.stock);
    setSku(p.sku);
    setDescriptionEn(p.descriptionEn);
    setDescriptionAr(p.descriptionAr);
    setFabricDetails(p.fabricDetails);
    setGsm(p.gsm || '');
    setFitType(p.fitType);
    setSizes(p.sizes);
    setColors(p.colors);
    setImages(p.images);
    setThumbnailUrl(p.thumbnailUrl || p.images[0] || '');
    setBadge(p.badge);
    setIsFeatured(p.isFeatured);
    setActiveTab('add-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim()) {
      showToast('يرجى إدخال اسم المنتج بالإنجليزية');
      return;
    }
    if (!price || Number(price) <= 0) {
      showToast('يرجى إدخال سعر صحيح أكبر من الصفر');
      return;
    }
    if (images.length === 0) {
      showToast('يرجى إضافة صورة واحدة على الأقل للمنتج');
      return;
    }

    setIsSavingProduct(true);
    try {
      const productPayload = {
        titleEn: titleEn.toUpperCase().trim(),
        titleAr: (titleAr || titleEn).trim(),
        category,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        stock: stock !== undefined && stock !== '' ? Number(stock) : 10,
        sku: sku?.trim() || `MLFT-${Date.now().toString().slice(-4)}`,
        descriptionEn: descriptionEn?.trim() || `${titleEn} by MOLFET.`,
        descriptionAr: descriptionAr?.trim() || titleAr || '',
        fabricDetails: fabricDetails?.trim() || '100% Egyptian Cotton',
        gsm: gsm?.trim() || '270 GSM',
        fitType,
        sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL', '2XL'],
        colors: colors.length ? colors : [{ name: 'Standard', hex: 'var(--molfet-brown)' }],
        thumbnailUrl: thumbnailUrl || images[0] || '',
        images,
        badge,
        isFeatured,
      };

      if (editingProductId) {
        await updateProduct(editingProductId, productPayload);
      } else {
        await addProduct(productPayload);
      }

      resetForm();
      setActiveTab('products-list');
    } catch (err: any) {
      console.error('Error saving product:', err);
      showToast(err?.message || 'حدث خطأ أثناء حفظ المنتج في قاعدة البيانات');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Client-Side Multiple Image Upload & WebP Optimization
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsOptimizingImage(true);
    setImageUploadStatus(`جاري تجهيز وضغط ${files.length} صور بصيغة WebP...`);

    const tempProdId = editingProductId || `prod_${Date.now()}`;

    try {
      const uploadedUrls: string[] = [];
      let firstThumbUrl = thumbnailUrl;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setImageUploadStatus(`جاري ضغط وتحسين الصورة ${i + 1} من ${files.length}...`);

        const { thumbnail, gallery } = await optimizeProductImages(file);

        // Upload Gallery WebP
        const galleryName = `gallery_${Date.now()}_${i}.webp`;
        const galleryUrl = await uploadProductImageToStorage(tempProdId, gallery.blob, galleryName);

        // Upload Thumbnail WebP if first
        if (i === 0 && !firstThumbUrl) {
          const thumbName = `thumb_${Date.now()}.webp`;
          const thumbUrl = await uploadProductImageToStorage(tempProdId, thumbnail.blob, thumbName);
          if (thumbUrl) firstThumbUrl = thumbUrl;
        }

        if (galleryUrl) {
          uploadedUrls.push(galleryUrl);
        } else {
          // Fallback to data URL if storage upload failed (preview)
          uploadedUrls.push(gallery.dataUrl);
          if (i === 0 && !firstThumbUrl) firstThumbUrl = thumbnail.dataUrl;
        }
      }

      setImages((prev) => {
        const combined = [...prev, ...uploadedUrls];
        if (!thumbnailUrl && combined.length > 0) {
          setThumbnailUrl(combined[0]);
        }
        return combined;
      });
      if (firstThumbUrl && !thumbnailUrl) setThumbnailUrl(firstThumbUrl);
      showToast(`تم رفع وضغط ${files.length} صور بنجاح! يمكنك الآن اختيار الصورة الأنسب`);
    } catch (err) {
      console.error('Image optimization error:', err);
      showToast('حدث خطأ أثناء ضغط ورفع الصور');
    } finally {
      setIsOptimizingImage(false);
      setImageUploadStatus(null);
      e.target.value = '';
    }
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      const trimmed = newImageUrl.trim();
      setImages((prev) => {
        const updated = [...prev, trimmed];
        if (!thumbnailUrl) setThumbnailUrl(trimmed);
        return updated;
      });
      setNewImageUrl('');
      showToast('تمت إضافة رابط الصورة بنجاح');
    }
  };

  const handleSetMainImage = (index: number) => {
    if (index < 0 || index >= images.length) return;
    const selectedUrl = images[index];
    const newImages = [selectedUrl, ...images.filter((_, i) => i !== index)];
    setImages(newImages);
    setThumbnailUrl(selectedUrl);
    showToast('⭐ تم تعيين هذه الصورة كصورة رئيسية (Cover) للمنتج!');
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setImages((prev) => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      if (targetIndex === 0 || index === 0) {
        setThumbnailUrl(copy[0]);
      }
      return copy;
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (thumbnailUrl === prev[index]) {
        setThumbnailUrl(newImages[0] || '');
      }
      return newImages;
    });
    showToast('تم حذف الصورة من القائمة');
  };

  const toggleSize = (size: string) => {
    if (sizes.includes(size)) {
      setSizes(sizes.filter((s) => s !== size));
    } else {
      setSizes([...sizes, size]);
    }
  };

  const handleAddColor = () => {
    if (customColorName.trim()) {
      setColors([...colors, { name: customColorName.trim(), hex: customColorHex }]);
      setCustomColorName('');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponValue) return;
    await addCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      value: Number(newCouponValue),
      minOrder: Number(newCouponMin) || 0,
      isActive: true,
    });
    setNewCouponCode('');
    setNewCouponValue(10);
  };

  // Category Management Handlers
  const handleResetCategoryForm = () => {
    setCategoryFormNameEn('');
    setCategoryFormNameAr('');
    setEditingCategoryId(null);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCategoryFormNameEn(cat.nameEn || '');
    setCategoryFormNameAr(cat.nameAr || '');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameAr = categoryFormNameAr.trim();
    const nameEn = categoryFormNameEn.trim();
    if (!nameAr && !nameEn) {
      showToast('⚠️ يرجى كتابة اسم التصنيف بالعربية أو بالإنجليزية');
      return;
    }

    setIsSavingCategory(true);
    try {
      if (editingCategoryId) {
        // Update existing category
        const success = await updateCategory(editingCategoryId, {
          nameEn: nameEn || nameAr,
          nameAr: nameAr || nameEn,
        });
        if (success) {
          handleResetCategoryForm();
        }
      } else {
        // Add new category (auto-slug generated by addCategory)
        const res = await addCategory({
          nameEn: nameEn || nameAr,
          nameAr: nameAr || nameEn,
        });
        if (res) {
          handleResetCategoryForm();
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ التصنيف');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIdx];
    newCategories[targetIdx] = temp;
    await reorderCategories(newCategories);
  };

  // Quick Category Save directly from Add/Edit Product form (100% automatic slug, no images)
  const handleSaveQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameAr = quickCategoryNameAr.trim();
    const nameEn = quickCategoryNameEn.trim();
    if (!nameAr && !nameEn) {
      showToast('⚠️ يرجى كتابة اسم التصنيف بالعربية أو بالإنجليزية');
      return;
    }

    setIsSavingQuickCategory(true);
    try {
      const created = await addCategory({
        nameEn: nameEn || nameAr,
        nameAr: nameAr || nameEn,
      });

      if (created) {
        setCategory(created.id);
        setQuickCategoryNameEn('');
        setQuickCategoryNameAr('');
        setIsQuickCategoryOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      showToast('حدث خطأ أثناء إضافة التصنيف السريع');
    } finally {
      setIsSavingQuickCategory(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    await updateOrderStatusDb(orderId, status);
    setOrdersList((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    showToast('تم تحديث حالة الطلب');
    loadStats();
  };

  // Safe Centralized Delete Confirmation Execution
  const executeConfirmDelete = async () => {
    if (!deleteModal) return;
    setIsProcessingDelete(true);
    try {
      switch (deleteModal.type) {
        case 'single_category':
          if (deleteModal.targetId) {
            await deleteCategory(deleteModal.targetId);
          }
          break;

        case 'single_product':
          if (deleteModal.targetId) {
            await deleteProduct(deleteModal.targetId);
            setSelectedProductIds((prev) => prev.filter((id) => id !== deleteModal.targetId));
            loadStats();
          }
          break;

        case 'bulk_products':
          if (selectedProductIds.length > 0) {
            await deleteProductsBulk(selectedProductIds);
            setSelectedProductIds([]);
            loadStats();
          }
          break;

        case 'all_products':
          await clearAllProducts();
          setSelectedProductIds([]);
          loadStats();
          break;

        case 'single_order':
          if (deleteModal.targetId) {
            await deleteOrderDb(deleteModal.targetId);
            setOrdersList((prev) => prev.filter((o) => o.id !== deleteModal.targetId));
            setSelectedOrderIds((prev) => prev.filter((id) => id !== deleteModal.targetId));
            showToast('تم حذف الطلب بنجاح من قاعدة البيانات');
            loadStats();
          }
          break;

        case 'bulk_orders':
          if (selectedOrderIds.length > 0) {
            await deleteOrdersBulk(selectedOrderIds);
            setOrdersList((prev) => prev.filter((o) => !selectedOrderIds.includes(o.id)));
            setSelectedOrderIds([]);
            loadStats();
          }
          break;

        case 'cancelled_orders': {
          const cancelledIds = ordersList.filter((o) => o.status === 'cancelled').map((o) => o.id);
          if (cancelledIds.length > 0) {
            await deleteOrdersBulk(cancelledIds);
            setOrdersList((prev) => prev.filter((o) => o.status !== 'cancelled'));
            setSelectedOrderIds((prev) => prev.filter((id) => !cancelledIds.includes(id)));
            loadStats();
          }
          break;
        }

        case 'all_orders':
          await clearAllOrders();
          setOrdersList([]);
          setSelectedOrderIds([]);
          loadStats();
          break;

        case 'single_coupon':
          if (deleteModal.targetId) {
            await deleteCoupon(deleteModal.targetId);
            setSelectedCouponIds((prev) => prev.filter((id) => id !== deleteModal.targetId));
          }
          break;

        case 'bulk_coupons':
          if (selectedCouponIds.length > 0) {
            await deleteCouponsBulk(selectedCouponIds);
            setSelectedCouponIds([]);
          }
          break;

        case 'all_coupons':
          await clearAllCoupons();
          setSelectedCouponIds([]);
          break;
      }
    } catch (err) {
      console.error('Error during deletion:', err);
      showToast('حدث خطأ أثناء الحذف');
    } finally {
      setIsProcessingDelete(false);
      setDeleteModal(null);
    }
  };

  // Resend single order to Telegram
  const [sendingTelegramOrderId, setSendingTelegramOrderId] = useState<string | null>(null);
  const [isBulkSendingTelegram, setIsBulkSendingTelegram] = useState(false);

  const handleSendOrderToTelegram = async (order: Order) => {
    const token = (settingsForm.telegramBotToken || localStorage.getItem('molfet_tg_bot_token') || settings.telegramBotToken || '').trim();
    const chatId = (settingsForm.telegramChatId || localStorage.getItem('molfet_tg_chat_id') || settings.telegramChatId || '').trim();

    if (!token || !chatId) {
      showToast('يرجى حفظ بيانات البوت (Bot Token و Chat ID) في تبويب الإعدادات أولاً');
      return;
    }

    setSendingTelegramOrderId(order.id);
    try {
      const res = await sendTelegramOrderNotification(token, chatId, order);
      if (res.success) {
        showToast(`✅ تم إرسال الطلب #${order.orderNumber} مع الصورة إلى تليجرام بنجاح!`);
      } else {
        showToast(`❌ خطأ: ${res.error || 'تعذر إرسال الطلب لتليجرام'}`);
      }
    } catch (e: any) {
      showToast(e?.message || 'فشل الاتصال بتليجرام');
    } finally {
      setSendingTelegramOrderId(null);
    }
  };

  // Bulk send selected orders or all orders to Telegram
  const handleBulkSendOrdersToTelegram = async (ordersToSend: Order[]) => {
    const token = (settingsForm.telegramBotToken || localStorage.getItem('molfet_tg_bot_token') || settings.telegramBotToken || '').trim();
    const chatId = (settingsForm.telegramChatId || localStorage.getItem('molfet_tg_chat_id') || settings.telegramChatId || '').trim();

    if (!token || !chatId) {
      showToast('يرجى حفظ بيانات البوت (Bot Token و Chat ID) في تبويب الإعدادات أولاً');
      return;
    }

    if (ordersToSend.length === 0) {
      showToast('لا توجد طلبات لإرسالها');
      return;
    }

    setIsBulkSendingTelegram(true);
    let sentCount = 0;
    let failedCount = 0;

    for (const ord of ordersToSend) {
      try {
        const res = await sendTelegramOrderNotification(token, chatId, ord);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
        }
        // Small delay to prevent Telegram rate limit
        await new Promise((resolve) => setTimeout(resolve, 600));
      } catch {
        failedCount++;
      }
    }

    setIsBulkSendingTelegram(false);
    if (sentCount > 0) {
      showToast(`✅ تم إرسال ${sentCount} طلب بنجاح إلى هاتفك على تليجرام!${failedCount > 0 ? ` (فشل ${failedCount})` : ''}`);
    } else {
      showToast('❌ تعذر إرسال الطلبات، يرجى مراجعة بيانات البوت');
    }
  };

  // Selection Toggles for Products
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = (currentList: Product[]) => {
    if (selectedProductIds.length === currentList.length && currentList.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(currentList.map((p) => p.id));
    }
  };

  // Selection Toggles for Orders
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((oId) => oId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllOrders = () => {
    if (selectedOrderIds.length === ordersList.length && ordersList.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(ordersList.map((o) => o.id));
    }
  };

  // Selection Toggles for Coupons
  const toggleSelectCoupon = (id: string) => {
    setSelectedCouponIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCoupons = () => {
    if (selectedCouponIds.length === coupons.length && coupons.length > 0) {
      setSelectedCouponIds([]);
    } else {
      setSelectedCouponIds(coupons.map((c) => c.id));
    }
  };

  // Seed sample products into live Supabase
  const handleSeedInitialCatalog = async () => {
    if (!confirm('This will insert initial MOLFET sample products into your Supabase database. Continue?')) return;
    setIsSeeding(true);
    try {
      let count = 0;
      for (const p of INITIAL_PRODUCTS) {
        const success = await addProductDb(p);
        if (success) count++;
      }
      showToast(`Successfully seeded ${count} products to Supabase!`);
      await loadProducts({ force: true });
      await loadStats();
    } catch (e) {
      console.error('Seeding error:', e);
      showToast('Error seeding products');
    } finally {
      setIsSeeding(false);
    }
  };

  // Presets for Hero Banner
  const BANNER_PRESETS = [
    {
      name: 'MOLFET Signature Editorial (Default)',
      url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop',
    },
    {
      name: 'Urban Streetwear Minimalist',
      url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
    },
    {
      name: 'Luxury Dark Aesthetic Studio',
      url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    },
    {
      name: 'Premium Oversized Cotton Apparel',
      url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=2070&auto=format&fit=crop',
    },
    {
      name: 'Cairo High-Fashion Editorial',
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop',
    },
    {
      name: 'Monochrome Studio Model',
      url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop',
    },
  ];

  const ANNOUNCEMENT_PRESETS = [
    '20% Discount',
    'Shop our latest arrivals!',
    'FREE SHIPPING FOR ORDERS OVER 2900 LE',
    'خصم 20% لفترة محدودة على جميع المنتجات',
    'عروض منتصف الموسم • خصومات تصل إلى 40%',
    'شحن سريع لجميع محافظات مصر 🇪🇬',
    'استخدم كود MOLFET20 عند الدفع',
  ];

  // Handle banner image upload with WebP compression
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBanner(true);
    setBannerUploadStatus('جاري ضغط وتحسين صورة البانر (WebP)...');

    try {
      const { gallery } = await optimizeProductImages(file);
      const fileName = `hero_banner_${Date.now()}.webp`;
      const uploadedUrl = await uploadProductImageToStorage('banners', gallery.blob, fileName);

      if (uploadedUrl) {
        setHeroBannerImageInput(uploadedUrl);
        showToast('تم رفع صورة البانر وتطبيقها بنجاح!');
      } else {
        setHeroBannerImageInput(gallery.dataUrl);
        showToast('تم تحسين وتطبيق صورة البانر');
      }
    } catch (err: any) {
      console.error('Error uploading banner:', err);
      showToast('حدث خطأ أثناء رفع الصورة، يمكنك وضع رابط مباشر');
    } finally {
      setIsUploadingBanner(false);
      setBannerUploadStatus('');
      e.target.value = '';
    }
  };

  // Add new announcement tag
  const handleAddAnnouncement = (textToAdd?: string) => {
    const txt = (textToAdd || newAnnouncementInput).trim();
    if (!txt) {
      showToast('يرجى كتابة نص التاج أو الإعلان');
      return;
    }
    setAnnouncementsList((prev) => [...prev, txt]);
    if (!textToAdd) setNewAnnouncementInput('');
    showToast('تمت إضافة التاج إلى القائمة');
  };

  // Remove announcement tag
  const handleRemoveAnnouncement = (index: number) => {
    setAnnouncementsList((prev) => prev.filter((_, i) => i !== index));
    if (editingAnnouncementIdx === index) {
      setEditingAnnouncementIdx(null);
      setEditingAnnouncementText('');
    }
    showToast('تم حذف التاج من القائمة');
  };

  // Move announcement tag
  const handleMoveAnnouncement = (index: number, direction: 'up' | 'down') => {
    setAnnouncementsList((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Save edited announcement item
  const handleSaveEditedAnnouncement = (index: number) => {
    if (!editingAnnouncementText.trim()) {
      handleRemoveAnnouncement(index);
      return;
    }
    setAnnouncementsList((prev) => {
      const copy = [...prev];
      copy[index] = editingAnnouncementText.trim();
      return copy;
    });
    setEditingAnnouncementIdx(null);
    setEditingAnnouncementText('');
    showToast('تم تعديل التاج بنجاح');
  };

  // Save banner and announcements to store & DB
  const handleSaveBannerAndAnnouncements = async () => {
    setIsSavingBanner(true);
    try {
      const finalAnnouncements = announcementsList.filter((a) => a.trim().length > 0);
      const validAnnouncements = finalAnnouncements.length > 0 ? finalAnnouncements : [
        'Shop our latest arrivals!',
        'FREE SHIPPING FOR ORDERS OVER 2900 LE',
        '20% Discount'
      ];

      const imageToSave = heroBannerImageInput.trim() || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop';
      const buttonTextToSave = heroButtonTextInput.trim() || 'New Arrivals';

      const success = await updateSettings({
        heroBannerImage: imageToSave,
        heroButtonText: buttonTextToSave,
        announcements: validAnnouncements,
      });

      if (success) {
        showToast('تم حفظ وتحديث صورة New Arrivals والتاجز بنجاح في قاعدة البيانات!');
      }
    } catch (err: any) {
      console.error('Error saving banner/announcements:', err);
      showToast(err?.message || 'حدث خطأ أثناء حفظ التاجز والبانر');
    } finally {
      setIsSavingBanner(false);
    }
  };

  // Social Media Links Helpers
  const handleSaveSocialLinks = async (linksToSave?: SocialLink[]) => {
    const list = linksToSave || socialLinksList;
    setIsSavingSocial(true);
    try {
      // Find individual values for direct columns
      const fbLink = list.find((l) => l.platform === 'facebook' && l.isActive)?.url || '';
      const igLink = list.find((l) => l.platform === 'instagram' && l.isActive)?.url || '';
      const ttLink = list.find((l) => l.platform === 'tiktok' && l.isActive)?.url || '';
      const waLink = list.find((l) => l.platform === 'whatsapp' && l.isActive)?.url || '';
      const tgLink = list.find((l) => l.platform === 'telegram' && l.isActive)?.url || '';
      const ytLink = list.find((l) => l.platform === 'youtube' && l.isActive)?.url || '';
      const twLink = list.find((l) => (l.platform === 'x' || l.platform === 'twitter') && l.isActive)?.url || '';
      const scLink = list.find((l) => l.platform === 'snapchat' && l.isActive)?.url || '';
      const pinLink = list.find((l) => l.platform === 'pinterest' && l.isActive)?.url || '';
      const thLink = list.find((l) => l.platform === 'threads' && l.isActive)?.url || '';

      const success = await updateSettings({
        socialLinks: list,
        facebook: fbLink,
        instagram: igLink,
        tiktok: ttLink,
        whatsapp: waLink,
        telegram: tgLink,
        youtube: ytLink,
        xTwitter: twLink,
        snapchat: scLink,
        pinterest: pinLink,
        threads: thLink,
      });

      if (success) {
        showToast('تم حفظ وتحديث روابط السوشيال ميديا في قاعدة البيانات بنجاح!');
      }
    } catch (err: any) {
      console.error('Error saving social links:', err);
      showToast(err?.message || 'حدث خطأ أثناء حفظ روابط السوشيال ميديا');
    } finally {
      setIsSavingSocial(false);
    }
  };

  // Store General Settings Helper
  const handleSaveStoreSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    try {
      const validatedThreshold = Math.max(0, Number(settingsForm.freeShippingThreshold) || 0);
      const validatedDefaultShipping = Math.max(0, Number(settingsForm.defaultShippingFee) || 0);
      const validatedAlex = Math.max(0, Number(settingsForm.alexShipping) || validatedDefaultShipping);
      const validatedCairo = Math.max(0, Number(settingsForm.cairoGizaShipping) || 50);
      const validatedDelta = Math.max(0, Number(settingsForm.deltaShipping) || 50);
      const validatedUpper = Math.max(0, Number(settingsForm.upperEgyptShipping) || 60);

      const payload: Partial<StoreSettings> = {
        ...settingsForm,
        storeName: (settingsForm.storeName || 'MOLFET FOR FASHON').trim(),
        tagline: (settingsForm.tagline || '').trim(),
        phone: (settingsForm.phone || '+201012345678').trim(),
        whatsapp: (settingsForm.whatsapp || '201012345678').trim(),
        freeShippingThreshold: validatedThreshold,
        defaultShippingFee: validatedDefaultShipping,
        alexShipping: validatedAlex,
        cairoGizaShipping: validatedCairo,
        deltaShipping: validatedDelta,
        upperEgyptShipping: validatedUpper,
        instapayAddress: (settingsForm.instapayAddress || '').trim(),
        instapayPhone: (settingsForm.instapayPhone || '').trim(),
        vodafoneCashNumber: (settingsForm.vodafoneCashNumber || '').trim(),
        paymentInstructions: (settingsForm.paymentInstructions || '').trim(),
        telegramBotToken: (settingsForm.telegramBotToken || '').trim(),
        telegramChatId: (settingsForm.telegramChatId || '').trim(),
        mobileWebhookUrl: (settingsForm.mobileWebhookUrl || '').trim(),
        enableTelegramNotifications: settingsForm.enableTelegramNotifications ?? true,
        enableWebhookNotifications: settingsForm.enableWebhookNotifications ?? true,
        // BREAK THE FRAME — theme settings
        slogan: (settingsForm.slogan || 'Style Without Limits').trim(),
        lensEnabled: settingsForm.lensEnabled !== false,
        lookDiscountPercent: Math.max(0, Number(settingsForm.lookDiscountPercent) || 0),
      };

      if (payload.telegramBotToken) localStorage.setItem('molfet_tg_bot_token', payload.telegramBotToken);
      if (payload.telegramChatId) localStorage.setItem('molfet_tg_chat_id', payload.telegramChatId);
      if (payload.mobileWebhookUrl) localStorage.setItem('molfet_wb_url', payload.mobileWebhookUrl);

      const success = await updateSettings(payload);
      if (success) {
        showToast('تم حفظ وتثبيت إعدادات المتجر والشحن وإشعارات الهاتف بنجاح!');
      }
    } catch (err: any) {
      console.error('Error saving store settings:', err);
      showToast(err?.message || 'حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Test Mobile Telegram Alert Handler
  const handleTestTelegramAlert = async () => {
    const token = (settingsForm.telegramBotToken || '').trim();
    const chatId = (settingsForm.telegramChatId || '').trim();
    if (!token || !chatId) {
      showToast('يرجى كتابة Telegram Bot Token و Chat ID أولاً');
      return;
    }
    setIsTestingTelegram(true);
    try {
      const res = await sendTelegramTestPing(token, chatId);
      if (res.success) {
        localStorage.setItem('molfet_tg_bot_token', token);
        localStorage.setItem('molfet_tg_chat_id', chatId);
        showToast('✅ تم إرسال رسالة تنبيه تجريبية لهاتفك على تليجرام وحفظ الربط بنجاح!');
      } else {
        showToast(`❌ خطأ: ${res.error || 'تعذر إرسال التنبيه التجريبي'}`);
      }
    } catch (e: any) {
      showToast(e?.message || 'فشل الاتصال بتليجرام');
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Test Webhook Alert Handler
  const handleTestWebhookAlert = async () => {
    const url = (settingsForm.mobileWebhookUrl || '').trim();
    if (!url) {
      showToast('يرجى إدخال رابط Webhook أولاً');
      return;
    }
    setIsTestingWebhook(true);
    try {
      const res = await sendWebhookTestPing(url);
      if (res.success) {
        showToast('✅ تم إرسال طلب تجريبي للـ Webhook بنجاح!');
      } else {
        showToast(`❌ خطأ: ${res.error || 'تعذر إرسال الويب هوك'}`);
      }
    } catch (e: any) {
      showToast(e?.message || 'فشل إرسال الويب هوك');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleAddOrUpdateSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialFormUrl.trim()) {
      showToast('يرجى إدخال الرابط (URL)');
      return;
    }

    let formattedUrl = socialFormUrl.trim();
    // Helper to format URLs smartly
    if (socialFormPlatform === 'whatsapp' && !formattedUrl.startsWith('http')) {
      const cleanNum = formattedUrl.replace(/\D/g, '');
      formattedUrl = `https://wa.me/${cleanNum}`;
    } else if (socialFormPlatform === 'instagram' && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://www.instagram.com/${formattedUrl.replace('@', '')}`;
    } else if (socialFormPlatform === 'tiktok' && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://www.tiktok.com/@${formattedUrl.replace('@', '')}`;
    } else if (socialFormPlatform === 'telegram' && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://t.me/${formattedUrl.replace('@', '')}`;
    } else if (socialFormPlatform === 'snapchat' && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://www.snapchat.com/add/${formattedUrl.replace('@', '')}`;
    } else if (socialFormPlatform === 'threads' && !formattedUrl.startsWith('http')) {
      formattedUrl = `https://www.threads.net/@${formattedUrl.replace('@', '')}`;
    } else if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const defaultTitleMap: Record<SocialPlatform, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      youtube: 'YouTube',
      x: 'X (Twitter)',
      twitter: 'X (Twitter)',
      snapchat: 'Snapchat',
      pinterest: 'Pinterest',
      threads: 'Threads',
      linkedin: 'LinkedIn',
      website: 'Website',
      custom: 'Link',
    };

    const finalTitle = socialFormTitle.trim() || defaultTitleMap[socialFormPlatform] || 'Social Link';

    let updatedList: SocialLink[];

    if (editingSocialLinkId) {
      updatedList = socialLinksList.map((item) =>
        item.id === editingSocialLinkId
          ? {
              ...item,
              platform: socialFormPlatform,
              title: finalTitle,
              url: formattedUrl,
              isActive: socialFormIsActive,
              openInNewTab: socialFormOpenInNewTab,
            }
          : item
      );
      setEditingSocialLinkId(null);
    } else {
      const newLink: SocialLink = {
        id: `social_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        platform: socialFormPlatform,
        title: finalTitle,
        url: formattedUrl,
        isActive: socialFormIsActive,
        openInNewTab: socialFormOpenInNewTab,
      };
      updatedList = [...socialLinksList, newLink];
    }

    setSocialLinksList(updatedList);
    setSocialFormTitle('');
    setSocialFormUrl('');
    setSocialFormIsActive(true);
    setSocialFormOpenInNewTab(true);

    await handleSaveSocialLinks(updatedList);
  };

  const handleEditSocialLink = (link: SocialLink) => {
    setEditingSocialLinkId(link.id);
    setSocialFormPlatform(link.platform);
    setSocialFormTitle(link.title);
    setSocialFormUrl(link.url);
    setSocialFormIsActive(link.isActive);
    setSocialFormOpenInNewTab(link.openInNewTab !== false);
    document.getElementById('social-link-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEditSocialLink = () => {
    setEditingSocialLinkId(null);
    setSocialFormTitle('');
    setSocialFormUrl('');
    setSocialFormIsActive(true);
    setSocialFormOpenInNewTab(true);
  };

  const handleDeleteSocialLink = async (id: string) => {
    const updatedList = socialLinksList.filter((item) => item.id !== id);
    setSocialLinksList(updatedList);
    if (editingSocialLinkId === id) {
      handleCancelEditSocialLink();
    }
    await handleSaveSocialLinks(updatedList);
  };

  const handleToggleSocialLinkActive = async (id: string) => {
    const updatedList = socialLinksList.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setSocialLinksList(updatedList);
    await handleSaveSocialLinks(updatedList);
  };

  const handleMoveSocialLink = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= socialLinksList.length) return;

    const copy = [...socialLinksList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setSocialLinksList(copy);
    await handleSaveSocialLinks(copy);
  };

  const handleResetDefaultSocialLinks = async () => {
    if (!confirm('هل تريد استعادة أزرار السوشيال ميديا الافتراضية؟')) return;
    setSocialLinksList(DEFAULT_SOCIAL_LINKS);
    await handleSaveSocialLinks(DEFAULT_SOCIAL_LINKS);
  };

  const handleSelectPresetPlatform = (platform: SocialPlatform) => {
    setSocialFormPlatform(platform);
    const defaultTitleMap: Record<SocialPlatform, string> = {
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      whatsapp: 'WhatsApp',
      telegram: 'Telegram',
      youtube: 'YouTube',
      x: 'X (Twitter)',
      twitter: 'X (Twitter)',
      snapchat: 'Snapchat',
      pinterest: 'Pinterest',
      threads: 'Threads',
      linkedin: 'LinkedIn',
      website: 'Website',
      custom: 'Link',
    };
    if (!socialFormTitle) {
      setSocialFormTitle(defaultTitleMap[platform]);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesQuery = p.titleEn.toLowerCase().includes(searchInList.toLowerCase()) || p.sku.includes(searchInList);
    const matchesCat = filterCatInList === 'all' || p.category === filterCatInList;
    return matchesQuery && matchesCat;
  });

  return (
    <div className="py-8 px-4 sm:px-8 max-w-[1300px] mx-auto text-left text-black">
      {/* Header & Quick stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">Store Management</h1>
            <span className="px-2.5 py-0.5 bg-black text-white font-semibold text-[10px] uppercase rounded-full">
              MOLFET FOR FASHON Admin
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Optimized for Supabase Free Tier • Persistent Database • Client-side WebP Compression
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Order Notifications System for Admin */}
          <AdminNotifications 
            onSelectOrder={handleNotificationSelectOrder} 
            onRefreshOrders={handleNotificationRefreshOrders} 
            onOpenSettings={() => setActiveTab('settings')}
          />

          <button
            onClick={() => setViewMode('store')}
            className="px-4 py-2.5 bg-black hover:bg-zinc-800 text-white font-medium text-xs rounded-full transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>View Live Store</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards (Calculated from Supabase aggregation) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-white border border-[var(--mf-hairline)] shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">Products in Catalog</span>
          <span className="text-2xl font-bold text-black">{stats.productsCount || products.length}</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[var(--mf-hairline)] shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">Total Orders</span>
          <span className="text-2xl font-bold text-black">{stats.totalOrdersCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[var(--mf-hairline)] shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">Pending Orders</span>
          <span className="text-2xl font-bold text-amber-600">{stats.pendingOrdersCount}</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[var(--mf-hairline)] shadow-xs">
          <span className="text-xs text-zinc-500 block mb-1">Total Sales Revenue</span>
          <span className="text-2xl font-bold text-black">LE {stats.totalSalesRevenue.toFixed(2)}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-8 border-b border-zinc-200">
        <button
          onClick={() => { setActiveTab('add-product'); if (!editingProductId) resetForm(); }}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'add-product'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{editingProductId ? 'Edit Product' : 'Add New Product'}</span>
        </button>

        <button
          onClick={() => setActiveTab('products-list')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'products-list'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Customer Orders ({stats.totalOrdersCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'coupons'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons ({coupons.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'banners'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>البانر والتاجز العلوية (Hero & Tags)</span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'social'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Share2 className="w-4 h-4 text-blue-500" />
          <span>أزرار السوشيال ميديا ({socialLinksList.filter(l => l.isActive).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>إدارة التصنيفات ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-black text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Store & Integrations</span>
        </button>
      </div>

      {/* TAB 1: ADD / EDIT PRODUCT */}
      {activeTab === 'add-product' && (
        <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 mb-6">
            <div>
              <h2 className="text-lg font-bold text-black">
                {editingProductId ? `Edit Product (${sku})` : 'Create New Product'}
              </h2>
              <p className="text-xs text-zinc-500">
                Images are automatically compressed to WebP and resized to 600px/1200px before uploading.
              </p>
            </div>
            {editingProductId && (
              <button
                onClick={resetForm}
                className="text-xs font-semibold text-zinc-500 hover:text-black underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-6">
            {/* Title & SKU */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-black uppercase mb-1">
                  Product Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. OVERSIZED HEAVYWEIGHT SHIRT"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">
                  SKU / Product Code
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="MLFT-701"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm font-mono text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Category & Badge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-black uppercase">Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickCategoryOpen(true)}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ تصنيف جديد</span>
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW_CAT__') {
                      setIsQuickCategoryOpen(true);
                      return;
                    }
                    setCategory(e.target.value);
                  }}
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black"
                >
                  {categories.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn} {c.nameAr && c.nameAr !== c.nameEn ? `(${c.nameAr})` : ''}
                    </option>
                  ))}
                  {category && !categories.some((c) => c.id === category) && (
                    <option value={category}>{category} (مخصص)</option>
                  )}
                  <option value="__NEW_CAT__" className="text-emerald-700 font-bold bg-emerald-50">
                    ➕ + أضف تصنيف جديد...
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Badge (الشارة المعروضة على المنتج)</label>
                <select
                  value={badge || ''}
                  onChange={(e) => setBadge(e.target.value as any || undefined)}
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3.5 py-2.5 text-sm text-black focus:outline-none focus:border-black font-medium"
                >
                  <option value="">بدون شارة (No Badge)</option>
                  <option value="SALE">SALE (مستطيل أسود في الركن العلوي الأيسر)</option>
                  <option value="NEW">NEW</option>
                  <option value="HOT">HOT</option>
                  <option value="LIMITED">LIMITED</option>
                  <option value="BESTSELLER">BESTSELLER</option>
                </select>
                <div className="mt-2.5 p-2.5 bg-zinc-100 rounded-lg flex items-center justify-between border border-zinc-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black">
                    <input
                      type="checkbox"
                      checked={badge === 'SALE'}
                      onChange={(e) => setBadge(e.target.checked ? 'SALE' : undefined)}
                      className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                    />
                    <span>إظهار شارة SALE السوداء على صورة المنتج</span>
                  </label>
                  <span className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded-xs">SALE</span>
                </div>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-black">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>Show on Featured Homepage</span>
                </label>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Price (LE) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="650"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-black font-semibold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Original Price (Before Sale)</label>
                <input
                  type="number"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="850"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-zinc-500 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Available Stock (Units) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value ? Number(e.target.value) : '')}
                  placeholder="30"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* Client-Side Multi-Image Upload & Primary Image Selector */}
            <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-zinc-200">
                <div>
                  <label className="block text-xs font-bold text-black uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4" />
                    <span>صور المنتج (رفع متعدد واختيار الصورة الأنسب) *</span>
                  </label>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    ارفع عدة صور معاً من جهازك، وحدد الصورة الأنسب لتكون هي الصورة الرئيسية (Cover) للمنتج.
                  </p>
                </div>
                {images.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-black text-white px-2.5 py-1 rounded-full">
                      {images.length} {images.length === 1 ? 'صورة' : 'صور مضافة'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImages([]);
                        setThumbnailUrl('');
                        showToast('تم مسح جميع الصور');
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    >
                      مسح الكل
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Drop Zone & URL Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="md:col-span-2 border-2 border-dashed border-zinc-300 hover:border-black rounded-xl p-5 text-center bg-white transition-all">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    id="image-file-input"
                    className="hidden"
                    disabled={isOptimizingImage}
                  />
                  <label htmlFor="image-file-input" className="cursor-pointer flex flex-col items-center justify-center py-2">
                    <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-2.5 text-black group-hover:scale-105 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-black mb-1">
                      {isOptimizingImage ? imageUploadStatus : 'اضغط لاختيار عدة صور من جهازك معاً (Multi-Select) أو اسحبها هنا'}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      يدعم JPG, PNG, WEBP • يتم ضغط الصور تلقائياً وتحسين حجمها وسرعتها
                    </span>
                  </label>
                </div>

                {/* Optional: Add Image via Direct URL */}
                <div className="border border-zinc-200 rounded-xl p-4 bg-white flex flex-col justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-black uppercase mb-1.5">
                      أو أضف رابط صورة مباشر (URL):
                    </label>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                      placeholder="https://example.com/image.webp"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="mt-2.5 w-full py-2 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة الرابط</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Images Gallery & Selection Matrix */}
              {images.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-black flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>اختر الصورة الأنسب لتكون الرئيسية (Cover):</span>
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      يمكنك إعادة ترتيب الصور أو حذف أي صورة غير مناسبة
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {images.map((imgUrl, idx) => {
                      const isMain = idx === 0 || imgUrl === thumbnailUrl;
                      return (
                        <div
                          key={idx}
                          className={`relative group bg-white rounded-xl overflow-hidden transition-all duration-200 flex flex-col ${
                            isMain
                              ? 'border-2 border-black shadow-md ring-2 ring-black/10'
                              : 'border border-zinc-200 hover:border-zinc-400 hover:shadow-xs'
                          }`}
                        >
                          {/* Image Aspect Box */}
                          <div className="relative aspect-[3/4] bg-zinc-100 overflow-hidden">
                            <img
                              src={imgUrl}
                              alt={`Product image ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Badge */}
                            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                              {isMain ? (
                                <span className="bg-black/90 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm backdrop-blur-xs">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>الرئيسية (Cover)</span>
                                </span>
                              ) : (
                                <span className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                                  #{idx + 1}
                                </span>
                              )}
                            </div>

                            {/* Delete button (top right) */}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg shadow-sm transition-transform active:scale-90 cursor-pointer"
                              title="حذف هذه الصورة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Card Footer Controls */}
                          <div className="p-2 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-1.5">
                            {!isMain ? (
                              <button
                                type="button"
                                onClick={() => handleSetMainImage(idx)}
                                className="w-full py-1.5 px-2 bg-white hover:bg-zinc-900 hover:text-white text-black text-[11px] font-bold rounded-md border border-zinc-300 hover:border-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Star className="w-3 h-3 text-amber-500" />
                                <span>اختيار كالرئيسية</span>
                              </button>
                            ) : (
                              <div className="w-full py-1 px-2 bg-black text-white text-[11px] font-bold rounded-md flex items-center justify-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>الصورة المعتمدة</span>
                              </div>
                            )}

                            {/* Move Left / Right Buttons for Ordering */}
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-200/60">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveImage(idx, 'left')}
                                className="flex-1 py-1 bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white text-zinc-700 text-[10px] font-bold rounded border border-zinc-200 flex items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                title="تحريك للأمام"
                              >
                                <ChevronRight className="w-3 h-3" />
                                <span>تقديم</span>
                              </button>
                              <button
                                type="button"
                                disabled={idx === images.length - 1}
                                onClick={() => handleMoveImage(idx, 'right')}
                                className="flex-1 py-1 bg-white hover:bg-zinc-200 disabled:opacity-30 disabled:hover:bg-white text-zinc-700 text-[10px] font-bold rounded border border-zinc-200 flex items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
                                title="تحريك للخلف"
                              >
                                <span>تأخير</span>
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-zinc-300 rounded-xl p-8 text-center bg-white">
                  <ImageIcon className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-700 mb-1">لم يتم رفع أي صور للمنتج بعد</p>
                  <p className="text-[11px] text-zinc-400">
                    يمكنك الضغط على زر الرفع بالأعلى وتحديد عدة صور من جهازك دفعة واحدة، ثم اختيار الصورة الأنسب لتكون الرئيسية.
                  </p>
                </div>
              )}
            </div>

            {/* Sizes & Fit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Available Sizes</label>
                <div className="flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size'].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        sizes.includes(s)
                          ? 'bg-black text-white border-black'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black uppercase mb-1">Fit Type</label>
                <select
                  value={fitType}
                  onChange={(e) => setFitType(e.target.value as any)}
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3.5 py-2 text-sm text-black focus:outline-none focus:border-black"
                >
                  <option value="Oversized">Oversized</option>
                  <option value="Relaxed">Relaxed</option>
                  <option value="Regular">Regular</option>
                  <option value="Boxy">Boxy</option>
                  <option value="Slim">Slim</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-zinc-200 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProduct}
                className="px-8 py-3 bg-black hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSavingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ في قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingProductId ? 'Update Product in Supabase' : 'Save Product to Supabase'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PRODUCTS CATALOG LIST */}
      {activeTab === 'products-list' && (
        <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 mb-4">
            <div>
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <span>Product Catalog</span>
                <span className="bg-black text-white text-xs px-2.5 py-0.5 rounded-full font-mono">{filteredProducts.length}</span>
              </h2>
              <p className="text-xs text-zinc-500">Live products retrieved from your Supabase PostgreSQL database.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInList}
                  onChange={(e) => setSearchInList(e.target.value)}
                  placeholder="Search by title, SKU..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <select
                value={filterCatInList}
                onChange={(e) => setFilterCatInList(e.target.value)}
                className="bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn} {c.nameAr && c.nameAr !== c.nameEn ? `(${c.nameAr})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Action & Management Toolbar */}
          {filteredProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSelectAllProducts(filteredProducts)}
                  className="flex items-center gap-2 font-bold text-black hover:text-zinc-700 cursor-pointer"
                >
                  {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>تحديد الكل ({filteredProducts.length})</span>
                </button>

                {selectedProductIds.length > 0 && (
                  <span className="bg-zinc-200 text-zinc-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    تم تحديد {selectedProductIds.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedProductIds.length > 0 && (
                  <>
                    <button
                      onClick={() => setSelectedProductIds([])}
                      className="px-3 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>

                    <button
                      onClick={() => setDeleteModal({
                        type: 'bulk_products',
                        title: 'حذف المنتجات المحددة',
                        message: `هل أنت متأكد من حذف ${selectedProductIds.length} منتج نهائياً من قاعدة البيانات والمتجر؟`,
                        itemCount: selectedProductIds.length
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المحددة ({selectedProductIds.length})</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setDeleteModal({
                    type: 'all_products',
                    title: 'مسح وحذف جميع المنتجات',
                    message: 'تحذير: سيتم حذف جميع المنتجات بالكامل من قاعدة البيانات والمتجر. لن يمكنك التراجع عن هذا الإجراء!',
                    itemCount: products.length
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 font-bold rounded-lg transition-colors cursor-pointer"
                  title="Delete All Products"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>مسح جميع المنتجات ({products.length})</span>
                </button>
              </div>
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl bg-zinc-50">
              <Package className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-black">No products found</p>
              <p className="text-xs text-zinc-500 mt-1 mb-4">You can add new products or seed the initial collection.</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => { resetForm(); setActiveTab('add-product'); }}
                  className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-full hover:bg-zinc-800 cursor-pointer"
                >
                  + Add First Product
                </button>
                <button
                  onClick={handleSeedInitialCatalog}
                  disabled={isSeeding}
                  className="px-4 py-2 bg-zinc-200 text-black text-xs font-semibold rounded-full hover:bg-zinc-300 cursor-pointer"
                >
                  {isSeeding ? 'Seeding...' : 'Seed Sample Collection'}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider bg-zinc-50/50">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        onClick={() => toggleSelectAllProducts(filteredProducts)}
                        className="cursor-pointer text-zinc-500 hover:text-black"
                      >
                        {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-black" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Price</th>
                    <th className="py-3 px-3">Badge (شارة)</th>
                    <th className="py-3 px-3">Stock</th>
                    <th className="py-3 px-3">Sizes</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        className={`transition-colors ${isSelected ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-zinc-50'}`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleSelectProduct(p.id)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-black" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-3 flex items-center gap-3">
                          <img
                            src={p.thumbnailUrl || p.images[0]}
                            alt=""
                            className="w-10 h-14 object-cover rounded bg-zinc-100 border border-zinc-200"
                            loading="lazy"
                          />
                          <div>
                            <span className="font-bold text-black block uppercase">{p.titleEn}</span>
                            <span className="text-[11px] text-zinc-500 font-mono">{p.sku}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-700 uppercase">{p.category}</td>
                        <td className="py-3 px-3 font-bold text-black">LE {p.price.toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer" title="تفعيل/إلغاء شارة SALE">
                              <input
                                type="checkbox"
                                checked={p.badge === 'SALE'}
                                onChange={async (e) => {
                                  const newBadge = e.target.checked ? 'SALE' : null;
                                  await updateProduct(p.id, { badge: newBadge });
                                  showToast(e.target.checked ? `تم تفعيل SALE على "${p.titleEn}"` : `تم إزالة SALE من "${p.titleEn}"`);
                                }}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                              />
                              <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-xs transition-colors ${
                                p.badge === 'SALE' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                SALE
                              </span>
                            </label>

                            <select
                              value={p.badge || ''}
                              onChange={async (e) => {
                                const newBadge = e.target.value as any || null;
                                await updateProduct(p.id, { badge: newBadge });
                                showToast(`تم تحديث شارة منتج "${p.titleEn}" بنجاح!`);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border focus:outline-none cursor-pointer transition-colors ${
                                p.badge && p.badge !== 'SALE'
                                  ? 'bg-zinc-100 text-black border-zinc-300'
                                  : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-zinc-400'
                              }`}
                            >
                              <option value="">أخرى...</option>
                              <option value="NEW">NEW</option>
                              <option value="HOT">HOT</option>
                              <option value="LIMITED">LIMITED</option>
                              <option value="BESTSELLER">BESTSELLER</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.stock > 10 ? 'bg-emerald-100 text-emerald-800' : p.stock > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {p.stock} units
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-600">{p.sizes.join(', ')}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditProduct(p)}
                              className="p-1.5 hover:bg-zinc-200 text-black rounded-md transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                type: 'single_product',
                                title: 'حذف المنتج',
                                message: `هل أنت متأكد من حذف منتج "${p.titleEn}" نهائياً من قاعدة البيانات؟`,
                                targetId: p.id
                              })}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer"
                              title="حذف المنتج"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER ORDERS (Paginated, Server-Side Filtered) */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 mb-4">
            <div>
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <span>Customer Orders</span>
                <span className="bg-black text-white text-xs px-2.5 py-0.5 rounded-full font-mono">{ordersTotalCount}</span>
              </h2>
              <p className="text-xs text-zinc-500">Live PostgreSQL orders with lightweight snapshots & atomic inventory deductions.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ordersSearchQuery}
                  onChange={(e) => { setOrdersSearchQuery(e.target.value); setOrdersPage(1); }}
                  placeholder="Search order #, phone..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <select
                value={ordersStatusFilter}
                onChange={(e) => { setOrdersStatusFilter(e.target.value); setOrdersPage(1); }}
                className="bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                type="button"
                onClick={loadOrders}
                disabled={isLoadingOrders}
                className="p-2 border border-zinc-300 rounded-lg hover:bg-zinc-100 text-black transition-colors cursor-pointer disabled:opacity-50"
                title="تحديث قائمة الطلبات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bulk Action & Management Toolbar for Orders */}
          {ordersList.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 mb-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAllOrders}
                  className="flex items-center gap-2 font-bold text-black hover:text-zinc-700 cursor-pointer"
                >
                  {selectedOrderIds.length === ordersList.length && ordersList.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-black" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                  <span>تحديد الكل في هذه الصفحة ({ordersList.length})</span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <span className="bg-zinc-200 text-zinc-800 font-bold px-2 py-0.5 rounded-full text-[11px]">
                    تم تحديد {selectedOrderIds.length}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkSendOrdersToTelegram(selectedOrderIds.length > 0 ? ordersList.filter(o => selectedOrderIds.includes(o.id)) : ordersList)}
                  disabled={isBulkSendingTelegram || ordersList.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="إرسال الطلبات إلى بوت تليجرام"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {isBulkSendingTelegram
                      ? 'جاري الإرسال للتليجرام...'
                      : selectedOrderIds.length > 0
                      ? `إرسال المحددة للتليجرام (${selectedOrderIds.length}) 📱`
                      : 'إرسال جميع الطلبات للتليجرام 📱'}
                  </span>
                </button>

                {selectedOrderIds.length > 0 && (
                  <>
                    <button
                      onClick={() => setSelectedOrderIds([])}
                      className="px-3 py-1.5 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>

                    <button
                      onClick={() => setDeleteModal({
                        type: 'bulk_orders',
                        title: 'حذف الطلبات المحددة',
                        message: `هل أنت متأكد من حذف ${selectedOrderIds.length} طلب نهائياً من قاعدة البيانات؟`,
                        itemCount: selectedOrderIds.length
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المحددة ({selectedOrderIds.length})</span>
                    </button>
                  </>
                )}

                {ordersList.some(o => o.status === 'cancelled') && (
                  <button
                    onClick={() => setDeleteModal({
                      type: 'cancelled_orders',
                      title: 'حذف الطلبات الملغاة',
                      message: 'هل تريد حذف جميع الطلبات التي تحمل حالة "Cancelled" لتنظيف السجل؟',
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>حذف الملغاة ({ordersList.filter(o => o.status === 'cancelled').length})</span>
                  </button>
                )}

                <button
                  onClick={() => setDeleteModal({
                    type: 'all_orders',
                    title: 'مسح وحذف جميع الطلبات',
                    message: 'تحذير: سيتم حذف جميع الطلبات وسجلاتها بالكامل من قاعدة البيانات. لن تتمكن من استرجاعها!',
                    itemCount: ordersTotalCount || ordersList.length
                  })}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>مسح جميع الطلبات</span>
                </button>
              </div>
            </div>
          )}

          {isLoadingOrders ? (
            <div className="text-center py-12 text-xs text-zinc-400">Loading orders from Supabase...</div>
          ) : ordersList.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl bg-zinc-50">
              <ShoppingBag className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-black">No orders yet</p>
              <p className="text-xs text-zinc-500 mt-1">Orders placed by customers in checkout will appear here instantly.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ordersList.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const cleanPhone = order.phone.replace(/[^0-9]/g, '');
                const waPhone = cleanPhone.startsWith('2') ? cleanPhone : `2${cleanPhone.replace(/^0/, '')}`;
                
                return (
                  <div 
                    key={order.id} 
                    className={`border rounded-2xl p-5 transition-all shadow-xs ${
                      isSelected ? 'border-red-400 bg-red-50/20' : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    {/* Top Header: Order Number, Date, Status Selector & Delete */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelectOrder(order.id)}
                          className="cursor-pointer text-zinc-400 hover:text-black"
                          aria-label="Select order"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-black" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-300 hover:text-zinc-500" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-base text-black">{order.orderNumber}</span>
                            {order.appliedCoupon && (
                              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-mono font-bold rounded">
                                كود: {order.appliedCoupon}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            {new Date(order.createdAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendOrderToTelegram(order)}
                          disabled={sendingTelegramOrderId === order.id}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="إرسال إشعار هذا الطلب وصورته إلى هاتفك عبر تليجرام"
                        >
                          {sendingTelegramOrderId === order.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                              <span>جاري الإرسال...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 text-sky-600" />
                              <span>إرسال لتليجرام 📱</span>
                            </>
                          )}
                        </button>

                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                          className={`text-xs font-bold rounded-lg px-3 py-1.5 border focus:outline-none cursor-pointer ${
                            order.status === 'pending'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : order.status === 'processing'
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : order.status === 'shipped'
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : 'bg-red-50 text-red-900 border-red-300'
                          }`}
                        >
                          <option value="pending">⏳ قيد الانتظار (Pending)</option>
                          <option value="processing">⚙️ جاري التجهيز (Processing)</option>
                          <option value="shipped">🚚 تم الشحن (Shipped)</option>
                          <option value="delivered">✅ تم التوصيل (Delivered)</option>
                          <option value="cancelled">❌ ملغي (Cancelled)</option>
                        </select>

                        <button
                          onClick={() => setDeleteModal({
                            type: 'single_order',
                            title: 'حذف الطلب',
                            message: `هل أنت متأكد من حذف الطلب رقم #${order.orderNumber} نهائياً من قاعدة البيانات؟`,
                            targetId: order.id
                          })}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customer Info Card & Payment Highlights */}
                    <div className="my-3 p-3.5 bg-zinc-50 border border-zinc-200/80 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Customer Identity & Quick Call / WhatsApp */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 block uppercase font-medium">اسم العميل (Customer Name)</span>
                            <span className="text-sm font-black text-black block leading-tight">{order.customerName}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg">
                            <Phone className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="font-mono font-bold text-xs text-black" dir="ltr">{order.phone}</span>
                          </div>

                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`أهلاً بك يا ${order.customerName} بخصوص طلبك رقم ${order.orderNumber} من MOLFET`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer"
                            title="تواصل عبر واتساب"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </a>

                          <a
                            href={`tel:${order.phone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg font-semibold text-xs transition-colors"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-3 h-3" />
                            <span>اتصال</span>
                          </a>

                          {order.altPhone && (
                            <span className="text-[11px] text-zinc-500 font-mono" dir="ltr">
                              رقم بديل: <a href={`tel:${order.altPhone}`} className="underline font-bold text-black">{order.altPhone}</a>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Payment Method & Receipt */}
                      <div className="space-y-2 border-t md:border-t-0 md:border-r border-zinc-200 pt-2 md:pt-0 md:pr-4">
                        <span className="text-[10px] text-zinc-500 block uppercase font-medium">طريقة الدفع والحالة</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {order.paymentMethod === 'instapay' ? (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-md inline-flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                              <span>تحويل إنستاباي (InstaPay)</span>
                            </span>
                          ) : order.paymentMethod === 'vodafone_cash' ? (
                            <span className="px-2.5 py-1 bg-red-100 text-red-900 border border-red-200 font-bold text-xs rounded-md inline-flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-red-700" />
                              <span>فودافون كاش (Vodafone Cash)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-zinc-200 text-zinc-900 font-bold text-xs rounded-md inline-flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-zinc-700" />
                              <span>الدفع عند الاستلام (COD)</span>
                            </span>
                          )}
                        </div>

                        {/* Receipt preview if available */}
                        {order.paymentReceiptUrl ? (
                          <div className="mt-2 p-2 bg-purple-50/60 border border-purple-200 rounded-lg flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <img 
                                src={order.paymentReceiptUrl} 
                                alt="إيصال التحويل" 
                                className="w-10 h-10 object-cover rounded border border-purple-300 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedReceiptUrl(order.paymentReceiptUrl || null)}
                              />
                              <div>
                                <span className="text-xs font-bold text-purple-950 block">مرفق إيصال تحويل 🧾</span>
                                <span className="text-[10px] text-purple-700">اضغط للمعاينة والتكبير</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptUrl(order.paymentReceiptUrl || null)}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Eye className="w-3 h-3" />
                              <span>معاينة الإيصال</span>
                            </button>
                          </div>
                        ) : order.paymentMethod !== 'cod' ? (
                          <p className="text-[11px] text-amber-700 font-medium mt-1">
                            ⚠️ لم يقم العميل برفع صورة الإيصال عبر الموقع (تأكد من التحويل عبر الواتساب).
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Order Details: Address & Items */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                      <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
                        <div className="flex items-center gap-1.5 text-zinc-500 font-semibold mb-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-700" />
                          <span>عنوان التوصيل (الإسكندرية):</span>
                        </div>
                        <p className="font-bold text-black text-xs leading-relaxed">
                          {order.governorate} • {order.city}
                        </p>
                        <p className="text-zinc-700 text-xs mt-1 leading-normal">
                          {order.address}
                        </p>
                        {order.notes && (
                          <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-950 text-[11px]">
                            <span className="font-bold block">ملاحظات العميل:</span>
                            <span>&quot;{order.notes}&quot;</span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
                        <span className="text-zinc-500 font-semibold block mb-1.5">المنتجات المطلوبة ({order.items.length}):</span>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-zinc-700 text-xs py-1 border-b border-zinc-100 last:border-0">
                              <div>
                                <span className="font-medium text-black">{item.title}</span>
                                <span className="text-zinc-500 text-[11px] block">المقاس: {item.size} • الكمية: {item.quantity}</span>
                              </div>
                              <span className="font-bold text-black font-mono">LE {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 mt-2 border-t border-zinc-200 flex justify-between font-bold text-black text-xs">
                          <span>الإجمالي شامل الشحن ({order.shippingFee} ج.م):</span>
                          <span className="font-mono text-sm text-emerald-800 font-black">LE {order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {ordersTotalCount > 15 && (
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 text-xs">
                  <span className="text-zinc-500">
                    Page {ordersPage} of {Math.ceil(ordersTotalCount / 15)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                      disabled={ordersPage <= 1}
                      className="px-3 py-1.5 border rounded-lg hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setOrdersPage((p) => p + 1)}
                      disabled={ordersPage >= Math.ceil(ordersTotalCount / 15)}
                      className="px-3 py-1.5 border rounded-lg hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-black mb-4">Create Promo Code</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-black mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value)}
                  placeholder="e.g. SUMMER20"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 font-mono uppercase font-bold focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Discount Type</label>
                <select
                  value={newCouponType}
                  onChange={(e) => setNewCouponType(e.target.value as any)}
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (LE)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Discount Value *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(e.target.value ? Number(e.target.value) : '')}
                  placeholder="10"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Min. Order Amount (LE)</label>
                <input
                  type="number"
                  min="0"
                  value={newCouponMin}
                  onChange={(e) => setNewCouponMin(e.target.value ? Number(e.target.value) : '')}
                  placeholder="500"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-bold rounded-full transition-colors cursor-pointer"
              >
                Create Coupon
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 mb-4">
              <h3 className="text-base font-bold text-black flex items-center gap-2">
                <span>Active Promo Codes</span>
                <span className="bg-black text-white text-xs px-2.5 py-0.5 rounded-full font-mono">{coupons.length}</span>
              </h3>

              {coupons.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectedCouponIds.length > 0 && (
                    <button
                      onClick={() => setDeleteModal({
                        type: 'bulk_coupons',
                        title: 'حذف الكوبونات المحددة',
                        message: `هل أنت متأكد من حذف ${selectedCouponIds.length} كود خصم نهائياً؟`,
                        itemCount: selectedCouponIds.length
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المحددة ({selectedCouponIds.length})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setDeleteModal({
                      type: 'all_coupons',
                      title: 'مسح وحذف جميع الكوبونات',
                      message: 'هل تريد حذف جميع أكواد الخصم بالكامل من قاعدة البيانات؟',
                      itemCount: coupons.length
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>مسح جميع الكوبونات</span>
                  </button>
                </div>
              )}
            </div>

            {coupons.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-300 rounded-xl bg-zinc-50">
                <Tag className="w-10 h-10 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-black">No coupons created yet</p>
                <p className="text-xs text-zinc-500 mt-1">Create your first promo code using the form on the left.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map((c) => {
                  const isSelected = selectedCouponIds.includes(c.id);
                  return (
                    <div 
                      key={c.id} 
                      className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                        isSelected ? 'bg-red-50/30 border-red-300' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSelectCoupon(c.id)}
                          className="cursor-pointer text-zinc-400 hover:text-black"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-black" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                          )}
                        </button>
                        <div>
                          <span className="font-mono font-bold text-black text-sm block">{c.code}</span>
                          <span className="text-xs text-zinc-500">
                            {c.discountType === 'percentage' ? `${c.value}% OFF` : `LE ${c.value} OFF`} • Min. Order: LE {c.minOrder}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeleteModal({
                          type: 'single_coupon',
                          title: 'حذف كود الخصم',
                          message: `هل أنت متأكد من حذف كود الخصم "${c.code}"؟`,
                          targetId: c.id
                        })}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Coupon"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: HERO BANNER & TOP ANNOUNCEMENT TAGS */}
      {activeTab === 'banners' && (
        <div className="space-y-8">
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-black">
                    خلفية New Arrivals والشريط العلوي (Hero Banner & Tags)
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  تحكم بكل سهولة في صورة البانر الرئيسي خلف زر New Arrivals، ونص الزر، والتاجز والإعلانات المتحركة في أعلى المتجر (مثل 20% discount).
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBannerAndAnnouncements}
                className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-full transition-all flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات وتطبيقها فوراً</span>
              </button>
            </div>

            {/* SECTION 1: HERO BANNER IMAGE & BUTTON */}
            <div className="space-y-6 mb-10">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-black" />
                  <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                    1. صورة البانر الرئيسي وزر New Arrivals
                  </h3>
                </div>
                <span className="text-[11px] bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-mono">
                  Aspect Ratio: Wide 21:9
                </span>
              </div>

              {/* Live Interactive Preview of Hero */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-black">
                  معاينة حية لشكل البانر في المتجر (Live Preview):
                </label>
                <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[3/1] max-h-[340px] min-h-[160px] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-300 shadow-inner group">
                  <img
                    src={heroBannerImageInput || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop'}
                    alt="Hero Banner Preview"
                    className="w-full h-full object-cover object-[center_35%]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2100&auto=format&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                    <button
                      type="button"
                      className="px-7 sm:px-9 py-2 sm:py-2.5 rounded-lg border border-white bg-black/40 text-white font-medium text-xs sm:text-sm tracking-wide backdrop-blur-xs shadow-md pointer-events-none"
                    >
                      {heroButtonTextInput || 'New Arrivals'}
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-md font-mono">
                    Live Store Banner View
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload or Custom Image URL */}
                <div className="space-y-4 bg-zinc-50 p-5 rounded-xl border border-zinc-200">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1.5">
                      أ. رفع صورة من جهازك (WebP Optimized):
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 hover:border-black rounded-xl p-4 bg-white cursor-pointer transition-colors text-center">
                      <Upload className="w-6 h-6 text-zinc-500 mb-1" />
                      <span className="text-xs font-bold text-black">اضغط لاختيار صورة من الكمبيوتر أو الهاتف</span>
                      <span className="text-[11px] text-zinc-400 mt-0.5">يتم تحسينها وضغطها تلقائياً لتسريع تحميل الموقع</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                        disabled={isUploadingBanner}
                      />
                    </label>
                    {bannerUploadStatus && (
                      <p className="text-xs text-amber-600 font-medium mt-1.5 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {bannerUploadStatus}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black mb-1.5">
                      ب. أو ضع رابط صورة مباشر (Image URL):
                    </label>
                    <input
                      type="url"
                      value={heroBannerImageInput}
                      onChange={(e) => setHeroBannerImageInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black mb-1.5">
                      ج. نص زر البانر (Button Text):
                    </label>
                    <input
                      type="text"
                      value={heroButtonTextInput}
                      onChange={(e) => setHeroButtonTextInput(e.target.value)}
                      placeholder="New Arrivals"
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black font-semibold focus:outline-none focus:border-black"
                    />
                    <span className="text-[11px] text-zinc-400 mt-1 block">
                      النص الظاهر فوق البانر (افتراضياً: New Arrivals أو وصل حديثاً).
                    </span>
                  </div>
                </div>

                {/* Presets Gallery */}
                <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200">
                  <label className="block text-xs font-bold text-black mb-1.5">
                    د. اختر من معرض صور MOLFET الجاهزة بنقرة واحدة:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
                    {BANNER_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setHeroBannerImageInput(preset.url);
                          showToast(`تم اختيار بانر: ${preset.name}`);
                        }}
                        className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all cursor-pointer aspect-[16/9] ${
                          heroBannerImageInput === preset.url
                            ? 'border-black ring-2 ring-black/20 shadow-md'
                            : 'border-zinc-200 hover:border-zinc-400'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] text-white font-medium truncate w-full">
                            {preset.name}
                          </span>
                        </div>
                        {heroBannerImageInput === preset.url && (
                          <div className="absolute top-1 right-1 bg-black text-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TOP ANNOUNCEMENT BAR & DISCOUNT TAGS */}
            <div className="space-y-6 pt-6 border-t border-zinc-200">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-black" />
                  <h3 className="text-sm font-bold text-black uppercase tracking-wider">
                    2. شريط التاجز والإعلانات العلوي (20% Discount / Free Shipping / Promos)
                  </h3>
                </div>
                <span className="text-[11px] bg-zinc-100 text-zinc-600 px-2.5 py-0.5 rounded-full font-mono">
                  {announcementsList.length} تاجز نشطة
                </span>
              </div>

              {/* Live Preview of Header Black Announcement Bar */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-black">
                  معاينة الشريط الأسود العلوي في المتجر (Live Announcement Bar Preview):
                </label>
                <div className="bg-black text-white py-2.5 px-4 rounded-xl flex items-center justify-between text-xs select-none shadow-md">
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementsList((prev) => {
                        if (prev.length <= 1) return prev;
                        const [first, ...rest] = prev;
                        return [...rest, first];
                      });
                    }}
                    className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Rotate Left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="text-center font-normal tracking-wide text-xs sm:text-sm">
                    <span>{announcementsList[0] || '20% Discount'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementsList((prev) => {
                        if (prev.length <= 1) return prev;
                        const last = prev[prev.length - 1];
                        const rest = prev.slice(0, -1);
                        return [last, ...rest];
                      });
                    }}
                    className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Rotate Right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add New Tag Input + Presets */}
              <div className="bg-zinc-50 p-5 rounded-xl border border-zinc-200 space-y-4">
                <label className="block text-xs font-bold text-black">
                  إضافة تاج أو رسالة إعلانية جديدة:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAnnouncementInput}
                    onChange={(e) => setNewAnnouncementInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAnnouncement();
                      }
                    }}
                    placeholder="مثال: 20% Discount أو خصم 20% لفترة محدودة أو شحن مجاني للطلبات فوق 2900 جنيه"
                    className="flex-1 bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black focus:outline-none focus:border-black font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddAnnouncement()}
                    className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة تاج +</span>
                  </button>
                </div>

                {/* Quick 1-Click Suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-500 font-medium block">
                    اقتراحات سريعة بنقرة واحدة (Quick 1-Click Tags):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ANNOUNCEMENT_PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleAddAnnouncement(preset)}
                        className="px-3 py-1 bg-white hover:bg-zinc-200 border border-zinc-200 rounded-full text-[11px] font-medium text-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-zinc-400" />
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Announcements List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-black">
                    التاجز النشطة حالياً في الشريط المتحرك ({announcementsList.length}):
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementsList([
                        'Shop our latest arrivals!',
                        'FREE SHIPPING FOR ORDERS OVER 2900 LE',
                        '20% Discount'
                      ]);
                      showToast('تم استعادة التاجز الافتراضية');
                    }}
                    className="text-[11px] text-zinc-500 hover:text-black underline cursor-pointer"
                  >
                    استعادة التاجز الافتراضية
                  </button>
                </div>

                <div className="space-y-2">
                  {announcementsList.map((tag, idx) => {
                    const isEditing = editingAnnouncementIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>

                          {isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={editingAnnouncementText}
                                onChange={(e) => setEditingAnnouncementText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditedAnnouncement(idx);
                                }}
                                className="flex-1 bg-zinc-50 border border-zinc-300 rounded-lg p-2 text-xs text-black focus:outline-none focus:border-black"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditedAnnouncement(idx)}
                                className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-zinc-800"
                              >
                                حفظ
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAnnouncementIdx(null);
                                  setEditingAnnouncementText('');
                                }}
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-600 text-xs rounded-lg hover:bg-zinc-200"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-black tracking-wide">
                              {tag}
                            </span>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveAnnouncement(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveAnnouncement(idx, 'down')}
                              disabled={idx === announcementsList.length - 1}
                              className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAnnouncementIdx(idx);
                                setEditingAnnouncementText(tag);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg cursor-pointer"
                              title="Edit Tag"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAnnouncement(idx)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete Tag"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Save Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveBannerAndAnnouncements}
                  disabled={isSavingBanner}
                  className="w-full sm:w-auto px-8 py-3 bg-black hover:bg-zinc-800 text-white font-bold text-sm rounded-full transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSavingBanner ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ في قاعدة البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ وتطبيق جميع تعديلات البانر والتاجز في قاعدة البيانات</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SOCIAL MEDIA LINKS MANAGEMENT */}
      {activeTab === 'social' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
                    <span>إدارة روابط ومنصات السوشيال ميديا</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      {socialLinksList.filter((l) => l.isActive).length} نشط
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    أضف، عدّل، وتحكم في جميع أزرار وحسابات التواصل الاجتماعي التي تظهر لعملائك في أسفل المتجر والقائمة الجانبية.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaultSocialLinks}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSocialLinks()}
                  disabled={isSavingSocial}
                  className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingSocial ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ جميع الروابط</span>
                </button>
              </div>
            </div>

            {/* Permanent file explanation banner */}
            <div className="mt-6 p-4 rounded-xl border text-xs bg-zinc-50 border-zinc-200 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-2.5">
                  <FileCode className="w-5 h-5 text-black shrink-0 mt-0.5" />
                  <div className="text-right sm:text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-black text-xs block">
                        📁 ملف الروابط المحفوظ دائماً بالموقع: <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-900">src/data/socialLinksConfig.ts</code>
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        محفوظ بملفات الموقع
                      </span>
                    </div>
                    <p className="text-zinc-600 text-[11px] mt-1 leading-relaxed">
                      جميع أزرار السوشيال ميديا (تيك توك، فيسبوك، إنستجرام، واتساب) يتم تضمينها وحفظها مباشرة داخل ملفات الموقع البرمجية <code className="font-mono bg-zinc-100 px-1">socialLinksConfig.ts</code>، مما يضمن ثباتها الدائم واستمرار عملها حتى بعد إعادة تحميل الصفحة أو فتح المتجر من أي جهاز.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const tsContent = `import { SocialLink } from '../types';

export const SOCIAL_LINKS_CONFIG: SocialLink[] = ${JSON.stringify(socialLinksList, null, 2)};

export default SOCIAL_LINKS_CONFIG;
`;
                    navigator.clipboard.writeText(tsContent);
                    showToast('تم نسخ كود ملف socialLinksConfig.ts بالكامل إلى الحافظة!');
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ كود ملف socialLinksConfig.ts</span>
                </button>
              </div>
            </div>

            {/* Quick Preset Badges */}
            <div className="mt-6">
              <label className="block text-xs font-bold text-zinc-700 mb-2">
                إضافة سريعة حسب المنصة (انقر لاختيار المنصة وتعبئة النموذج):
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { platform: 'whatsapp' as const, label: 'واتساب', color: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' },
                  { platform: 'instagram' as const, label: 'إنستجرام', color: 'hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300' },
                  { platform: 'tiktok' as const, label: 'تيك توك', color: 'hover:bg-zinc-100 hover:text-black hover:border-black' },
                  { platform: 'facebook' as const, label: 'فيسبوك', color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300' },
                  { platform: 'telegram' as const, label: 'تليجرام', color: 'hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300' },
                  { platform: 'youtube' as const, label: 'يوتيوب', color: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300' },
                  { platform: 'snapchat' as const, label: 'سناب شات', color: 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300' },
                  { platform: 'twitter' as const, label: 'X / تويتر', color: 'hover:bg-zinc-100 hover:text-black hover:border-zinc-400' },
                  { platform: 'threads' as const, label: 'ثريدز', color: 'hover:bg-zinc-100 hover:text-black hover:border-black' },
                  { platform: 'pinterest' as const, label: 'بينترست', color: 'hover:bg-red-50 hover:text-red-700 hover:border-red-300' },
                  { platform: 'linkedin' as const, label: 'لينكد إن', color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300' },
                  { platform: 'website' as const, label: 'رابط مخصص / موقع', color: 'hover:bg-zinc-100 hover:text-black hover:border-zinc-400' },
                ].map((item) => (
                  <button
                    key={item.platform}
                    type="button"
                    onClick={() => handleSelectPresetPlatform(item.platform)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer bg-white border-zinc-200 text-zinc-700 ${item.color}`}
                  >
                    <SocialIcon platform={item.platform} className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Add / Edit Form Card */}
            <div id="social-link-form" className="mt-6 bg-[var(--mf-surface-soft)] border border-zinc-200 rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-black text-white rounded-lg">
                    {editingSocialLinkId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="font-bold text-sm text-black">
                    {editingSocialLinkId ? 'تعديل بيانات الرابط المختار' : 'إضافة زر سوشيال ميديا جديد'}
                  </h3>
                </div>

                {editingSocialLinkId && (
                  <button
                    type="button"
                    onClick={handleCancelEditSocialLink}
                    className="text-xs text-zinc-500 hover:text-black underline cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <form onSubmit={handleAddOrUpdateSocialLink} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Platform Selector */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      المنصة / نوع الرابط <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={socialFormPlatform}
                      onChange={(e) => {
                        const plat = e.target.value as SocialPlatform;
                        setSocialFormPlatform(plat);
                        if (!socialFormTitle) {
                          const defaultTitleMap: Record<SocialPlatform, string> = {
                            facebook: 'Facebook',
                            instagram: 'Instagram',
                            tiktok: 'TikTok',
                            whatsapp: 'WhatsApp',
                            telegram: 'Telegram',
                            youtube: 'YouTube',
                            x: 'X (Twitter)',
                            twitter: 'X (Twitter)',
                            snapchat: 'Snapchat',
                            pinterest: 'Pinterest',
                            threads: 'Threads',
                            linkedin: 'LinkedIn',
                            website: 'Website',
                            custom: 'Link',
                          };
                          setSocialFormTitle(defaultTitleMap[plat] || 'Link');
                        }
                      }}
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black focus:outline-none focus:border-black"
                    >
                      <option value="instagram">Instagram (إنستجرام)</option>
                      <option value="tiktok">TikTok (تيك توك)</option>
                      <option value="whatsapp">WhatsApp (واتساب)</option>
                      <option value="facebook">Facebook (فيسبوك)</option>
                      <option value="telegram">Telegram (تليجرام)</option>
                      <option value="youtube">YouTube (يوتيوب)</option>
                      <option value="twitter">X / Twitter (تويتر)</option>
                      <option value="snapchat">Snapchat (سناب شات)</option>
                      <option value="threads">Threads (ثريدز)</option>
                      <option value="pinterest">Pinterest (بينترست)</option>
                      <option value="linkedin">LinkedIn (لينكد إن)</option>
                      <option value="website">Custom Website (موقع إلكتروني)</option>
                      <option value="custom">Other Link (رابط آخر)</option>
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      اسم الحساب / العنوان الظاهر (Title)
                    </label>
                    <input
                      type="text"
                      value={socialFormTitle}
                      onChange={(e) => setSocialFormTitle(e.target.value)}
                      placeholder="e.g. MOLFET Official"
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black focus:outline-none focus:border-black"
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-800 mb-1">
                      الرابط أو اسم المستخدم (URL / Handle) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={socialFormUrl}
                      onChange={(e) => setSocialFormUrl(e.target.value)}
                      placeholder={
                        socialFormPlatform === 'whatsapp'
                          ? '201012345678 or https://wa.me/...'
                          : socialFormPlatform === 'instagram'
                          ? 'molfet.eg or https://instagram.com/...'
                          : socialFormPlatform === 'tiktok'
                          ? '@molfet.eg or https://tiktok.com/...'
                          : 'https://...'
                      }
                      required
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                </div>

                {/* Toggles & Submit */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={socialFormIsActive}
                        onChange={(e) => setSocialFormIsActive(e.target.checked)}
                        className="rounded text-black focus:ring-black h-4 w-4"
                      />
                      <span className="text-xs font-medium text-zinc-800">
                        تفعيل الزر وعرضه في المتجر (Active)
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={socialFormOpenInNewTab}
                        onChange={(e) => setSocialFormOpenInNewTab(e.target.checked)}
                        className="rounded text-black focus:ring-black h-4 w-4"
                      />
                      <span className="text-xs font-medium text-zinc-800">
                        فتح في علامة تبويب جديدة (New Tab)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingSocialLinkId && (
                      <button
                        type="button"
                        onClick={handleCancelEditSocialLink}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {editingSocialLinkId ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>تحديث الزر</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>إضافة الزر للقائمة</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Configured Social Links */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-black flex items-center gap-2">
                  <span>الأزرار والروابط المضافة حالياً ({socialLinksList.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-500">
                  يمكنك إعادة ترتيب الأزرار باستخدام أسهم الصعود والنزول
                </span>
              </div>

              {socialLinksList.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 space-y-3">
                  <Share2 className="w-8 h-8 text-zinc-400 mx-auto" />
                  <p className="text-xs text-zinc-600 font-medium">
                    لم تقم بإضافة أي أزرار سوشيال ميديا بعد.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetDefaultSocialLinks}
                    className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    استعادة الأزرار الافتراضية
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {socialLinksList.map((link, idx) => (
                    <div
                      key={link.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        link.isActive
                          ? 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                          : 'bg-zinc-50/70 border-zinc-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Icon Badge */}
                        <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <SocialIcon platform={link.platform} className="w-5 h-5" />
                        </div>

                        {/* Text info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-black truncate">
                              {link.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold uppercase">
                              {link.platform}
                            </span>
                            {link.isActive ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                ظاهر في المتجر
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600 font-semibold">
                                مخفي
                              </span>
                            )}
                          </div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-zinc-500 hover:text-black font-mono truncate block max-w-[280px] sm:max-w-[420px] transition-colors mt-0.5"
                          >
                            {link.url}
                          </a>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveSocialLink(idx, 'up')}
                          disabled={idx === 0}
                          className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg disabled:opacity-30 cursor-pointer"
                          title="نقل لأعلى"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveSocialLink(idx, 'down')}
                          disabled={idx === socialLinksList.length - 1}
                          className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg disabled:opacity-30 cursor-pointer"
                          title="نقل لأسفل"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Toggle Active */}
                        <button
                          type="button"
                          onClick={() => handleToggleSocialLinkActive(link.id)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            link.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                          title={link.isActive ? 'إخفاء من المتجر' : 'إظهار في المتجر'}
                        >
                          {link.isActive ? 'إخفاء' : 'إظهار'}
                        </button>

                        {/* Test External Link */}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                          title="تجربة الرابط"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleEditSocialLink(link)}
                          className="p-2 text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSocialLink(link.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Explicit Save to Database Button */}
              {socialLinksList.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-200 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSaveSocialLinks()}
                    disabled={isSavingSocial}
                    className="px-6 py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {isSavingSocial ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ في قاعدة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>حفظ وتثبيت كافة روابط السوشيال ميديا في قاعدة البيانات</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    يتم الحفظ تلقائياً عند إضافة أو تعديل أو تغيير حالة أي زر
                  </span>
                </div>
              )}
            </div>

            {/* Live Storefront Mockup Preview */}
            <div className="mt-10 pt-6 border-t border-zinc-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-zinc-700" />
                  <h4 className="text-xs font-bold text-zinc-800">
                    معاينة حية لشكل الأزرار كما تظهر للعملاء في أسفل المتجر (Footer Preview):
                  </h4>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {socialLinksList.filter((l) => l.isActive).length} أزرار نشطة
                </span>
              </div>

              <div className="bg-black rounded-2xl p-6 sm:p-8 text-center text-white space-y-4">
                <p className="text-xs text-zinc-400 font-medium">Join our social community</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {socialLinksList.filter((l) => l.isActive).length === 0 ? (
                    <span className="text-xs text-zinc-500 italic">لا توجد أزرار نشطة حالياً</span>
                  ) : (
                    socialLinksList
                      .filter((l) => l.isActive)
                      .map((link) => (
                        <div
                          key={link.id}
                          className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-500 flex items-center justify-center transition-all shadow-xs cursor-default"
                          title={link.title}
                        >
                          <SocialIcon platform={link.platform} className="w-5 h-5" />
                        </div>
                      ))
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  © {new Date().getFullYear()} MOLFET
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: STORE & SUPABASE SETTINGS */}
      {/* Shopify connection — the storefront reads products, cart and checkout from here */}
      {activeTab === 'settings' && (
        <ShopifyConnectionPanel />
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supabase Connection Setup */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-black" />
                <div>
                  <h3 className="text-base font-bold text-black">ربط قاعدة بيانات Supabase الدائمة</h3>
                  <span className="text-[11px] text-zinc-500">Permanent Database Connection</span>
                </div>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-1.5">
                {getSupabaseConfig().source === 'file' && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full flex items-center gap-1 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    محفوظ بملف التكوين الدائم
                  </span>
                )}
                {getSupabaseConfig().source === 'env' && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full flex items-center gap-1 border border-blue-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    متغيرات البيئة (.env)
                  </span>
                )}
                {getSupabaseConfig().source === 'storage' && (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full flex items-center gap-1 border border-amber-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تخزين المتصفح المحلي
                  </span>
                )}
                {getSupabaseConfig().source === 'none' && (
                  <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 text-[11px] font-bold rounded-full flex items-center gap-1 border border-zinc-300">
                    غير متصل
                  </span>
                )}
              </div>
            </div>

            {/* Permanent file explanation banner */}
            <div className="mb-4 p-3.5 rounded-xl border text-xs bg-zinc-50 border-zinc-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <FileCode className="w-5 h-5 text-black shrink-0 mt-0.5" />
                <div className="flex-1 text-right sm:text-left">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-black text-xs block">
                      📁 ملف التكوين المحفوظ دائماً: <code className="bg-zinc-200 px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-900">src/lib/supabaseConfig.ts</code>
                    </span>
                  </div>
                  <p className="text-zinc-600 text-[11px] mt-1 leading-relaxed">
                    تم إعداد ملف دائم داخل المشروع <code className="font-mono bg-zinc-100 px-1">supabaseConfig.ts</code> بحيث يمكنك كتابة الرابط ومفتاح الـ Anon Key مرة واحدة فقط ويبقى محفوظاً للأبد عبر كافة الأجهزة والمتصفحات دون الحاجة لإعادة كتابته!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-black mb-1">رابط المشروع (Supabase Project URL)</label>
                <input
                  type="text"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 font-mono text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">مفتاح الوصول (Supabase Anon Public Key)</label>
                <input
                  type="password"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 font-mono text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    configureSupabase(supabaseUrlInput, supabaseKeyInput);
                    showToast('تم حفظ إعدادات Supabase بنجاح!');
                  }}
                  className="flex-1 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold rounded-full transition-colors cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ وتفعيل الاتصال</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsTestingConnection(true);
                    setConnectionTestResult(null);
                    try {
                      if (supabaseUrlInput !== getSupabaseConfig().url || supabaseKeyInput !== getSupabaseConfig().anonKey) {
                        configureSupabase(supabaseUrlInput, supabaseKeyInput);
                      }
                      const result = await testSupabaseConnection();
                      setConnectionTestResult(result);
                      if (result.success) {
                        showToast('تم الاتصال بقاعدة البيانات بنجاح وجميع الجداول جاهزة!');
                      }
                    } catch (e: any) {
                      setConnectionTestResult({
                        success: false,
                        message: e?.message || 'فشل الاتصال',
                        source: getSupabaseConfig().source,
                        tables: { products: false, orders: false, coupons: false, store_settings: false },
                      });
                    } finally {
                      setIsTestingConnection(false);
                    }
                  }}
                  disabled={isTestingConnection || !supabaseUrlInput.trim()}
                  className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  <span>{isTestingConnection ? 'جاري الفحص...' : 'فحص الاتصال'}</span>
                </button>
              </div>

              {/* Live Connection Diagnostics */}
              {connectionTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    connectionTestResult.success
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {connectionTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 w-full">
                      <p className="font-bold">{connectionTestResult.message}</p>
                      {connectionTestResult.tables && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className={connectionTestResult.tables.products ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {connectionTestResult.tables.products ? '✓ جدول المنتجات (products)' : '✗ جدول المنتجات مفقود'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={connectionTestResult.tables.orders ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {connectionTestResult.tables.orders ? '✓ جدول الطلبات (orders)' : '✗ جدول الطلبات مفقود'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={connectionTestResult.tables.coupons ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {connectionTestResult.tables.coupons ? '✓ جدول الكوبونات (coupons)' : '✗ جدول الكوبونات مفقود'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={connectionTestResult.tables.store_settings ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {connectionTestResult.tables.store_settings ? '✓ جدول الإعدادات (store_settings)' : '✗ جدول الإعدادات مفقود'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Copy Config File Snippet & Schema.sql */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800">أدوات الربط السريع وقاعدة البيانات:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = `export const SUPABASE_CONFIG = {\n  supabaseUrl: '${supabaseUrlInput.trim()}',\n  supabaseAnonKey: '${supabaseKeyInput.trim()}',\n  storageBucket: 'product-images',\n};`;
                      navigator.clipboard.writeText(snippet);
                      showToast('تم نسخ كود ملف src/lib/supabaseConfig.ts إلى الحافظة!');
                    }}
                    className="p-2 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-zinc-700 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ كود ملف التكوين</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      fetch('/src/data/schema.sql')
                        .then((res) => res.text())
                        .then((sql) => {
                          navigator.clipboard.writeText(sql);
                          showToast('تم نسخ كود schema.sql بالكامل إلى الحافظة!');
                        })
                        .catch(() => {
                          showToast('يمكنك العثور على ملف schema.sql في المجلد الرئيسي');
                        });
                    }}
                    className="p-2 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-zinc-700 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>نسخ كود schema.sql</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleSeedInitialCatalog}
                  disabled={isSeeding}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{isSeeding ? 'جاري تصدير المنتجات...' : 'تصدير المنتجات الافتراضية إلى قاعدة البيانات (Seed Catalog)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Store General Settings & Payment Methods */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-black" />
                <div>
                  <h3 className="text-base font-bold text-black">بيانات المتجر والشحن والدفع</h3>
                  <span className="text-[11px] text-zinc-500">Store Identity, Shipping Rates & Payment Details</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Store Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">اسم المتجر (Store Name)</label>
                  <input
                    type="text"
                    value={settingsForm.storeName || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                    placeholder="MOLFET FOR FASHON"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">شعار البراند (Tagline / Slogan)</label>
                  <input
                    type="text"
                    value={settingsForm.tagline || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                    placeholder="MOLFET FOR FASHON"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-black mb-1">رقم خدمة العملاء (Phone)</label>
                  <input
                    type="text"
                    value={settingsForm.phone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    placeholder="+201012345678"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-black mb-1">رقم الواتساب الرئيسي (WhatsApp)</label>
                  <input
                    type="text"
                    value={settingsForm.whatsapp || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    placeholder="201012345678"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Shipping Rates */}
              <div className="pt-3 border-t border-zinc-200 space-y-3">
                <h4 className="font-bold text-black text-sm flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-black" />
                  <span>أسعار الشحن والشحن المجاني</span>
                </h4>

                <div>
                  <label className="block font-bold text-black mb-1">الحد الأدنى للشحن المجاني (Free Shipping Threshold LE)</label>
                  <input
                    type="number"
                    value={settingsForm.freeShippingThreshold}
                    onChange={(e) => setSettingsForm({ ...settingsForm, freeShippingThreshold: Number(e.target.value) })}
                    placeholder="1500"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-500 block mt-0.5">الطلبات التي تتجاوز هذا المبلغ تحصل على شحن مجاني تلقائياً.</span>
                </div>

                {/* BREAK THE FRAME — theme settings (slogan, Lens switch, look discount) */}
                <div className="pt-3 border-t border-zinc-200 space-y-3">
                  <h4 className="font-bold text-black text-sm">هوية "Break the Frame"</h4>

                  <div>
                    <label className="block font-bold text-black mb-1">نص الشعار (Slogan Text)</label>
                    <input
                      type="text"
                      value={settingsForm.slogan ?? 'Style Without Limits'}
                      onChange={(e) => setSettingsForm({ ...settingsForm, slogan: e.target.value })}
                      placeholder="Style Without Limits"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-500 block mt-0.5">
                      الشعار الرسمي "Style Without Limits" ويظهر في الهيرو وشريط الإعلانات والفوتر واللودر والسلة الفارغة وصفحة 404.
                    </span>
                  </div>

                  <label className="flex items-center justify-between gap-3 border border-zinc-200 rounded-lg p-3 cursor-pointer">
                    <span>
                      <span className="block font-bold text-black">تشغيل العدسة (The Lens)</span>
                      <span className="block text-[11px] text-zinc-500">
                        مؤشر الفرشاة على الديسكتوب، ويُفتح دائرة تعرض الرسم الإيطالي وتفاصيل القماش.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settingsForm.lensEnabled !== false}
                      onChange={(e) => setSettingsForm({ ...settingsForm, lensEnabled: e.target.checked })}
                      className="w-5 h-5 accent-black"
                    />
                  </label>

                  <div>
                    <label className="block font-bold text-black mb-1">خصم الإطلالة (٣ قطع أو أكثر) %</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={settingsForm.lookDiscountPercent ?? 10}
                      onChange={(e) => setSettingsForm({ ...settingsForm, lookDiscountPercent: Number(e.target.value) })}
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                    <span className="text-[11px] text-zinc-500 block mt-0.5">تُستخدم في رسالة الخصم التلقائي داخل Limitless Mix.</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-black mb-1">شحن الإسكندرية (ج.م)</label>
                    <input
                      type="number"
                      value={settingsForm.alexShipping ?? settingsForm.defaultShippingFee ?? 60}
                      onChange={(e) => setSettingsForm({ ...settingsForm, alexShipping: Number(e.target.value), defaultShippingFee: Number(e.target.value) })}
                      placeholder="60"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-black mb-1">شحن القاهرة والجيزة (ج.م)</label>
                    <input
                      type="number"
                      value={settingsForm.cairoGizaShipping ?? 50}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cairoGizaShipping: Number(e.target.value) })}
                      placeholder="50"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-black mb-1">شحن محافظات وجه بحري (ج.م)</label>
                    <input
                      type="number"
                      value={settingsForm.deltaShipping ?? 50}
                      onChange={(e) => setSettingsForm({ ...settingsForm, deltaShipping: Number(e.target.value) })}
                      placeholder="50"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-black mb-1">شحن محافظات وجه قبلي (ج.م)</label>
                    <input
                      type="number"
                      value={settingsForm.upperEgyptShipping ?? 60}
                      onChange={(e) => setSettingsForm({ ...settingsForm, upperEgyptShipping: Number(e.target.value) })}
                      placeholder="60"
                      className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods Config (InstaPay & Vodafone Cash) */}
              <div className="pt-3 border-t border-zinc-200 space-y-3">
                <h4 className="font-bold text-black text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-700" />
                  <span>إعدادات الدفع الإلكتروني (إنستاباي وفودافون كاش)</span>
                </h4>
                
                <div>
                  <label className="block font-bold text-zinc-800 mb-1">عنوان إنستاباي (InstaPay Address / IPA)</label>
                  <input
                    type="text"
                    value={settingsForm.instapayAddress || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instapayAddress: e.target.value })}
                    placeholder="e.g. molfet@instapay"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-zinc-500 block mt-0.5">يظهر للعميل في شاشة الدفع عند اختيار InstaPay.</span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-800 mb-1">رقم هاتف إنستاباي (InstaPay Phone Number)</label>
                  <input
                    type="text"
                    value={settingsForm.instapayPhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instapayPhone: e.target.value })}
                    placeholder="01012345678"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-800 mb-1">رقم محفظة فودافون كاش (Vodafone Cash Number)</label>
                  <input
                    type="text"
                    value={settingsForm.vodafoneCashNumber || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, vodafoneCashNumber: e.target.value })}
                    placeholder="01012345678"
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none font-mono"
                  />
                  <span className="text-[11px] text-zinc-500 block mt-0.5">يظهر للعميل لتحويل قيمة الطلب لمحفظتك.</span>
                </div>

                <div>
                  <label className="block font-bold text-zinc-800 mb-1">تعليمات الدفع والتحويل للعميل (Payment Instructions)</label>
                  <textarea
                    rows={2}
                    value={settingsForm.paymentInstructions || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, paymentInstructions: e.target.value })}
                    placeholder="يرجى تحويل المبلغ الإجمالي إلى العنوان أو الرقم أعلاه ورفع سكرين شوت بالتحويل لتأكيد الطلب فوراً."
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Mobile Phone Alerts System (Telegram Bot, Webhook & Push) */}
              <div className="pt-4 border-t border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-black text-sm">إشعارات الهاتف عند وصول طلب جديد (حتى والموقع مغلق)</h4>
                      <p className="text-[11px] text-zinc-500">تصلك رسالة فورية مع صوت رنين عالي على هاتفك بمجرد قيام أي عميل بطلب جديد</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTelegramGuide(prev => !prev)}
                    className="text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showTelegramGuide ? 'إخفاء الشرح' : 'طريقة الربط في دقيقة'}</span>
                  </button>
                </div>

                {/* Telegram Step-by-Step Guide Accordion */}
                {showTelegramGuide && (
                  <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-950 space-y-2">
                    <p className="font-bold text-sky-900 flex items-center gap-1.5">
                      <span>🚀 طريقة استقبال التنبيهات على تطبيق Telegram في هاتفك مجاناً:</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 pr-2 text-zinc-800">
                      <li>
                        افتح تطبيق Telegram على هاتفك وابحث عن <strong className="text-black font-mono">@BotFather</strong> واضغط Start ثم أرسل له أمر <code className="bg-white px-1.5 py-0.5 rounded border border-zinc-300 font-mono">/newbot</code> واختر اسماً للبوت، وسيعطيك <strong className="text-sky-700">Bot Token</strong>.
                      </li>
                      <li>
                        ابحث في تليجرام عن <strong className="text-black font-mono">@userinfobot</strong> أو <strong className="text-black font-mono">@getmyid_bot</strong> واضغط Start لتعرف الـ <strong className="text-sky-700">Chat ID</strong> الخاص برقمك.
                      </li>
                      <li>
                        الصق الـ <strong className="font-bold">Token</strong> والـ <strong className="font-bold">Chat ID</strong> في الحقول أدناه، واضغط <strong>"إرسال تنبيه تجريبي"</strong> وستصلك رسالة فوراً على موبايلك!
                      </li>
                    </ol>
                  </div>
                )}

                {/* Telegram Bot Config Card */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-zinc-900 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.enableTelegramNotifications ?? true}
                        onChange={(e) => setSettingsForm({ ...settingsForm, enableTelegramNotifications: e.target.checked })}
                        className="rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                      />
                      <span>تفعيل إشعارات تيليجرام على الهاتف (Telegram Bot Alerts)</span>
                    </label>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      فوري ومجاني 100%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Telegram Bot Token
                      </label>
                      <input
                        type="text"
                        value={settingsForm.telegramBotToken || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegramBotToken: e.target.value })}
                        placeholder="مثال: 7123456789:AAFq_xxx..."
                        className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs focus:outline-none font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Telegram Chat ID
                      </label>
                      <input
                        type="text"
                        value={settingsForm.telegramChatId || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telegramChatId: e.target.value })}
                        placeholder="مثال: 123456789"
                        className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs focus:outline-none font-mono"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestTelegramAlert}
                      disabled={isTestingTelegram || !settingsForm.telegramBotToken || !settingsForm.telegramChatId}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                    >
                      {isTestingTelegram ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري إرسال التنبيه للهاتف...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>إرسال تنبيه تجريبي للهاتف 📱</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Custom Webhook (Discord / Slack / Make / WhatsApp Gateway) */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-zinc-900 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.enableWebhookNotifications ?? true}
                        onChange={(e) => setSettingsForm({ ...settingsForm, enableWebhookNotifications: e.target.checked })}
                        className="rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
                      />
                      <span>تفعيل تنبيهات Webhook المخصصة (Discord / WhatsApp Gateway / Zapier)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Webhook Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={settingsForm.mobileWebhookUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, mobileWebhookUrl: e.target.value })}
                      placeholder="https://discord.com/api/webhooks/... أو رابط سيرفرك"
                      className="w-full bg-white border border-zinc-300 rounded-lg p-2 text-xs focus:outline-none font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestWebhookAlert}
                      disabled={isTestingWebhook || !settingsForm.mobileWebhookUrl}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-black text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                    >
                      {isTestingWebhook ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الاختبار...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-3.5 h-3.5" />
                          <span>تجربة الـ Webhook</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('social')}
                  className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200"
                >
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>إدارة أزرار السوشيال ميديا والتواصل ({socialLinksList.filter(l => l.isActive).length} نشط)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('banners')}
                  className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer mb-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>تعديل صورة New Arrivals والتاجز العلوية</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveStoreSettings}
                disabled={isSavingSettings}
                className="w-full py-3 bg-black hover:bg-zinc-800 text-white font-bold rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isSavingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ وتثبيت الإعدادات في قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ وتثبيت إعدادات المتجر في قاعدة البيانات</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Admin Passkey & Security Settings */}
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-black" />
                <h3 className="text-base font-bold text-black">Passkey & Security</h3>
              </div>
              <span className="text-[10px] bg-zinc-100 text-zinc-700 font-mono px-2 py-0.5 rounded-md font-semibold">
                Protected
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Biometric Passkey Registration */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-black">
                    <Fingerprint className="w-4 h-4 text-emerald-600" />
                    <span>Device Passkey (Biometrics)</span>
                  </div>
                  {hasRegisteredPasskey ? (
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Active on device
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Not registered</span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Register your device Face ID, Touch ID, or screen lock for instant 1-tap admin login.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setIsRegisteringDevicePasskey(true);
                    setPasskeyMsg(null);
                    try {
                      if (!window.PublicKeyCredential) {
                        throw new Error('WebAuthn Passkeys not supported');
                      }
                      const challenge = new Uint8Array(32);
                      window.crypto.getRandomValues(challenge);
                      const userId = new Uint8Array(16);
                      window.crypto.getRandomValues(userId);
                      const credential = await navigator.credentials.create({
                        publicKey: {
                          challenge,
                          rp: { name: 'MOLFET FOR FASHON Admin', id: window.location.hostname || undefined },
                          user: { id: userId, name: 'admin@molfet.com', displayName: 'MOLFET FOR FASHON Admin' },
                          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
                          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'preferred', residentKey: 'preferred' },
                          timeout: 60000,
                        },
                      }) as PublicKeyCredential | null;
                      if (credential) {
                        localStorage.setItem('molfet_webauthn_passkey', credential.id);
                        setHasRegisteredPasskey(true);
                        setPasskeyMsg({ text: 'Device Biometric Passkey registered successfully!', type: 'success' });
                        showToast('Device Passkey registered');
                      }
                    } catch (err) {
                      console.warn(err);
                      setPasskeyMsg({ text: 'Could not register device passkey. You can always use the Passkey PIN.', type: 'error' });
                    } finally {
                      setIsRegisteringDevicePasskey(false);
                    }
                  }}
                  disabled={isRegisteringDevicePasskey}
                  className="w-full py-2 bg-zinc-900 hover:bg-black text-white font-medium rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{hasRegisteredPasskey ? 'Update Device Passkey' : 'Register Device Passkey'}</span>
                </button>
              </div>

              {/* Passkey PIN Change */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminPasskeyInput.trim()) {
                    setPasskeyMsg({ text: 'Please enter a valid passkey PIN', type: 'error' });
                    return;
                  }
                  if (adminPasskeyInput !== confirmAdminPasskeyInput) {
                    setPasskeyMsg({ text: 'Passkeys do not match', type: 'error' });
                    return;
                  }
                  localStorage.setItem('molfet_admin_passkey', adminPasskeyInput.trim());
                  setPasskeyMsg({ text: 'Passkey PIN updated successfully!', type: 'success' });
                  setAdminPasskeyInput('');
                  setConfirmAdminPasskeyInput('');
                  showToast('Passkey PIN updated');
                }}
                className="space-y-3 pt-1"
              >
                <div className="flex items-center gap-1.5 font-bold text-black">
                  <Key className="w-4 h-4 text-zinc-600" />
                  <span>Change Passkey PIN / Password</span>
                </div>
                <div>
                  <label className="block text-zinc-600 text-[11px] mb-1">New Passkey PIN</label>
                  <input
                    type="password"
                    value={adminPasskeyInput}
                    onChange={(e) => setAdminPasskeyInput(e.target.value)}
                    placeholder="Enter new passkey"
                    required
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 font-mono text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 text-[11px] mb-1">Confirm Passkey PIN</label>
                  <input
                    type="password"
                    value={confirmAdminPasskeyInput}
                    onChange={(e) => setConfirmAdminPasskeyInput(e.target.value)}
                    placeholder="Confirm new passkey"
                    required
                    className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg p-2.5 font-mono text-xs focus:outline-none"
                  />
                </div>

                {passkeyMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                      passkeyMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {passkeyMsg.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{passkeyMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-black hover:bg-zinc-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Save Passkey PIN
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-white border border-[var(--mf-hairline)] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 mb-6">
              <div>
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  <span>إدارة تصنيفات المتجر (Store Categories)</span>
                  <span className="bg-black text-white text-xs px-2.5 py-0.5 rounded-full font-mono">
                    {categories.length}
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  أضف وعدّل تصنيفات المنتجات (مثل تيشيرت، هوديز، شورتات، قمصان). يتم إنشاء المعرف والرابط المختصر تلقائياً وبدون الحاجة لصور.
                </p>
              </div>

              {editingCategoryId && (
                <button
                  onClick={handleResetCategoryForm}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء التعديل والبدء بتصنيف جديد
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-5 bg-[var(--mf-surface-soft)] border border-zinc-200 rounded-2xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
                  <span className="text-sm font-bold text-black flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-emerald-600" />
                    <span>{editingCategoryId ? 'تعديل بيانات التصنيف' : 'إضافة تصنيف جديد'}</span>
                  </span>
                  {editingCategoryId && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                      وضع التعديل
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">
                      اسم التصنيف بالعربية (Arabic Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryFormNameAr}
                      onChange={(e) => {
                        setCategoryFormNameAr(e.target.value);
                        if (!categoryFormNameEn && !editingCategoryId) {
                          // Simple transliteration helper or default
                        }
                      }}
                      placeholder="مثال: تيشيرت، هوديز، شورتات، جاكيتات..."
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-black focus:outline-none focus:border-black text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">
                      اسم التصنيف بالإنجليزية (English Name)
                    </label>
                    <input
                      type="text"
                      value={categoryFormNameEn}
                      onChange={(e) => setCategoryFormNameEn(e.target.value)}
                      placeholder="e.g. T-Shirts, Hoodies, Shorts..."
                      className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-xs font-medium text-black focus:outline-none focus:border-black"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      (اختياري - يتم استخدامه للواجهة الإنجليزية وتوليد المعرف تلقائياً)
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-100/80 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-800">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>المعرف والرابط (Slug) يتم إنشاؤه تلقائياً</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      لا حاجة لكتابة أي روابط أو معرفات، سيتم الربط آلياً مع فلاتر المتجر وقائمة المنتجات.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                    >
                      {isSavingCategory ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري حفظ التصنيف...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{editingCategoryId ? 'حفظ تعديلات التصنيف' : 'إضافة التصنيف الآن'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Column */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700">قائمة التصنيفات النشطة ({categories.length})</span>
                  <span className="text-[11px] text-zinc-500">استخدم الأسهم للترتيب</span>
                </div>

                <div className="space-y-2.5">
                  {categories.map((cat, idx) => {
                    const productCount = products.filter((p) => {
                      if (cat.id === 'sale') return (p.compareAtPrice && p.compareAtPrice > p.price) || p.badge === 'SALE';
                      if (cat.id === 'all') return true;
                      const pCat = (p.category || '').toLowerCase().trim();
                      return pCat === cat.id.toLowerCase() || pCat === (cat.slug || '').toLowerCase();
                    }).length;

                    const isSpecial = cat.id === 'all';

                    return (
                      <div
                        key={cat.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          editingCategoryId === cat.id
                            ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                            : 'bg-white border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Category Tag Icon */}
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 shrink-0 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-zinc-600" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-black">{cat.nameAr}</span>
                              {cat.nameEn && cat.nameEn !== cat.nameAr && (
                                <span className="text-xs text-zinc-500 font-sans-eng font-medium">({cat.nameEn})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                                {productCount} منتج
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {/* Move Buttons */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveCategory(idx, 'up')}
                            className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-md disabled:opacity-30 cursor-pointer transition-colors"
                            title="تحريك لأعلى"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === categories.length - 1}
                            onClick={() => handleMoveCategory(idx, 'down')}
                            className="p-1.5 text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-md disabled:opacity-30 cursor-pointer transition-colors"
                            title="تحريك لأسفل"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleEditCategory(cat)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                            title="تعديل هذا التصنيف"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          {!isSpecial ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModal({
                                  type: 'single_category',
                                  title: `حذف التصنيف "${cat.nameAr || cat.nameEn}"`,
                                  message: `هل أنت متأكد من حذف تصنيف "${cat.nameAr || cat.nameEn}"؟ لن يتم مسح المنتجات المسجلة به.`,
                                  targetId: cat.id,
                                });
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                              title="حذف هذا التصنيف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-semibold px-2 py-1 bg-zinc-100 rounded">
                              رئيسي
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CATEGORY MODAL (Accessible from Product Form - 100% Automatic Slug, No Images) */}
      {isQuickCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-black">إضافة تصنيف جديد</h3>
              </div>
              <button
                onClick={() => setIsQuickCategoryOpen(false)}
                className="p-1 text-zinc-400 hover:text-black rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  اسم التصنيف بالعربي (Arabic Name) *
                </label>
                <input
                  type="text"
                  required
                  value={quickCategoryNameAr}
                  onChange={(e) => setQuickCategoryNameAr(e.target.value)}
                  placeholder="مثال: تيشيرت، هوديز، شورتات، جاكيتات..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black font-medium text-right"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  اسم التصنيف بالإنجليزي (English Name)
                </label>
                <input
                  type="text"
                  value={quickCategoryNameEn}
                  onChange={(e) => setQuickCategoryNameEn(e.target.value)}
                  placeholder="e.g. T-Shirts, Hoodies..."
                  className="w-full bg-[var(--mf-surface-soft)] border border-zinc-300 rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:border-black font-medium"
                />
              </div>

              <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 text-[11px] text-zinc-500">
                ✨ يتم إنشاء المعرف والتصنيف تلقائياً واختياره للمنتج الحالي فوراً.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-lg cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickCategory}
                  className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isSavingQuickCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>إضافة واختيار التصنيف فوراً</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT IMAGE PREVIEW LIGHTBOX MODAL */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-4 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-sm">صورة إيصال التحويل (Payment Receipt)</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  title="فتح في نافذة جديدة"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center bg-black/60 rounded-xl p-2 max-h-[75vh] overflow-auto">
              <img
                src={selectedReceiptUrl}
                alt="إيصال التحويل"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-800">
              <span>تحقق من تطابق رقم الحساب / المحفظة وقيمة الطلب</span>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg cursor-pointer transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL FOR SAFE & BULK DELETIONS */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-black mb-2">{deleteModal.title}</h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-6">
              {deleteModal.message}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isProcessingDelete}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={executeConfirmDelete}
                disabled={isProcessingDelete}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isProcessingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
