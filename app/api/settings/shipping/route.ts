import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const SHIPPING_ENABLED_KEY = 'shipping_enabled';
const SHIPPING_MESSAGE_KEY = 'shipping_message';
const SHIPPING_FEE_KEY = 'order_shipping_fee'; // Keep existing key for compatibility

interface ShippingSettings {
  enabled: boolean;
  customMessage: string;
  fee: number;
}

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  enabled: true,
  customMessage: 'Shipping is currently available for all orders.',
  fee: 0
};

export async function GET() {
  try {
    // Get shipping settings
    const shippingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_ENABLED_KEY));
    
    const messageSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_MESSAGE_KEY));
    
    const feeSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_FEE_KEY));
    
    let shippingEnabled = DEFAULT_SHIPPING_SETTINGS.enabled;
    let customMessage = DEFAULT_SHIPPING_SETTINGS.customMessage;
    let fee = DEFAULT_SHIPPING_SETTINGS.fee;

    // Parse existing settings
    if (shippingSettings.length > 0) {
      try {
        shippingEnabled = shippingSettings[0].value === 'true';
      } catch (error) {
        console.error('Error parsing shipping enabled setting:', error);
      }
    }

    if (messageSettings.length > 0) {
      customMessage = messageSettings[0].value;
    }

    if (feeSettings.length > 0) {
      try {
        fee = parseFloat(feeSettings[0].value) || 0;
      } catch (error) {
        console.error('Error parsing shipping fee setting:', error);
      }
    }

    // Create default settings if they don't exist
    if (shippingSettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_ENABLED_KEY,
        value: String(DEFAULT_SHIPPING_SETTINGS.enabled),
        type: 'boolean',
        description: 'Enable or disable shipping functionality',
        isActive: true,
      });
    }

    if (messageSettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_MESSAGE_KEY,
        value: DEFAULT_SHIPPING_SETTINGS.customMessage,
        type: 'string',
        description: 'Custom message to display when shipping is disabled',
        isActive: true,
      });
    }

    if (feeSettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_FEE_KEY,
        value: String(DEFAULT_SHIPPING_SETTINGS.fee),
        type: 'number',
        description: 'Shipping fee amount',
        isActive: true,
      });
    }

    return NextResponse.json({
      enabled: shippingEnabled,
      customMessage: customMessage,
      fee: fee
    });
  } catch (error) {
    console.error('Error getting shipping settings:', error);
    return NextResponse.json(
      { error: 'Failed to get shipping settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { enabled, customMessage, fee } = await req.json();

    // Validate input
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Enabled must be a boolean value' },
        { status: 400 }
      );
    }

    if (typeof customMessage !== 'string') {
      return NextResponse.json(
        { error: 'Custom message must be a string' },
        { status: 400 }
      );
    }

    if (customMessage.length > 1000) {
      return NextResponse.json(
        { error: 'Custom message cannot exceed 1000 characters' },
        { status: 400 }
      );
    }

    if (typeof fee !== 'number' || fee < 0) {
      return NextResponse.json(
        { error: 'Fee must be a non-negative number' },
        { status: 400 }
      );
    }

    // Update or create shipping enabled setting
    const existingEnabledSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_ENABLED_KEY))
      .limit(1);

    if (existingEnabledSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: String(enabled),
          updatedAt: new Date()
        })
        .where(eq(settings.key, SHIPPING_ENABLED_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_ENABLED_KEY,
        value: String(enabled),
        type: 'boolean',
        description: 'Enable or disable shipping functionality',
        isActive: true,
      });
    }

    // Update or create custom message setting
    const existingMessageSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_MESSAGE_KEY))
      .limit(1);

    if (existingMessageSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: customMessage,
          updatedAt: new Date()
        })
        .where(eq(settings.key, SHIPPING_MESSAGE_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_MESSAGE_KEY,
        value: customMessage,
        type: 'string',
        description: 'Custom message to display when shipping is disabled',
        isActive: true,
      });
    }

    // Update or create fee setting
    const existingFeeSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHIPPING_FEE_KEY))
      .limit(1);

    if (existingFeeSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: String(fee),
          updatedAt: new Date()
        })
        .where(eq(settings.key, SHIPPING_FEE_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: SHIPPING_FEE_KEY,
        value: String(fee),
        type: 'number',
        description: 'Shipping fee amount',
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Shipping settings updated successfully',
      settings: {
        enabled,
        customMessage,
        fee
      }
    });
  } catch (error) {
    console.error('Error updating shipping settings:', error);
    return NextResponse.json(
      { error: 'Failed to update shipping settings' },
      { status: 500 }
    );
  }
}
