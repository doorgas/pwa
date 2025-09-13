import { useState, useCallback } from 'react';

export interface VariantPriceResult {
  price: number;
  comparePrice: number | null;
  variantId: string;
  inventoryQuantity: number;
  sku: string;
  title?: string;
  isOnSale: boolean;
  savings: number;
  discountPercentage: number;
}

/**
 * Lightweight hook for getting variant prices by attribute combination
 * Perfect for product pages where you need quick price lookups
 */
export const useVariantPrice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPrice = useCallback(async (
    productId: string,
    attributes: { [key: string]: string }
  ): Promise<VariantPriceResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/products/variant-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variationCombination: attributes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch variant price');
      }

      const data = await response.json();
      
      const price = parseFloat(data.price);
      const comparePrice = data.comparePrice ? parseFloat(data.comparePrice) : null;
      const isOnSale = comparePrice ? comparePrice > price : false;
      const savings = isOnSale ? comparePrice! - price : 0;
      const discountPercentage = isOnSale ? Math.round((savings / comparePrice!) * 100) : 0;

      return {
        price,
        comparePrice,
        variantId: data.variantId,
        inventoryQuantity: data.inventoryQuantity,
        sku: data.sku,
        title: data.title,
        isOnSale,
        savings,
        discountPercentage
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all variant data with price matrix for a product
   */
  const getAllVariants = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch variants');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getPrice,
    getAllVariants,
    loading,
    error
  };
};

export default useVariantPrice; 