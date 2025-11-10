'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { convertFromGrams } from '@/utils/weightUtils';

interface StockMovement {
  id: string;
  productName: string;
  variantTitle?: string;
  movementType: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  weightQuantity?: number;
  previousWeightQuantity?: number;
  newWeightQuantity?: number;
  stockManagementType?: 'quantity' | 'weight';
  baseWeightUnit?: string;
  reason: string;
  location: string;
  createdAt: string;
  reference?: string;
  notes?: string;
  costPrice?: string;
  supplier?: string;
  processedBy?: string;
}

export default function StockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  // Checkbox and delete functionality state
  const [selectedMovements, setSelectedMovements] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStockMovements();
  }, []);

  useEffect(() => {
    filterMovements();
  }, [movements, searchTerm, movementFilter, dateRange]);

  const fetchStockMovements = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inventory/stock-movements');
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      } else {
        console.error('Failed to fetch stock movements');
      }
    } catch (error) {
      console.error('Error fetching stock movements:', error);
    }
    setLoading(false);
  };

  // Checkbox handling functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMovements(new Set(filteredMovements.map(m => m.id)));
    } else {
      setSelectedMovements(new Set());
    }
  };

  const handleSelectMovement = (movementId: string, checked: boolean) => {
    const newSelected = new Set(selectedMovements);
    if (checked) {
      newSelected.add(movementId);
    } else {
      newSelected.delete(movementId);
    }
    setSelectedMovements(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedMovements.size === 0) {
      alert('Please select movements to delete');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedMovements.size} stock movement(s)? This action cannot be undone and will remove audit trail history.`
    );

    if (!confirmed) return;

    setDeleting(true);
    try {
      const response = await fetch('/api/inventory/stock-movements', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedMovements)
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message + (result.warning ? `\n\nWarning: ${result.warning}` : ''));
        
        // Refresh the movements list
        await fetchStockMovements();
        setSelectedMovements(new Set());
      } else {
        const error = await response.json();
        alert(`Failed to delete movements: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting movements:', error);
      alert('Failed to delete movements. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filterMovements = () => {
    let filtered = movements;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(movement =>
        movement.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.variantTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Movement type filter
    if (movementFilter !== 'all') {
      filtered = filtered.filter(movement => movement.movementType === movementFilter);
    }

    // Date range filter
    if (dateRange.startDate) {
      filtered = filtered.filter(movement => 
        new Date(movement.createdAt) >= new Date(dateRange.startDate)
      );
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(movement => 
        new Date(movement.createdAt) <= new Date(dateRange.endDate)
      );
    }

    setFilteredMovements(filtered);
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'in': return '📈';
      case 'out': return '📉';
      case 'adjustment': return '🔧';
      default: return '📦';
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'text-green-600 bg-green-100';
      case 'out': return 'text-red-600 bg-red-100';
      case 'adjustment': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTotalMovements = () => {
    return {
      in: filteredMovements.filter(m => m.movementType === 'in').reduce((sum, m) => sum + m.quantity, 0),
      out: filteredMovements.filter(m => m.movementType === 'out').reduce((sum, m) => sum + m.quantity, 0),
      adjustments: filteredMovements.filter(m => m.movementType === 'adjustment').length
    };
  };

  const formatWeightDisplay = (weightInGrams: number) => {
    // If weight is 1kg (1000g) or more, display in kg
    if (weightInGrams >= 1000) {
      const weightInKg = convertFromGrams(weightInGrams, 'kg');
      return `${parseFloat(weightInKg.toFixed(3))}kg`;
    } else {
      // If less than 1kg, display in grams
      return `${Math.round(weightInGrams)}g`;
    }
  };

  if (loading) return <div className="p-8 text-center">Loading stock movements...</div>;

  const totals = getTotalMovements();

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📊 Stock Movements</h1>
          <p className="text-gray-600">Track all inventory movements and changes</p>
        </div>
        <div className="flex gap-2">
          {selectedMovements.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : `🗑️ Delete Selected (${selectedMovements.size})`}
            </button>
          )}
          <button
            onClick={fetchStockMovements}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <Link 
            href="/inventory/stock-movements/add" 
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            ➕ Add Stock Movement
          </Link>
          <Link 
            href="/inventory" 
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ← Back to Inventory
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-800">{filteredMovements.length}</div>
              <div className="text-gray-600">Total Movements</div>
            </div>
            <div className="text-3xl">📦</div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-800">+{totals.in}</div>
              <div className="text-green-600">Stock In</div>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-800">-{totals.out}</div>
              <div className="text-red-600">Stock Out</div>
            </div>
            <div className="text-3xl">📉</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-800">{totals.adjustments}</div>
              <div className="text-blue-600">Adjustments</div>
            </div>
            <div className="text-3xl">🔧</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search products, reasons, references..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type</label>
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Movements</option>
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      
      {/* Movements Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b p-3 text-center font-semibold">
                  <input
                    type="checkbox"
                    checked={filteredMovements.length > 0 && selectedMovements.size === filteredMovements.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="border-b p-3 text-left font-semibold">Date</th>
                <th className="border-b p-3 text-left font-semibold">Product</th>
                <th className="border-b p-3 text-left font-semibold">Variant</th>
                <th className="border-b p-3 text-left font-semibold">Type</th>
                <th className="border-b p-3 text-left font-semibold">Quantity/Weight</th>
                <th className="border-b p-3 text-left font-semibold">Reason</th>
                <th className="border-b p-3 text-left font-semibold">Location</th>
                <th className="border-b p-3 text-left font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.length > 0 ? (
                filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="border-b p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMovements.has(movement.id)}
                        onChange={(e) => handleSelectMovement(movement.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="border-b p-3 text-sm">
                      {new Date(movement.createdAt).toLocaleDateString()} <br />
                      <span className="text-gray-500">
                        {new Date(movement.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="border-b p-3">
                      <div className="font-medium">{movement.productName}</div>
                    </td>
                    <td className="border-b p-3">{movement.variantTitle || 'Base Product'}</td>
                    <td className="border-b p-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movementType)}`}>
                        {getMovementTypeIcon(movement.movementType)} {movement.movementType.toUpperCase()}
                      </span>
                    </td>
                    <td className="border-b p-3">
                      <div className="space-y-1">
                        <span className={`font-semibold ${
                          movement.movementType === 'in' ? 'text-green-600' : 
                          movement.movementType === 'out' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {movement.movementType === 'in' ? '+' : movement.movementType === 'out' ? '-' : '±'}
                          {movement.quantity}
                        </span>
                        {movement.weightQuantity && movement.stockManagementType === 'weight' && (
                          <div className={`text-sm ${
                            movement.movementType === 'in' ? 'text-green-500' : 
                            movement.movementType === 'out' ? 'text-red-500' : 'text-blue-500'
                          }`}>
                            {movement.movementType === 'in' ? '+' : movement.movementType === 'out' ? '-' : '±'}
                            {formatWeightDisplay(movement.weightQuantity)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border-b p-3">{movement.reason}</td>
                    <td className="border-b p-3">{movement.location}</td>
                    <td className="border-b p-3">{movement.reference || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="border-b p-8 text-center text-gray-500">
                    {searchTerm || movementFilter !== 'all' || dateRange.startDate || dateRange.endDate
                      ? 'No stock movements match your filters' 
                      : 'No stock movements recorded yet'
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 