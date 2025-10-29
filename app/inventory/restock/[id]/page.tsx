'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CurrencySymbol from '../../../components/CurrencySymbol';

export default function RestockInventory() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.id as string;
  
  const [inventory, setInventory] = useState<any>(null);
  const [restockData, setRestockData] = useState({
    quantity: '',
    reason: 'regular_restock',
    cost: '',
    supplier: '',
    notes: '',
    location: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInventoryData();
  }, [inventoryId]);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory/${inventoryId}`);
      if (!response.ok) throw new Error('Inventory item not found');
      
      const data = await response.json();
      setInventory(data);
      
      // Pre-fill some fields
      setRestockData(prev => ({
        ...prev,
        supplier: data.inventory.supplier || '',
        location: data.inventory.location || 'Main Warehouse'
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRestockData({ ...restockData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!restockData.quantity || parseInt(restockData.quantity) <= 0) {
        throw new Error('Please enter a valid restock quantity');
      }

      const updateData = {
        quantity: inventory.inventory.quantity + parseInt(restockData.quantity),
        lastRestockDate: new Date().toISOString(),
        supplier: restockData.supplier || inventory.inventory.supplier,
        location: restockData.location || inventory.inventory.location,
        restockRecord: {
          quantity: parseInt(restockData.quantity),
          reason: restockData.reason,
          cost: restockData.cost ? parseFloat(restockData.cost) : null,
          supplier: restockData.supplier,
          notes: restockData.notes,
          date: new Date().toISOString()
        }
      };

      const response = await fetch(`/api/inventory/${inventoryId}/restock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update inventory');
      }

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity <= 0) return { status: 'Out of Stock', color: 'text-red-600' };
    if (quantity <= reorderPoint) return { status: 'Low Stock', color: 'text-yellow-600' };
    return { status: 'In Stock', color: 'text-green-600' };
  };

  const calculateNewStock = () => {
    const currentStock = inventory?.inventory.quantity || 0;
    const restockQty = parseInt(restockData.quantity) || 0;
    return currentStock + restockQty;
  };

  const calculateRestockCost = () => {
    const unitCost = parseFloat(restockData.cost) || 0;
    const quantity = parseInt(restockData.quantity) || 0;
    return unitCost * quantity;
  };

  if (loading) return <div className="p-8 text-center">Loading inventory data...</div>;
  if (error && !inventory) return <div className="p-8 text-center text-red-600">Error: {error}</div>;

  const currentStatus = inventory ? getStockStatus(inventory.inventory.quantity, inventory.inventory.reorderPoint) : null;
  const newStatus = inventory ? getStockStatus(calculateNewStock(), inventory.inventory.reorderPoint) : null;

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">📦 Restock Inventory</h1>
          <button
            onClick={() => router.push('/inventory')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Inventory
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {inventory && (
          <>
            {/* Current Inventory Info */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">📋 Current Inventory Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Product</label>
                  <div className="text-lg font-semibold">{inventory.product?.name || 'Unknown Product'}</div>
                  {inventory.variant && (
                    <div className="text-sm text-gray-500">{inventory.variant.title}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Current Stock</label>
                  <div className="text-2xl font-bold">{inventory.inventory.quantity}</div>
                  <div className={`text-sm font-medium ${currentStatus?.color}`}>
                    {currentStatus?.status}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Location</label>
                  <div className="text-lg">{inventory.inventory.location || 'Main Warehouse'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Reorder Point</label>
                  <div className="text-lg">{inventory.inventory.reorderPoint}</div>
                  <div className="text-sm text-gray-500">
                    {inventory.inventory.quantity <= inventory.inventory.reorderPoint ? 
                      'Below reorder point' : 'Above reorder point'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Restock Form */}
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">📈 Restock Details</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="quantity">
                      Restock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      value={restockData.quantity}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="reason">
                      Restock Reason
                    </label>
                    <select
                      id="reason"
                      name="reason"
                      value={restockData.reason}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="regular_restock">Regular Restock</option>
                      <option value="low_stock_alert">Low Stock Alert</option>
                      <option value="emergency_restock">Emergency Restock</option>
                      <option value="seasonal_preparation">Seasonal Preparation</option>
                      <option value="bulk_purchase">Bulk Purchase</option>
                      <option value="supplier_promotion">Supplier Promotion</option>
                      <option value="return_to_inventory">Return to Inventory</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="cost">
                      Unit Cost (Optional)
                    </label>
                    <input
                      type="number"
                      id="cost"
                      name="cost"
                      value={restockData.cost}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="supplier">
                      Supplier
                    </label>
                    <input
                      type="text"
                      id="supplier"
                      name="supplier"
                      value={restockData.supplier}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="location">
                      Storage Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={restockData.location}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="notes">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={restockData.notes}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Any additional information about this restock..."
                  />
                </div>

                {/* Preview */}
                {restockData.quantity && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-3">📊 Restock Preview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600 font-medium">New Stock Level:</span>
                        <div className="text-xl font-bold text-blue-800">
                          {inventory.inventory.quantity} + {restockData.quantity} = {calculateNewStock()}
                        </div>
                        <div className={`font-medium ${newStatus?.color}`}>
                          {newStatus?.status}
                        </div>
                      </div>
                      {restockData.cost && (
                        <div>
                          <span className="text-blue-600 font-medium">Total Cost:</span>
                          <div className="text-xl font-bold text-blue-800">
                            <CurrencySymbol />{calculateRestockCost().toFixed(2)}
                          </div>
                          <div className="text-blue-600">
                            <CurrencySymbol />{parseFloat(restockData.cost).toFixed(2)} × {restockData.quantity}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-blue-600 font-medium">Days Since Last Restock:</span>
                        <div className="text-xl font-bold text-blue-800">
                          {inventory.inventory.lastRestockDate ? 
                            Math.floor((new Date().getTime() - new Date(inventory.inventory.lastRestockDate).getTime()) / (1000 * 60 * 60 * 24)) :
                            'Never'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting || !restockData.quantity}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Processing Restock...' : '✅ Confirm Restock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/inventory')}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">⚡ Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setRestockData(prev => ({ 
                    ...prev, 
                    quantity: (inventory.inventory.reorderPoint - inventory.inventory.quantity + 10).toString(),
                    reason: 'low_stock_alert'
                  }))}
                  className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
                >
                  <div className="font-medium text-yellow-800">Restock to Safe Level</div>
                  <div className="text-sm text-yellow-600">
                    +{inventory.inventory.reorderPoint - inventory.inventory.quantity + 10} units
                  </div>
                </button>
                
                <button
                  onClick={() => setRestockData(prev => ({ 
                    ...prev, 
                    quantity: inventory.inventory.quantity.toString(),
                    reason: 'regular_restock'
                  }))}
                  className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="font-medium text-blue-800">Double Current Stock</div>
                  <div className="text-sm text-blue-600">
                    +{inventory.inventory.quantity} units
                  </div>
                </button>
                
                <button
                  onClick={() => setRestockData(prev => ({ 
                    ...prev, 
                    quantity: '100',
                    reason: 'bulk_purchase'
                  }))}
                  className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="font-medium text-green-800">Bulk Restock</div>
                  <div className="text-sm text-green-600">
                    +100 units
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 