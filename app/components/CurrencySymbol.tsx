'use client';
import React from 'react';
import { useCurrency } from '@/app/contexts/CurrencyContext';

interface CurrencySymbolProps {
  /** Additional CSS classes to apply */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * CurrencySymbol Component
 * 
 * Renders the current currency symbol based on the selected currency setting.
 * Use this component consistently across the admin app for currency displays.
 * 
 * @example
 * <CurrencySymbol /> {formattedPrice}
 */
const CurrencySymbol: React.FC<CurrencySymbolProps> = ({ 
  className = '', 
  style = {} 
}) => {
  const { currencySettings, loading } = useCurrency();
  
  if (loading) {
    return (
      <span 
        className={`currency-symbol ${className}`.trim()}
        style={style}
      >
        $ {/* Fallback to USD while loading */}
      </span>
    );
  }

  return (
    <span 
      className={`currency-symbol ${className}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: currencySettings.symbol }}
    />
  );
};

export default CurrencySymbol; 