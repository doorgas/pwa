import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function POST() {
  try {
    console.log('Enabling loyalty system with default settings...');

    const defaultSettings = [
      { key: 'loyalty_enabled', value: 'true', type: 'boolean' },
      { key: 'points_earning_rate', value: '1', type: 'number' },
      { key: 'points_earning_basis', value: 'subtotal', type: 'string' },
      { key: 'points_redemption_value', value: '0.01', type: 'number' },
      { key: 'points_minimum_order', value: '0', type: 'number' },
      { key: 'points_max_redemption_percent', value: '50', type: 'number' },
      { key: 'points_redemption_minimum', value: '100', type: 'number' }
    ];

    for (const setting of defaultSettings) {
      // Check if setting exists
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(settings)
          .set({
            value: setting.value,
            type: setting.type,
            updatedAt: new Date()
          })
          .where(eq(settings.key, setting.key));
        console.log(`Updated setting: ${setting.key} = ${setting.value}`);
      } else {
        // Create new
        await db.insert(settings).values({
          id: uuidv4(),
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: `Loyalty setting: ${setting.key}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created setting: ${setting.key} = ${setting.value}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Loyalty system enabled with default settings'
    });

  } catch (error) {
    console.error('Error enabling loyalty system:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to enable loyalty system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}