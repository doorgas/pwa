'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import CurrencySymbol from '../../../components/CurrencySymbol';
import { 
  formatWeightAuto, 
  isWeightBasedProduct 
} from '@/utils/weightUtils';

export default function OrderInvoice() {
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrderData();
    fetchAddons();
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      setLoading(true);
      const orderRes = await fetch(`/api/orders/${orderId}`);
      
      if (!orderRes.ok) throw new Error('Order not found');
      
      const orderData = await orderRes.json();
      
      // Process items to add weight-based information
      if (orderData.items) {
        orderData.items = orderData.items.map((item: any) => {
          // Determine if item is weight-based by checking if weightQuantity exists and is > 0
          const weightQuantity = item.weightQuantity ? parseFloat(item.weightQuantity) : 0;
          const isWeightBased = weightQuantity > 0;

          return {
            ...item,
            isWeightBased,
            weightQuantity: weightQuantity > 0 ? weightQuantity : undefined,
            weightUnit: item.weightUnit || undefined
          };
        });
      }
      
      setOrder(orderData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async () => {
    try {
      const addonsRes = await fetch('/api/addons');
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json();
        setAddons(addonsData);
      }
    } catch (err) {
      console.error('Failed to fetch addons:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Format date and time to "Aug 5, 2025 at 5:57 PM" format
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options).replace(',', ' at');
  };

  const formatAmount = (amount: string | number) => {
    const numAmount = Number(amount);
    
    // Handle NaN, undefined, null, or invalid values
    if (isNaN(numAmount) || amount === null || amount === undefined || typeof numAmount !== 'number') {
      return (
        <span className="flex items-center gap-1">
          <CurrencySymbol />0.00
        </span>
      );
    }
    
    return (
      <span className="flex items-center gap-1">
        <CurrencySymbol />{numAmount.toFixed(2)}
      </span>
    );
  };

  const parseAddons = (addonsData: any) => {
    if (!addonsData) return [];
    
    try {
      // If it's already an array, return it
      if (Array.isArray(addonsData)) {
        return addonsData;
      }
      
      // If it's a string, try to parse it
      if (typeof addonsData === 'string') {
        const parsed = JSON.parse(addonsData);
        return Array.isArray(parsed) ? parsed : [];
      }
      
      // If it's an object but not an array, wrap it in an array
      if (typeof addonsData === 'object') {
        return [addonsData];
      }
      
      return [];
    } catch (error) {
      console.error('Error parsing addons:', error);
      return [];
    }
  };

  const getAddonTitle = (addon: any, index: number) => {
    // First try to get the title from the stored addon data
    if (addon.addonTitle) return addon.addonTitle;
    if (addon.title) return addon.title;
    if (addon.name) return addon.name;
    
    // If no title in stored data, try to find it in the addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable) {
        return addonFromTable.title;
      }
    }
    
    // Fallback to generic name
    return `Addon ${index + 1}`;
  };

  const getAddonDescription = (addon: any) => {
    // Try to get description from addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable && addonFromTable.description) {
        return addonFromTable.description;
      }
    }
    return null;
  };

  const getAddonImage = (addon: any) => {
    // Try to get image from addons table
    if (addon.addonId && addons.length > 0) {
      const addonFromTable = addons.find(a => a.id === addon.addonId);
      if (addonFromTable && addonFromTable.image) {
        return addonFromTable.image;
      }
    }
    return null;
  };

  if (loading) return <div className="p-8">Loading invoice...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!order) return <div className="p-8">Order not found</div>;

  const orderItems = order.items || [];

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-container, .invoice-container * {
            visibility: visible;
          }
          .invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hidden {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Print Button */}
          <div className="mb-6 print-hidden">
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🖨️ Print Invoice
            </button>
          </div>

          {/* Invoice */}
          <div className="invoice-container bg-white shadow-lg">
            {/* Header */}
            <div className="border-b-2 border-gray-200 p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                  <p className="text-gray-600 mt-2">Invoice #{order.orderNumber}</p>
                </div>
                <div className="text-right">
                 
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-8 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Bill To */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To:</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{order.billingFirstName} {order.billingLastName}</p>
                    <p>{order.email}</p>
                    {order.phone && <p>{order.phone}</p>}
                    <div className="mt-2">
                      {order.billingAddress1 && <p>{order.billingAddress1}</p>}
                      {order.billingAddress2 && <p>{order.billingAddress2}</p>}
                      <p>
                        {order.billingCity && `${order.billingCity}, `}
                        {order.billingState && `${order.billingState} `}
                        {order.billingPostalCode}
                      </p>
                      {order.billingCountry && <p>{order.billingCountry}</p>}
                    </div>
                  </div>
                </div>

                {/* Ship To */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Delivered To:</h3>
                  <div className="text-gray-600">
                    <p className="font-medium">{order.shippingFirstName} {order.shippingLastName}</p>
                    <div className="mt-2">
                      {order.shippingAddress1 && <p>{order.shippingAddress1}</p>}
                      {order.shippingAddress2 && <p>{order.shippingAddress2}</p>}
                      <p>
                        {order.shippingCity && `${order.shippingCity}, `}
                        {order.shippingState && `${order.shippingState} `}
                        {order.shippingPostalCode}
                      </p>
                      {order.shippingCountry && <p>{order.shippingCountry}</p>}
                    </div>
                  </div>
                </div>

                {/* Invoice Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Invoice Information:</h3>
                  <div className="text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Invoice Date:</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Status:</span>
                      <span className="capitalize">{order.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span className="capitalize">{order.paymentStatus}</span>
                    </div>
                    {order.trackingNumber && (
                      <div className="flex justify-between">
                        <span>Tracking:</span>
                        <span className="font-mono text-sm">{order.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="p-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items:</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-2">Item</th>
                      <th className="text-left py-3 px-2">SKU</th>
                      <th className="text-center py-3 px-2">Qty/Weight</th>
                      <th className="text-center py-3 px-2">Unit Price</th>
                      <th className="text-center py-3 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.length > 0 ? (
                      orderItems.map((item: any, index: number) => (
                        <React.Fragment key={index}>
                          <tr className="border-b border-gray-100">
                            <td className="py-3 px-2">
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                {item.variantTitle && (
                                  <div className="text-sm text-gray-500">{item.variantTitle}</div>
                                )}
                                {item.isWeightBased && item.weightQuantity && (
                                  <div className="text-sm text-blue-600">
                                    ⚖️ Weight: {formatWeightAuto(item.weightQuantity).formattedString}
                                  </div>
                                )}
                                {(() => {
                                  const parsedAddons = parseAddons(item.addons);
                                  return parsedAddons.length > 0 && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      🧩 {parsedAddons.length} addon(s) included
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-gray-600 font-mono text-sm">
                              {item.sku || 'N/A'}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {item.isWeightBased && item.weightQuantity ? (
                                <div className="text-sm">
                                  <div>{formatWeightAuto(item.weightQuantity).formattedString}</div>
                                  <div className="text-xs text-gray-500">(Weight)</div>
                                </div>
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {(() => {
                                const parsedAddons = parseAddons(item.addons);
                                if (parsedAddons.length > 0) {
                                  return (
                                    <div>
                                      <div className="text-sm">Base: {formatAmount(item.price)}</div>
                                      <div className="text-xs text-gray-500">
                                        +Addons: {formatAmount(parsedAddons.reduce((sum: number, addon: any) => sum + ((Number(addon.price) || 0) * (Number(addon.quantity) || 1)), 0))}
                                      </div>
                                    </div>
                                  );
                                } else if (item.isWeightBased && item.weightQuantity) {
                                  return (
                                    <div className="text-sm">
                                      {formatAmount(item.price)}
                                      <div className="text-xs text-gray-500">
                                        (for {formatWeightAuto(item.weightQuantity).formattedString})
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return formatAmount(item.price);
                                }
                              })()}
                            </td>
                            <td className="py-3 px-2 text-right font-medium">
                              {formatAmount(item.totalPrice)}
                            </td>
                          </tr>
                          {/* Addon details row */}
                          {(() => {
                            const parsedAddons = parseAddons(item.addons);
                            return parsedAddons.length > 0 && (
                              <tr className="border-b border-gray-50 bg-gray-25">
                                <td colSpan={5} className="py-3 px-2 pl-8">
                                  <div className="text-xs text-gray-600">
                                    <div className="font-medium mb-2 text-gray-700">🧩 Addons:</div>
                                    <div className="space-y-2">
                                      {parsedAddons.map((addon: any, addonIndex: number) => {
                                      // Ensure addon has required properties
                                      const safeAddon = {
                                        addonId: addon.addonId || '',
                                        addonTitle: addon.addonTitle || addon.title || addon.name || `Addon ${addonIndex + 1}`,
                                        price: Number(addon.price) || 0,
                                        quantity: Number(addon.quantity) || 1
                                      };
                                      
                                      const addonDescription = getAddonDescription(addon);
                                      const addonImage = getAddonImage(addon);
                                      return (
                                        <div key={addonIndex} className="flex items-start justify-between">
                                          <div className="flex items-start gap-2 flex-1">
                                            {addonImage && (
                                              <img 
                                                src={addonImage} 
                                                alt={safeAddon.addonTitle}
                                                className="w-6 h-6 object-cover rounded"
                                              />
                                            )}
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-700">
                                                • {safeAddon.addonTitle} (x{safeAddon.quantity})
                                              </div>
                                              {addonDescription && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {addonDescription}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right ml-4">
                                            <div className="font-medium text-gray-700">
                                              {formatAmount(safeAddon.price)} each
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Total: {formatAmount(safeAddon.price * safeAddon.quantity)}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                        <div className="flex justify-between text-sm font-medium text-gray-700 border-t pt-2 mt-2">
                                          <span>Addons subtotal per product:</span>
                                          <span>{formatAmount(parsedAddons.reduce((sum: number, addon: any) => sum + ((Number(addon.price) || 0) * (Number(addon.quantity) || 1)), 0))}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No items found for this order
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="p-8 bg-gray-50">
              <div className="max-w-md ml-auto">
                <div className="space-y-2">
                  <div className="flex justify-between py-2">
                    <span>Subtotal:</span>
                    <span>{formatAmount(order.subtotal)}</span>
                  </div>
                  
                  {parseFloat(order.taxAmount) > 0 && (
                    <div className="flex justify-between py-2">
                      <span>Tax:</span>
                      <span>{formatAmount(order.taxAmount)}</span>
                    </div>
                  )}
                  
                  {parseFloat(order.shippingAmount) > 0 && (
                    <div className="flex justify-between py-2">
                      <span>Shipping:</span>
                      <span>{formatAmount(order.shippingAmount)}</span>
                    </div>
                  )}
                  
                  {parseFloat(order.discountAmount) > 0 && (
                    <div className="flex justify-between py-2 text-green-600">
                      <span>Discount:</span>
                      <span>-{formatAmount(order.discountAmount)}</span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-gray-300 pt-2">
                    <div className="flex justify-between py-2 text-xl font-bold">
                      <span>Total:</span>
                      <span>{formatAmount(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        </div>
      </div>
    </>
  );
} 
