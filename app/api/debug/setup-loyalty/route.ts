import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    console.log('Setting up loyalty system with default configuration...');
    
    // Default loyalty settings
    const defaultSettings = [
      { key: 'loyalty_enabled', value: 'true', type: 'boolean', description: 'Enable/disable loyalty points system' },
      { key: 'points_earning_rate', value: '1', type: 'number', description: '1 point per 1 currency unit' },
      { key: 'points_earning_basis', value: 'subtotal', type: 'string', description: 'subtotal or total' },
      { key: 'points_redemption_value', value: '0.01', type: 'number', description: '1 point = 0.01 currency' },
      { key: 'points_redemption_minimum', value: '100', type: 'number', description: 'minimum 100 points to redeem' },
      { key: 'points_max_redemption_percent', value: '50', type: 'number', description: 'max 50% of order' },
      { key: 'points_minimum_order', value: '0', type: 'number', description: 'no minimum order' },
      { key: 'points_expiry_months', value: '12', type: 'number', description: 'points expire after 12 months' }
    ];

    // Insert or update each setting
    for (const setting of defaultSettings) {
      // Check if setting exists
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existingSetting.length > 0) {
        // Update existing
        await db.update(settings)
          .set({
            value: setting.value,
            type: setting.type,
            description: setting.description,
            updatedAt: new Date()
          })
          .where(eq(settings.key, setting.key));
      } else {
        // Create new
        await db.insert(settings).values({
          id: uuidv4(),
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: setting.description,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      console.log(`Set ${setting.key} = ${setting.value}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Loyalty system configured successfully',
      settings: defaultSettings
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check current loyalty settings
    const loyaltyKeys = [
      'loyalty_enabled',
      'points_earning_rate', 
      'points_earning_basis',
      'points_redemption_value',
      'points_redemption_minimum',
      'points_max_redemption_percent',
      'points_minimum_order',
      'points_expiry_months'
    ];

    const currentSettings: Record<string, string> = {};
    for (const key of loyaltyKeys) {
      const setting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      
      currentSettings[key] = setting[0]?.value || 'NOT SET';
    }

    return NextResponse.json({
      success: true,
      currentSettings,
      instructions: {
        setup: 'POST to this endpoint to setup default loyalty settings',
        test: 'Create an order with status "delivered" to test points awarding'
      }
    });
  } catch (error) {
    console.error('Check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}