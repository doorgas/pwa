import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const DELIVERY_ENABLED_KEY = 'delivery_enabled';
const DELIVERY_MESSAGE_KEY = 'delivery_message';
const DELIVERY_FEE_KEY = 'delivery_fee';

interface DeliverySettings {
  enabled: boolean;
  customMessage: string;
  fee: number;
}

const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  enabled: true,
  customMessage: 'Delivery is currently available for all orders.',
  fee: 0
};

export async function GET() {
  try {
    // Get delivery settings
    const deliverySettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_ENABLED_KEY));
    
    const messageSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_MESSAGE_KEY));
    
    const feeSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_FEE_KEY));
    
    let deliveryEnabled = DEFAULT_DELIVERY_SETTINGS.enabled;
    let customMessage = DEFAULT_DELIVERY_SETTINGS.customMessage;
    let fee = DEFAULT_DELIVERY_SETTINGS.fee;

    // Parse existing settings
    if (deliverySettings.length > 0) {
      try {
        deliveryEnabled = deliverySettings[0].value === 'true';
      } catch (error) {
        console.error('Error parsing delivery enabled setting:', error);
      }
    }

    if (messageSettings.length > 0) {
      customMessage = messageSettings[0].value;
    }

    if (feeSettings.length > 0) {
      try {
        fee = parseFloat(feeSettings[0].value) || 0;
      } catch (error) {
        console.error('Error parsing delivery fee setting:', error);
      }
    }

    // Create default settings if they don't exist
    if (deliverySettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_ENABLED_KEY,
        value: String(DEFAULT_DELIVERY_SETTINGS.enabled),
        type: 'boolean',
        description: 'Enable or disable delivery functionality',
        isActive: true,
      });
    }

    if (messageSettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_MESSAGE_KEY,
        value: DEFAULT_DELIVERY_SETTINGS.customMessage,
        type: 'string',
        description: 'Custom message to display when delivery is disabled',
        isActive: true,
      });
    }

    if (feeSettings.length === 0) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_FEE_KEY,
        value: String(DEFAULT_DELIVERY_SETTINGS.fee),
        type: 'number',
        description: 'Delivery fee amount',
        isActive: true,
      });
    }

    return NextResponse.json({
      enabled: deliveryEnabled,
      customMessage: customMessage,
      fee: fee
    });
  } catch (error) {
    console.error('Error getting delivery settings:', error);
    return NextResponse.json(
      { error: 'Failed to get delivery settings' },
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

    // Update or create delivery enabled setting
    const existingEnabledSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_ENABLED_KEY))
      .limit(1);

    if (existingEnabledSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: String(enabled),
          updatedAt: new Date()
        })
        .where(eq(settings.key, DELIVERY_ENABLED_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_ENABLED_KEY,
        value: String(enabled),
        type: 'boolean',
        description: 'Enable or disable delivery functionality',
        isActive: true,
      });
    }

    // Update or create custom message setting
    const existingMessageSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_MESSAGE_KEY))
      .limit(1);

    if (existingMessageSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: customMessage,
          updatedAt: new Date()
        })
        .where(eq(settings.key, DELIVERY_MESSAGE_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_MESSAGE_KEY,
        value: customMessage,
        type: 'string',
        description: 'Custom message to display when delivery is disabled',
        isActive: true,
      });
    }

    // Update or create fee setting
    const existingFeeSetting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, DELIVERY_FEE_KEY))
      .limit(1);

    if (existingFeeSetting.length > 0) {
      await db
        .update(settings)
        .set({
          value: String(fee),
          updatedAt: new Date()
        })
        .where(eq(settings.key, DELIVERY_FEE_KEY));
    } else {
      await db.insert(settings).values({
        id: uuidv4(),
        key: DELIVERY_FEE_KEY,
        value: String(fee),
        type: 'number',
        description: 'Delivery fee amount',
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating delivery settings:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery settings' },
      { status: 500 }
    );
  }
}
