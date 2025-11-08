/**
 * Image compression utilities for field app
 * Reduces photo sizes before upload to improve sync performance
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

/**
 * Check if the browser can decode a given image type
 * Handles HEIC and other formats that Canvas may not support
 */
export async function canDecodeImage(blob: Blob): Promise<boolean> {
  // HEIC images are not supported by Canvas on iOS Safari
  if (blob.type === 'image/heic' || blob.type === 'image/heif') {
    return false;
  }
  
  // Try to create an ImageBitmap to test decode support
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(blob);
      bitmap.close();
      return true;
    } catch {
      return false;
    }
  }
  
  // Fallback: assume common formats are supported
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return supportedTypes.includes(blob.type.toLowerCase());
}

/**
 * Compress an image blob to reduce file size
 * @param blob - Original image blob
 * @param options - Compression options
 * @returns Compressed image blob
 */
export async function compressImage(
  blob: Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            console.log('[Image Compression]', {
              originalSize: Math.round(blob.size / 1024),
              compressedSize: Math.round(compressedBlob.size / 1024),
              reduction: `${Math.round((1 - compressedBlob.size / blob.size) * 100)}%`,
              dimensions: `${width}x${height}`
            });
            resolve(compressedBlob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get optimal compression settings based on original file size
 */
export function getCompressionSettings(fileSize: number): CompressionOptions {
  // For files over 2MB, use more aggressive compression
  if (fileSize > 2 * 1024 * 1024) {
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.75,
      mimeType: 'image/jpeg'
    };
  }
  
  // For files over 1MB, use moderate compression
  if (fileSize > 1024 * 1024) {
    return {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      mimeType: 'image/jpeg'
    };
  }
  
  // For smaller files, use light compression
  return {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    mimeType: 'image/jpeg'
  };
}

/**
 * Safely compress an image with fallback to original
 * Returns original blob if compression fails or format is unsupported
 */
export async function compressImageSafe(
  blob: Blob,
  options?: CompressionOptions
): Promise<Blob> {
  try {
    // Check if we can decode this image type
    const canDecode = await canDecodeImage(blob);
    
    if (!canDecode) {
      console.log('[Image Compression] Unsupported format, using original:', blob.type);
      return blob;
    }
    
    // Attempt compression
    const settings = options || getCompressionSettings(blob.size);
    const compressed = await compressImage(blob, settings);
    return compressed;
    
  } catch (error) {
    console.warn('[Image Compression] Failed to compress, using original:', error);
    return blob;
  }
}

/**
 * Batch compress multiple images with progress callback
 */
export async function compressImageBatch(
  blobs: Blob[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
  const compressed: Blob[] = [];
  
  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    const compressedBlob = await compressImageSafe(blob);
    compressed.push(compressedBlob);
    
    if (onProgress) {
      onProgress(i + 1, blobs.length);
    }
  }
  
  return compressed;
}
