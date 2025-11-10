import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';

export async function GET() {
  try {
    // Fetch store settings
    const storeSettings = await db
      .select()
      .from(settings)
      .where(
        and(
          eq(settings.key, 'store_name'),
          eq(settings.isActive, true)
        )
      )
      .union(
        db
          .select()
          .from(settings)
          .where(
            and(
              eq(settings.key, 'store_description'),
              eq(settings.isActive, true)
            )
          )
      );

    // Format the settings
    const formattedSettings = {
      store_name: '',
      store_description: ''
    };

    storeSettings.forEach(setting => {
      if (setting.key === 'store_name') {
        formattedSettings.store_name = setting.value;
      } else if (setting.key === 'store_description') {
        formattedSettings.store_description = setting.value;
      }
    });

    return NextResponse.json({
      success: true,
      settings: formattedSettings
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch store settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { settings: newSettings } = await req.json();

    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (typeof newSettings.store_name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Store name must be a string' },
        { status: 400 }
      );
    }

    if (typeof newSettings.store_description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Store description must be a string' },
        { status: 400 }
      );
    }

    // Update or create store name setting
    const existingStoreName = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'store_name'))
      .limit(1);

    if (existingStoreName.length > 0) {
      await db
        .update(settings)
        .set({
          value: newSettings.store_name,
          updatedAt: new Date()
        })
        .where(eq(settings.key, 'store_name'));
    } else {
      await db.insert(settings).values({
        id: `store_name_${Date.now()}`,
        key: 'store_name',
        value: newSettings.store_name,
        type: 'string',
        description: 'The name of the store',
        isActive: true
      });
    }

    // Update or create store description setting
    const existingStoreDescription = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'store_description'))
      .limit(1);

    if (existingStoreDescription.length > 0) {
      await db
        .update(settings)
        .set({
          value: newSettings.store_description,
          updatedAt: new Date()
        })
        .where(eq(settings.key, 'store_description'));
    } else {
      await db.insert(settings).values({
        id: `store_description_${Date.now()}`,
        key: 'store_description',
        value: newSettings.store_description,
        type: 'string',
        description: 'The description of the store',
        isActive: true
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Store settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating store settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update store settings' },
      { status: 500 }
    );
  }
}
