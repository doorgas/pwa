'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CurrencySymbol from '../../components/CurrencySymbol';
import { 
  formatWeightAuto, 
  isWeightBasedProduct, 
  convertToGrams,
  parseWeightInput,
  calculateWeightBasedPrice,
  getWeightUnits
} from '@/utils/weightUtils';
import { useCurrency } from '@/app/contexts/CurrencyContext';

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  productType: string;
  isActive: boolean;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  // Weight-based fields
  stockManagementType?: string;
  pricePerUnit?: number;
  baseWeightUnit?: string;
}

interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number;
  isActive: boolean;
  inventoryQuantity: number;
}

interface Addon {
  id: string;
  title: string;
  price: number;
  description?: string;
  image?: string;
  isActive: boolean;
}

interface ProductAddon {
  id: string;
  productId: string;
  addonId: string;
  price: number;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
  addon: Addon;
}

interface SelectedAddon {
  addonId: string;
  addonTitle: string;
  price: number;
  quantity: number;
}

interface OrderItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  sku?: string;
  price: number;
  quantity: number;
  totalPrice: number;
  addons?: SelectedAddon[];
  // Weight-based fields
  weightQuantity?: number; // Weight in grams
  weightUnit?: string; // Display unit (grams, kg)
  isWeightBased?: boolean;
}

interface Customer {
  id: string;
  name?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  latitude?: string;
  longitude?: string;
  isActive: boolean;
}

export default function AddOrder() {
  const router = useRouter();
  const { currentCurrency } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stockManagementEnabled, setStockManagementEnabled] = useState(true);
  
  // Loyalty points state
  const [loyaltySettings, setLoyaltySettings] = useState({
    enabled: false,
    earningRate: 1,
    earningBasis: 'subtotal',
    redemptionValue: 0.01,
    maxRedemptionPercent: 50,
    redemptionMinimum: 100,
    minimumOrder: 0
  });
  const [customerPoints, setCustomerPoints] = useState({
    availablePoints: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0
  });
  
  // Order form data
  const [orderData, setOrderData] = useState({
    customerId: '',
    email: '',
    phone: '',
    status: 'pending',
    paymentStatus: 'pending',
    notes: '',
    shippingAmount: 0,
    taxRate: 0, // 10%
    discountAmount: 0,
    discountType: 'amount', // 'amount' or 'percentage'
    currency: currentCurrency,
    // Order type and pickup location fields
    orderType: 'delivery',
    pickupLocationId: '',
    // Driver assignment fields
    assignedDriverId: '',
    deliveryStatus: 'pending',
    assignmentType: 'manual',
    // Loyalty points fields
    pointsToRedeem: 0,
    pointsDiscountAmount: 0,
    useAllPoints: false
  });

  // Customer/shipping information
  const [customerInfo, setCustomerInfo] = useState({
    isGuest: true,
    billingFirstName: '',
    billingLastName: '',
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'US',
    shippingFirstName: '',
    shippingLastName: '',
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: 'US',
    sameAsBilling: true
  });

  // Product selection
  const [productSelection, setProductSelection] = useState({
    selectedProductId: '',
    selectedVariantId: '',
    quantity: 1,
    customPrice: '',
    // Weight-based fields
    weightInput: '',
    weightUnit: 'grams' as 'grams' | 'kg'
  });

  // Group product addon selection
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Driver selection
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Clear selected addons when product changes
  useEffect(() => {
    setSelectedAddons([]);
  }, [productSelection.selectedProductId]);

  const fetchInitialData = async () => {
    try {
      const [productsRes, customersRes, pickupLocationsRes, stockSettingRes, driversRes, loyaltyRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/users'),
        fetch('/api/pickup-locations?activeOnly=true'),
        fetch('/api/settings/stock-management'),
        fetch('/api/drivers/available?includeAll=true'),
        fetch('/api/settings/loyalty')
      ]);

      const productsData = await productsRes.json();
      const customersData = await customersRes.json();
      const pickupLocationsData = await pickupLocationsRes.json();
      const stockData = await stockSettingRes.json();
      const driversData = await driversRes.json();
      const loyaltyData = await loyaltyRes.json();

      // Process products to include variants
      const processedProducts = await Promise.all(
        productsData.map(async (productItem: any) => {
          const product = productItem.product;
          
          // Convert price to number
          product.price = Number(product.price) || 0;
          
          if (product.productType === 'variable') {
            const variantsRes = await fetch(`/api/product-variants?productId=${product.id}`);
            const variantsData = await variantsRes.json();
            product.variants = variantsData.map((v: any) => ({
              ...v.variant,
              price: Number(v.variant.price) || 0 // Convert variant price to number
            }));
          } else if (product.productType === 'group') {
            const addonsRes = await fetch(`/api/product-addons?productId=${product.id}`);
            const addonsData = await addonsRes.json();
            product.addons = addonsData.map((a: any) => ({
              ...a.productAddon,
              price: Number(a.productAddon.price) || 0, // Convert addon price to number
              addon: {
                ...a.addon,
                price: Number(a.addon.price) || 0
              }
            }));
          }
          
          return product;
        })
      );

      setProducts(processedProducts);
      setCustomers(customersData);
      setPickupLocations(pickupLocationsData || []);
      setStockManagementEnabled(stockData.stockManagementEnabled || true);
      setAvailableDrivers(driversData.drivers || []);
      
      // Set loyalty settings
      console.log('Loyalty API response:', loyaltyData);
      if (loyaltyData.success) {
        const newSettings = {
          enabled: loyaltyData.settings.loyalty_enabled?.value === 'true' || loyaltyData.settings.loyalty_enabled?.value === true,
          earningRate: Number(loyaltyData.settings.points_earning_rate?.value) || 1,
          earningBasis: loyaltyData.settings.points_earning_basis?.value || 'subtotal',
          redemptionValue: Number(loyaltyData.settings.points_redemption_value?.value) || 0.01,
          maxRedemptionPercent: Number(loyaltyData.settings.points_max_redemption_percent?.value) || 50,
          redemptionMinimum: Number(loyaltyData.settings.points_redemption_minimum?.value) || 100,
          minimumOrder: Number(loyaltyData.settings.points_minimum_order?.value) || 0
        };
        console.log('Setting loyalty settings:', newSettings);
        setLoyaltySettings(newSettings);
      } else {
        console.log('Loyalty settings fetch failed:', loyaltyData);
      }
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  // Addon management functions
  const addSelectedAddon = (addonId: string, addonTitle: string, price: number) => {
    const isAlreadySelected = selectedAddons.some(addon => addon.addonId === addonId);
    if (isAlreadySelected) return;

    setSelectedAddons([...selectedAddons, {
      addonId,
      addonTitle,
      price,
      quantity: 1
    }]);
  };

  const updateAddonQuantity = (addonId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAddons(selectedAddons.filter(addon => addon.addonId !== addonId));
      return;
    }

    setSelectedAddons(selectedAddons.map(addon => 
      addon.addonId === addonId 
        ? { ...addon, quantity }
        : addon
    ));
  };

  const removeSelectedAddon = (addonId: string) => {
    setSelectedAddons(selectedAddons.filter(addon => addon.addonId !== addonId));
  };

  const clearSelectedAddons = () => {
    setSelectedAddons([]);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    setOrderData({ ...orderData, customerId });
    
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setOrderData(prev => ({ ...prev, email: customer.email, phone: customer.phone || '' }));
        setCustomerInfo(prev => ({
          ...prev,
          isGuest: false,
          billingFirstName: customer.firstName || '',
          billingLastName: customer.lastName || '',
          billingAddress1: customer.address || '',
          billingCity: customer.city || '',
          billingState: customer.state || '',
          billingPostalCode: customer.postalCode || '',
          billingCountry: customer.country || 'US'
        }));
        
        // Fetch customer loyalty points if loyalty is enabled
        if (loyaltySettings.enabled) {
          fetchCustomerPoints(customerId);
        }
      }
    } else {
      setCustomerInfo(prev => ({ ...prev, isGuest: true }));
      setOrderData(prev => ({ ...prev, email: '', phone: '', pointsToRedeem: 0, pointsDiscountAmount: 0, useAllPoints: false }));
      setCustomerPoints({ availablePoints: 0, totalPointsEarned: 0, totalPointsRedeemed: 0 });
    }
  };

  // Fetch customer loyalty points (simplified)
  const fetchCustomerPoints = async (customerId: string) => {
    try {
      const response = await fetch(`/api/loyalty/points-simple?userId=${customerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomerPoints({
            availablePoints: data.points.availablePoints || 0,
            totalPointsEarned: data.points.totalPointsEarned || 0,
            totalPointsRedeemed: data.points.totalPointsRedeemed || 0
          });
        }
      }
    } catch (err) {
      console.error('Error fetching customer points:', err);
    }
  };

  // Helper function to get price per gram based on product's base weight unit
  const getPricePerGram = (product: Product): number => {
    const pricePerUnit = Number(product.pricePerUnit) || 0;
    if (product.baseWeightUnit === 'kg') {
      // If stored per kg, convert to per gram
      return pricePerUnit / 1000;
    }
    // If stored per gram or undefined, use as is
    return pricePerUnit;
  };

  // Driver assignment functions
  const handleDriverAssignmentTypeChange = (type: 'manual' | 'automatic') => {
    setOrderData(prev => ({
      ...prev,
      assignmentType: type,
      assignedDriverId: type === 'automatic' ? '' : prev.assignedDriverId
    }));
  };

  const handleAssignDriver = async (orderId: string) => {
    if (!orderId) return;

    try {
      const response = await fetch('/api/drivers/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          driverId: orderData.assignmentType === 'manual' ? orderData.assignedDriverId : null,
          assignedBy: 'admin', // This should be the current admin user ID
          assignmentType: orderData.assignmentType,
          priority: 'normal'
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('Driver assigned successfully:', data);
        return data;
      } else {
        console.warn('Failed to assign driver:', data.error || 'Unknown error');
        // Don't throw error - just log warning and continue
        return null;
      }
    } catch (error) {
      console.warn('Error in driver assignment request:', error);
      // Don't throw error - just log and continue
      return null;
    }
  };

  const handleAddProduct = () => {
    const { selectedProductId, selectedVariantId, quantity, customPrice, weightInput, weightUnit } = productSelection;
    
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const isWeightBased = isWeightBasedProduct(product.stockManagementType || 'quantity');

    // Validate quantity or weight based on product type
    if (isWeightBased) {
      if (!weightInput || parseFloat(weightInput) <= 0) {
        alert('Please enter a valid weight');
        return;
      }
    } else {
      if (quantity <= 0) {
        alert('Please enter a valid quantity');
        return;
      }
    }

    // For group products, validate that addons are selected if base price is 0
    if (product.productType === 'group') {
      const basePrice = Number(product.price) || 0;
      if (basePrice === 0 && selectedAddons.length === 0) {
        alert('Please select at least one addon for this group product');
        return;
      }
    }

    let variant = null;
    let price = Number(product.price) || 0;
    let productName = product.name;
    let variantTitle = '';
    let sku = product.sku || '';
    let weightInGrams = 0;
    let finalQuantity = quantity;

    if (selectedVariantId && product.variants) {
      variant = product.variants.find(v => v.id === selectedVariantId);
      if (variant) {
        price = Number(variant.price) || 0;
        variantTitle = variant.title;
        sku = variant.sku || sku;
      }
    }

    // Handle weight-based pricing
    if (isWeightBased) {
      weightInGrams = convertToGrams(parseFloat(weightInput), weightUnit);
      const pricePerGram = getPricePerGram(product);
      price = calculateWeightBasedPrice(weightInGrams, pricePerGram);
      finalQuantity = 1; // For weight-based products, quantity is always 1 (the weight is the measure)
    }

    // Use custom price if provided (overrides weight-based calculation)
    if (customPrice) {
      price = parseFloat(customPrice);
    }

    // Stock validation when stock management is enabled
    if (stockManagementEnabled) {
      // Check if we have inventory information for this product/variant
      const inventoryKey = selectedVariantId ? `${selectedProductId}-${selectedVariantId}` : selectedProductId;
      
      // For now, we'll add a warning but allow the order to proceed
      // The actual validation will happen on the server side
      if (variant && variant.inventoryQuantity !== undefined) {
        if (variant.inventoryQuantity < quantity) {
          if (!confirm(`Warning: Requested quantity (${quantity}) exceeds available stock (${variant.inventoryQuantity}). Do you want to continue? This may fail when creating the order.`)) {
            return;
          }
        }
      }
    }

    // Calculate total price including addons for group products
    let totalPrice = price * finalQuantity;
    if (product.productType === 'group' && selectedAddons.length > 0) {
      const addonsPrice = selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
      totalPrice = (price + addonsPrice) * finalQuantity;
    }

    const newItem: OrderItem = {
      productId: selectedProductId,
      variantId: selectedVariantId || undefined,
      productName,
      variantTitle: variantTitle || undefined,
      sku,
      price,
      quantity: finalQuantity,
      totalPrice,
      addons: product.productType === 'group' && selectedAddons.length > 0 ? [...selectedAddons] : undefined,
      // Weight-based fields
      isWeightBased,
      weightQuantity: isWeightBased ? weightInGrams : undefined,
      weightUnit: isWeightBased ? weightUnit : undefined
    };

    setOrderItems([...orderItems, newItem]);
    
    // Reset selection
    setProductSelection({
      selectedProductId: '',
      selectedVariantId: '',
      quantity: 1,
      customPrice: '',
      weightInput: '',
      weightUnit: 'grams'
    });
    clearSelectedAddons();
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const updatedItems = [...orderItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = updatedItems[index].price * quantity;
    setOrderItems(updatedItems);
  };

  const getAddonTitle = (addon: any, index: number) => {
    return addon.addonTitle || addon.title || addon.name || `Addon ${index + 1}`;
  };

  // Points redemption functions
  const handlePointsRedemption = (pointsToRedeem: number) => {
    if (pointsToRedeem < 0) pointsToRedeem = 0;
    if (pointsToRedeem > customerPoints.availablePoints) {
      pointsToRedeem = customerPoints.availablePoints;
    }

    // Calculate discount amount based on points
    const discountAmount = pointsToRedeem * loyaltySettings.redemptionValue;
    
    // Get current totals to check max redemption limit
    const currentTotals = calculateTotals();
    const maxAllowedDiscount = (currentTotals.subtotal - currentTotals.discountAmount) * (loyaltySettings.maxRedemptionPercent / 100);
    
    const finalDiscountAmount = Math.min(discountAmount, maxAllowedDiscount);
    const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);

    setOrderData(prev => ({
      ...prev,
      pointsToRedeem: finalPointsToRedeem,
      pointsDiscountAmount: finalDiscountAmount,
      useAllPoints: false
    }));
  };

  const handleUseAllPoints = () => {
    if (orderData.useAllPoints) {
      // Turn off - clear points
      setOrderData(prev => ({
        ...prev,
        pointsToRedeem: 0,
        pointsDiscountAmount: 0,
        useAllPoints: false
      }));
    } else {
      // Turn on - use maximum allowed points
      const currentTotals = calculateTotals();
      const maxAllowedDiscount = (currentTotals.subtotal - currentTotals.discountAmount) * (loyaltySettings.maxRedemptionPercent / 100);
      const maxPointsDiscount = customerPoints.availablePoints * loyaltySettings.redemptionValue;
      
      const finalDiscountAmount = Math.min(maxAllowedDiscount, maxPointsDiscount);
      const finalPointsToRedeem = Math.floor(finalDiscountAmount / loyaltySettings.redemptionValue);

      setOrderData(prev => ({
        ...prev,
        pointsToRedeem: finalPointsToRedeem,
        pointsDiscountAmount: finalDiscountAmount,
        useAllPoints: true
      }));
    }
  };

  const calculatePointsToEarn = () => {
    console.log('calculatePointsToEarn called:', {
      loyaltyEnabled: loyaltySettings.enabled,
      customerId: orderData.customerId,
      loyaltySettings,
      orderData: { customerId: orderData.customerId, status: orderData.status }
    });

    if (!loyaltySettings.enabled) {
      console.log('Points calculation skipped - loyalty disabled');
      return 0;
    }
    
    const totals = calculateTotals();
    const baseAmount = loyaltySettings.earningBasis === 'total' ? totals.totalAmount : totals.subtotal;
    
    console.log('Points calculation:', {
      totals,
      baseAmount,
      earningBasis: loyaltySettings.earningBasis,
      earningRate: loyaltySettings.earningRate,
      minimumOrder: loyaltySettings.minimumOrder
    });
    
    if (baseAmount < loyaltySettings.minimumOrder) {
      console.log('Points calculation skipped - below minimum order amount');
      return 0;
    }
    
    const points = Math.floor(baseAmount * loyaltySettings.earningRate);
    console.log('Points to earn:', points);
    return points;
  };

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      
      // Add addon prices for group products
      if (item.addons && Array.isArray(item.addons) && item.addons.length > 0) {
        const addonsTotal = item.addons.reduce((addonSum, addon) => 
          addonSum + (addon.price * addon.quantity), 0
        );
        itemTotal += addonsTotal * item.quantity;
      }
      
      return sum + itemTotal;
    }, 0);
    
    const discountAmount = orderData.discountType === 'percentage' 
      ? subtotal * (orderData.discountAmount / 100)
      : orderData.discountAmount;
    const discountedSubtotal = subtotal - discountAmount;
    
    // Apply points discount
    const pointsDiscountAmount = orderData.pointsDiscountAmount || 0;
    const afterPointsDiscount = Math.max(0, discountedSubtotal - pointsDiscountAmount);
    
    const taxAmount = afterPointsDiscount * (orderData.taxRate / 100);
    const totalAmount = afterPointsDiscount + taxAmount + orderData.shippingAmount;

    return {
      subtotal,
      discountAmount,
      pointsDiscountAmount,
      taxAmount,
      totalAmount,
      afterPointsDiscount
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    if (orderItems.length === 0) {
      setError('Please add at least one product to the order');
      setSubmitting(false);
      return;
    }

    if (!orderData.email) {
      setError('Please provide customer email');
      setSubmitting(false);
      return;
    }

    if (orderData.orderType === 'pickup' && !orderData.pickupLocationId) {
      setError('Please select a pickup location for pickup orders');
      setSubmitting(false);
      return;
    }

    try {
      const totals = calculateTotals();
      
      const submitData = {
        userId: orderData.customerId || null,
        email: orderData.email,
        phone: orderData.phone,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        shippingAmount: orderData.shippingAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        currency: orderData.currency,
        notes: orderData.notes,
        
        // Order type and pickup location fields
        orderType: orderData.orderType,
        pickupLocationId: orderData.pickupLocationId || null,
        
        // Driver assignment fields
        assignedDriverId: orderData.assignedDriverId || null,
        deliveryStatus: orderData.deliveryStatus,
        
        // Loyalty points fields
        pointsToRedeem: orderData.pointsToRedeem,
        pointsDiscountAmount: orderData.pointsDiscountAmount,
        
        // Billing address
        billingFirstName: customerInfo.billingFirstName,
        billingLastName: customerInfo.billingLastName,
        billingAddress1: customerInfo.billingAddress1,
        billingAddress2: customerInfo.billingAddress2,
        billingCity: customerInfo.billingCity,
        billingState: customerInfo.billingState,
        billingPostalCode: customerInfo.billingPostalCode,
        billingCountry: customerInfo.billingCountry,
        
        // Shipping address
        shippingFirstName: customerInfo.sameAsBilling ? customerInfo.billingFirstName : customerInfo.shippingFirstName,
        shippingLastName: customerInfo.sameAsBilling ? customerInfo.billingLastName : customerInfo.shippingLastName,
        shippingAddress1: customerInfo.sameAsBilling ? customerInfo.billingAddress1 : customerInfo.shippingAddress1,
        shippingAddress2: customerInfo.sameAsBilling ? customerInfo.billingAddress2 : customerInfo.shippingAddress2,
        shippingCity: customerInfo.sameAsBilling ? customerInfo.billingCity : customerInfo.shippingCity,
        shippingState: customerInfo.sameAsBilling ? customerInfo.billingState : customerInfo.shippingState,
        shippingPostalCode: customerInfo.sameAsBilling ? customerInfo.billingPostalCode : customerInfo.shippingPostalCode,
        shippingCountry: customerInfo.sameAsBilling ? customerInfo.billingCountry : customerInfo.shippingCountry,
        
        // Order items
        items: orderItems
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create order');
      }

      const orderResponse = await response.json();
      const orderId = orderResponse.orderId;

      // Create driver assignment record if driver is assigned
      if (orderData.assignedDriverId && orderData.assignmentType === 'manual') {
        try {
          await handleAssignDriver(orderId);
        } catch (driverError) {
          console.warn('Order created but driver assignment failed:', driverError);
          // Don't fail the order creation if driver assignment fails
          // The order is still created successfully, just without driver assignment
        }
      }

      // Redeem loyalty points if any were used
      if (orderData.pointsToRedeem > 0 && orderData.customerId) {
        try {
          const pointsResponse = await fetch('/api/loyalty/points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'redeem_points',
              userId: orderData.customerId,
              orderId: orderId,
              pointsToRedeem: orderData.pointsToRedeem,
              discountAmount: orderData.pointsDiscountAmount,
              description: `Redeemed at checkout for order #${orderResponse.orderNumber || orderId}`
            })
          });
          
          if (!pointsResponse.ok) {
            console.warn('Order created but points redemption failed:', await pointsResponse.text());
          }
        } catch (pointsError) {
          console.warn('Order created but points redemption failed:', pointsError);
          // Don't fail the order creation if points redemption fails
        }
      }

      router.push('/orders');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === productSelection.selectedProductId);
  const totals = calculateTotals();

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🛒 Create New Order</h1>
        <button
          onClick={() => router.push('/orders')}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
        >
          ← Back to Orders
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {!stockManagementEnabled && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
            <div>
              <h3 className="font-medium text-orange-800">Stock Management Disabled</h3>
              <p className="text-sm text-orange-600 mt-1">
                Orders can be created without stock limitations. Products will not show inventory levels or availability warnings.
              </p>
            </div>
          </div>
        </div>
      )}

      {stockManagementEnabled && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
            <div>
              <h3 className="font-medium text-blue-800">Stock Management Enabled</h3>
              <p className="text-sm text-blue-600 mt-1">
                Orders will check inventory levels where available. Products without inventory records can still be ordered.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Order Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">👤 Customer Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Select Customer</label>
                <select
                  value={orderData.customerId}
                  onChange={handleCustomerChange}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Guest Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name || `${customer.firstName} ${customer.lastName}`} ({customer.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={orderData.email}
                  onChange={(e) => setOrderData({...orderData, email: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={orderData.phone}
                  onChange={(e) => setOrderData({...orderData, phone: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Order Status</label>
                <select
                  value={orderData.status}
                  onChange={(e) => setOrderData({...orderData, status: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Order Type and Pickup Location */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🚚 Order Type</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Order Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orderType"
                      value="delivery"
                      checked={orderData.orderType === 'delivery'}
                      onChange={(e) => setOrderData({...orderData, orderType: e.target.value, pickupLocationId: ''})}
                      className="mr-2"
                    />
                    🚚 Delivery
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="orderType"
                      value="pickup"
                      checked={orderData.orderType === 'pickup'}
                      onChange={(e) => setOrderData({...orderData, orderType: e.target.value})}
                      className="mr-2"
                    />
                    📍 Pickup
                  </label>
                </div>
              </div>

              {orderData.orderType === 'pickup' && (
                <div>
                  <label className="block text-gray-700 mb-2">Pickup Location <span className="text-red-500">*</span></label>
                  <select
                    value={orderData.pickupLocationId}
                    onChange={(e) => setOrderData({...orderData, pickupLocationId: e.target.value})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                    required={orderData.orderType === 'pickup'}
                  >
                    <option value="">-- Select a pickup location --</option>
                    {pickupLocations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.address}
                      </option>
                    ))}
                  </select>
                  {pickupLocations.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      No active pickup locations available. Please create one first.
                    </p>
                  )}
                  {orderData.orderType === 'pickup' && !orderData.pickupLocationId && pickupLocations.length > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      Please select a pickup location for pickup orders.
                    </p>
                  )}
                </div>
              )}

              {orderData.orderType === 'delivery' && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-700">
                    📦 This order will be delivered to the customer's address. Make sure to fill in the shipping address below.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loyalty Points Redemption */}
          {loyaltySettings.enabled && orderData.customerId && customerPoints.availablePoints > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">🎁 Loyalty Points</h3>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Available Points:</span>
                  <span className="text-lg font-bold text-purple-600">{customerPoints.availablePoints}</span>
                </div>
                <div className="text-xs text-purple-600">
                  Worth up to <CurrencySymbol />{(customerPoints.availablePoints * loyaltySettings.redemptionValue).toFixed(2)} discount
                </div>
              </div>

              <div className="space-y-4">
                {/* Use All Points Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Use All Available Points</label>
                    <p className="text-xs text-gray-500">
                      Apply maximum discount (up to {loyaltySettings.maxRedemptionPercent}% of order)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseAllPoints}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                      orderData.useAllPoints ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        orderData.useAllPoints ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Manual Points Input */}
                {!orderData.useAllPoints && (
                  <div>
                    <label className="block text-gray-700 mb-2">Points to Redeem</label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={customerPoints.availablePoints}
                        value={orderData.pointsToRedeem}
                        onChange={(e) => handlePointsRedemption(parseInt(e.target.value) || 0)}
                        className="flex-1 p-2 border rounded focus:border-purple-500 focus:outline-none"
                        placeholder={`Min: ${loyaltySettings.redemptionMinimum}`}
                      />
                      <button
                        type="button"
                        onClick={() => handlePointsRedemption(customerPoints.availablePoints)}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        Max
                      </button>
                    </div>
                    {orderData.pointsToRedeem > 0 && (
                      <div className="mt-2 text-sm text-green-600">
                        Discount: <CurrencySymbol />{orderData.pointsDiscountAmount.toFixed(2)}
                      </div>
                    )}
                    {orderData.pointsToRedeem > 0 && orderData.pointsToRedeem < loyaltySettings.redemptionMinimum && (
                      <div className="mt-2 text-sm text-red-600">
                        Minimum {loyaltySettings.redemptionMinimum} points required for redemption
                      </div>
                    )}
                  </div>
                )}

                {/* Points Summary */}
                {orderData.pointsToRedeem > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Points to redeem:</span>
                        <span className="font-medium">{orderData.pointsToRedeem}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount amount:</span>
                        <span className="font-medium"><CurrencySymbol />{orderData.pointsDiscountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-600 mt-1">
                        <span>Remaining points:</span>
                        <span>{customerPoints.availablePoints - orderData.pointsToRedeem}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Billing Address */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📍 Billing Address</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={customerInfo.billingFirstName}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingFirstName: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={customerInfo.billingLastName}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingLastName: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Address Line 1</label>
                <input
                  type="text"
                  value={customerInfo.billingAddress1}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingAddress1: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={customerInfo.billingCity}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingCity: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={customerInfo.billingState}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingState: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={customerInfo.billingPostalCode}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingPostalCode: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Country</label>
                <input
                  type="text"
                  value={customerInfo.billingCountry}
                  onChange={(e) => setCustomerInfo({...customerInfo, billingCountry: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={customerInfo.sameAsBilling}
                  onChange={(e) => setCustomerInfo({...customerInfo, sameAsBilling: e.target.checked})}
                  className="mr-2"
                />
                Shipping address same as billing
              </label>
            </div>
          </div>

          {/* Add Products */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">📦 Add Products</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2">Product</label>
                <select
                  value={productSelection.selectedProductId}
                  onChange={(e) => setProductSelection({...productSelection, selectedProductId: e.target.value, selectedVariantId: ''})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a product...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {
                        isWeightBasedProduct(product.stockManagementType || 'quantity')
                          ? product.baseWeightUnit === 'kg'
                            ? `${Number(product.pricePerUnit).toFixed(2)}/kg`
                            : `${(Number(product.pricePerUnit) * 1000).toFixed(2)}/kg`
                          : `${Number(product.price).toFixed(2)}`
                      }
                      {product.productType === 'group' && Number(product.price) === 0 ? ' (Group Product - Price from addons)' : ''}
                      {isWeightBasedProduct(product.stockManagementType || 'quantity') ? ' (Weight-based)' : ''}
                      {!stockManagementEnabled ? ' (No stock limit)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && selectedProduct.productType === 'variable' && selectedProduct.variants && (
                <div>
                  <label className="block text-gray-700 mb-2">Variant</label>
                  <select
                    value={productSelection.selectedVariantId}
                    onChange={(e) => setProductSelection({...productSelection, selectedVariantId: e.target.value})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select variant...</option>
                    {selectedProduct.variants?.filter(v => v.isActive).map(variant => (
                      <option key={variant.id} value={variant.id}>
                        {variant.title} - {Number(variant.price).toFixed(2)}
                        {stockManagementEnabled && variant.inventoryQuantity !== undefined 
                          ? ` (Stock: ${variant.inventoryQuantity})` 
                          : !stockManagementEnabled ? ' (No stock limit)' : ''
                        }
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedProduct && selectedProduct.productType === 'group' && selectedProduct.addons && (
                <div className="md:col-span-4">
                  <label className="block text-gray-700 mb-2">🧩 Available Addons</label>
                  <div className="border rounded p-3 bg-gray-50">
                    {selectedProduct.addons.length > 0 ? (
                      <div className="space-y-2">
                        {selectedProduct.addons
                          .filter(pa => pa.isActive && pa.addon.isActive)
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map(productAddon => {
                            const isSelected = selectedAddons.some(sa => sa.addonId === productAddon.addonId);
                            const selectedAddon = selectedAddons.find(sa => sa.addonId === productAddon.addonId);
                            
                            return (
                              <div key={productAddon.id} className="flex items-center justify-between p-2 border rounded bg-white">
                                <div className="flex items-center flex-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        removeSelectedAddon(productAddon.addonId);
                                      } else {
                                        addSelectedAddon(
                                          productAddon.addonId, 
                                          productAddon.addon.title, 
                                          productAddon.price
                                        );
                                      }
                                    }}
                                    className={`px-3 py-1 rounded text-sm mr-3 ${
                                      isSelected 
                                        ? 'bg-green-500 text-white hover:bg-green-600' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    {isSelected ? '✓ Added' : '+ Add'}
                                  </button>
                                  
                                  <div className="flex-1">
                                    <div className="font-medium">{productAddon.addon.title}</div>
                                    <div className="text-sm text-gray-600">
                                      <span className="flex items-center gap-1"><CurrencySymbol />{productAddon.price.toFixed(2)}</span>
                                      {productAddon.isRequired && (
                                        <span className="ml-2 text-red-500 text-xs">Required</span>
                                      )}
                                    </div>
                                    {productAddon.addon.description && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {productAddon.addon.description}
                                      </div>
                                    )}
                                  </div>

                                  {productAddon.addon.image && (
                                    <img 
                                      src={productAddon.addon.image} 
                                      alt={productAddon.addon.title}
                                      className="w-12 h-12 object-cover rounded ml-2"
                                    />
                                  )}
                                </div>

                                {isSelected && (
                                  <div className="flex items-center ml-3">
                                    <label className="text-sm text-gray-600 mr-2">Qty:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={selectedAddon?.quantity || 1}
                                      onChange={(e) => updateAddonQuantity(
                                        productAddon.addonId, 
                                        parseInt(e.target.value) || 1
                                      )}
                                      className="w-16 p-1 border rounded text-center"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-center py-4">
                        No addons available for this product
                      </div>
                    )}

                    {selectedAddons.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          Selected Addons Summary:
                        </div>
                        <div className="space-y-1">
                          {selectedAddons.map(addon => (
                            <div key={addon.addonId} className="flex justify-between text-sm">
                              <span>{addon.addonTitle} (x{addon.quantity})</span>
                              <span className="flex items-center gap-1"><CurrencySymbol />{(addon.price * addon.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium text-sm border-t pt-1">
                            <span>Total Addons:</span>
                            <span className="flex items-center gap-1"><CurrencySymbol />{selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quantity or Weight input based on product type */}
              {selectedProduct && isWeightBasedProduct(selectedProduct.stockManagementType || 'quantity') ? (
                <div>
                  <label className="block text-gray-700 mb-2">
                                         Weight 
                     {selectedProduct.pricePerUnit && (
                       <span className="text-sm text-gray-500">
                         (<CurrencySymbol />{
                           selectedProduct.baseWeightUnit === 'kg'
                             ? `${Number(selectedProduct.pricePerUnit).toFixed(2)}/kg`
                             : `${(Number(selectedProduct.pricePerUnit) * 1000).toFixed(2)}/kg`
                         })
                       </span>
                     )}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={productSelection.weightInput}
                      onChange={(e) => setProductSelection({...productSelection, weightInput: e.target.value})}
                      className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                      placeholder="Enter weight"
                    />
                    <select
                      value={productSelection.weightUnit}
                      onChange={(e) => setProductSelection({...productSelection, weightUnit: e.target.value as 'grams' | 'kg'})}
                      className="p-2 border rounded focus:border-blue-500 focus:outline-none"
                    >
                      <option value="grams">g</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                                     {productSelection.weightInput && selectedProduct.pricePerUnit && (
                    <div className="mt-1 text-sm text-green-600">
                      Price: <CurrencySymbol />{calculateWeightBasedPrice(
                        convertToGrams(parseFloat(productSelection.weightInput) || 0, productSelection.weightUnit),
                        getPricePerGram(selectedProduct)
                      ).toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={productSelection.quantity}
                    onChange={(e) => setProductSelection({...productSelection, quantity: parseInt(e.target.value) || 1})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-700 mb-2">Custom Price (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={productSelection.customPrice}
                  onChange={(e) => setProductSelection({...productSelection, customPrice: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  placeholder="Override price"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddProduct}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ➕ Add Product
            </button>

            {/* Order Items List */}
            {orderItems.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Order Items</h4>
                <div className="space-y-2">
                  {orderItems.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{item.productName}</div>
                          {item.variantTitle && (
                            <div className="text-sm text-gray-600">{item.variantTitle}</div>
                          )}
                          {item.sku && (
                            <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                          )}
                          {item.isWeightBased && item.weightQuantity && (
                            <div className="text-sm text-blue-600">
                              ⚖️ Weight: {formatWeightAuto(item.weightQuantity).formattedString}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm">
                            {item.addons && Array.isArray(item.addons) && item.addons.length > 0 ? (
                              <div className="text-right">
                                                <div className="flex items-center gap-1">Base: <CurrencySymbol />{item.price.toFixed(2)}</div>
                <div className="flex items-center gap-1">Addons: <CurrencySymbol />{item.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0).toFixed(2)}</div>
                <div className="font-medium border-t pt-1 flex items-center gap-1">
                  <CurrencySymbol />{(item.price + item.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)).toFixed(2)} x 
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                    className="w-16 mx-1 p-1 border rounded text-center"
                  />
                  = <CurrencySymbol />{item.totalPrice.toFixed(2)}
                </div>
                              </div>
                            ) : item.isWeightBased ? (
                              <div className="flex items-center gap-1">
                                <CurrencySymbol />{item.price.toFixed(2)} (for {formatWeightAuto(item.weightQuantity || 0).formattedString})
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <CurrencySymbol />{item.price.toFixed(2)} x 
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                                  className="w-16 mx-1 p-1 border rounded text-center"
                                />
                                = <CurrencySymbol />{item.totalPrice.toFixed(2)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      
                      {/* Display addons for group products */}
                      {item.addons && Array.isArray(item.addons) && item.addons.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-200">
                          <div className="text-sm font-medium text-gray-700 mb-2">🧩 Addons:</div>
                          <div className="space-y-1">
                            {item.addons.map((addon, addonIndex) => (
                              <div key={addon.addonId} className="flex justify-between text-sm text-gray-600">
                                <span>• {getAddonTitle(addon, addonIndex)} (x{addon.quantity})</span>
                                <span className="flex items-center gap-1"><CurrencySymbol />{(addon.price * addon.quantity).toFixed(2)} each</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-medium text-gray-700 border-t pt-1 mt-2">
                              <span>Addons subtotal per product:</span>
                              <span className="flex items-center gap-1"><CurrencySymbol />{item.addons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Settings */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">⚙️ Order Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">Payment Status</label>
                <select
                  value={orderData.paymentStatus}
                  onChange={(e) => setOrderData({...orderData, paymentStatus: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Shipping Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={orderData.shippingAmount}
                  onChange={(e) => setOrderData({...orderData, shippingAmount: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={orderData.taxRate}
                  onChange={(e) => setOrderData({...orderData, taxRate: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderData.discountAmount}
                    onChange={(e) => setOrderData({...orderData, discountAmount: parseFloat(e.target.value) || 0})}
                    className="flex-1 p-2 border rounded focus:border-blue-500 focus:outline-none"
                  />
                  <select
                    value={orderData.discountType}
                    onChange={(e) => setOrderData({...orderData, discountType: e.target.value})}
                    className="p-2 border rounded focus:border-blue-500 focus:outline-none currency-symbol"
                  >
                    <option value="amount">Currency</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-gray-700 mb-2">Order Notes</label>
              <textarea
                value={orderData.notes}
                onChange={(e) => setOrderData({...orderData, notes: e.target.value})}
                className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="Internal notes about this order..."
              />
            </div>
          </div>

          {/* Driver Assignment */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">🚚 Driver Assignment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Assignment Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="manual"
                      checked={orderData.assignmentType === 'manual'}
                      onChange={(e) => handleDriverAssignmentTypeChange(e.target.value as 'manual')}
                      className="mr-2"
                    />
                    Manual Assignment
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="assignmentType"
                      value="automatic"
                      checked={orderData.assignmentType === 'automatic'}
                      onChange={(e) => handleDriverAssignmentTypeChange(e.target.value as 'automatic')}
                      className="mr-2"
                    />
                    Automatic (Nearest Driver)
                  </label>
                </div>
              </div>

              {orderData.assignmentType === 'manual' && (
                <div>
                  <label className="block text-gray-700 mb-2">Select Driver</label>
                  <select
                    value={orderData.assignedDriverId}
                    onChange={(e) => setOrderData({...orderData, assignedDriverId: e.target.value})}
                    className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select a driver --</option>
                    {availableDrivers.map((driverData) => (
                      <option key={driverData.driver.id} value={driverData.driver.id}>
                        {driverData.user.name} - {driverData.driver.vehicleType} ({driverData.driver.vehiclePlateNumber}) - {driverData.driver.status}
                      </option>
                    ))}
                  </select>
                  {availableDrivers.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">No drivers available</p>
                  )}
                </div>
              )}

              {orderData.assignmentType === 'automatic' && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-700">
                    📍 The system will automatically assign the nearest available driver based on the delivery address.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 mb-2">Delivery Status</label>
                <select
                  value={orderData.deliveryStatus}
                  onChange={(e) => setOrderData({...orderData, deliveryStatus: e.target.value})}
                  className="w-full p-2 border rounded focus:border-blue-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary - Right Side */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 sticky top-4">
            <h3 className="text-lg font-semibold mb-4">📊 Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="flex items-center gap-1"><CurrencySymbol />{totals.subtotal.toFixed(2)}</span>
              </div>
              
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span className="flex items-center gap-1">-<CurrencySymbol />{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              {totals.pointsDiscountAmount > 0 && (
                <div className="flex justify-between text-purple-600">
                  <span>Points Discount ({orderData.pointsToRedeem} pts):</span>
                  <span className="flex items-center gap-1">-<CurrencySymbol />{totals.pointsDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Tax ({orderData.taxRate}%):</span>
                <span className="flex items-center gap-1"><CurrencySymbol />{totals.taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span className="flex items-center gap-1"><CurrencySymbol />{orderData.shippingAmount.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="flex items-center gap-1"><CurrencySymbol />{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Points Preview */}
              {loyaltySettings.enabled && (
                <div className="border-t pt-3">
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-800 mb-1">🎁 Loyalty Points</div>
                    <div className="text-sm text-purple-700">
                      {orderData.customerId ? (
                        <>Customer will earn: <strong>{calculatePointsToEarn()} points</strong></>
                      ) : (
                        <>This order will earn: <strong>{calculatePointsToEarn()} points</strong> (requires customer)</>
                      )}
                      {calculatePointsToEarn() === 0 && loyaltySettings.minimumOrder > 0 && (
                        <div className="text-xs text-purple-600 mt-1">
                          (Minimum order: <CurrencySymbol />{loyaltySettings.minimumOrder})
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-purple-600 mt-2">
                      {orderData.status === 'completed' ? (
                        <span className="text-green-600">✅ Points will be available immediately</span>
                      ) : (
                        <span className="text-yellow-600">⏳ Points will be pending until completed</span>
                      )}
                    </div>
                    {!orderData.customerId && (
                      <div className="text-xs text-orange-600 mt-1">
                        ⚠️ Select a customer above to award points for this order
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <div className="text-sm text-gray-600">
                  <strong>{orderItems.length}</strong> item(s) in order
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={submitting || orderItems.length === 0}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {submitting ? 'Creating Order...' : 'Create Order'}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push('/orders')}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 