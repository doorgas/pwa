import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const MIN_ORDER_KEY = 'order_minimum_order_value';
const DELIVERY_FEE_KEY = 'order_delivery_fee';
const SHIPPING_FEE_KEY = 'order_shipping_fee';
const DRIVER_CUT_KEY = 'order_driver_cut_flat';

export async function GET() {
  try {
    const keys = [MIN_ORDER_KEY, DELIVERY_FEE_KEY, SHIPPING_FEE_KEY, DRIVER_CUT_KEY];
    const results = await Promise.all(keys.map(async (key) => {
      const rows = await db.select().from(settings).where(eq(settings.key, key));
      return rows[0] || null;
    }));

    const current = {
      minimum_order_value: results[0]?.value ? parseFloat(String(results[0].value)) : 0,
      delivery_fee: results[1]?.value ? parseFloat(String(results[1].value)) : 0,
      shipping_fee: results[2]?.value ? parseFloat(String(results[2].value)) : 0,
      driver_cut_flat: results[3]?.value ? parseFloat(String(results[3].value)) : 0,
    };

    // Create defaults if missing
    const toCreate: Array<{ key: string; value: string; description: string }> = [];
    if (!results[0]) toCreate.push({ key: MIN_ORDER_KEY, value: '0', description: 'Minimum order value' });
    if (!results[1]) toCreate.push({ key: DELIVERY_FEE_KEY, value: '0', description: 'Delivery fee' });
    if (!results[2]) toCreate.push({ key: SHIPPING_FEE_KEY, value: '0', description: 'Shipping fee' });
    if (!results[3]) toCreate.push({ key: DRIVER_CUT_KEY, value: '0', description: 'Driver flat payment per order' });

    if (toCreate.length > 0) {
      for (const s of toCreate) {
        await db.insert(settings).values({
          id: uuidv4(),
          key: s.key,
          value: s.value,
          type: 'number',
          description: s.description,
          isActive: true,
        });
      }
    }

    return NextResponse.json({ success: true, settings: current });
  } catch (error) {
    console.error('Error getting order config:', error);
    return NextResponse.json({ success: false, error: 'Failed to get order settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { minimum_order_value, delivery_fee, shipping_fee, driver_cut_flat } = body || {};

    const validateNumber = (val: any, name: string) => {
      if (val === undefined || val === null || isNaN(parseFloat(String(val)))) {
        throw new Error(`${name} must be a valid number`);
      }
      if (parseFloat(String(val)) < 0) {
        throw new Error(`${name} cannot be negative`);
      }
    };

    validateNumber(minimum_order_value, 'Minimum order value');
    validateNumber(delivery_fee, 'Delivery fee');
    validateNumber(shipping_fee, 'Shipping fee');
    validateNumber(driver_cut_flat, 'Driver cut');

    const updates = [
      { key: MIN_ORDER_KEY, value: String(minimum_order_value), description: 'Minimum order value' },
      { key: DELIVERY_FEE_KEY, value: String(delivery_fee), description: 'Delivery fee' },
      { key: SHIPPING_FEE_KEY, value: String(shipping_fee), description: 'Shipping fee' },
      { key: DRIVER_CUT_KEY, value: String(driver_cut_flat), description: 'Driver flat payment per order' },
    ];

    for (const u of updates) {
      const existing = await db.select().from(settings).where(eq(settings.key, u.key)).limit(1);
      if (existing.length > 0) {
        await db.update(settings).set({ value: u.value, updatedAt: new Date() }).where(eq(settings.key, u.key));
      } else {
        await db.insert(settings).values({ id: uuidv4(), key: u.key, value: u.value, type: 'number', description: u.description, isActive: true });
      }
    }

    return NextResponse.json({ success: true, message: 'Order settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating order config:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update order settings' }, { status: 400 });
  }
}


