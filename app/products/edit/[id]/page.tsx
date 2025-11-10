'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ImageUploader from '../../../components/ImageUploader';
import CurrencySymbol from '../../../components/CurrencySymbol';
import RichTextEditor from '../../../components/RichTextEditor';
import TagSelector from '../../../components/TagSelector';
import VariantManager from '../../../../components/VariantManager';
import useProductVariants from '../../../../hooks/useProductVariants';
import { formatPrice, calculatePriceRange } from '../../../../utils/priceUtils';
import { 
  normalizeVariationAttributes, 
  normalizeVariantOptions, 
  normalizeProductImageObjects, 
  normalizeProductTags,
  deepParseJSON 
} from '../../../../utils/jsonUtils';

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

interface SelectedTag {
  tagId: string;
  tagName: string;
  groupId: string;
  groupName: string;
  customValue?: string;
  color?: string;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  // Use the custom hook for variants
  const { data: variantData, loading: variantsLoading, refetch: refetchVariants } = useProductVariants(productId);
  
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
    productType: 'simple',
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
  const [variantChanges, setVariantChanges] = useState<Record<string, Record<string, any>>>({});
  
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
  const [explicitSubmit, setExplicitSubmit] = useState(false);

  useEffect(() => {
    fetchProductAndInitialData();
  }, [productId]);

  

  useEffect(() => {
    if (formData.categoryId) {
      fetchSubcategories(formData.categoryId);
    } else {
      setSubcategories([]);
    }
  }, [formData.categoryId]);

  const fetchProductAndInitialData = async () => {
    try {
      const [productRes, categoriesRes, attributesRes, addonsRes, productAddonsRes, productTagsRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch('/api/categories'),
        fetch('/api/variation-attributes?includeValues=true'),
        fetch('/api/addons'),
        fetch(`/api/product-addons?productId=${productId}`),
        fetch(`/api/product-tags?productId=${productId}`)
      ]);
      
      const product = await productRes.json();
      const categoriesData = await categoriesRes.json();
      const attributesData = await attributesRes.json();
      const addonsData = await addonsRes.json();
      const productAddonsData = await productAddonsRes.json();
      const productTagsData = await productTagsRes.json();
      
      // Parse product data using deep parsing utilities
      const productImages = normalizeProductImageObjects(product.images);
      const productTags = normalizeProductTags(product.tags);
      const productVariationAttributes = normalizeVariationAttributes(product.variationAttributes);
      
      setFormData({
        name: product.name || '',
        description: product.description || '',
        shortDescription: product.shortDescription || '',
        sku: product.sku || '',
        price: product.price || '',
        comparePrice: product.comparePrice || '',
        costPrice: product.costPrice || '',
        categoryId: product.categoryId || '',
        subcategoryId: product.subcategoryId || '',
        weight: product.weight || '',
        isFeatured: product.isFeatured || false,
        isActive: product.isActive !== undefined ? product.isActive : true,
        isDigital: product.isDigital || false,
        requiresShipping: product.requiresShipping !== undefined ? product.requiresShipping : true,
        taxable: product.taxable !== undefined ? product.taxable : true,
        outOfStock: product.outOfStock || false,
        metaTitle: product.metaTitle || '',
        metaDescription: product.metaDescription || '',
        productType: product.productType || 'simple',
        banner: product.banner || '', // Banner image URL
        // Weight-based stock management fields
        stockManagementType: product.stockManagementType || 'quantity',
        pricePerUnit: product.pricePerUnit || '',
        baseWeightUnit: product.baseWeightUnit || 'grams',
        // Cannabis-specific fields
        thc: product.thc || '',
        cbd: product.cbd || '',
        difficulty: product.difficulty || '',
        floweringTime: product.floweringTime || '',
        yieldAmount: product.yieldAmount || ''
      });
      
      setImages(Array.isArray(productImages) ? productImages : []);
      setCategories(categoriesData);
      setAvailableAttributes(attributesData);
      
      // Auto-select attributes based on existing variants and saved variation attributes
      const attributesFromVariants = new Map<string, Set<string>>();
      
      // First, get attributes from existing variants if available
      if (variantData && variantData.variants.length > 0) {
        variantData.variants.forEach(variant => {
          // Normalize variant attributes using our utility
          const normalizedAttributes = normalizeVariantOptions(variant.attributes);
          Object.entries(normalizedAttributes).forEach(([attrName, attrValue]) => {
            if (!attributesFromVariants.has(attrName)) {
              attributesFromVariants.set(attrName, new Set());
            }
            attributesFromVariants.get(attrName)!.add(attrValue);
          });
        });
      }
      
      // If no variants but we have saved variation attributes, use those
      if (attributesFromVariants.size === 0 && productVariationAttributes.length > 0) {
        productVariationAttributes.forEach((attr: any) => {
          if (attr.name && attr.values && Array.isArray(attr.values)) {
            attributesFromVariants.set(attr.name, new Set(attr.values.map((v: any) => v.value || v)));
          }
        });
      }

      // Build the selected attributes array
      const autoSelectedAttributes: VariationAttribute[] = [];
      attributesFromVariants.forEach((values, attrName) => {
        const dbAttribute = attributesData.find((attr: any) => attr.name === attrName);
        if (dbAttribute) {
          const selectedValues = Array.from(values).map((value: string) => {
            const dbValue = dbAttribute.values.find((v: any) => v.value === value);
            return dbValue || {
              id: `temp_${value}`,
              value: value,
              slug: value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
              colorCode: undefined,
              image: undefined
            };
          });
          
          autoSelectedAttributes.push({
            id: dbAttribute.id,
            name: dbAttribute.name,
            type: dbAttribute.type,
            slug: dbAttribute.slug,
            values: selectedValues
          });
        }
      });
      
      setSelectedAttributes(autoSelectedAttributes);
      
      // Set available addons
      setAvailableAddons(addonsData.filter((addon: any) => addon.isActive));
      
      // Convert existing product addons to our format
      const formattedProductAddons = productAddonsData.map((item: any) => ({
        addonId: item.productAddon.addonId,
        addonTitle: item.addon.title,
        price: item.productAddon.price,
        isRequired: item.productAddon.isRequired,
        sortOrder: item.productAddon.sortOrder,
        isActive: item.productAddon.isActive
      }));
      
      setSelectedAddons(formattedProductAddons);
      
      // Convert existing product tags to our format
      const formattedProductTags = Array.isArray(productTagsData) ? productTagsData
        .filter((item: any) => item.tag && item.tag.id) // Filter out items with null tags
        .map((item: any) => ({
          tagId: item.tag.id,
          tagName: item.tag.name,
          groupId: item.tag.groupId,
          groupName: item.tag.group?.name || 'Unknown Group',
          customValue: item.customValue,
          color: item.tag.color || item.tag.group?.color || '#gray',
        })) : [];
      
      setSelectedTags(formattedProductTags);
      
    } catch (err) {
      console.error(err);
      setError('Failed to load product data');
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

  // Variant management functions using our optimized hook
  const handleVariantUpdate = (variantId: string, field: string, value: any) => {
    // Store variant changes locally instead of making immediate API calls
    setVariantChanges(prev => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value
      }
    }));
    
    console.log(`Variant ${variantId} field '${field}' changed to:`, value, '(stored locally, will be saved on form submit)');
  };

  const handleVariantDelete = async (variantId: string) => {
    // Add debugging to confirm the variant ID
    console.log('🗑️ Deleting variant with ID:', variantId);
    
    // Find the variant details for logging
    const variantToDelete = variantData?.variants.find(v => v.id === variantId);
    if (variantToDelete) {
      console.log('🗑️ Variant details:', {
        id: variantToDelete.id,
        title: variantToDelete.title,
        attributes: variantToDelete.attributes
      });
    } else {
      console.warn('⚠️ Variant not found in current data:', variantId);
    }
    
    // Immediately delete from database via API call
    try {
      const response = await fetch(`/api/products/${productId}/variants/${variantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete variant');
      }

      console.log('✅ Variant deleted successfully from database');
      
      // Refresh variant data to sync with database (this will update the UI)
      await refetchVariants();
      
      // Also refresh product data to update variation attributes
      await fetchProductAndInitialData();
      
    } catch (error) {
      console.error('❌ Error deleting variant:', error);
      setError(`Failed to delete variant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Function to get unused variation attributes and new values
  const getNewVariationData = () => {
    const usedAttributeNames = selectedAttributes.map(attr => attr.name);
    
    // 1. Find completely new attributes (not used at all)
    const newAttributes = availableAttributes.filter(attr => !usedAttributeNames.includes(attr.name));
    
    // 2. Find existing attributes with new values
    const attributesWithNewValues: VariationAttribute[] = [];
    
    selectedAttributes.forEach(selectedAttr => {
      const dbAttribute = availableAttributes.find(attr => attr.name === selectedAttr.name);
      if (dbAttribute) {
        // Get currently used value IDs for this attribute
        const usedValueIds = selectedAttr.values.map(v => v.id);
        
        // Find values in the database that aren't currently used
        const newValues = dbAttribute.values.filter(dbValue => !usedValueIds.includes(dbValue.id));
        
        if (newValues.length > 0) {
          // Create an attribute object with only the new values
          attributesWithNewValues.push({
            id: dbAttribute.id,
            name: dbAttribute.name,
            type: dbAttribute.type,
            slug: dbAttribute.slug,
            values: newValues
          });
        }
      }
    });
    
    return {
      newAttributes,
      attributesWithNewValues,
      hasNewData: newAttributes.length > 0 || attributesWithNewValues.length > 0
    };
  };

  // Function to get unused variation attributes (backward compatibility)
  const getUnusedVariationAttributes = () => {
    const { newAttributes, attributesWithNewValues } = getNewVariationData();
    return [...newAttributes, ...attributesWithNewValues];
  };

  // Function to generate all possible variant combinations from attributes
  const generateVariantCombinations = (attributes: VariationAttribute[]) => {
    if (attributes.length === 0) return [];
    
    const combinations: Array<Record<string, string>> = [];
    
    const generateCombos = (index: number, currentCombo: Record<string, string>) => {
      if (index === attributes.length) {
        combinations.push({ ...currentCombo });
        return;
      }
      
      const attribute = attributes[index];
      for (const value of attribute.values) {
        currentCombo[attribute.name] = value.value;
        generateCombos(index + 1, currentCombo);
      }
    };
    
    generateCombos(0, {});
    return combinations;
  };

  // Function to import new variations from unused attributes
  const handleImportNewVariations = async () => {
    const { newAttributes, attributesWithNewValues, hasNewData } = getNewVariationData();
    
    if (!hasNewData) {
      setError('No new variation attributes or values available to import. All available options are already being used.');
      return;
    }

    try {
      // Create updated attributes list
      const allAttributes: VariationAttribute[] = [...selectedAttributes];
      
      // 1. Add completely new attributes
      newAttributes.forEach(attr => {
        allAttributes.push({
          id: attr.id,
          name: attr.name,
          type: attr.type,
          slug: attr.slug,
          values: attr.values
        });
      });
      
      // 2. Update existing attributes with new values
      attributesWithNewValues.forEach(attrWithNewValues => {
        const existingAttrIndex = allAttributes.findIndex(attr => attr.name === attrWithNewValues.name);
        if (existingAttrIndex !== -1) {
          // Merge new values with existing values
          allAttributes[existingAttrIndex] = {
            ...allAttributes[existingAttrIndex],
            values: [...allAttributes[existingAttrIndex].values, ...attrWithNewValues.values]
          };
        }
      });
      
      // Generate all possible variant combinations from all attributes
      const allCombinations = generateVariantCombinations(allAttributes);
      
      // Get existing variant combinations to avoid duplicates
      const existingCombinations = variantData?.variants.map(variant => variant.attributes) || [];
      
      // Find only the new combinations that don't already exist
      const newCombinations = allCombinations.filter(newCombo => {
        return !existingCombinations.some(existing => {
          return Object.keys(newCombo).every(key => 
            existing[key] === newCombo[key]
          );
        });
      });

      if (newCombinations.length === 0) {
        setError('No new variant combinations to create. All possible combinations already exist.');
        return;
      }

      // Create new variant objects for the new combinations
      const newVariants = newCombinations.map(combo => {
        const title = Object.entries(combo).map(([key, value]) => `${key}: ${value}`).join(', ');
        return {
          title,
          attributes: combo,
          price: parseFloat(formData.price || '0'),
          comparePrice: null,
          costPrice: null,
          sku: '',
          inventoryQuantity: 0,
          isActive: true,
          outOfStock: false
        };
      });

      // Update selected attributes and save to database
      setSelectedAttributes(allAttributes);
      
      // Use the existing product update API to save the new attributes and variants
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType: 'variable',
          variationAttributes: allAttributes,
          variants: [...(variantData?.variants || []), ...newVariants]
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate new variants');
      }

      // Refresh variant data to show the new variants
      await refetchVariants();
      
      setError(''); // Clear any previous errors
      // Show success message
      const totalNewAttrs = newAttributes.length;
      const totalNewValues = attributesWithNewValues.reduce((sum, attr) => sum + attr.values.length, 0);
      console.log(`Successfully imported ${totalNewAttrs} new attributes and ${totalNewValues} new values, generating ${newVariants.length} new variants`);
      
    } catch (err: any) {
      console.error('Error importing variations:', err);
      setError(err.message || 'Failed to import new variations');
    }
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

  // Merge original variant data with pending changes for display
  const getVariantsWithChanges = () => {
    if (!variantData?.variants) return [];
    
    return variantData.variants.map(variant => {
      const changes = variantChanges[variant.id];
      if (changes) {
        return { ...variant, ...changes };
      }
      return variant;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent form submission on Enter key press in input fields
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      // Allow Enter in textarea fields but prevent in input fields
      if (tagName === 'input' || tagName === 'select') {
        e.preventDefault();
        return false;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only allow submission if it was explicitly triggered by the submit button
    if (!explicitSubmit) {
      console.log('Form submission prevented - not explicitly triggered');
      return;
    }
    
    // Additional check to prevent accidental submissions
    if (submitting) {
      return;
    }
    
    setSubmitting(true);
    setExplicitSubmit(false); // Reset the flag
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
        price: formData.price ? parseFloat(formData.price) : (formData.productType === 'group' ? 0 : parseFloat(formData.price)),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : null,
        pricePerUnit: formData.pricePerUnit ? parseFloat(formData.pricePerUnit) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        // Cannabis-specific fields
        thc: formData.thc ? parseFloat(formData.thc) : null,
        cbd: formData.cbd ? parseFloat(formData.cbd) : null,
        difficulty: formData.difficulty || null,
        floweringTime: formData.floweringTime || null,
        yieldAmount: formData.yieldAmount || null,
        images: images.length > 0 ? images : null,
        selectedTags: selectedTags.length > 0 ? selectedTags : null,
        // Note: variationAttributes not sent - variants are the source of truth
        variantChanges: Object.keys(variantChanges).length > 0 ? variantChanges : null,
        addons: selectedAddons.length > 0 ? selectedAddons : null,
      };

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update product');
      }

      // Clear local changes after successful submission
      setVariantChanges({});
      
      // Refresh variant data and reload product data to get updated variation attributes
      await refetchVariants();
      await fetchProductAndInitialData();
      
      // Optionally navigate back to products list
      // router.push('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || variantsLoading) return <div className="p-8">Loading...</div>;

  // Calculate price range for variable products
  const priceRange = variantData ? calculatePriceRange(variantData.variants) : null;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Price Range Display for Variable Products */}
      {formData.productType === 'variable' && variantData && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Variable Product Pricing</h3>
              <p className="text-blue-700">
                {priceRange?.hasRange 
                  ? `Price Range: ${priceRange.range}`
                  : `Fixed Price: ${priceRange?.range}`
                }
              </p>
            </div>
            <div className="text-blue-700">
              <span className="text-2xl font-bold">{variantData.totalVariants}</span>
              <span className="text-sm ml-1">variants</span>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="max-w-6xl">
        {/* Product Type Selection */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50 hidden">
          <h3 className="text-lg font-semibold mb-4">Product Type</h3>
          <div className="flex gap-4" >
            <label className="flex items-center">
              <input
                type="radio"
                name="productType"
                value="simple"
                checked={formData.productType === 'simple'}
                onChange={handleChange}
                className="mr-2"
                disabled={true}
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
                disabled={true}
              />
              Variable Product (with variations)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="productType"
                value="group"
                checked={formData.productType === 'group'}
                onChange={handleChange}
                className="mr-2"
                disabled={true}
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
            <h3 className="text-lg font-semibold">Pricing & Details</h3>
            
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
                    Compare Price <span className="text-sm text-gray-500">(Optional - for showing discounts)</span>
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

                <div>
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
                  Prices will be set individually for each variant below. Each variant can have its own price, compare price, and cost price.
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

            {/* Base price field for group products */}
            {formData.productType === 'group' && (
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="price">
                  Base Price <span className="text-sm text-gray-500">(Optional - can be 0 if all pricing comes from addons)</span>
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
                />
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
                id="gallery-upload-edit"
                disabled={submitting || uploadingGallery}
              />
              <label htmlFor="gallery-upload-edit" className={`w-full h-full flex flex-col items-center justify-center ${uploadingGallery ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
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
                id="banner-upload-edit"
                disabled={submitting || uploadingBanner}
              />
              <label htmlFor="banner-upload-edit" className={`aspect-[16/9] md:aspect-[21/9] flex flex-col items-center justify-center ${uploadingBanner ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
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
                  {uploadingBanner ? 'Please wait while your banner is being uploaded.' : 'Choose a high-quality banner image that represents your product. Recommended size: 840x270px or larger.'}
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
            <span> Recommended: 840x270px • Max 10MB • Stored in 'products/banner' directory</span>
          </div>
        </div>

            
          </div>
        </div>


        {/* Variable Product Variants - Using our optimized VariantManager */}
        {formData.productType === 'variable' && variantData && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🔧 Product Variants</h3>
              <div className="flex items-center gap-3">
                {/* Import New Variations Button */}
                <button
                  type="button"
                  onClick={handleImportNewVariations}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={submitting || !getNewVariationData().hasNewData}
                  title={!getNewVariationData().hasNewData ? 'No new variation attributes or values available' : `Import new variation data`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Import New Variations</span>
                  {getNewVariationData().hasNewData && (
                    <span className="bg-green-600 text-green-100 px-2 py-1 rounded-full text-xs">
                      NEW
                    </span>
                  )}
                </button>
                
                {Object.keys(variantChanges).length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-yellow-800 font-medium">
                      {Object.keys(variantChanges).length} variant{Object.keys(variantChanges).length > 1 ? 's' : ''} modified
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Show available attributes info */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="text-blue-700">
                  <strong>Current Attributes:</strong> {selectedAttributes.length > 0 ? selectedAttributes.map(attr => `${attr.name} (${attr.values.length} values)`).join(', ') : 'None'}
                </div>
                
                {(() => {
                  const { newAttributes, attributesWithNewValues } = getNewVariationData();
                  return (
                    <>
                      {newAttributes.length > 0 && (
                        <div className="text-green-700">
                          <strong>New Attributes:</strong> {newAttributes.map(attr => `${attr.name} (${attr.values.length} values)`).join(', ')}
                        </div>
                      )}
                      
                      {attributesWithNewValues.length > 0 && (
                        <div className="text-orange-700">
                          <strong>New Values in Existing Attributes:</strong> {attributesWithNewValues.map(attr => `${attr.name} (+${attr.values.length} values)`).join(', ')}
                        </div>
                      )}
                      
                      {newAttributes.length === 0 && attributesWithNewValues.length === 0 && (
                        <div className="text-gray-600">
                          <strong>Available to Import:</strong> None - all variation options are already being used
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Manage individual variant pricing and settings. Changes are saved when you submit the form.
            </p>
            
            <VariantManager
              variants={getVariantsWithChanges()}
              onVariantUpdate={handleVariantUpdate}
              onVariantDelete={handleVariantDelete}
              isEditing={true}
            />
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
            <label className=" items-center hidden">
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

            <label className=" items-center hidden">
              <input
                type="checkbox"
                name="isDigital"
                checked={formData.isDigital}
                onChange={handleChange}
                className="mr-2"
              />
              Digital Product
            </label>

            <label className="items-center hidden">
              <input
                type="checkbox"
                name="requiresShipping"
                checked={formData.requiresShipping}
                onChange={handleChange}
                className="mr-2"
              />
              Requires Shipping
            </label>

            <label className=" items-center hidden">
              <input
                type="checkbox"
                name="taxable"
                checked={formData.taxable}
                onChange={handleChange}
                className="mr-2"
              />
              Taxable
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
            onClick={() => setExplicitSubmit(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Updating...' : 'Update Product'}
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