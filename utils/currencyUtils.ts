import { AVAILABLE_CURRENCIES, CurrencyCode } from '@/app/contexts/CurrencyContext';

/**
 * Format a number as currency with the given currency code
 */
export const formatCurrency = (
  amount: number, 
  currencyCode: CurrencyCode = 'AED',
  options: {
    showSymbol?: boolean;
    decimalPlaces?: number;
  } = {}
): string => {
  const { showSymbol = true, decimalPlaces = 2 } = options;
  const currency = AVAILABLE_CURRENCIES[currencyCode];
  
  const formattedAmount = amount.toFixed(decimalPlaces);
  
  if (!showSymbol) {
    return formattedAmount;
  }
  
  if (currency.position === 'before') {
    return `${currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${currency.symbol}`;
  }
};

/**
 * Parse a currency string to number
 */
export const parseCurrency = (value: string): number => {
  // Remove all non-digit and non-decimal characters
  const cleanValue = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleanValue) || 0;
};

/**
 * Get currency symbol HTML for a given currency code
 */
export const getCurrencySymbolHtml = (currencyCode: CurrencyCode): string => {
  return AVAILABLE_CURRENCIES[currencyCode].symbol;
};

/**
 * Get currency name for a given currency code
 */
export const getCurrencyName = (currencyCode: CurrencyCode): string => {
  return AVAILABLE_CURRENCIES[currencyCode].name;
}; 