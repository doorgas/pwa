import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const SHIPPING_ENABLED_KEY = 'shipping_enabled';
const SHIPPING_MESSAGE_KEY = 'shipping_message';

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
    
    let shippingEnabled = true; // Default to enabled
    let customMessage = 'Shipping is currently available for all orders.';

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

    return NextResponse.json({
      enabled: shippingEnabled,
      message: customMessage,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting public shipping status:', error);
    // Return default values in case of error to avoid breaking frontend
    return NextResponse.json({
      enabled: true,
      message: 'Shipping is currently available for all orders.',
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch current settings'
    });
  }
}
