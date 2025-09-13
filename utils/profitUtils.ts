import { formatCurrency } from './currencyUtils';

export interface OrderItemData {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantTitle?: string;
  quantity: number;
  weightQuantity?: number; // in grams
  price: number;
  costPrice?: number;
  totalPrice: number;
  totalCost?: number;
  isWeightBased?: boolean;
}

export interface ProfitData {
  revenue: number;
  cost: number;
  profit: number;
  margin: number; // percentage
  isProfit: boolean;
}

export interface OrderProfitSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageMargin: number;
  profitableItems: number;
  lossItems: number;
  totalItems: number;
}

/**
 * Calculate profit for a single order item
 */
export const calculateItemProfit = (item: OrderItemData): ProfitData => {
  const revenue = item.totalPrice || (item.price * item.quantity);
  let cost = 0;

  if (item.totalCost) {
    cost = item.totalCost;
  } else if (item.costPrice) {
    if (item.isWeightBased && item.weightQuantity) {
      // For weight-based products, cost is per gram/unit weight
      cost = item.costPrice * (item.weightQuantity / 1000); // Convert grams to kg if needed
    } else {
      cost = item.costPrice * item.quantity;
    }
  }

  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    margin,
    isProfit: profit >= 0
  };
};

/**
 * Calculate profit summary for multiple items (order or report)
 */
export const calculateOrderProfitSummary = (items: OrderItemData[]): OrderProfitSummary => {
  let totalRevenue = 0;
  let totalCost = 0;
  let profitableItems = 0;
  let lossItems = 0;

  items.forEach(item => {
    const itemProfit = calculateItemProfit(item);
    totalRevenue += itemProfit.revenue;
    totalCost += itemProfit.cost;
    
    if (itemProfit.isProfit) {
      profitableItems++;
    } else {
      lossItems++;
    }
  });

  const totalProfit = totalRevenue - totalCost;
  const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    averageMargin,
    profitableItems,
    lossItems,
    totalItems: items.length
  };
};

/**
 * Format profit data for display
 */
export const formatProfitDisplay = (profitData: ProfitData, currencyCode: string = 'AED') => {
  return {
    revenue: formatCurrency(profitData.revenue, currencyCode as any),
    cost: formatCurrency(profitData.cost, currencyCode as any),
    profit: formatCurrency(profitData.profit, currencyCode as any),
    margin: `${profitData.margin.toFixed(2)}%`,
    profitClass: profitData.isProfit ? 'text-green-600' : 'text-red-600',
    profitIcon: profitData.isProfit ? '📈' : '📉'
  };
};

/**
 * Get profit status indicator
 */
export const getProfitStatus = (profit: number) => {
  if (profit > 0) return { status: 'profit', color: 'text-green-600 bg-green-100', icon: '📈' };
  if (profit < 0) return { status: 'loss', color: 'text-red-600 bg-red-100', icon: '📉' };
  return { status: 'break-even', color: 'text-gray-600 bg-gray-100', icon: '➖' };
};

/**
 * Calculate cost price for weight-based products
 */
export const calculateWeightBasedCost = (
  costPerGram: number,
  weightInGrams: number
): number => {
  return costPerGram * weightInGrams;
};

/**
 * Calculate profit margin tier
 */
export const getProfitMarginTier = (margin: number) => {
  if (margin >= 50) return { tier: 'excellent', color: 'text-green-700 bg-green-100', label: 'Excellent' };
  if (margin >= 30) return { tier: 'good', color: 'text-green-600 bg-green-50', label: 'Good' };
  if (margin >= 15) return { tier: 'average', color: 'text-yellow-600 bg-yellow-50', label: 'Average' };
  if (margin >= 0) return { tier: 'low', color: 'text-orange-600 bg-orange-50', label: 'Low' };
  return { tier: 'loss', color: 'text-red-600 bg-red-50', label: 'Loss' };
};

/**
 * Export data for CSV/PDF reports
 */
export const formatProfitDataForExport = (items: OrderItemData[]) => {
  return items.map(item => {
    const profit = calculateItemProfit(item);
    return {
      'Product Name': item.productName,
      'Variant': item.variantTitle || 'N/A',
      'Quantity': item.quantity,
      'Weight (g)': item.weightQuantity || 'N/A',
      'Unit Price': item.price.toFixed(2),
      'Cost Price': item.costPrice?.toFixed(2) || 'N/A',
      'Total Revenue': profit.revenue.toFixed(2),
      'Total Cost': profit.cost.toFixed(2),
      'Profit/Loss': profit.profit.toFixed(2),
      'Margin %': profit.margin.toFixed(2),
      'Status': profit.isProfit ? 'Profit' : 'Loss'
    };
  });
};

/**
 * Date range helpers for reports
 */
export const getDateRanges = () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  
  const thisYearStart = new Date(today.getFullYear(), 0, 1);

  return {
    today: {
      label: 'Today',
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    yesterday: {
      label: 'Yesterday',
      startDate: yesterday.toISOString().split('T')[0],
      endDate: yesterday.toISOString().split('T')[0]
    },
    thisWeek: {
      label: 'This Week',
      startDate: thisWeekStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    lastWeek: {
      label: 'Last Week',
      startDate: lastWeekStart.toISOString().split('T')[0],
      endDate: lastWeekEnd.toISOString().split('T')[0]
    },
    thisMonth: {
      label: 'This Month',
      startDate: thisMonthStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    },
    lastMonth: {
      label: 'Last Month',
      startDate: lastMonthStart.toISOString().split('T')[0],
      endDate: lastMonthEnd.toISOString().split('T')[0]
    },
    thisYear: {
      label: 'This Year',
      startDate: thisYearStart.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    }
  };
}; 