import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

interface ImportResult {
  total: number;
  success: number;
  errors: string[];
}

// Helper function to parse CSV
function parseCSV(csvText: string): string[][] {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    row.push(current.trim().replace(/^"|"$/g, ''));
    result.push(row);
  }
  
  return result;
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to parse date
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return new Date();
  
  // Try various date formats
  const formats = [
    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}$/,
    // MM/DD/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // DD/MM/YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
  ];
  
  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return new Date(); // Default to current date if parsing fails
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    let rows: string[][];
    
    // Parse file based on type
    if (file.name.endsWith('.csv')) {
      const fileContent = await file.text();
      rows = parseCSV(fileContent);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Parse Excel file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      rows = jsonData;
    } else {
      return NextResponse.json({ 
        error: 'Unsupported file format. Please use CSV, XLS, or XLSX files.' 
      }, { status: 400 });
    }
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }
    
    // Get headers (first row)
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);
    
    // Validate required columns - name is required, but either email or phone must be present
    if (!headers.includes('name')) {
      return NextResponse.json({ 
        error: 'Missing required column: name' 
      }, { status: 400 });
    }
    
    if (!headers.includes('email') && !headers.includes('phone')) {
      return NextResponse.json({ 
        error: 'Either email or phone column must be present' 
      }, { status: 400 });
    }
    
    // Get column indices
    const nameIndex = headers.indexOf('name');
    const phoneIndex = headers.indexOf('phone');
    const emailIndex = headers.indexOf('email');
    const notesIndex = headers.indexOf('notes');
    const dateCreatedIndex = headers.indexOf('date created') || headers.indexOf('datecreated');
    
    const result: ImportResult = {
      total: dataRows.length,
      success: 0,
      errors: []
    };
    
    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // +2 because we skipped header and arrays are 0-indexed
      
      try {
        // Extract data
        const name = row[nameIndex]?.trim();
        const phone = row[phoneIndex]?.trim();
        const email = row[emailIndex]?.trim();
        const notes = notesIndex >= 0 ? row[notesIndex]?.trim() : '';
        const dateCreatedStr = dateCreatedIndex >= 0 ? row[dateCreatedIndex]?.trim() : '';
        
        // Validate required fields
        if (!name) {
          result.errors.push(`Row ${rowNum}: Name is required`);
          continue;
        }
        
        // Either email or phone must be provided
        if (!email && !phone) {
          result.errors.push(`Row ${rowNum}: Either email or phone is required`);
          continue;
        }
        
        // Validate email format if provided
        if (email && !isValidEmail(email)) {
          result.errors.push(`Row ${rowNum}: Invalid email format`);
          continue;
        }
        
        // Check if user already exists (by email or phone)
        let existingUser = null;
        
        if (email) {
          existingUser = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.email, email)
          });
          
          if (existingUser) {
            result.errors.push(`Row ${rowNum}: User with email ${email} already exists`);
            continue;
          }
        }
        
        if (phone) {
          existingUser = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.phone, phone)
          });
          
          if (existingUser) {
            result.errors.push(`Row ${rowNum}: User with phone ${phone} already exists`);
            continue;
          }
        }
        
        // Parse date
        const createdAt = parseDate(dateCreatedStr);
        
        // Create user
        const newUser = {
          id: uuidv4(),
          name: name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          userType: 'customer' as const,
          status: 'pending' as const,
          createdAt: createdAt,
          updatedAt: new Date(),
        };
        
        await db.insert(user).values(newUser);
        result.success++;
        
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        result.errors.push(`Row ${rowNum}: Failed to import user - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error importing users:', error);
    return NextResponse.json({ 
      error: 'Failed to import users' 
    }, { status: 500 });
  }
}
