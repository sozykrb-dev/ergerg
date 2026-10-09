import { getSupabase, getSupabaseConfig } from './supabase';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

/**
 * Optimizes, resizes, and converts an image File or Data URL to WebP Blob client-side.
 * Strips EXIF metadata automatically and minimizes storage & bandwidth.
 */
export async function optimizeImageClientSide(
  fileOrUrl: File | string,
  options: ImageOptimizationOptions = {}
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number; sizeBytes: number }> {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.82,
    format = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio preserving resize
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Smooth downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Check WebP support in canvas
      let targetFormat = format;
      const testWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
      if (!testWebP && targetFormat === 'image/webp') {
        targetFormat = 'image/jpeg';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create optimized image blob'));
            return;
          }

          const dataUrl = canvas.toDataURL(targetFormat, quality);
          resolve({
            blob,
            dataUrl,
            width,
            height,
            sizeBytes: blob.size,
          });
        },
        targetFormat,
        quality
      );
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for optimization: ' + err));
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileOrUrl);
    }
  });
}

/**
 * Generates both a high-res gallery image and a lightweight thumbnail for a product.
 */
export async function optimizeProductImages(
  fileOrUrl: File | string
): Promise<{
  thumbnail: { blob: Blob; dataUrl: string; sizeBytes: number };
  gallery: { blob: Blob; dataUrl: string; sizeBytes: number };
}> {
  // 1. Thumbnail (600px width, ~100-200KB WebP)
  const thumbnail = await optimizeImageClientSide(fileOrUrl, {
    maxWidth: 600,
    maxHeight: 800,
    quality: 0.78,
    format: 'image/webp',
  });

  // 2. Gallery image (1200px width, ~250-450KB WebP)
  const gallery = await optimizeImageClientSide(fileOrUrl, {
    maxWidth: 1200,
    maxHeight: 1600,
    quality: 0.82,
    format: 'image/webp',
  });

  return {
    thumbnail: {
      blob: thumbnail.blob,
      dataUrl: thumbnail.dataUrl,
      sizeBytes: thumbnail.sizeBytes,
    },
    gallery: {
      blob: gallery.blob,
      dataUrl: gallery.dataUrl,
      sizeBytes: gallery.sizeBytes,
    },
  };
}

/**
 * Uploads optimized image to Supabase Storage bucket 'product-images'
 */
export async function uploadProductImageToStorage(
  productId: string,
  blob: Blob,
  fileName: string
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const bucket = getSupabaseConfig().bucket || 'product-images';
  const cleanProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${cleanProductId}/${fileName}`;

  try {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: blob.type || 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      console.warn('Supabase storage upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (e) {
    console.error('Storage upload exception:', e);
    return null;
  }
}

/**
 * Deletes all stored images for a product when deleted from catalog.
 */
export async function deleteProductImagesFromStorage(productId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const bucket = getSupabaseConfig().bucket || 'product-images';
  const cleanProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');

  try {
    // List all files in the product's directory
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(cleanProductId);

    if (listError || !files || files.length === 0) return;

    const filePaths = files.map((f) => `${cleanProductId}/${f.name}`);
    await supabase.storage.from(bucket).remove(filePaths);
  } catch (e) {
    console.warn('Failed to delete product storage images:', e);
  }
}
