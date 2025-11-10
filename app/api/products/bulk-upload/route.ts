import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Please upload a CSV file' }, { status: 400 });
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file must contain header and at least one data row' }, { status: 400 });
    }

    // Parse CSV header
    const header = lines[0].split(',').map(h => h.replace(/['"]/g, '').trim());
    
    // Expected columns
    const requiredColumns = ['name', 'price'];
    const optionalColumns = [
      'slug', 'description', 'shortDescription', 'sku', 'comparePrice', 'costPrice',
      'categoryId', 'subcategoryId', 'tags', 'weight', 'isFeatured', 'isActive',
      'isDigital', 'requiresShipping', 'taxable', 'metaTitle', 'metaDescription'
    ];
    
    // Validate required columns
    const missingColumns = requiredColumns.filter(col => !header.includes(col));
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 });
    }

    const results = {
      successful: 0,
      failed: 0,
      successfulProducts: [] as Array<{id: string, name: string, sku: string | null}>,
      errors: [] as Array<{row: number, message: string, product: any}>
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = lines[i];
        if (!row.trim()) continue;
        
        // Parse CSV row (simple CSV parser - doesn't handle complex escaping)
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < row.length; j++) {
          const char = row[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // Add the last value

        // Create product object from CSV data
        const productData: any = {};
        
        header.forEach((col, index) => {
          const value = values[index]?.replace(/^["']|["']$/g, '') || '';
          
          switch (col) {
            case 'name':
            case 'slug':
            case 'description':
            case 'shortDescription':
            case 'sku':
            case 'categoryId':
            case 'subcategoryId':
            case 'metaTitle':
            case 'metaDescription':
              productData[col] = value || null;
              break;
              
            case 'price':
            case 'comparePrice':
            case 'costPrice':
            case 'weight':
              productData[col] = value ? parseFloat(value) : (col === 'price' ? null : null);
              break;
              
            case 'tags':
              productData[col] = value ? value.split(',').map((tag: string) => tag.trim()) : [];
              break;
              
            case 'isFeatured':
            case 'isActive':
            case 'isDigital':
            case 'requiresShipping':
            case 'taxable':
              productData[col] = value ? value.toLowerCase() === 'true' : (
                col === 'isActive' || col === 'requiresShipping' || col === 'taxable' ? true : false
              );
              break;
          }
        });

        // Validate required fields
        if (!productData.name || !productData.price) {
          results.errors.push({
            row: i + 1,
            message: 'Missing required fields: name and price',
            product: productData
          });
          results.failed++;
          continue;
        }

        // Generate ID and slug if not provided
        const newProduct = {
          id: uuidv4(),
          name: productData.name,
          slug: productData.slug || productData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: productData.description,
          shortDescription: productData.shortDescription,
          sku: productData.sku || null, // Convert empty SKU to null
          price: productData.price.toString(),
          comparePrice: productData.comparePrice ? productData.comparePrice.toString() : null,
          costPrice: productData.costPrice ? productData.costPrice.toString() : null,
          images: null, // CSV doesn't support images
          categoryId: productData.categoryId || null,
          subcategoryId: productData.subcategoryId || null,
          tags: productData.tags?.length > 0 ? JSON.stringify(productData.tags) : null,
          weight: productData.weight ? productData.weight.toString() : null,
          dimensions: null, // Not supported in CSV
          isFeatured: productData.isFeatured || false,
          isActive: productData.isActive !== undefined ? productData.isActive : true,
          isDigital: productData.isDigital || false,
          requiresShipping: productData.requiresShipping !== undefined ? productData.requiresShipping : true,
          taxable: productData.taxable !== undefined ? productData.taxable : true,
          metaTitle: productData.metaTitle,
          metaDescription: productData.metaDescription,
        };

        // Insert product into database
        await db.insert(products).values(newProduct);
        
        results.successful++;
        results.successfulProducts.push({
          id: newProduct.id,
          name: newProduct.name,
          sku: newProduct.sku
        });

      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          message: error.message || 'Unknown error occurred',
          product: null
        });
      }
    }

    return NextResponse.json(results);

  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process bulk upload: ' + error.message 
    }, { status: 500 });
  }
} 