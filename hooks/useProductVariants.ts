import { useState, useEffect, useCallback } from 'react';
import { normalizeVariantOptions } from '../utils/jsonUtils';

export interface VariantData {
  id: string;
  title: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  weight: number | null;
  image: string;
  inventoryQuantity: number;
  attributes: { [key: string]: string };
  isActive: boolean;
  outOfStock: boolean;
}

export interface PriceMatrixEntry {
  price: number;
  comparePrice: number | null;
  variantId: string;
  inventoryQuantity: number;
  sku: string;
}

export interface ProductVariantsData {
  product: {
    id: string;
    name: string;
    productType: string;
    basePrice: number;
  };
  variants: VariantData[];
  priceMatrix: { [key: string]: PriceMatrixEntry };
  totalVariants: number;
}

export const useProductVariants = (productId: string | null) => {
  const [data, setData] = useState<ProductVariantsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/products/${productId}/variants`);
      if (!response.ok) {
        throw new Error('Failed to fetch variants');
      }
      
      const variantData = await response.json();
      setData(variantData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // Helper function to get price by attribute combination
  const getPriceByAttributes = useCallback((attributes: { [key: string]: string }): PriceMatrixEntry | null => {
    if (!data) return null;
    
    const attributeKey = Object.entries(attributes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return data.priceMatrix[attributeKey] || null;
  }, [data]);

  // Helper function to get all available attribute values
  const getAvailableAttributes = useCallback(() => {
    if (!data) return {};
    
    const attributes: { [key: string]: Set<string> } = {};
    
    data.variants.forEach(variant => {
      // Normalize attributes using our utility
      const normalizedAttributes = normalizeVariantOptions(variant.attributes);
      Object.entries(normalizedAttributes).forEach(([key, value]) => {
        if (!attributes[key]) {
          attributes[key] = new Set();
        }
        attributes[key].add(value);
      });
    });
    
    // Convert Sets to arrays
    const result: { [key: string]: string[] } = {};
    Object.entries(attributes).forEach(([key, valueSet]) => {
      result[key] = Array.from(valueSet).sort();
    });
    
    return result;
  }, [data]);

  // Helper function to check if variant combination exists
  const variantExists = useCallback((attributes: { [key: string]: string }): boolean => {
    return getPriceByAttributes(attributes) !== null;
  }, [getPriceByAttributes]);

  // Helper function to get inventory for specific combination
  const getInventoryByAttributes = useCallback((attributes: { [key: string]: string }): number => {
    const priceData = getPriceByAttributes(attributes);
    return priceData?.inventoryQuantity || 0;
  }, [getPriceByAttributes]);

  return {
    data,
    loading,
    error,
    refetch: fetchVariants,
    getPriceByAttributes,
    getAvailableAttributes,
    variantExists,
    getInventoryByAttributes,
  };
};

export default useProductVariants; 