interface TaxSetting {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  value: number;
}

interface TaxCalculationResult {
  vatAmount: number;
  serviceAmount: number;
  totalTaxAmount: number;
  finalAmount: number;
}

/**
 * Calculate tax amounts based on settings and base amount
 */
export function calculateTaxes(
  baseAmount: number,
  vatTax: TaxSetting,
  serviceTax: TaxSetting
): TaxCalculationResult {
  let vatAmount = 0;
  let serviceAmount = 0;

  // Calculate VAT tax
  if (vatTax.enabled) {
    if (vatTax.type === 'percentage') {
      vatAmount = (baseAmount * vatTax.value) / 100;
    } else {
      vatAmount = vatTax.value;
    }
  }

  // Calculate Service tax
  if (serviceTax.enabled) {
    if (serviceTax.type === 'percentage') {
      serviceAmount = (baseAmount * serviceTax.value) / 100;
    } else {
      serviceAmount = serviceTax.value;
    }
  }

  const totalTaxAmount = vatAmount + serviceAmount;
  const finalAmount = baseAmount + totalTaxAmount;

  return {
    vatAmount: Math.round(vatAmount * 100) / 100, // Round to 2 decimal places
    serviceAmount: Math.round(serviceAmount * 100) / 100,
    totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
  };
}

/**
 * Get tax settings from the API
 */
export async function fetchTaxSettings(): Promise<{
  vatTax: TaxSetting;
  serviceTax: TaxSetting;
}> {
  const response = await fetch('/api/settings/tax-settings');
  if (!response.ok) {
    throw new Error('Failed to fetch tax settings');
  }
  return response.json();
}

/**
 * Format tax amount for display
 */
export function formatTaxAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Get tax description for display
 */
export function getTaxDescription(tax: TaxSetting): string {
  if (!tax.enabled) return 'Disabled';
  
  if (tax.type === 'percentage') {
    return `${tax.value}%`;
  } else {
    return `$${tax.value.toFixed(2)} fixed`;
  }
} 