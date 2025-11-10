'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define available currencies (copied from API route to avoid server imports)
export const AVAILABLE_CURRENCIES = {
  'USD': { 
    name: 'US Dollar', 
    symbol: '$', // Standard dollar symbol
    code: 'USD',
    position: 'before' // before or after the amount
  },
  'AED': { 
    name: 'Dirham', 
    symbol: '&#xe001;', // Custom font character
    code: 'AED',
    position: 'before'
  },
  'PKR': { 
    name: 'Rs (Rupees)', 
    symbol: '₨', // Unicode rupee symbol
    code: 'PKR',
    position: 'before'
  }
} as const;

export type CurrencyCode = keyof typeof AVAILABLE_CURRENCIES;

interface CurrencyContextType {
  currentCurrency: CurrencyCode;
  currencySettings: typeof AVAILABLE_CURRENCIES[CurrencyCode];
  availableCurrencies: typeof AVAILABLE_CURRENCIES;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  refreshCurrency: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>('USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current currency settings on mount
  useEffect(() => {
    fetchCurrencySettings();
  }, []);

  const fetchCurrencySettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/settings/currency');
      if (!response.ok) {
        throw new Error('Failed to fetch currency settings');
      }
      
      const data = await response.json();
      setCurrentCurrency(data.currentCurrency);
    } catch (err: any) {
      console.error('Error fetching currency settings:', err);
      setError(err.message);
      // Fallback to default currency
      setCurrentCurrency('USD');
    } finally {
      setLoading(false);
    }
  };

  const setCurrency = async (currency: CurrencyCode) => {
    try {
      setError(null);
      
      const response = await fetch('/api/settings/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update currency');
      }
      
      const result = await response.json();
      setCurrentCurrency(result.currentCurrency);
    } catch (err: any) {
      console.error('Error updating currency:', err);
      setError(err.message);
      throw err;
    }
  };

  const refreshCurrency = async () => {
    await fetchCurrencySettings();
  };

  const value: CurrencyContextType = {
    currentCurrency,
    currencySettings: AVAILABLE_CURRENCIES[currentCurrency],
    availableCurrencies: AVAILABLE_CURRENCIES,
    setCurrency,
    refreshCurrency,
    loading,
    error,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}; 