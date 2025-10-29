// Utility functions for stock management
export interface StockManagementSetting {
  stockManagementEnabled: boolean;
}

// Check if stock management is enabled
export async function getStockManagementSetting(): Promise<boolean> {
  try {
    const response = await fetch('/api/settings/stock-management');
    if (!response.ok) {
      console.warn('Failed to fetch stock management setting, defaulting to enabled');
      return true;
    }
    const data: StockManagementSetting = await response.json();
    return data.stockManagementEnabled;
  } catch (error) {
    console.warn('Error fetching stock management setting, defaulting to enabled:', error);
    return true;
  }
}

// Update stock management setting
export async function updateStockManagementSetting(enabled: boolean): Promise<StockManagementSetting> {
  try {
    const response = await fetch('/api/settings/stock-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update stock management setting');
    }
    
    const data = await response.json();
    return { stockManagementEnabled: data.stockManagementEnabled };
  } catch (error) {
    console.error('Error updating stock management setting:', error);
    throw error;
  }
}

// Server-side function to get stock management setting directly from database
// This can be used in API routes to avoid HTTP calls
export async function getStockManagementSettingDirect(): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db');
    const { settings } = await import('@/lib/schema');
    const { eq } = await import('drizzle-orm');
    
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, 'stock_management_enabled'))
      .limit(1);

    if (setting.length > 0) {
      return setting[0].value === 'true';
    }
    
    // Default to enabled if setting doesn't exist
    return true;
  } catch (error) {
    console.warn('Error fetching stock management setting from database, defaulting to enabled:', error);
    return true;
  }
} 