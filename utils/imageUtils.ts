/**
 * Utility functions for image processing and compression
 */

/**
 * Compress an image file to reduce its size while maintaining quality
 */
export async function compressImage(file: File, maxSize: number = 8 * 1024 * 1024): Promise<File> {
  // If file is already small enough, return as-is
  if (file.size <= maxSize) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions to reduce file size
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        // Scale down if image is too large
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg', // Convert to JPEG for better compression
                  lastModified: Date.now(),
                });
                console.log(`Compressed ${file.name}: ${file.size} -> ${compressedFile.size} bytes`);
                resolve(compressedFile);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8 // 80% quality
          );
        } else {
          reject(new Error('Canvas context not available'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload file with retry logic and progress tracking
 */
export async function uploadFileWithRetry(
  file: File, 
  directory: string = 'products',
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string }> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Compress large images before upload
  const processedFile = file.size > 8 * 1024 * 1024 ? await compressImage(file) : file;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.(0);
      
      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('directory', directory);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      onProgress?.(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown upload error');
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        onProgress?.(0);
      }
    }
  }

  throw lastError || new Error('Upload failed after all retries');
}