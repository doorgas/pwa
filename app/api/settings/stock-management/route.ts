import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const STOCK_MANAGEMENT_KEY = 'stock_management_enabled';

export async function GET() {
  try {
    // Try to get the setting from database
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, STOCK_MANAGEMENT_KEY))
      .limit(1);

    let stockManagementEnabled = true; // Default value

    if (setting.length > 0) {
      // Parse the stored value
      stockManagementEnabled = setting[0].value === 'true';
    } else {
      // Create default setting if it doesn't exist
      await db.insert(settings).values({
        id: uuidv4(),
        key: STOCK_MANAGEMENT_KEY,
        value: 'true',
        type: 'boolean',
        description: 'Enable or disable stock management system',
        isActive: true,
      });
    }

    return NextResponse.json({ stockManagementEnabled });
  } catch (error) {
    console.error('Error getting stock management setting:', error);
    return NextResponse.json({ error: 'Failed to get setting' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { enabled } = await req.json();
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean value' }, { status: 400 });
    }

    // Check if setting exists
    const existingSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, STOCK_MANAGEMENT_KEY))
      .limit(1);

    if (existingSetting.length > 0) {
      // Update existing setting
      await db
        .update(settings)
        .set({
          value: enabled.toString(),
          updatedAt: new Date(),
        })
        .where(eq(settings.key, STOCK_MANAGEMENT_KEY));
    } else {
      // Create new setting
      await db.insert(settings).values({
        id: uuidv4(),
        key: STOCK_MANAGEMENT_KEY,
        value: enabled.toString(),
        type: 'boolean',
        description: 'Enable or disable stock management system',
        isActive: true,
      });
    }
    
    return NextResponse.json({ 
      stockManagementEnabled: enabled, 
      message: `Stock management ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('Error updating stock management setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
} 