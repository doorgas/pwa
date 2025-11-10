import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const VAT_TAX_KEY = 'vat_tax_settings';
const SERVICE_TAX_KEY = 'service_tax_settings';

interface TaxSetting {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  value: number;
}

const DEFAULT_TAX_SETTING: TaxSetting = {
  enabled: false,
  type: 'percentage',
  value: 0
};

export async function GET() {
  try {
    // Get both VAT and Service tax settings
    const taxSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, VAT_TAX_KEY)
      );
    
    const serviceSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, SERVICE_TAX_KEY)
      );
    
    const allTaxSettings = [...taxSettings, ...serviceSettings];

    let vatTax = DEFAULT_TAX_SETTING;
    let serviceTax = DEFAULT_TAX_SETTING;

    // Parse existing settings
    for (const setting of allTaxSettings) {
      try {
        const parsedValue = JSON.parse(setting.value);
        if (setting.key === VAT_TAX_KEY) {
          vatTax = { ...DEFAULT_TAX_SETTING, ...parsedValue };
        } else if (setting.key === SERVICE_TAX_KEY) {
          serviceTax = { ...DEFAULT_TAX_SETTING, ...parsedValue };
        }
      } catch (error) {
        console.error(`Error parsing ${setting.key}:`, error);
      }
    }

    // Create default settings if they don't exist
    if (!allTaxSettings.some(s => s.key === VAT_TAX_KEY)) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: VAT_TAX_KEY,
        value: JSON.stringify(DEFAULT_TAX_SETTING),
        type: 'json',
        description: 'VAT tax configuration (enabled, type, value)',
        isActive: true,
      });
    }

    if (!allTaxSettings.some(s => s.key === SERVICE_TAX_KEY)) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SERVICE_TAX_KEY,
        value: JSON.stringify(DEFAULT_TAX_SETTING),
        type: 'json',
        description: 'Service tax configuration (enabled, type, value)',
        isActive: true,
      });
    }

    return NextResponse.json({
      vatTax,
      serviceTax
    });
  } catch (error) {
    console.error('Error getting tax settings:', error);
    return NextResponse.json({ error: 'Failed to get tax settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { vatTax, serviceTax } = await req.json();

    // Validate input
    const validateTaxSetting = (tax: any, name: string) => {
      if (!tax || typeof tax !== 'object') {
        throw new Error(`${name} must be an object`);
      }
      if (typeof tax.enabled !== 'boolean') {
        throw new Error(`${name}.enabled must be a boolean`);
      }
      if (!['percentage', 'fixed'].includes(tax.type)) {
        throw new Error(`${name}.type must be 'percentage' or 'fixed'`);
      }
      if (typeof tax.value !== 'number' || tax.value < 0) {
        throw new Error(`${name}.value must be a non-negative number`);
      }
      if (tax.type === 'percentage' && tax.value > 100) {
        throw new Error(`${name}.value cannot exceed 100% for percentage type`);
      }
    };

    if (vatTax) {
      validateTaxSetting(vatTax, 'VAT Tax');
    }
    if (serviceTax) {
      validateTaxSetting(serviceTax, 'Service Tax');
    }

    // Update VAT tax setting
    if (vatTax) {
      const existingVat = await db
        .select()
        .from(settings)
        .where(eq(settings.key, VAT_TAX_KEY))
        .limit(1);

      if (existingVat.length > 0) {
        await db
          .update(settings)
          .set({
            value: JSON.stringify(vatTax),
            updatedAt: new Date(),
          })
          .where(eq(settings.key, VAT_TAX_KEY));
      } else {
        await db.insert(settings).values({
          id: uuidv4(),
          key: VAT_TAX_KEY,
          value: JSON.stringify(vatTax),
          type: 'json',
          description: 'VAT tax configuration (enabled, type, value)',
          isActive: true,
        });
      }
    }

    // Update Service tax setting
    if (serviceTax) {
      const existingService = await db
        .select()
        .from(settings)
        .where(eq(settings.key, SERVICE_TAX_KEY))
        .limit(1);

      if (existingService.length > 0) {
        await db
          .update(settings)
          .set({
            value: JSON.stringify(serviceTax),
            updatedAt: new Date(),
          })
          .where(eq(settings.key, SERVICE_TAX_KEY));
      } else {
        await db.insert(settings).values({
          id: uuidv4(),
          key: SERVICE_TAX_KEY,
          value: JSON.stringify(serviceTax),
          type: 'json',
          description: 'Service tax configuration (enabled, type, value)',
          isActive: true,
        });
      }
    }

    return NextResponse.json({
      message: 'Tax settings updated successfully',
      vatTax,
      serviceTax
    });
  } catch (error) {
    console.error('Error updating tax settings:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update tax settings' 
    }, { status: 400 });
  }
} 