'use client';
import React, { useState } from 'react';
import { formatPrice, getPriceDisplay } from '../utils/priceUtils';
import { VariantData } from '../hooks/useProductVariants';

interface VariantManagerProps {
  variants: VariantData[];
  onVariantUpdate: (variantId: string, field: string, value: any) => void;
  onVariantDelete: (variantId: string) => void;
  isEditing?: boolean;
}

const VariantManager: React.FC<VariantManagerProps> = ({
  variants,
  onVariantUpdate,
  onVariantDelete,
  isEditing = true,
}) => {
  // Initialize expanded sections with all groups expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const groupedVariants = variants.reduce((groups, variant) => {
      const firstAttr = Object.keys(variant.attributes)[0];
      const firstValue = variant.attributes[firstAttr];
      const groupKey = firstAttr ? `${firstAttr}: ${firstValue}` : 'Default';
      groups.add(groupKey);
      return groups;
    }, new Set<string>());
    return groupedVariants;
  });
  const [bulkEdit, setBulkEdit] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const toggleVariantSelection = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      newSelected.add(variantId);
    }
    setSelectedVariants(newSelected);
  };

  const applyBulkPriceUpdate = (percentage: number) => {
    selectedVariants.forEach(variantId => {
      const variant = variants.find(v => v.id === variantId);
      if (variant) {
        const newPrice = variant.price * (1 + percentage / 100);
        onVariantUpdate(variantId, 'price', parseFloat(newPrice.toFixed(2)));
      }
    });
    setSelectedVariants(new Set());
  };

  // Group variants by first attribute for collapsible sections
  const groupedVariants = variants.reduce((groups, variant) => {
    const firstAttr = Object.keys(variant.attributes)[0];
    const firstValue = variant.attributes[firstAttr];
    const groupKey = firstAttr ? `${firstAttr}: ${firstValue}` : 'Default';
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(variant);
    return groups;
  }, {} as { [key: string]: VariantData[] });

  const getStockStatusColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800';
    if (quantity <= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {isEditing && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg">
          <div className="hidden items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bulkEdit}
                onChange={(e) => setBulkEdit(e.target.checked)}
                className="mr-2"
              />
              Bulk Edit Mode
            </label>
            {bulkEdit && selectedVariants.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedVariants.size} variant(s) selected
              </span>
            )}
          </div>
          
          {bulkEdit && selectedVariants.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => applyBulkPriceUpdate(10)}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                +10% Price
              </button>
              <button
                onClick={() => applyBulkPriceUpdate(-10)}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
              >
                -10% Price
              </button>
            </div>
          )}
        </div>
      )}

      {/* Variant Groups */}
      {Object.entries(groupedVariants).map(([groupName, groupVariants]) => (
        <div key={groupName} className="border rounded-lg">
          {/* Group Header */}
          <div
            className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection(groupName)}
          >
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-lg">{groupName}</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {groupVariants.length} variant{groupVariants.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Price Range: {(() => {
                  const prices = groupVariants.map(v => v.price);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
                })()}
              </div>
              
              <svg
                className={`w-5 h-5 transition-transform ${
                  expandedSections.has(groupName) ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Group Content */}
          {expandedSections.has(groupName) && (
            <div className="border-t">
              {groupVariants.map((variant) => {
                const priceDisplay = getPriceDisplay({
                  price: variant.price,
                  comparePrice: variant.comparePrice,
                  costPrice: variant.costPrice,
                });

                return (
                  <div key={variant.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                      {/* Selection Checkbox */}
                      {bulkEdit && (
                        <div className="lg:col-span-1">
                          <input
                            type="checkbox"
                            checked={selectedVariants.has(variant.id)}
                            onChange={() => toggleVariantSelection(variant.id)}
                            className="rounded"
                          />
                        </div>
                      )}

                      {/* Variant Info */}
                      <div className={`${bulkEdit ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
                        
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span
                              key={`${key}-${value}`}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className={`${bulkEdit ? 'lg:col-span-3' : 'lg:col-span-3'}`}>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-600">Price</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.price}
                                onChange={(e) => onVariantUpdate(variant.id, 'price', e.target.value)}
                                className="w-full p-1 text-sm border rounded"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600">Old Price <span className="text-gray-400">(Optional)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.comparePrice || ''}
                                onChange={(e) => onVariantUpdate(variant.id, 'comparePrice', e.target.value)}
                                className="w-full p-1 text-sm border rounded"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600">Cost Price <span className="text-gray-400">(For profit)</span></label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={variant.costPrice || ''}
                                onChange={(e) => onVariantUpdate(variant.id, 'costPrice', e.target.value)}
                                className="w-full p-1 text-sm border rounded"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-green-600">{priceDisplay.price}</div>
                            {priceDisplay.isOnSale && (
                              <div className="text-sm">
                                <span className="line-through text-gray-500">{priceDisplay.originalPrice}</span>
                                <span className="ml-2 text-red-600">-{priceDisplay.discountPercentage}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      

                      {/* Actions */}
                      {isEditing && (
                        <div className={`${bulkEdit ? 'lg:col-span-3' : 'lg:col-span-3'} flex flex-col gap-2`}>
                          <div className="flex gap-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variant.isActive}
                                onChange={(e) => onVariantUpdate(variant.id, 'isActive', e.target.checked)}
                                className="mr-1"
                              />
                              <span className="text-sm">Active</span>
                            </label>
                            
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={variant.outOfStock}
                                onChange={(e) => onVariantUpdate(variant.id, 'outOfStock', e.target.checked)}
                                className="mr-1"
                              />
                              <span className="text-sm">Out of stock</span>
                            </label>
                          </div>
                          
                          <button
                            onClick={() => onVariantDelete(variant.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 self-start"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {variants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No variants found
        </div>
      )}
    </div>
  );
};

export default VariantManager; 