'use client';
import React, { useState, useEffect } from 'react';
import CurrencySymbol from './CurrencySymbol';

interface VariationAttribute {
  id: string;
  name: string;
  type: string;
  slug: string;
  values: Array<{
    id: string;
    value: string;
    slug: string;
    colorCode?: string;
    image?: string;
  }>;
}

interface VariationMatrix {
  attributes: VariationAttribute[];
  variants: Array<{
    id?: string;
    title: string;
    attributes: Array<{
      attributeId: string;
      attributeName: string;
      attributeType: string;
      attributeSlug: string;
      valueId: string;
      value: string;
      valueSlug: string;
      colorCode?: string;
      image?: string;
    }>;
    price: string;
    comparePrice: string;
    costPrice: string;
    sku: string;
    weight: string;
    inventoryQuantity: number;
    image: string;
    isActive: boolean;
  }>;
  defaultSelections?: { [attributeId: string]: string };
}

interface VariationSelectorProps {
  variationMatrix: VariationMatrix;
  onVariantChange: (variant: any) => void;
  className?: string;
}

export default function VariationSelector({ 
  variationMatrix, 
  onVariantChange, 
  className = '' 
}: VariationSelectorProps) {
  const [selections, setSelections] = useState<{ [attributeId: string]: string }>({});
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  // Initialize with default selections
  useEffect(() => {
    if (variationMatrix.defaultSelections) {
      setSelections(variationMatrix.defaultSelections);
    } else {
      // Set first value of each attribute as default
      const defaults = variationMatrix.attributes.reduce((acc, attr) => {
        if (attr.values.length > 0) {
          acc[attr.id] = attr.values[0].id;
        }
        return acc;
      }, {} as { [attributeId: string]: string });
      setSelections(defaults);
    }
  }, [variationMatrix]);

  // Find matching variant when selections change
  useEffect(() => {
    const variant = findMatchingVariant();
    setSelectedVariant(variant);
    onVariantChange(variant);
  }, [selections, variationMatrix]);

  const findMatchingVariant = () => {
    return variationMatrix.variants.find(variant => 
      variant.attributes.every(attr => 
        selections[attr.attributeId] === attr.valueId
      )
    );
  };

  const handleSelectionChange = (attributeId: string, valueId: string) => {
    setSelections(prev => ({
      ...prev,
      [attributeId]: valueId
    }));
  };

  const renderAttributeSelector = (attribute: VariationAttribute) => {
    const selectedValue = selections[attribute.id];

    switch (attribute.type) {
      case 'color':
        return (
          <div key={attribute.id} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {attribute.name}
              {selectedValue && (
                <span className="ml-2 text-gray-500">
                  ({attribute.values.find(v => v.id === selectedValue)?.value})
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value) => (
                <button
                  key={value.id}
                  onClick={() => handleSelectionChange(attribute.id, value.id)}
                  className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                    selectedValue === value.id
                      ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: value.colorCode || '#ccc' }}
                  title={value.value}
                  aria-label={`Select ${value.value}`}
                >
                  {selectedValue === value.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'size':
      case 'material':
      default:
        if (attribute.values.length > 5) {
          // Dropdown for many options
          return (
            <div key={attribute.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {attribute.name}
              </label>
              <select
                value={selectedValue || ''}
                onChange={(e) => handleSelectionChange(attribute.id, e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose {attribute.name}...</option>
                {attribute.values.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.value}
                  </option>
                ))}
              </select>
            </div>
          );
        } else {
          // Radio buttons for few options
          return (
            <div key={attribute.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {attribute.name}
              </label>
              <div className="space-y-2">
                {attribute.values.map((value) => (
                  <label key={value.id} className="flex items-center">
                    <input
                      type="radio"
                      name={attribute.id}
                      value={value.id}
                      checked={selectedValue === value.id}
                      onChange={(e) => handleSelectionChange(attribute.id, e.target.value)}
                      className="mr-3 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {value.value}
                      {value.image && (
                        <img 
                          src={value.image} 
                          alt={value.value}
                          className="inline-block w-6 h-6 ml-2 object-cover rounded"
                        />
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        }
    }
  };

  return (
    <div className={`variation-selector ${className}`}>
      <div className="space-y-4">
        {variationMatrix.attributes.map(renderAttributeSelector)}
      </div>

      {/* Variant Info Display */}
      {selectedVariant && (
        <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Selected Variant</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-medium flex items-center gap-1">
                <CurrencySymbol />
                {parseFloat(selectedVariant.price).toFixed(2)}
              </span>
            </div>
            {selectedVariant.comparePrice && (
              <div className="flex justify-between">
                <span className="text-gray-600">Compare Price:</span>
                <span className="line-through text-gray-500 flex items-center gap-1">
                  <CurrencySymbol />
                  {parseFloat(selectedVariant.comparePrice).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">SKU:</span>
              <span>{selectedVariant.sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In Stock:</span>
              <span className={selectedVariant.inventoryQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
                {selectedVariant.inventoryQuantity > 0 
                  ? `${selectedVariant.inventoryQuantity} available` 
                  : 'Out of stock'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug: Current Selections</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify({ selections, selectedVariant }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
} 