'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from '../../components/ImageUploader';
import CurrencySymbol from '../../components/CurrencySymbol';
import RichTextEditor from '../../components/RichTextEditor';
import TagSelector from '../../components/TagSelector';
import { formatPrice } from '../../../utils/priceUtils';

/**
 * Enhanced Variation System for E-commerce Products
 * 
 * This system provides a user-friendly way to handle product variations with:
 * 1. Structured attribute storage with type information
 * 2. Frontend-optimized data format for easy consumption
 * 3. Automatic UI component selection based on attribute types
 * 4. Comprehensive variant generation with detailed metadata
 * 
 * Data Structure:
 * - VariationMatrix: Main container with attributes, variants, and defaults
 * - Attributes: Store type info to determine UI rendering (color swatches, dropdowns, radio buttons)
 * - Variants: Detailed variant info with complete attribute metadata
 * 
 * Frontend Rendering Logic:
 * - Color attributes → Color swatches with visual feedback
 * - Attributes with >5 values → Dropdown select
 * - Attributes with ≤5 values → Radio button group
 */

interface DatabaseVariationAttribute {
  id: string;
  name: string;
  slug: string;
  type: string;
  values: Array<{
    id: string;
    value: string;
    slug: string;
    colorCode?: string;
    image?: string;
  }>;
}

/**
 * Enhanced VariationAttribute interface for internal use
 * Stores selected attribute values with complete metadata
 */
interface VariationAttribute {
  id: string;
  name: string;
  type: string; // Used to determine frontend UI component
  slug: string; // For URL-friendly attribute names
  values: Array<{
    id: string;
    value: string;
    slug: string;
    colorCode?: string; // For color swatches
    image?: string; // For image-based attributes
  }>;
}

/**
 * Enhanced GeneratedVariant interface with detailed attribute metadata
 * Each variant stores complete information about its attribute combinations
 */
interface GeneratedVariant {
  id?: string;
  title: string;
  attributes: Array<{
    attributeId: string;
    attributeName: string;
    attributeType: string; // Critical for frontend rendering
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
  outOfStock: boolean;
}

interface Addon {
  id: string;
  title: string;
  price: string;
  description?: string;
  image?: string;
  groupId?: string;
  groupTitle?: string;
  isActive: boolean;
  sortOrder: number;
}

interface SelectedAddon {
  addonId: string;
  addonTitle: string;
  price: string;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Frontend-optimized variation matrix
 * This structure is specifically designed for easy frontend consumption
 */
interface VariationMatrix {
  attributes: Array<{
    id: string;
    name: string;
    type: string; // Determines UI component: 'color' | 'size' | 'material' | etc.
    slug: string;
    values: Array<{
      id: string;
      value: string;
      slug: string;
      colorCode?: string;
      image?: string;
    }>;
  }>;
  variants: GeneratedVariant[];
  defaultSelections?: { [attributeId: string]: string }; // For setting default selections
}

interface SelectedTag {
  tagId: string;
  tagName: string;
  groupId: string;
  groupName: string;
  customValue?: string;
  color?: string;
}

export default function AddProduct() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    sku: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    categoryId: '',
    subcategoryId: '',
    weight: '',
    isFeatured: false,
    isActive: true,
    isDigital: false,
    requiresShipping: true,
    taxable: true,
    outOfStock: false,
    metaTitle: '',
    metaDescription: '',
    productType: 'simple', // 'simple' or 'variable'
    banner: '', // Banner image URL
    // Weight-based stock management fields
    stockManagementType: 'quantity', // 'quantity' or 'weight'
    pricePerUnit: '', // Price per gram for weight-based products
    baseWeightUnit: 'grams', // 'grams' or 'kg'
    // Cannabis-specific fields
    thc: '',
    cbd: '',
    difficulty: '',
    floweringTime: '',
    yieldAmount: ''
  });
  
  // Variable product specific states
  const [availableAttributes, setAvailableAttributes] = useState<DatabaseVariationAttribute[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<VariationAttribute[]>([]);
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [showVariantGeneration, setShowVariantGeneration] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Group product specific states
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  
  // Tag selection state
  const [selectedTags, setSelectedTags] = useState<SelectedTag[]>([]);
  
  const [images, setImages] = useState<{ url: string; sortOrder: number }[]>([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubcategories(formData.categoryId);
    } else {
      setSubcategories([]);
    }
  }, [formData.categoryId]);

  useEffect(() => {
    if (formData.productType === 'variable' && selectedAttributes.length > 0) {
      generateVariants();
    } else {
      setGeneratedVariants([]);
    }
  }, [selectedAttributes, formData.productType]);

  // Show generated variants by default when they are created
  useEffect(() => {
    if (generatedVariants.length > 0) {
      setShowVariantGeneration(true);
      // Auto-expand all sections
      const groupedVariants = generatedVariants.reduce((groups, variant) => {
        const firstAttr = variant.attributes[0];
        const groupKey = firstAttr ? `${firstAttr.attributeName}: ${firstAttr.value}` : 'Default';
        groups[groupKey] = true;
        return groups;
      }, {} as { [key: string]: boolean });
      setExpandedSections(new Set(Object.keys(groupedVariants)));
    }
  }, [generatedVariants.length]);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, attributesRes, addonsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/variation-attributes?includeValues=true'),
        fetch('/api/addons')
      ]);
      
      const categoriesData = await categoriesRes.json();
      const attributesData = await attributesRes.json();
      const addonsData = await addonsRes.json();
      
      setCategories(categoriesData);
      setAvailableAttributes(attributesData);
      setAvailableAddons(addonsData.filter((addon: any) => addon.isActive));
    } catch (err) {
      console.error(err);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      const res = await fetch('/api/subcategories');
      const data = await res.json();
      const filtered = data.filter((sub: any) => sub.categoryId === categoryId);
      setSubcategories(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleImageRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const reindexed = newImages.map((img, i) => ({ ...img, sortOrder: i }));
    setImages(reindexed);
  };

  const handleBannerRemove = () => {
    setFormData(prev => ({ ...prev, banner: '' }));
  };

  // New gallery image upload handler
  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingGallery(true);
    setError('');

    const uploaded: { url: string; sortOrder: number }[] = [];
    let nextOrder = images.length;

    for (const file of Array.from(files)) {
      // Validate file size (15MB limit)
      if (file.size > 15 * 1024 * 1024) {
        setError('One or more images exceed 15MB');
        continue;
      }
      if (!file.type.startsWith('image/')) {
        setError('One or more files are not valid images');
        continue;
      }
      try {
        // Use the enhanced upload function with compression and retry
        const { uploadFileWithRetry } = await import('@/utils/imageUtils');
        const data = await uploadFileWithRetry(file, 'products');
        uploaded.push({ url: data.url, sortOrder: nextOrder++ });
      } catch (err) {
        console.error('Upload error:', err);
        setError(`Failed to upload ${file.name}. Please try again.`);
      }
    }

    if (uploaded.length > 0) {
      setImages([...images, ...uploaded]);
    }

    // Clear the input
    e.target.value = '';
    setUploadingGallery(false);
  };

  // New banner image upload handler
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit for banners)
    if (file.size > 10 * 1024 * 1024) {
      setError('Banner image must be less than 10MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setUploadingBanner(true);
    setError('');

    try {
      // Use the enhanced upload function with compression and retry
      const { uploadFileWithRetry } = await import('@/utils/imageUtils');
      const data = await uploadFileWithRetry(file, 'products/banner');
      setFormData(prev => ({ ...prev, banner: data.url }));
      
      // Clear the input
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload banner. Please try again.');
    } finally {
      setUploadingBanner(false);
    }
  };

  // Variation attribute management
  const addSelectedAttribute = (attributeId: string) => {
    const attribute = availableAttributes.find(attr => attr.id === attributeId);
    if (!attribute) return;

    const isAlreadySelected = selectedAttributes.some(attr => attr.id === attributeId);
    if (isAlreadySelected) return;

    setSelectedAttributes([...selectedAttributes, {
      id: attribute.id,
      name: attribute.name,
      type: attribute.type,
      slug: attribute.slug,
      values: []
    }]);
  };

  const updateSelectedAttributeValues = (attributeId: string, selectedValueObjects: Array<{
    id: string;
    value: string;
    slug: string;
    colorCode?: string;
    image?: string;
  }>) => {
    const updated = selectedAttributes.map(attr => 
      attr.id === attributeId 
        ? { ...attr, values: selectedValueObjects }
        : attr
    );
    setSelectedAttributes(updated);
  };

  const removeSelectedAttribute = (attributeId: string) => {
    setSelectedAttributes(selectedAttributes.filter(attr => attr.id !== attributeId));
  };

  // Addon management functions
  const addSelectedAddon = (addonId: string) => {
    const addon = availableAddons.find(addon => addon.id === addonId);
    if (!addon) return;

    const isAlreadySelected = selectedAddons.some(selected => selected.addonId === addonId);
    if (isAlreadySelected) return;

    setSelectedAddons([...selectedAddons, {
      addonId: addon.id,
      addonTitle: addon.title,
      price: addon.price,
      isRequired: false,
      sortOrder: selectedAddons.length,
      isActive: true
    }]);
  };

  const updateSelectedAddon = (addonId: string, field: keyof SelectedAddon, value: any) => {
    const updated = selectedAddons.map(addon => 
      addon.addonId === addonId 
        ? { ...addon, [field]: value }
        : addon
    );
    setSelectedAddons(updated);
  };

  const removeSelectedAddon = (addonId: string) => {
    setSelectedAddons(selectedAddons.filter(addon => addon.addonId !== addonId));
  };

  // Generate all possible variant combinations
  const generateVariants = () => {
    if (selectedAttributes.length === 0) {
      setGeneratedVariants([]);
      return;
    }

    const validAttributes = selectedAttributes.filter(attr => attr.values.length > 0);
    if (validAttributes.length === 0) {
      setGeneratedVariants([]);
      return;
    }

    // Generate cartesian product of all attribute values
    const combinations: Array<{ [key: string]: { id: string; value: string; slug: string; colorCode?: string; image?: string; } }> = [];
    
    const generateCombinations = (index: number, current: { [key: string]: { id: string; value: string; slug: string; colorCode?: string; image?: string; } }) => {
      if (index === validAttributes.length) {
        combinations.push({ ...current });
        return;
      }

      const attribute = validAttributes[index];
      for (const valueObj of attribute.values) {
        current[attribute.name] = valueObj;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});

    const variants: GeneratedVariant[] = combinations.map((combo, index) => {
      const title = Object.entries(combo).map(([key, valueObj]) => `${key}: ${valueObj.value}`).join(' / ');
      const skuSuffix = Object.values(combo).map(valueObj => valueObj.value).join('-').toLowerCase().replace(/[^a-z0-9]/g, '');
      
      return {
        title,
        attributes: Object.entries(combo).map(([attrName, valueObj]) => {
          const selectedAttr = selectedAttributes.find(attr => attr.name === attrName);
          return {
            attributeId: selectedAttr?.id || '',
            attributeName: attrName,
            attributeType: selectedAttr?.type || '',
            attributeSlug: selectedAttr?.slug || '',
            valueId: valueObj.id,
            value: valueObj.value,
            valueSlug: valueObj.slug,
            colorCode: valueObj.colorCode,
            image: valueObj.image
          };
        }),
        price: formData.price || '0',
        comparePrice: formData.comparePrice || '',
        costPrice: formData.costPrice || '',
        sku: formData.sku ? `${formData.sku}-${skuSuffix}` : '',
        weight: formData.weight || '',
        inventoryQuantity: 0,
        image: '',
        isActive: true,
        outOfStock: false
      };
    });

    setGeneratedVariants(variants);
  };

  const updateVariant = (index: number, field: keyof GeneratedVariant, value: any) => {
    const updated = [...generatedVariants];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedVariants(updated);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Generate variation matrix for frontend consumption
  const generateVariationMatrix = (): VariationMatrix => {
    return {
      attributes: selectedAttributes.map(attr => ({
        id: attr.id,
        name: attr.name,
        type: attr.type,
        slug: attr.slug,
        values: attr.values
      })),
      variants: generatedVariants,
      defaultSelections: selectedAttributes.reduce((acc, attr) => {
        if (attr.values.length > 0) {
          acc[attr.id] = attr.values[0].id; // Set first value as default
        }
        return acc;
      }, {} as { [attributeId: string]: string })
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validate group products with zero price must have addons
    if (formData.productType === 'group' && (!formData.price || parseFloat(formData.price) === 0) && selectedAddons.length === 0) {
      setError('Group products with zero price must have at least one addon');
      setSubmitting(false);
      return;
    }

    try {
      const submitData = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : (formData.productType === 'group' ? 0 : 0),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        // Weight-based stock management fields
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
        // Cannabis-specific fields
        thc: formData.thc ? parseFloat(formData.thc) : null,
        cbd: formData.cbd ? parseFloat(formData.cbd) : null,
        difficulty: formData.difficulty || null,
        floweringTime: formData.floweringTime || null,
        yieldAmount: formData.yieldAmount || null,
        images: images.length > 0 ? images : null,
        selectedTags: selectedTags.length > 0 ? selectedTags : null,
        // Enhanced variation data structure
        variationMatrix: formData.productType === 'variable' ? generateVariationMatrix() : null,
        // Note: variationAttributes column not used - variants are the source of truth
        variants: formData.productType === 'variable' ? generatedVariants : null,
        addons: selectedAddons.length > 0 ? selectedAddons : null,
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create product');
      }

      router.push('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="max-w-6xl">
        {/* Product Type Selection */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Product Type</h3>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="productType"
                value="simple"
                checked={formData.productType === 'simple'}
                onChange={handleChange}
                className="mr-2"
              />
              Simple Product
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="productType"
                value="variable"
                checked={formData.productType === 'variable'}
                onChange={handleChange}
                className="mr-2"
              />
              Variable Product (with variations)
            </label>
            <label className="items-center hidden">
              <input
                type="radio"
                name="productType"
                value="group"
                checked={formData.productType === 'group'}
                onChange={handleChange}
                className="mr-2"
              />
              Group Product (with addons)
            </label>
          </div>
        </div>

        {/* Stock Management Type Selection */}
        <div className="mb-6 p-4 border rounded-lg bg-blue-50 hidden">
          <h3 className="text-lg font-semibold mb-4">⚖️ Stock Management Type</h3>
          <div className="space-y-4">
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="stockManagementType"
                  value="quantity"
                  checked={formData.stockManagementType === 'quantity'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="font-medium">📦 Quantity-Based</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="stockManagementType"
                  value="weight"
                  checked={formData.stockManagementType === 'weight'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="font-medium">⚖️ Weight-Based</span>
              </label>
            </div>
            
            <div className="text-sm text-gray-600">
              {formData.stockManagementType === 'quantity' ? (
                <p>📦 <strong>Quantity-based:</strong> Track inventory by individual units/pieces (e.g., 5 shirts, 10 books)</p>
              ) : (
                <p>⚖️ <strong>Weight-based:</strong> Track inventory by weight (e.g., 2.5kg rice, 500g coffee beans)</p>
              )}
            </div>

            {/* Weight-based specific fields */}
            {formData.stockManagementType === 'weight' && (
              <div className="mt-4 p-4 bg-white border rounded-lg">
                <h4 className="font-medium mb-3">Weight-Based Pricing Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="pricePerUnit">
                      Price per {formData.baseWeightUnit === 'kg' ? 'Kilogram' : 'Gram'} <span className="text-red-500">*</span>
                      <span className="text-sm text-gray-500 block">
                        {formData.baseWeightUnit === 'kg' 
                          ? '(e.g., $50 per kg)' 
                          : '(e.g., $0.05 per gram = $50 per kg)'
                        }
                      </span>
                    </label>
                    <input
                      type="number"
                      id="pricePerUnit"
                      name="pricePerUnit"
                      value={formData.pricePerUnit}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                      step={formData.baseWeightUnit === 'kg' ? '0.01' : '0.0001'}
                      min="0"
                      placeholder={formData.baseWeightUnit === 'kg' ? '50.00' : '0.0500'}
                      required={formData.stockManagementType === 'weight'}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="costPrice">
                      Cost per {formData.baseWeightUnit === 'kg' ? 'Kilogram' : 'Gram'} <span className="text-sm text-gray-500">(For profit tracking)</span>
                    </label>
                    <input
                      type="number"
                      id="costPrice"
                      name="costPrice"
                      value={formData.costPrice}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                      step={formData.baseWeightUnit === 'kg' ? '0.01' : '0.0001'}
                      min="0"
                      placeholder={formData.baseWeightUnit === 'kg' ? '30.00' : '0.0300'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used to calculate profit margins for weight-based products
                    </p>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2" htmlFor="baseWeightUnit">
                      Base Weight Unit
                    </label>
                    <select
                      id="baseWeightUnit"
                      name="baseWeightUnit"
                      value={formData.baseWeightUnit}
                      onChange={handleChange}
                      className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    >
                      <option value="grams">Grams (g)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>
                </div>
                
                {formData.pricePerUnit && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-700">
                      <strong>Price Preview:</strong> 
                      {formData.baseWeightUnit === 'kg' ? (
                        <>
                          <CurrencySymbol />{parseFloat(formData.pricePerUnit || '0').toFixed(2)} per kg = 
                          <CurrencySymbol />{(parseFloat(formData.pricePerUnit || '0') / 1000).toFixed(4)} per gram
                        </>
                      ) : (
                        <>
                          <CurrencySymbol />{parseFloat(formData.pricePerUnit || '0').toFixed(4)} per gram = 
                          <CurrencySymbol />{(parseFloat(formData.pricePerUnit || '0') * 1000).toFixed(2)} per kg
                        </>
                      )}
                    </p>
                    {formData.costPrice && (
                      <p className="text-sm text-orange-700 mt-1">
                        <strong>Cost Preview:</strong> 
                        {formData.baseWeightUnit === 'kg' ? (
                          <>
                            <CurrencySymbol />{parseFloat(formData.costPrice || '0').toFixed(2)} per kg = 
                            <CurrencySymbol />{(parseFloat(formData.costPrice || '0') / 1000).toFixed(4)} per gram
                          </>
                        ) : (
                          <>
                            <CurrencySymbol />{parseFloat(formData.costPrice || '0').toFixed(4)} per gram = 
                            <CurrencySymbol />{(parseFloat(formData.costPrice || '0') * 1000).toFixed(2)} per kg
                          </>
                        )}
                      </p>
                    )}
                    {formData.pricePerUnit && formData.costPrice && (
                      <p className="text-sm text-blue-700 mt-1">
                        <strong>Profit Margin:</strong> 
                        {(() => {
                          const price = parseFloat(formData.pricePerUnit || '0');
                          const cost = parseFloat(formData.costPrice || '0');
                          const profit = price - cost;
                          const margin = price > 0 ? (profit / price) * 100 : 0;
                          return `${margin.toFixed(1)}% (${profit >= 0 ? '+' : ''}<CurrencySymbol />${profit.toFixed(formData.baseWeightUnit === 'kg' ? 2 : 4)} per ${formData.baseWeightUnit === 'kg' ? 'kg' : 'gram'})`;
                        })()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="name">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="description">
                Description
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="Enter a detailed description of your product..."
                height="250px"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="shortDescription">
                Short Description
              </label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                rows={2}
              />
            </div>

            {/* Cannabis-specific fields */}
            <div className="mt-6 p-4 border rounded-lg bg-green-50 hidden">
              <h4 className="text-lg font-semibold mb-4 text-green-800">🌿 Cannabis Properties</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="thc">
                    THC % <span className="text-sm text-gray-500">(0-100)</span>
                  </label>
                  <input
                    type="number"
                    id="thc"
                    name="thc"
                    value={formData.thc}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 25.50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="cbd">
                    CBD % <span className="text-sm text-gray-500">(0-100)</span>
                  </label>
                  <input
                    type="number"
                    id="cbd"
                    name="cbd"
                    value={formData.cbd}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 2.10"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="difficulty">
                    Difficulty
                  </label>
                  <input
                    type="text"
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Beginner, Intermediate, Advanced"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="floweringTime">
                    Flowering Time
                  </label>
                  <input
                    type="text"
                    id="floweringTime"
                    name="floweringTime"
                    value={formData.floweringTime}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., 8-9 weeks, 55-65 days"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-700 mb-2" htmlFor="yieldAmount">
                    Yield
                  </label>
                  <input
                    type="text"
                    id="yieldAmount"
                    name="yieldAmount"
                    value={formData.yieldAmount}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., 400-500g/m², High, Medium, Low"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column - Pricing & Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pricing, Category & Images</h3>
            
            {/* Only show pricing fields for simple products and quantity-based */}
            {formData.productType === 'simple' && formData.stockManagementType === 'quantity' && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="price">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2" htmlFor="comparePrice">
                    Old Price <span className="text-sm text-gray-500">(Optional - for showing discounts)</span>
                  </label>
                  <input
                    type="number"
                    id="comparePrice"
                    name="comparePrice"
                    value={formData.comparePrice}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="outOfStock"
                    name="outOfStock"
                    checked={formData.outOfStock}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-gray-700" htmlFor="outOfStock">
                    Out of stock
                  </label>
                </div>

                <div className="">
                  <label className="block text-gray-700 mb-2" htmlFor="costPrice">
                    Cost Price <span className="text-sm text-gray-500">(For profit tracking)</span>
                  </label>
                  <input
                    type="number"
                    id="costPrice"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used to calculate profit margins and track business performance
                  </p>
                </div>
              </>
            )}

            {/* Weight-based pricing info for simple products */}
            {formData.productType === 'simple' && formData.stockManagementType === 'weight' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">⚖️ Weight-Based Product Pricing</h4>
                <p className="text-sm text-yellow-700">
                  This product uses weight-based pricing. The price per gram is configured above in the Stock Management section.
                  Customers will select the weight they want, and the price will be calculated automatically.
                </p>
                {formData.pricePerUnit && (
                  <div className="mt-2 text-sm">
                    <p className="text-yellow-800">
                                              <strong>Current Rate:</strong> <CurrencySymbol />{parseFloat(formData.pricePerUnit).toFixed(4)} per gram
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Show informational message for variable/grouped products */}
            {formData.productType === 'variable' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Variable Product Pricing</h4>
                <p className="text-sm text-blue-700">
                  Prices will be set individually for each variant below. Each variant can have its own price.
                </p>
              </div>
            )}

            {formData.productType === 'group' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Group Product Pricing</h4>
                <p className="text-sm text-green-700">
                  Product pricing will come from the selected addons below. Customers will choose which addons they want.
                </p>
              </div>
            )}

            

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="categoryId">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a category</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Gallery Manager */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Product Gallery</h3>
              <p className="text-sm text-gray-600">Manage your product images with our advanced uploader</p>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {images.map((imageObj, index) => (
              <div 
                key={`${imageObj.url}-${index}`} 
                className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border-2 border-purple-100 cursor-move"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', index.toString());
                  (e.currentTarget as HTMLElement).style.opacity = '0.5';
                }}
                onDragEnd={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = '1';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor = '#8b5cf6';
                }}
                onDragLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
                  const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  const dropIndex = index;
                  if (!Number.isNaN(dragIndex) && dragIndex !== dropIndex) {
                    const reordered = [...images];
                    const [dragged] = reordered.splice(dragIndex, 1);
                    reordered.splice(dropIndex, 0, dragged);
                    const updated = reordered.map((img, i) => ({ ...img, sortOrder: i }));
                    setImages(updated);
                  }
                }}
              >
                <div className="aspect-square overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img 
                    src={imageObj.url} 
                    alt={`Gallery ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    onError={(e) => {
                      console.error('Failed to load image:', imageObj.url);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="flex flex-col items-center justify-center h-full text-gray-500">
                            <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span class="text-xs">Failed to load</span>
                          </div>
                        `;
                      }
                    }}
                    onLoad={() => {
                      console.log('Successfully loaded image:', imageObj.url);
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-none bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  #{index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => handleImageRemove(index)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-transparent to-transparent p-2">
                  <p className="text-white text-xs font-medium">Order: {imageObj.sortOrder + 1}</p>
                </div>
              </div>
            ))}
            
            {/* Add New Image Card */}
            <div className="aspect-square border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center bg-white hover:bg-purple-50 transition-colors duration-300 cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryImageUpload}
                className="hidden"
                id="gallery-upload"
                disabled={submitting || uploadingGallery}
              />
              <label htmlFor="gallery-upload" className={`w-full h-full flex flex-col items-center justify-center ${uploadingGallery ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                  {uploadingGallery ? (
                    <svg className="w-6 h-6 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                </div>
                <span className="text-purple-600 font-medium text-sm">
                  {uploadingGallery ? 'Uploading...' : 'Add Image'}
                </span>
                <span className="text-gray-500 text-xs mt-1">
                  {uploadingGallery ? 'Please wait' : 'Click to browse'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recommended: 355x250px • Images stored in 'products' directory • Supports JPG, PNG, WebP • Max 15MB per image</span>
          </div>
        </div>

        {/* Hero Banner Manager */}
        <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl shadow-sm hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h2a1 1 0 011 1v3" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Hero Banner</h3>
              <p className="text-sm text-gray-600">Upload a promotional banner for marketing displays</p>
            </div>
          </div>

          {formData.banner ? (
            <div className="relative bg-white rounded-lg overflow-hidden shadow-md border-2 border-emerald-100 mb-4">
              <div className="aspect-[16/9] md:aspect-[21/9] overflow-hidden">
                <img 
                  src={formData.banner} 
                  alt="Hero Banner" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute top-4 left-4 bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                HERO BANNER
              </div>
              <button
                type="button"
                onClick={handleBannerRemove}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white font-medium">Current Hero Banner</p>
                <p className="text-white/80 text-sm">Click the trash icon to remove</p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-emerald-300 rounded-lg bg-white hover:bg-emerald-50 transition-colors duration-300 mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerImageUpload}
                className="hidden"
                id="banner-upload"
                disabled={submitting || uploadingBanner}
              />
              <label htmlFor="banner-upload" className={`aspect-[16/9] md:aspect-[21/9] flex flex-col items-center justify-center ${uploadingBanner ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  {uploadingBanner ? (
                    <svg className="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                </div>
                <h4 className="text-emerald-600 font-semibold text-lg mb-2">
                  {uploadingBanner ? 'Uploading Banner...' : 'Upload Hero Banner'}
                </h4>
                <p className="text-gray-600 text-center max-w-md">
                  {uploadingBanner ? 'Please wait while your banner is being uploaded.' : 'Choose a high-quality banner image that represents your product. Recommended size: 840x270px • or larger.'}
                </p>
                <div className="mt-4 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                  {uploadingBanner ? 'Uploading...' : 'Click to Browse Files'}
                </div>
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recommended: 840x270px • Banner stored in 'products/banner' directory • Max 10MB</span>
          </div>
        </div>


          </div>
        </div>

        

        {/* Variable Product Variation Attributes */}
        {formData.productType === 'variable' && (
          <div className="mt-6 mb-6 bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold mb-4">🔧 Variation Attributes</h3>
            
            {/* Add New Attribute */}
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Add Variation Attribute</h4>
              <select
                onChange={(e) => e.target.value && addSelectedAttribute(e.target.value)}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                value=""
              >
                <option value="">Select an attribute to add...</option>
                {availableAttributes
                  .filter(attr => !selectedAttributes.some(selected => selected.id === attr.id))
                  .map((attr) => (
                    <option key={attr.id} value={attr.id}>
                      {attr.name} ({attr.type})
                    </option>
                  ))}
              </select>
            </div>

            {/* Selected Attributes */}
            <div className="space-y-3 max-h-96 overflow-y-auto flex gap-3 flex-wrap" style={{  display: 'flex', flexWrap: 'wrap', gap: '10px', margin: '10px 0 0 2%' }}>
              {selectedAttributes.map((selectedAttr) => {
                const dbAttribute = availableAttributes.find(attr => attr.id === selectedAttr.id);
                if (!dbAttribute) return null;

                return (
                  <div key={selectedAttr.id} className="p-4 border rounded-lg bg-white" style={{  width: '49%', boxSizing: 'border-box', height: '100%' }}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">
                        {selectedAttr.name} 
                        <span className="ml-2 text-sm text-gray-500">({dbAttribute.type})</span>
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Frontend: {dbAttribute.type === 'color' ? 'Color Swatches' : 
                                   dbAttribute.values.length > 5 ? 'Dropdown' : 'Radio Buttons'}
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeSelectedAttribute(selectedAttr.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      
                      {/* Render different UI based on attribute type */}
                      {dbAttribute.type === 'color' ? (
                        // Color swatches preview
                        <div>
                        </div>
                      ) : dbAttribute.values.length > 5 ? (
                        // Dropdown preview
                        <div>
                        </div>
                      ) : (
                        // Radio buttons preview
                        <div>
                        </div>
                      )}

                      {/* Value selection checkboxes */}
                      <div className="border-t pt-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                          {dbAttribute.values.map((value) => (
                            <label key={value.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={selectedAttr.values.some(v => v.id === value.id)}
                                onChange={(e) => {
                                  const newValues = e.target.checked
                                    ? [...selectedAttr.values, value]
                                    : selectedAttr.values.filter(v => v.id !== value.id);
                                  updateSelectedAttributeValues(selectedAttr.id, newValues);
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">
                                {value.value}
                                {value.colorCode && (
                                  <span 
                                    className="inline-block w-4 h-4 rounded-full ml-1 border"
                                    style={{ backgroundColor: value.colorCode }}
                                  ></span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          {/* Selected: {selectedAttr.values.map(v => v.value).join(', ') || 'None'} */}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {generatedVariants.length > 0 && (
              <div className="mt-8 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Generated Variants ({generatedVariants.length})</h4>
                  <button
                    type="button"
                    onClick={() => setShowVariantGeneration(!showVariantGeneration)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    {showVariantGeneration ? 'Hide' : 'Show'} Variants
                  </button>
                </div>

                {showVariantGeneration && (
                  <div className="space-y-4">
                    {(() => {
                      // Group variants by first attribute for collapsible sections
                      const groupedVariants = generatedVariants.reduce((groups, variant, index) => {
                        const firstAttr = variant.attributes[0];
                        const groupKey = firstAttr ? `${firstAttr.attributeName}: ${firstAttr.value}` : 'Default';
                        
                        if (!groups[groupKey]) {
                          groups[groupKey] = [];
                        }
                        groups[groupKey].push({ ...variant, index });
                        return groups;
                      }, {} as { [key: string]: (GeneratedVariant & { index: number })[] });

                      return Object.entries(groupedVariants).map(([groupName, groupVariants]) => (
                        <div key={groupName} className="border rounded-lg bg-white">
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
                                  const prices = groupVariants.map(v => parseFloat(v.price) || 0);
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
                              {groupVariants.map((variant) => (
                                <div key={variant.index} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                                    {/* Variant Info */}
                                    <div className="lg:col-span-4">
                                      <div className="flex flex-wrap gap-1">
                                        {variant.attributes.map((attr, attrIndex) => (
                                          <span
                                            key={attrIndex}
                                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                          >
                                            {attr.attributeName}: {attr.value}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="lg:col-span-3">
                                      <div className="space-y-2">
                                        <div>
                                          <label className="block text-xs text-gray-600">Price</label>
                                          <input
                                            type="text"
                                            value={variant.price}
                                            onChange={(e) => updateVariant(variant.index, 'price', e.target.value)}
                                            className="w-full p-1 text-sm border rounded"
                                            placeholder="0.00"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600">Old Price <span className="text-gray-400">(Optional)</span></label>
                                          <input
                                            type="text"
                                            value={variant.comparePrice}
                                            onChange={(e) => updateVariant(variant.index, 'comparePrice', e.target.value)}
                                            className="w-full p-1 text-sm border rounded"
                                            placeholder="0.00"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-600">Cost Price <span className="text-gray-400">(For profit)</span></label>
                                          <input
                                            type="text"
                                            value={variant.costPrice}
                                            onChange={(e) => updateVariant(variant.index, 'costPrice', e.target.value)}
                                            className="w-full p-1 text-sm border rounded"
                                            placeholder="0.00"
                                          />
                                        </div>
                                      </div>
                                    </div>


                                    {/* Actions */}
                                    <div className="lg:col-span-2 flex flex-col gap-2">
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={variant.isActive}
                                          onChange={(e) => updateVariant(variant.index, 'isActive', e.target.checked)}
                                          className="mr-1"
                                        />
                                        <span className="text-sm">Active</span>
                                      </label>
                                      <label className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={variant.outOfStock}
                                          onChange={(e) => updateVariant(variant.index, 'outOfStock', e.target.checked)}
                                          className="mr-1"
                                        />
                                        <span className="text-sm">Out of stock</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Product Addons - Available for all product types */}
        {(
          <div className="mt-6 hidden">
            <h3 className="text-lg font-semibold mb-4">🧩 Product Addons</h3>
            
            {/* Add New Addon */}
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Add Addon to Product</h4>
              <select
                onChange={(e) => e.target.value && addSelectedAddon(e.target.value)}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                value=""
              >
                <option value="">Select an addon to add...</option>
                {availableAddons
                  .filter(addon => !selectedAddons.some(selected => selected.addonId === addon.id))
                  .map((addon) => (
                    <option key={addon.id} value={addon.id}>
                      {addon.groupTitle ? `[${addon.groupTitle}] ` : ''}{addon.title} - {parseFloat(addon.price).toFixed(2)}
                    </option>
                  ))}
              </select>
              {availableAddons.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No addons available. <a href="/addons/add" className="text-blue-500 hover:underline">Create some addons first</a>.
                </p>
              )}
            </div>

            {/* Selected Addons */}
            <div className="space-y-4">
              {selectedAddons.map((selectedAddon) => {
                const addon = availableAddons.find(a => a.id === selectedAddon.addonId);

                return (
                  <div key={selectedAddon.addonId} className="p-4 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">
                        {addon?.groupTitle && (
                          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs mr-2">
                            {addon.groupTitle}
                          </span>
                        )}
                        {selectedAddon.addonTitle}
                        {addon?.description && (
                          <span className="block text-sm text-gray-600">{addon.description}</span>
                        )}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeSelectedAddon(selectedAddon.addonId)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Override Price
                        </label>
                        <input
                          type="number"
                          value={selectedAddon.price}
                          onChange={(e) => updateSelectedAddon(selectedAddon.addonId, 'price', e.target.value)}
                          className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                          step="0.01"
                          min="0"
                        />
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          Original price: <CurrencySymbol />{addon ? parseFloat(addon.price).toFixed(2) : '0.00'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={selectedAddon.sortOrder}
                          onChange={(e) => updateSelectedAddon(selectedAddon.addonId, 'sortOrder', parseInt(e.target.value) || 0)}
                          className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                          min="0"
                        />
                      </div>

                      <div className="flex flex-col justify-center space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedAddon.isRequired}
                            onChange={(e) => updateSelectedAddon(selectedAddon.addonId, 'isRequired', e.target.checked)}
                            className="mr-2"
                          />
                          Required Addon
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedAddon.isActive}
                            onChange={(e) => updateSelectedAddon(selectedAddon.addonId, 'isActive', e.target.checked)}
                            className="mr-2"
                          />
                          Active
                        </label>
                      </div>
                    </div>

                    {addon?.image && (
                      <div className="mt-3">
                        <img 
                          src={addon.image} 
                          alt={addon.title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedAddons.length === 0 && (
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                No addons selected. Add some addons to enhance your product.
              </div>
            )}

            {/* Product Pricing Summary with Addons */}
            {selectedAddons.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Pricing Summary with Addons</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base Product Price:</span>
                    <span className="flex items-center gap-1">
                      <CurrencySymbol />
                      {formData.productType === 'simple' 
                        ? (formData.price ? parseFloat(formData.price).toFixed(2) : '0.00')
                        : formData.productType === 'variable' 
                          ? 'Variable pricing'
                          : (formData.price ? parseFloat(formData.price).toFixed(2) : '0.00')
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Addon Prices:</span>
                    <span className="flex items-center gap-1">
                      <CurrencySymbol />
                      {selectedAddons.reduce((total, addon) => total + parseFloat(addon.price), 0).toFixed(2)}
                    </span>
                  </div>
                  {formData.productType !== 'variable' && (
                    <div className="flex justify-between font-medium pt-2 border-t border-blue-300">
                      <span>Maximum Product Price:</span>
                      <span className="flex items-center gap-1">
                        <CurrencySymbol />
                        {(
                          (formData.price ? parseFloat(formData.price) : 0) + 
                          selectedAddons.reduce((total, addon) => total + parseFloat(addon.price), 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-blue-700 mt-2">
                    * Final price depends on which addons customer selects
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="items-center hidden">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="mr-2"
              />
              Featured Product
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              Active
            </label>
          </div>
        </div>

        {/* Product Tags */}
        <div className="mt-6 hidden">
          <h3 className="text-lg font-semibold mb-4">🏷️ Product Tags</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <TagSelector
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              disabled={submitting}
            />
          </div>
        </div>

        {/* SEO */}
        <div className="mt-6 hidden">
          <h3 className="text-lg font-semibold mb-4">SEO</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="metaTitle">
                Meta Title
              </label>
              <input
                type="text"
                id="metaTitle"
                name="metaTitle"
                value={formData.metaTitle}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="metaDescription">
                Meta Description
              </label>
              <textarea
                id="metaDescription"
                name="metaDescription"
                value={formData.metaDescription}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Creating...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
} 