import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Define available currencies (server-side copy)
const AVAILABLE_CURRENCIES = {
  'USD': { 
    name: 'US Dollar', 
    symbol: '$', // Standard dollar symbol
    code: 'USD',
    position: 'before' // before or after the amount
  },
  'AED': { 
    name: 'Dirham', 
    symbol: '&#xe001;', // Custom font character
    code: 'AED',
    position: 'before'
  },
  'PKR': { 
    name: 'Rs (Rupees)', 
    symbol: '₨', // Unicode rupee symbol
    code: 'PKR',
    position: 'before'
  }
} as const;

type CurrencyCode = keyof typeof AVAILABLE_CURRENCIES;

// Default currency
const DEFAULT_CURRENCY: CurrencyCode = 'USD';
const CURRENCY_SETTING_KEY = 'selected_currency';

// Get currency setting from database
async function getCurrencyFromDatabase(): Promise<CurrencyCode> {
  try {
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, CURRENCY_SETTING_KEY))
      .limit(1);

    if (result.length > 0 && result[0].value) {
      const currency = result[0].value as CurrencyCode;
      // Validate that it's a valid currency
      if (AVAILABLE_CURRENCIES[currency]) {
        return currency;
      }
    }
  } catch (error) {
    console.error('Error fetching currency from database:', error);
  }
  
  return DEFAULT_CURRENCY;
}

// Save currency setting to database
async function saveCurrencyToDatabase(currency: CurrencyCode): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, CURRENCY_SETTING_KEY))
      .limit(1);

    if (existing.length > 0) {
      // Update existing setting
      await db
        .update(settings)
        .set({
          value: currency,
          updatedAt: new Date()
        })
        .where(eq(settings.key, CURRENCY_SETTING_KEY));
    } else {
      // Create new setting
      await db
        .insert(settings)
        .values({
          id: uuidv4(),
          key: CURRENCY_SETTING_KEY,
          value: currency,
          type: 'string',
          description: 'Selected currency for the application',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
    }
  } catch (error) {
    console.error('Error saving currency to database:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const currentCurrency = await getCurrencyFromDatabase();
    
    return NextResponse.json({
      currentCurrency,
      availableCurrencies: AVAILABLE_CURRENCIES,
      currencySettings: AVAILABLE_CURRENCIES[currentCurrency]
    });
  } catch (error) {
    console.error('Error fetching currency settings:', error);
    return NextResponse.json({ error: 'Failed to fetch currency settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { currency } = await req.json();
    
    // Validate currency
    if (!currency || !AVAILABLE_CURRENCIES[currency as CurrencyCode]) {
      return NextResponse.json({ 
        error: 'Invalid currency. Must be one of: ' + Object.keys(AVAILABLE_CURRENCIES).join(', ')
      }, { status: 400 });
    }
    
    const currencyCode = currency as CurrencyCode;
    
    // Save currency to database
    await saveCurrencyToDatabase(currencyCode);
    
    return NextResponse.json({
      success: true,
      currentCurrency: currencyCode,
      currencySettings: AVAILABLE_CURRENCIES[currencyCode],
      message: `Currency updated to ${AVAILABLE_CURRENCIES[currencyCode].name} successfully`
    });
  } catch (error) {
    console.error('Error updating currency settings:', error);
    return NextResponse.json({ error: 'Failed to update currency settings' }, { status: 500 });
  }
} 