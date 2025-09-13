// Weight conversion utilities

export type WeightUnit = 'grams' | 'kg';

export interface WeightValue {
  value: number;
  unit: WeightUnit;
}

export interface WeightDisplay {
  displayValue: number;
  displayUnit: WeightUnit;
  formattedString: string;
}

/**
 * Convert weight to grams (base unit for storage)
 */
export function convertToGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'grams':
      return value;
    case 'kg':
      return value * 1000;
    default:
      throw new Error(`Unsupported weight unit: ${unit}`);
  }
}

/**
 * Convert grams to specified unit
 */
export function convertFromGrams(grams: number, targetUnit: WeightUnit): number {
  switch (targetUnit) {
    case 'grams':
      return grams;
    case 'kg':
      return grams / 1000;
    default:
      throw new Error(`Unsupported weight unit: ${targetUnit}`);
  }
}

/**
 * Convert weight from one unit to another
 */
export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  const grams = convertToGrams(value, fromUnit);
  return convertFromGrams(grams, toUnit);
}

/**
 * Format weight for display with appropriate precision
 */
export function formatWeight(grams: number, displayUnit: WeightUnit = 'grams'): WeightDisplay {
  const displayValue = convertFromGrams(grams, displayUnit);
  
  let formattedValue: string;
  let unitLabel: string;
  
  switch (displayUnit) {
    case 'grams':
      formattedValue = displayValue.toFixed(0);
      unitLabel = displayValue === 1 ? 'gram' : 'grams';
      break;
    case 'kg':
      formattedValue = displayValue.toFixed(3);
      unitLabel = 'kg';
      break;
    default:
      formattedValue = displayValue.toString();
      unitLabel = displayUnit;
  }
  
  return {
    displayValue,
    displayUnit,
    formattedString: `${formattedValue} ${unitLabel}`
  };
}

/**
 * Auto-format weight with the most appropriate unit
 */
export function formatWeightAuto(grams: number): WeightDisplay {
  if (grams >= 1000) {
    return formatWeight(grams, 'kg');
  } else {
    return formatWeight(grams, 'grams');
  }
}

/**
 * Parse weight input string (e.g., "1.5kg", "500g", "2.5")
 */
export function parseWeightInput(input: string, defaultUnit: WeightUnit = 'grams'): WeightValue | null {
  if (!input || input.trim() === '') {
    return null;
  }
  
  const trimmed = input.trim().toLowerCase();
  
  // Extract number and unit
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(g|grams?|kg|kilograms?)?$/);
  
  if (!match) {
    return null;
  }
  
  const value = parseFloat(match[1]);
  let unit: WeightUnit = defaultUnit;
  
  if (match[2]) {
    const unitStr = match[2];
    if (unitStr === 'g' || unitStr.startsWith('gram')) {
      unit = 'grams';
    } else if (unitStr === 'kg' || unitStr.startsWith('kilogram')) {
      unit = 'kg';
    }
  }
  
  return { value, unit };
}

/**
 * Validate weight value
 */
export function validateWeight(grams: number): { isValid: boolean; error?: string } {
  if (isNaN(grams) || grams < 0) {
    return { isValid: false, error: 'Weight must be a positive number' };
  }
  
  if (grams > 1000000) { // 1000kg limit
    return { isValid: false, error: 'Weight cannot exceed 1000kg' };
  }
  
  return { isValid: true };
}

/**
 * Calculate price for weight-based products
 */
export function calculateWeightBasedPrice(
  weightInGrams: number, 
  pricePerGram: number
): number {
  return weightInGrams * pricePerGram;
}

/**
 * Get weight units for display
 */
export function getWeightUnits(): Array<{ value: WeightUnit; label: string }> {
  return [
    { value: 'grams', label: 'Grams (g)' },
    { value: 'kg', label: 'Kilograms (kg)' }
  ];
}

/**
 * Check if a product uses weight-based stock management
 */
export function isWeightBasedProduct(stockManagementType: string): boolean {
  return stockManagementType === 'weight';
}

/**
 * Get appropriate stock status for weight-based products
 */
export function getWeightStockStatus(
  availableWeight: number, 
  reorderPoint: number
): { status: string; color: string } {
  if (availableWeight <= 0) {
    return { status: 'Out of Stock', color: 'bg-red-100 text-red-800' };
  } else if (availableWeight <= reorderPoint) {
    return { status: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { status: 'In Stock', color: 'bg-green-100 text-green-800' };
  }
}

/**
 * Format weight for input fields (removes unnecessary decimals)
 */
export function formatWeightForInput(grams: number, unit: WeightUnit): string {
  const value = convertFromGrams(grams, unit);
  
  if (unit === 'grams') {
    return Math.round(value).toString();
  } else {
    // For kg, show up to 3 decimal places, removing trailing zeros
    return parseFloat(value.toFixed(3)).toString();
  }
} 