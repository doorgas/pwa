import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const LOGO_URL_KEY = 'appearance_logo_url';
const BACKGROUND_COLOR_KEY = 'appearance_background_color';
const TEXT_COLOR_KEY = 'appearance_text_color';

const DEFAULT_APPEARANCE_SETTINGS = {
  logo_url: '',
  background_color: '#ffffff',
  text_color: '#000000'
};

export async function GET() {
  try {
    // Get all appearance settings
    const appearanceSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, LOGO_URL_KEY)
      );
    
    const backgroundSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, BACKGROUND_COLOR_KEY)
      );
    
    const textSettings = await db
      .select()
      .from(settings)
      .where(
        eq(settings.key, TEXT_COLOR_KEY)
      );

    const allSettings = [...appearanceSettings, ...backgroundSettings, ...textSettings];

    let currentSettings = { ...DEFAULT_APPEARANCE_SETTINGS };

    // Parse existing settings
    for (const setting of allSettings) {
      if (setting.key === LOGO_URL_KEY) {
        currentSettings.logo_url = setting.value;
      } else if (setting.key === BACKGROUND_COLOR_KEY) {
        currentSettings.background_color = setting.value;
      } else if (setting.key === TEXT_COLOR_KEY) {
        currentSettings.text_color = setting.value;
      }
    }

    // Create default settings if they don't exist
    if (!allSettings.some(s => s.key === LOGO_URL_KEY)) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: LOGO_URL_KEY,
        value: DEFAULT_APPEARANCE_SETTINGS.logo_url,
        type: 'string',
        description: 'Application logo URL',
        isActive: true,
      });
    }

    if (!allSettings.some(s => s.key === BACKGROUND_COLOR_KEY)) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: BACKGROUND_COLOR_KEY,
        value: DEFAULT_APPEARANCE_SETTINGS.background_color,
        type: 'string',
        description: 'Main background color',
        isActive: true,
      });
    }

    if (!allSettings.some(s => s.key === TEXT_COLOR_KEY)) {
      await db.insert(settings).values({
        id: uuidv4(),
        key: TEXT_COLOR_KEY,
        value: DEFAULT_APPEARANCE_SETTINGS.text_color,
        type: 'string',
        description: 'Main text color',
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      settings: currentSettings
    });
  } catch (error) {
    console.error('Error getting appearance settings:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get appearance settings' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { settings: newSettings } = await req.json();

    if (!newSettings) {
      return NextResponse.json({ error: 'Settings data is required' }, { status: 400 });
    }

    // Validate hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (newSettings.background_color && !hexColorRegex.test(newSettings.background_color)) {
      return NextResponse.json({ error: 'Invalid background color format' }, { status: 400 });
    }
    if (newSettings.text_color && !hexColorRegex.test(newSettings.text_color)) {
      return NextResponse.json({ error: 'Invalid text color format' }, { status: 400 });
    }

    // Update or create each setting
    const settingsToUpdate = [
      { key: LOGO_URL_KEY, value: newSettings.logo_url || '', description: 'Application logo URL' },
      { key: BACKGROUND_COLOR_KEY, value: newSettings.background_color || '#ffffff', description: 'Main background color' },
      { key: TEXT_COLOR_KEY, value: newSettings.text_color || '#000000', description: 'Main text color' }
    ];

    for (const settingData of settingsToUpdate) {
      // Check if setting exists
      const existingSetting = await db
        .select()
        .from(settings)
        .where(eq(settings.key, settingData.key))
        .limit(1);

      if (existingSetting.length > 0) {
        // Update existing setting
        await db
          .update(settings)
          .set({ 
            value: settingData.value,
            updatedAt: new Date()
          })
          .where(eq(settings.key, settingData.key));
      } else {
        // Create new setting
        await db.insert(settings).values({
          id: uuidv4(),
          key: settingData.key,
          value: settingData.value,
          type: 'string',
          description: settingData.description,
          isActive: true,
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Appearance settings updated successfully' 
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    return NextResponse.json({ 
      error: 'Failed to update appearance settings' 
    }, { status: 500 });
  }
}
