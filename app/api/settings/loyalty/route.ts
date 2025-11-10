import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Default loyalty settings
const DEFAULT_LOYALTY_SETTINGS = {
  loyalty_enabled: {
    value: "false",
    type: "boolean",
    description: "Enable/disable loyalty points system"
  },
  points_earning_rate: {
    value: "1",
    type: "number", 
    description: "Points earned per currency unit spent (e.g., 1 point per $1)"
  },
  points_earning_basis: {
    value: "subtotal",
    type: "string",
    description: "Calculate points based on subtotal or total amount (subtotal/total)"
  },
  points_redemption_value: {
    value: "0.01",
    type: "number",
    description: "Currency value per point when redeeming (e.g., 1 point = $0.01)"
  },
  points_expiry_months: {
    value: "12",
    type: "number",
    description: "Number of months after which points expire (0 = never expire)"
  },
  points_minimum_order: {
    value: "0",
    type: "number",
    description: "Minimum order amount required to earn points"
  },
  points_max_redemption_percent: {
    value: "50",
    type: "number",
    description: "Maximum percentage of order that can be paid with points"
  },
  points_redemption_minimum: {
    value: "100",
    type: "number",
    description: "Minimum points required to redeem"
  }
};

export async function GET() {
  try {
    // Get all loyalty-related settings
    const loyaltySettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.isActive, true)
      );

    // Convert to key-value object
    const settingsObject: { [key: string]: any } = {};
    
    loyaltySettings.forEach(setting => {
      if (setting.key.startsWith('loyalty_') || setting.key.startsWith('points_')) {
        let value: any = setting.value;
        
        // Parse based on type
        switch (setting.type) {
          case 'boolean':
            value = value === 'true';
            break;
          case 'number':
            value = parseFloat(value) || 0;
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              value = {};
            }
            break;
          default:
            // string - keep as is
            break;
        }
        
        settingsObject[setting.key] = {
          value,
          type: setting.type,
          description: setting.description
        };
      }
    });

    // Fill in defaults for missing settings
    Object.keys(DEFAULT_LOYALTY_SETTINGS).forEach(key => {
      if (!settingsObject[key]) {
        settingsObject[key] = DEFAULT_LOYALTY_SETTINGS[key as keyof typeof DEFAULT_LOYALTY_SETTINGS];
      }
    });

    return NextResponse.json({
      success: true,
      settings: settingsObject
    });

  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch loyalty settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { settings: newSettings } = body;

    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings data' },
        { status: 400 }
      );
    }

    // Validate settings
    const validSettings = Object.keys(DEFAULT_LOYALTY_SETTINGS);
    const updatePromises = [];

    for (const [key, settingData] of Object.entries(newSettings)) {
      if (!validSettings.includes(key)) {
        continue; // Skip invalid settings
      }

      const { value, type, description } = settingData as any;
      
      // Validate value based on type
      let processedValue = value;
      switch (type) {
        case 'boolean':
          processedValue = Boolean(value).toString();
          break;
        case 'number':
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            return NextResponse.json(
              { success: false, error: `Invalid number value for ${key}` },
              { status: 400 }
            );
          }
          processedValue = numValue.toString();
          break;
        case 'string':
          processedValue = String(value);
          break;
        case 'json':
          try {
            processedValue = JSON.stringify(value);
          } catch (e) {
            return NextResponse.json(
              { success: false, error: `Invalid JSON value for ${key}` },
              { status: 400 }
            );
          }
          break;
        default:
          processedValue = String(value);
      }

      // Check if setting exists
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (existingSetting.length > 0) {
        // Update existing
        updatePromises.push(
          db.update(settings)
            .set({
              value: processedValue,
              type,
              description: description || DEFAULT_LOYALTY_SETTINGS[key as keyof typeof DEFAULT_LOYALTY_SETTINGS]?.description,
              updatedAt: new Date()
            })
            .where(eq(settings.key, key))
        );
      } else {
        // Create new
        updatePromises.push(
          db.insert(settings).values({
            id: uuidv4(),
            key,
            value: processedValue,
            type,
            description: description || DEFAULT_LOYALTY_SETTINGS[key as keyof typeof DEFAULT_LOYALTY_SETTINGS]?.description,
            isActive: true
          })
        );
      }
    }

    // Execute all updates
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'Loyalty settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating loyalty settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update loyalty settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}