import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Configure route to handle larger request bodies (20MB for 15MB file + form data overhead)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for large uploads

// Helper function to compress image on server side if needed
async function compressImageIfNeeded(file: File): Promise<File> {
  // For very large files (>8MB), we could implement server-side compression here
  // For now, we'll return the original file
  return file;
}

export async function POST(request: NextRequest) {
  console.log('Upload API called');
  
  try {
    // Log request details
    console.log('Processing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || 'general';
    
    console.log('File details:', {
      name: file?.name,
      size: file?.size,
      type: file?.type,
      directory
    });
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size, 'bytes. Max:', maxSize, 'bytes');
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 15MB.' 
      }, { status: 400 });
    }

    // Validate directory parameter
    const allowedDirectories = ['courses', 'batches', 'general', 'products', 'products/banner', 'category-icons', 'logos'];
    if (!allowedDirectories.includes(directory)) {
      console.log('Invalid directory:', directory);
      return NextResponse.json({ 
        error: 'Invalid directory. Allowed directories: courses, batches, general, products, products/banner, category-icons, logos' 
      }, { status: 400 });
    }

    // Check environment variables
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 });
    }

    // Generate unique filename with directory structure
    const timestamp = Date.now();
    const fileName = `${directory}/${timestamp}-${file.name}`;
    console.log('Generated filename:', fileName);

    // Compress file if needed
    const processedFile = await compressImageIfNeeded(file);
    console.log('File processing complete. Final size:', processedFile.size);

    // Upload to Vercel Blob with explicit token and retry logic
    console.log('Starting upload to Vercel Blob...');
    let blob;
    let retries = 3;
    
    while (retries > 0) {
      try {
        blob = await put(fileName, processedFile, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false, // Keep our custom filename
        });
        break; // Success, exit retry loop
      } catch (uploadError) {
        retries--;
        console.log(`Upload attempt failed, ${retries} retries left:`, uploadError);
        
        if (retries === 0) {
          throw uploadError; // Re-throw if no retries left
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!blob) {
      throw new Error('Upload failed - no blob returned');
    }

    console.log('Upload successful:', blob.url);
    return NextResponse.json({ 
      url: blob.url,
      fileName: fileName 
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 