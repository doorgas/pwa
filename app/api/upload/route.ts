import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Configure route to handle larger request bodies (20MB for 15MB file + form data overhead)
export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout for large uploads

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const directory = formData.get('directory') as string || 'general';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and AVIF images are allowed.' 
      }, { status: 400 });
    }

    // Validate file size (15MB limit)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 15MB.' 
      }, { status: 400 });
    }

    // Validate directory parameter
    const allowedDirectories = ['courses', 'batches', 'general', 'products', 'products/banner', 'category-icons', 'logos'];
    if (!allowedDirectories.includes(directory)) {
      return NextResponse.json({ 
        error: 'Invalid directory. Allowed directories: courses, batches, general, products, products/banner, category-icons, logos' 
      }, { status: 400 });
    }

    // Generate unique filename with directory structure
    const timestamp = Date.now();
    const fileName = `${directory}/${timestamp}-${file.name}`;

    // Upload to Vercel Blob with explicit token
    const blob = await put(fileName, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ 
      url: blob.url,
      fileName: fileName 
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 