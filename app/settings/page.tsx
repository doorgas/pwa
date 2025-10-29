'use client';
import React, { useState, useEffect } from 'react';
import CurrencySymbol from '../components/CurrencySymbol';
import { useCurrency } from '@/app/contexts/CurrencyContext';
import { CurrencyCode } from '@/app/contexts/CurrencyContext';



interface TaxSetting {
  enabled: boolean;
  type: 'percentage' | 'fixed';
  value: number;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Currency context
  const { currentCurrency, availableCurrencies, setCurrency, loading: currencyLoading } = useCurrency();
  
  // Stock management setting
  const [stockManagementEnabled, setStockManagementEnabled] = useState(true);
  
  // Tax settings
  const [vatTax, setVatTax] = useState<TaxSetting>({
    enabled: false,
    type: 'percentage',
    value: 0
  });
  
  const [serviceTax, setServiceTax] = useState<TaxSetting>({
    enabled: false,
    type: 'percentage',
    value: 0
  });

  // Loyalty settings
  const [loyaltySettings, setLoyaltySettings] = useState({
    loyalty_enabled: { value: false, type: 'boolean', description: '' },
    points_earning_rate: { value: 1, type: 'number', description: '' },
    points_earning_basis: { value: 'subtotal', type: 'string', description: '' },
    points_redemption_value: { value: 0.01, type: 'number', description: '' },
    points_expiry_months: { value: 12, type: 'number', description: '' },
    points_minimum_order: { value: 0, type: 'number', description: '' },
    points_max_redemption_percent: { value: 50, type: 'number', description: '' },
    points_redemption_minimum: { value: 100, type: 'number', description: '' }
  });

  // Appearance settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    logo_url: '',
    background_color: '#ffffff',
    text_color: '#000000'
  });
  const [logoUploading, setLogoUploading] = useState(false);

  // Store settings
  const [storeSettings, setStoreSettings] = useState({
    store_name: '',
    store_description: ''
  });

  // Order settings
  const [orderSettings, setOrderSettings] = useState({
    minimum_order_value: '',
    driver_cut_flat: '',
  });

  // Delivery settings
  const [deliverySettings, setDeliverySettings] = useState({
    enabled: true,
    customMessage: 'Delivery is currently available for all orders.',
    fee: 0
  });

  // Shipping settings
  const [shippingSettings, setShippingSettings] = useState({
    enabled: true,
    customMessage: 'Shipping is currently available for all orders.',
    fee: 0
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [stockRes, taxRes, loyaltyRes, appearanceRes, storeRes, orderRes, deliveryRes, shippingRes] = await Promise.all([
        fetch('/api/settings/stock-management'),
        fetch('/api/settings/tax-settings'),
        fetch('/api/settings/loyalty'),
        fetch('/api/settings/appearance'),
        fetch('/api/settings/store'),
        fetch('/api/settings/order-config'),
        fetch('/api/settings/delivery'),
        fetch('/api/settings/shipping')
      ]);
      
      const stockData = await stockRes.json();
      const taxData = await taxRes.json();
      const loyaltyData = await loyaltyRes.json();
      const appearanceData = await appearanceRes.json();
      const storeData = await storeRes.json();
      const orderData = await orderRes.json();
      const deliveryData = await deliveryRes.json();
      const shippingData = await shippingRes.json();
      
      setStockManagementEnabled(stockData.stockManagementEnabled);
      setVatTax(taxData.vatTax);
      setServiceTax(taxData.serviceTax);
      
      if (loyaltyData.success) {
        setLoyaltySettings(loyaltyData.settings);
      }

      if (appearanceData.success) {
        setAppearanceSettings(appearanceData.settings);
      }

      if (storeData.success) {
        setStoreSettings(storeData.settings);
      }

      if (orderData.success) {
        setOrderSettings({
          minimum_order_value: orderData.settings.minimum_order_value !== undefined ? String(orderData.settings.minimum_order_value) : '',
          driver_cut_flat: orderData.settings.driver_cut_flat !== undefined ? String(orderData.settings.driver_cut_flat) : '',
        });
      }

      // Set delivery settings
      if (deliveryData.enabled !== undefined && deliveryData.customMessage !== undefined && deliveryData.fee !== undefined) {
        setDeliverySettings({
          enabled: deliveryData.enabled,
          customMessage: deliveryData.customMessage,
          fee: deliveryData.fee
        });
      }

      // Set shipping settings
      if (shippingData.enabled !== undefined && shippingData.customMessage !== undefined && shippingData.fee !== undefined) {
        setShippingSettings({
          enabled: shippingData.enabled,
          customMessage: shippingData.customMessage,
          fee: shippingData.fee
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleStockManagementToggle = async () => {
    try {
      setSaving(true);
      setError('');
      
      const response = await fetch('/api/settings/stock-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !stockManagementEnabled })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update stock management setting');
      }
      
      setStockManagementEnabled(!stockManagementEnabled);
      setSuccess('Stock management setting updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCurrencyChange = async (currency: CurrencyCode) => {
    try {
      setSaving(true);
      setError('');
      
      await setCurrency(currency);
      setSuccess('Currency updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTaxSettingChange = (
    taxType: 'vat' | 'service',
    field: keyof TaxSetting,
    value: any
  ) => {
    const updateFunction = taxType === 'vat' ? setVatTax : setServiceTax;
    const currentSetting = taxType === 'vat' ? vatTax : serviceTax;
    
    updateFunction({
      ...currentSetting,
      [field]: value
    });
  };

  const handleSaveTaxSettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Validate settings
      if (vatTax.enabled && vatTax.value <= 0) {
        throw new Error('VAT tax value must be greater than 0 when enabled');
      }
      if (serviceTax.enabled && serviceTax.value <= 0) {
        throw new Error('Service tax value must be greater than 0 when enabled');
      }
      if (vatTax.type === 'percentage' && vatTax.value > 100) {
        throw new Error('VAT tax percentage cannot exceed 100%');
      }
      if (serviceTax.type === 'percentage' && serviceTax.value > 100) {
        throw new Error('Service tax percentage cannot exceed 100%');
      }
      
      const response = await fetch('/api/settings/tax-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vatTax, serviceTax })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tax settings');
      }
      
      setSuccess('Tax settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTaxPreview = (tax: TaxSetting, baseAmount: number = 100) => {
    if (!tax.enabled) return '0.00';
    
    if (tax.type === 'percentage') {
      return ((baseAmount * tax.value) / 100).toFixed(2);
    } else {
      return tax.value.toFixed(2);
    }
  };

  const handleLoyaltySettingChange = (key: string, value: any) => {
    setLoyaltySettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key as keyof typeof prev],
        value
      }
    }));
  };

  const handleSaveLoyaltySettings = async () => {
    try {
      setSaving(true);
      setError('');
      
      // Validate settings
      if (loyaltySettings.points_earning_rate.value <= 0) {
        throw new Error('Points earning rate must be greater than 0');
      }
      if (loyaltySettings.points_redemption_value.value <= 0) {
        throw new Error('Points redemption value must be greater than 0');
      }
      if (loyaltySettings.points_max_redemption_percent.value > 100) {
        throw new Error('Maximum redemption percentage cannot exceed 100%');
      }
      if (loyaltySettings.points_redemption_minimum.value < 0) {
        throw new Error('Minimum redemption points cannot be negative');
      }
      
      const response = await fetch('/api/settings/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: loyaltySettings })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update loyalty settings');
      }
      
      setSuccess('Loyalty settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('directory', 'logos');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload logo');
      }

      const data = await response.json();
      setAppearanceSettings(prev => ({
        ...prev,
        logo_url: data.url
      }));

      setSuccess('Logo uploaded successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Trigger logo update event
      window.dispatchEvent(new Event('logoUpdated'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleColorChange = (colorType: 'background_color' | 'text_color', color: string) => {
    setAppearanceSettings(prev => ({
      ...prev,
      [colorType]: color
    }));
  };

  const handleSaveAppearanceSettings = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/settings/appearance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: appearanceSettings })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update appearance settings');
      }

      setSuccess('Appearance settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Trigger logo update event
      window.dispatchEvent(new Event('logoUpdated'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (confirm('Are you sure you want to remove the logo?')) {
      try {
        setAppearanceSettings(prev => ({
          ...prev,
          logo_url: ''
        }));

        // Save the updated settings
        const response = await fetch('/api/settings/appearance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            settings: { 
              ...appearanceSettings, 
              logo_url: '' 
            } 
          })
        });

        if (response.ok) {
          setSuccess('Logo removed successfully');
          setTimeout(() => setSuccess(''), 3000);
          
          // Trigger logo update event
          window.dispatchEvent(new Event('logoUpdated'));
        }
      } catch (err: any) {
        setError('Failed to remove logo');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleStoreSettingChange = (field: 'store_name' | 'store_description', value: string) => {
    setStoreSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOrderSettingChange = (field: keyof typeof orderSettings, value: string) => {
    setOrderSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveOrderSettings = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/settings/order-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minimum_order_value: orderSettings.minimum_order_value,
          driver_cut_flat: orderSettings.driver_cut_flat,
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update order settings');
      }

      setSuccess('Order settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate settings
      if (!storeSettings.store_name.trim()) {
        throw new Error('Store name is required');
      }

      const response = await fetch('/api/settings/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: storeSettings })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update store settings');
      }

      setSuccess('Store settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeliveryToggle = async () => {
    try {
      setSaving(true);
      setError('');
      
      const newEnabled = !deliverySettings.enabled;
      
      const response = await fetch('/api/settings/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: newEnabled, 
          customMessage: deliverySettings.customMessage,
          fee: deliverySettings.fee
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update delivery settings');
      }
      
      setDeliverySettings(prev => ({ ...prev, enabled: newEnabled }));
      setSuccess(`Delivery ${newEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShippingToggle = async () => {
    try {
      setSaving(true);
      setError('');
      
      const newEnabled = !shippingSettings.enabled;
      
      const response = await fetch('/api/settings/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled: newEnabled, 
          customMessage: shippingSettings.customMessage,
          fee: shippingSettings.fee
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update shipping settings');
      }
      
      setShippingSettings(prev => ({ ...prev, enabled: newEnabled }));
      setSuccess(`Shipping ${newEnabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeliveryMessageChange = (message: string) => {
    setDeliverySettings(prev => ({ ...prev, customMessage: message }));
  };

  const handleDeliveryFeeChange = (fee: string) => {
    setDeliverySettings(prev => ({ ...prev, fee: parseFloat(fee) || 0 }));
  };

  const handleShippingMessageChange = (message: string) => {
    setShippingSettings(prev => ({ ...prev, customMessage: message }));
  };

  const handleShippingFeeChange = (fee: string) => {
    setShippingSettings(prev => ({ ...prev, fee: parseFloat(fee) || 0 }));
  };

  const handleSaveDeliverySettings = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate message length
      if (deliverySettings.customMessage.length > 1000) {
        throw new Error('Custom message cannot exceed 1000 characters');
      }

      // Validate fee
      if (deliverySettings.fee < 0) {
        throw new Error('Delivery fee cannot be negative');
      }

      const response = await fetch('/api/settings/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliverySettings)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update delivery settings');
      }

      setSuccess('Delivery settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShippingSettings = async () => {
    try {
      setSaving(true);
      setError('');

      // Validate message length
      if (shippingSettings.customMessage.length > 1000) {
        throw new Error('Custom message cannot exceed 1000 characters');
      }

      // Validate fee
      if (shippingSettings.fee < 0) {
        throw new Error('Shipping fee cannot be negative');
      }

      const response = await fetch('/api/settings/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shippingSettings)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update shipping settings');
      }

      setSuccess('Shipping settings updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getColorFromImage = (imageElement: HTMLImageElement, x: number, y: number): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '#000000';

    // Set canvas size to match image display size
    const rect = imageElement.getBoundingClientRect();
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    // Draw the image on canvas
    ctx.drawImage(imageElement, 0, 0);

    // Calculate the actual pixel position based on image scaling
    const scaleX = imageElement.naturalWidth / rect.width;
    const scaleY = imageElement.naturalHeight / rect.height;
    
    const pixelX = Math.floor(x * scaleX);
    const pixelY = Math.floor(y * scaleY);

    // Get pixel color data
    const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
    const [r, g, b] = imageData.data;

    // Convert to hex
    const hex = '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');

    return hex;
  };

  const handleLogoColorPick = (colorType: 'background_color' | 'text_color') => {
    if (!appearanceSettings.logo_url) {
      setError('Please upload a logo first to pick colors from it.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSuccess('Click anywhere on your logo to pick a color!');
    setTimeout(() => setSuccess(''), 3000);

    // Add click event to logo
    const logoImg = document.querySelector('.logo-color-picker') as HTMLImageElement;
    if (logoImg) {
      const handleLogoClick = (event: MouseEvent) => {
        event.preventDefault();
        const rect = logoImg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const color = getColorFromImage(logoImg, x, y);
        handleColorChange(colorType, color);
        //setSuccess(`Color picked from logo: ${color}`);
        //setTimeout(() => setSuccess(''), 2000);

        // Remove the click listener
        logoImg.removeEventListener('click', handleLogoClick);
        logoImg.style.cursor = 'default';
      };

      logoImg.addEventListener('click', handleLogoClick);
      logoImg.style.cursor = 'crosshair';
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      <div className="space-y-8">
        {/* Store Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Store Information</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure your store's basic information and details
            </p>
          </div>

          <div className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={storeSettings.store_name}
                onChange={(e) => handleStoreSettingChange('store_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your store name"
                maxLength={255}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be displayed as your store's official name
              </p>
            </div>

            {/* Store Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Description
              </label>
              <textarea
                value={storeSettings.store_description}
                onChange={(e) => handleStoreSettingChange('store_description', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                placeholder="Describe your store, products, or services..."
                rows={2}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-400">
                  {storeSettings.store_description.length}/1000
                </span>
              </div>
            </div>


            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveStoreSettings}
                disabled={saving || !storeSettings.store_name.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Store Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Appearance Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Customize the look and feel of your application
            </p>
          </div>

          <div className="space-y-6">
            {/* Logo Upload Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4">Logo</h3>
              <div className="flex items-start space-x-6">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 relative">
                    {appearanceSettings.logo_url ? (
                      <>
                        <img
                          src={appearanceSettings.logo_url}
                          alt="Logo preview"
                          className="max-w-full max-h-full object-contain rounded-lg logo-color-picker transition-all duration-200"
                          crossOrigin="anonymous"
                        />
                        <div className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded text-center opacity-75">
                          Click to pick colors
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors opacity-75 hover:opacity-100"
                          title="Remove logo"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400">
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs">No logo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Logo
                  </label>
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                    {logoUploading && (
                      <div className="flex items-center text-sm text-blue-600">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      Recommended: PNG or JPG, max 15MB. Square format works best.
                    </p>
                    {appearanceSettings.logo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="mt-3 flex items-center text-sm text-red-600 hover:text-red-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Color Pickers Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Colors</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set your brand colors manually or use the color picker tool (⭐) to pick colors directly from your uploaded logo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Background Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Main Background Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={appearanceSettings.background_color}
                      onChange={(e) => handleColorChange('background_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={appearanceSettings.background_color}
                        onChange={(e) => handleColorChange('background_color', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogoColorPick('background_color')}
                      disabled={!appearanceSettings.logo_url}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-colors relative group ${
                        appearanceSettings.logo_url 
                          ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer text-gray-600 hover:text-blue-600' 
                          : 'border-gray-200 cursor-not-allowed text-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {appearanceSettings.logo_url 
                          ? "🎨 Click to pick background color from your logo!" 
                          : "⚠️ Upload a logo first to pick colors"
                        }
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </button>
                  </div>
                  <div className="mt-2 p-3 rounded-md border" style={{ backgroundColor: appearanceSettings.background_color }}>
                    <p className="text-sm text-gray-600">Background preview</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ⭐ Click the star button to pick colors directly from your logo (works in all browsers)
                  </p>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Main Text Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={appearanceSettings.text_color}
                      onChange={(e) => handleColorChange('text_color', e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={appearanceSettings.text_color}
                        onChange={(e) => handleColorChange('text_color', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="#000000"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLogoColorPick('text_color')}
                      disabled={!appearanceSettings.logo_url}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-colors relative group ${
                        appearanceSettings.logo_url 
                          ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer text-gray-600 hover:text-blue-600' 
                          : 'border-gray-200 cursor-not-allowed text-gray-400'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {appearanceSettings.logo_url 
                          ? "🎨 Click to pick text color from your logo!" 
                          : "⚠️ Upload a logo first to pick colors"
                        }
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </button>
                  </div>
                  <div className="mt-2 p-3 rounded-md border bg-white">
                    <p className="text-sm" style={{ color: appearanceSettings.text_color }}>Text color preview</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    ⭐ Click the star button to pick colors directly from your logo (works in all browsers)
                  </p>
                </div>
              </div>
            </div>

            {/* Combined Preview */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-700 mb-4">Preview</h3>
              <div 
                className="p-6 rounded-lg border-2 border-gray-200"
                style={{ 
                  backgroundColor: appearanceSettings.background_color,
                  color: appearanceSettings.text_color 
                }}
              >
                <div className="flex items-center space-x-4 mb-4">
                  {appearanceSettings.logo_url && (
                    <img
                      src={appearanceSettings.logo_url}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                    />
                  )}
                  <div>
                    <h4 className="text-xl font-semibold">Your Application</h4>
                    <p className="text-sm opacity-75">This is how your branding will look</p>
                  </div>
                </div>
                <p className="text-sm">
                  Sample content with your chosen colors and logo. The background and text colors will be applied throughout your application.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveAppearanceSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Appearance Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Order Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Order Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure general order settings and driver payments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Order Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">
                  <CurrencySymbol />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderSettings.minimum_order_value}
                  onChange={(e) => handleOrderSettingChange('minimum_order_value', e.target.value)}
                  inputMode="decimal"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Orders below this amount may be blocked or incur additional fees
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Driver Cut (Flat per Order)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">
                  <CurrencySymbol />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orderSettings.driver_cut_flat}
                  onChange={(e) => handleOrderSettingChange('driver_cut_flat', e.target.value)}
                  inputMode="decimal"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Flat payment amount per order paid to the driver
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveOrderSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Order Settings'}
            </button>
          </div>
        </div>

        {/* Delivery Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Delivery Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Control delivery availability, fees, and display custom messages to customers
            </p>
          </div>

          <div className="space-y-6">
            {/* Delivery Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-700">Enable Delivery</h3>
                <p className="text-sm text-gray-500">
                  When disabled, customers won't be able to select delivery as an option
                </p>
              </div>
              <button
                onClick={handleDeliveryToggle}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  deliverySettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    deliverySettings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status Indicator */}
            <div className={`p-4 rounded-lg border-2 ${
              deliverySettings.enabled 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  deliverySettings.enabled ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`font-medium ${
                  deliverySettings.enabled ? 'text-green-800' : 'text-red-800'
                }`}>
                  Delivery is currently {deliverySettings.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className={`text-sm mt-2 ${
                deliverySettings.enabled ? 'text-green-700' : 'text-red-700'
              }`}>
                {deliverySettings.enabled 
                  ? 'Customers can select delivery as an order type'
                  : 'Delivery option will be disabled or hidden from customers'
                }
              </p>
            </div>

            {/* Delivery Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">
                  <CurrencySymbol />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliverySettings.fee}
                  onChange={(e) => handleDeliveryFeeChange(e.target.value)}
                  inputMode="decimal"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Flat delivery fee added to delivery orders
              </p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message
              </label>
              <p className="text-xs text-gray-500 mb-3">
                This message will be displayed to customers on the frontend. 
                {!deliverySettings.enabled && ' It will be shown when delivery is disabled.'}
              </p>
              <textarea
                value={deliverySettings.customMessage}
                onChange={(e) => handleDeliveryMessageChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                placeholder="Enter a custom message for customers..."
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">
                  {deliverySettings.customMessage.length}/1000 characters
                </span>
                {deliverySettings.customMessage.length > 800 && (
                  <span className="text-xs text-orange-600">
                    Approaching character limit
                  </span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Preview</h4>
              <div className={`p-4 rounded-lg border-2 ${
                deliverySettings.enabled 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex items-start">
                  <div className={`w-5 h-5 rounded-full mr-3 mt-0.5 flex items-center justify-center ${
                    deliverySettings.enabled ? 'bg-blue-500' : 'bg-orange-500'
                  }`}>
                    {deliverySettings.enabled ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      deliverySettings.enabled ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                      {deliverySettings.enabled ? 'Delivery Available' : 'Delivery Notice'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      deliverySettings.enabled ? 'text-blue-700' : 'text-orange-700'
                    }`}>
                      {deliverySettings.customMessage || 'No custom message set'}
                    </p>
                    {deliverySettings.enabled && deliverySettings.fee > 0 && (
                      <p className={`text-xs mt-1 ${
                        deliverySettings.enabled ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        Delivery fee: <CurrencySymbol />{deliverySettings.fee.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveDeliverySettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Delivery Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Shipping Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Shipping Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Control shipping availability and display custom messages to customers
            </p>
          </div>

          <div className="space-y-6">
            {/* Shipping Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-700">Enable Shipping</h3>
                <p className="text-sm text-gray-500">
                  When disabled, customers won't be able to select shipping as an option
                </p>
              </div>
              <button
                onClick={handleShippingToggle}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  shippingSettings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    shippingSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Status Indicator */}
            <div className={`p-4 rounded-lg border-2 ${
              shippingSettings.enabled 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  shippingSettings.enabled ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`font-medium ${
                  shippingSettings.enabled ? 'text-green-800' : 'text-red-800'
                }`}>
                  Shipping is currently {shippingSettings.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className={`text-sm mt-2 ${
                shippingSettings.enabled ? 'text-green-700' : 'text-red-700'
              }`}>
                {shippingSettings.enabled 
                  ? 'Customers can select shipping as an order type'
                  : 'Shipping option will be disabled or hidden from customers'
                }
              </p>
            </div>

            {/* Shipping Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Fee
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">
                  <CurrencySymbol />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingSettings.fee}
                  onChange={(e) => handleShippingFeeChange(e.target.value)}
                  inputMode="decimal"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Flat shipping fee applied to shipped orders
              </p>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message
              </label>
              <p className="text-xs text-gray-500 mb-3">
                This message will be displayed to customers on the frontend. 
                {!shippingSettings.enabled && ' It will be shown when shipping is disabled.'}
              </p>
              <textarea
                value={shippingSettings.customMessage}
                onChange={(e) => handleShippingMessageChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-vertical"
                placeholder="Enter a custom message for customers..."
                rows={3}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">
                  {shippingSettings.customMessage.length}/1000 characters
                </span>
                {shippingSettings.customMessage.length > 800 && (
                  <span className="text-xs text-orange-600">
                    Approaching character limit
                  </span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="border-t pt-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Preview</h4>
              <div className={`p-4 rounded-lg border-2 ${
                shippingSettings.enabled 
                  ? 'border-blue-200 bg-blue-50' 
                  : 'border-orange-200 bg-orange-50'
              }`}>
                <div className="flex items-start">
                  <div className={`w-5 h-5 rounded-full mr-3 mt-0.5 flex items-center justify-center ${
                    shippingSettings.enabled ? 'bg-blue-500' : 'bg-orange-500'
                  }`}>
                    {shippingSettings.enabled ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      shippingSettings.enabled ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                      {shippingSettings.enabled ? 'Shipping Available' : 'Shipping Notice'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      shippingSettings.enabled ? 'text-blue-700' : 'text-orange-700'
                    }`}>
                      {shippingSettings.customMessage || 'No custom message set'}
                    </p>
                    {shippingSettings.enabled && shippingSettings.fee > 0 && (
                      <p className={`text-xs mt-1 ${
                        shippingSettings.enabled ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        Shipping fee: <CurrencySymbol />{shippingSettings.fee.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleSaveShippingSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Shipping Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Stock Management Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Stock Management</h2>
              <p className="text-gray-600 text-sm mt-1">
                Enable or disable inventory tracking for your products
              </p>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleStockManagementToggle}
                disabled={saving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  stockManagementEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    stockManagementEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {stockManagementEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            {stockManagementEnabled ? (
              <p>✅ Orders will check and update inventory levels automatically</p>
            ) : (
              <p>❌ Orders will be created without inventory validation</p>
            )}
          </div>
        </div>

        {/* Currency Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hidden">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Currency Settings</h2>
            <p className="text-gray-600 text-sm mt-1">
              Select the currency to display throughout the application
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Currency
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(availableCurrencies).map(([code, currency]) => (
                  <button
                    key={code}
                    onClick={() => handleCurrencyChange(code as CurrencyCode)}
                    disabled={saving || currencyLoading}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      currentCurrency === code
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    } ${saving || currencyLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span 
                          className="text-2xl currency-symbol"
                          dangerouslySetInnerHTML={{ __html: currency.symbol }}
                        />
                        <div className="text-left">
                          <div className="font-medium">{currency.name}</div>
                          <div className="text-sm opacity-75">{currency.code}</div>
                        </div>
                      </div>
                      {currentCurrency === code && (
                        <div className="text-blue-500">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Preview */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Currency Preview</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div>Sample price: <CurrencySymbol />100.00</div>
                <div>Selected currency: {availableCurrencies[currentCurrency].name} ({availableCurrencies[currentCurrency].code})</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tax Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hidden">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Tax Configuration</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure VAT and Service tax rates for your orders
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* VAT Tax Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">VAT Tax</h3>
                <button
                  onClick={() => handleTaxSettingChange('vat', 'enabled', !vatTax.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                    vatTax.enabled ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      vatTax.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {vatTax.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-green-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Type
                    </label>
                    <select
                      value={vatTax.type}
                      onChange={(e) => handleTaxSettingChange('vat', 'type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Value
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={vatTax.value}
                        onChange={(e) => handleTaxSettingChange('vat', 'value', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                        min="0"
                        max={vatTax.type === 'percentage' ? '100' : undefined}
                        step={vatTax.type === 'percentage' ? '0.1' : '0.01'}
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">
                          {vatTax.type === 'percentage' ? '%' : <CurrencySymbol />}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>Preview:</strong> On a <CurrencySymbol />100 order, VAT tax would be{' '}
                      <CurrencySymbol />{formatTaxPreview(vatTax, 100)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Service Tax Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-700">Service Tax</h3>
                <button
                  onClick={() => handleTaxSettingChange('service', 'enabled', !serviceTax.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    serviceTax.enabled ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      serviceTax.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {serviceTax.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-purple-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Type
                    </label>
                    <select
                      value={serviceTax.type}
                      onChange={(e) => handleTaxSettingChange('service', 'type', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Value
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={serviceTax.value}
                        onChange={(e) => handleTaxSettingChange('service', 'value', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        min="0"
                        max={serviceTax.type === 'percentage' ? '100' : undefined}
                        step={serviceTax.type === 'percentage' ? '0.1' : '0.01'}
                        placeholder="0"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">
                          {serviceTax.type === 'percentage' ? '%' : <CurrencySymbol />}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-md">
                    <p className="text-sm text-purple-700">
                      <strong>Preview:</strong> On a <CurrencySymbol />100 order, Service tax would be{' '}
                      <CurrencySymbol />{formatTaxPreview(serviceTax, 100)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Combined Tax Preview */}
          {(vatTax.enabled || serviceTax.enabled) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Combined Tax Preview</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>Base Amount: <CurrencySymbol />100.00</div>
                {vatTax.enabled && (
                  <div>VAT Tax: <CurrencySymbol />{formatTaxPreview(vatTax, 100)}</div>
                )}
                {serviceTax.enabled && (
                  <div>Service Tax: <CurrencySymbol />{formatTaxPreview(serviceTax, 100)}</div>
                )}
                <div className="font-medium pt-2 border-t border-blue-300">
                  Total Amount: <CurrencySymbol />
                  {(100 + 
                    (vatTax.enabled ? parseFloat(formatTaxPreview(vatTax, 100)) : 0) + 
                    (serviceTax.enabled ? parseFloat(formatTaxPreview(serviceTax, 100)) : 0)
                  ).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveTaxSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Tax Settings'}
            </button>
          </div>
        </div>

        {/* Loyalty Points Settings Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Loyalty Points System</h2>
            <p className="text-gray-600 text-sm mt-1">
              Configure loyalty points earning and redemption settings
            </p>
          </div>

          {/* Enable/Disable Loyalty System */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-700">Enable Loyalty Points</h3>
                <p className="text-sm text-gray-500">Allow customers to earn and redeem loyalty points</p>
              </div>
              <button
                onClick={() => handleLoyaltySettingChange('loyalty_enabled', !loyaltySettings.loyalty_enabled.value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  loyaltySettings.loyalty_enabled.value ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    loyaltySettings.loyalty_enabled.value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {loyaltySettings.loyalty_enabled.value && (
            <div className="space-y-6 pl-4 border-l-2 border-purple-200">
              {/* Points Earning Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-700">Points Earning</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Points per Currency Unit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={loyaltySettings.points_earning_rate.value}
                      onChange={(e) => handleLoyaltySettingChange('points_earning_rate', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., 1 = customers earn 1 point per <CurrencySymbol />1 spent
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calculate Points Based On
                    </label>
                    <select
                      value={loyaltySettings.points_earning_basis.value}
                      onChange={(e) => handleLoyaltySettingChange('points_earning_basis', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="subtotal">Subtotal (before tax/shipping)</option>
                      <option value="total">Total Amount (including tax/shipping)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">
                        <CurrencySymbol />
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={loyaltySettings.points_minimum_order.value}
                        onChange={(e) => handleLoyaltySettingChange('points_minimum_order', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum order amount required to earn points (0 = no minimum)
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-700">Points Redemption</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Redemption Value per Point
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">
                        <CurrencySymbol />
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={loyaltySettings.points_redemption_value.value}
                        onChange={(e) => handleLoyaltySettingChange('points_redemption_value', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                        placeholder="0.01"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      e.g., 0.01 = 1 point = <CurrencySymbol />0.01 discount
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Points to Redeem
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={loyaltySettings.points_redemption_minimum.value}
                      onChange={(e) => handleLoyaltySettingChange('points_redemption_minimum', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum points required for redemption
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Redemption Percentage
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={loyaltySettings.points_max_redemption_percent.value}
                      onChange={(e) => handleLoyaltySettingChange('points_max_redemption_percent', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                      placeholder="50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum % of order that can be paid with points
                    </p>
                  </div>
                </div>
              </div>

              {/* Points Expiry Settings */}
              <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-700 mb-4">Points Expiry</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points Expire After (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={loyaltySettings.points_expiry_months.value}
                    onChange={(e) => handleLoyaltySettingChange('points_expiry_months', parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                    placeholder="12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of months after which points expire (0 = never expire)
                  </p>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="text-md font-medium text-purple-800 mb-2">Preview</h4>
                <div className="text-sm text-purple-700 space-y-1">
                  <p>• Customer spends <CurrencySymbol />100 → earns {(100 * loyaltySettings.points_earning_rate.value).toFixed(0)} points</p>
                  <p>• {loyaltySettings.points_redemption_minimum.value} points = <CurrencySymbol />{(loyaltySettings.points_redemption_minimum.value * loyaltySettings.points_redemption_value.value).toFixed(2)} discount</p>
                  <p>• Maximum discount on <CurrencySymbol />100 order: <CurrencySymbol />{(100 * loyaltySettings.points_max_redemption_percent.value / 100).toFixed(2)}</p>
                  {loyaltySettings.points_expiry_months.value > 0 && (
                    <p>• Points expire after {loyaltySettings.points_expiry_months.value} months</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveLoyaltySettings}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Loyalty Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 