'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ResponsiveTable from '@/app/components/ResponsiveTable';
import CurrencySymbol from '@/app/components/CurrencySymbol';
import { 
  ArrowLeftIcon, 
  TrendingUpIcon, 
  TrendingDownIcon, 
  ClockIcon,
  RefreshCwIcon,
  GiftIcon,
  ShoppingCartIcon,
  UserIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  TrashIcon
} from 'lucide-react';

interface User {
  id: string;
  name?: string;
  email: string;
  phone?: string;
}

interface LoyaltyPoints {
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  availablePoints: number;
  pointsExpiringSoon: number;
  lastEarnedAt?: string;
  lastRedeemedAt?: string;
}

interface PointsHistory {
  id: string;
  transactionType: 'earned' | 'redeemed' | 'expired' | 'manual_adjustment';
  points: number;
  pointsBalance: number;
  description: string;
  orderAmount?: number;
  discountAmount?: number;
  expiresAt?: string;
  isExpired: boolean;
  processedBy?: string;
  metadata?: any;
  createdAt: string;
}

interface ExpiringSoon {
  points: number;
  expiresAt: string;
  createdAt: string;
}

export default function UserPointsHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [totalMoneySaved, setTotalMoneySaved] = useState<number>(0);
  const [history, setHistory] = useState<PointsHistory[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringSoon[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      fetchUserData();
      fetchPointsData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Failed to fetch user data');
    }
  };

  const fetchPointsData = async () => {
    try {
      const response = await fetch(`/api/loyalty/points?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoyaltyPoints(data.points);
          setTotalMoneySaved(data.totalMoneySaved || 0);
          setHistory(data.history || []);
          setExpiringSoon(data.expiringSoon || []);
        } else {
          setError(data.error || 'Failed to fetch points data');
        }
      } else {
        setError('Failed to fetch points data');
      }
    } catch (err) {
      console.error('Error fetching points:', err);
      setError('Failed to fetch points data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllHistory = async () => {
    if (confirm('Are you sure you want to delete ALL points history for this user? This action cannot be undone and will reset all loyalty points data.')) {
      try {
        setLoading(true);
        const response = await fetch(`/api/loyalty/points/delete-all?userId=${userId}`, { 
          method: 'DELETE' 
        });
        
        if (response.ok) {
          // Reset all data
          setLoyaltyPoints({
            totalPointsEarned: 0,
            totalPointsRedeemed: 0,
            availablePoints: 0,
            pointsExpiringSoon: 0
          });
          setTotalMoneySaved(0);
          setHistory([]);
          setExpiringSoon([]);
          setSelectedHistory(new Set());
          setSelectAll(false);
          alert('All points history has been deleted successfully.');
        } else {
          const errorData = await response.json();
          alert(`Failed to delete points history: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting points history:', error);
        alert('Error deleting points history. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedHistory(new Set(history.map(item => item.id)));
    } else {
      setSelectedHistory(new Set());
    }
  };

  const handleSelectHistory = (historyId: string, checked: boolean) => {
    const newSelected = new Set(selectedHistory);
    if (checked) {
      newSelected.add(historyId);
    } else {
      newSelected.delete(historyId);
    }
    setSelectedHistory(newSelected);
    setSelectAll(newSelected.size === history.length && history.length > 0);
  };

  const handleDeleteSelected = async () => {
    if (selectedHistory.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedHistory.size} selected points history record(s)? This action cannot be undone.`)) {
      try {
        setLoading(true);
        const response = await fetch('/api/loyalty/points/delete-selected', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId, 
            historyIds: Array.from(selectedHistory) 
          })
        });
        
        if (response.ok) {
          // Remove deleted items from state and refresh data
          await fetchPointsData();
          setSelectedHistory(new Set());
          setSelectAll(false);
          alert(`${selectedHistory.size} points history record(s) deleted successfully.`);
        } else {
          const errorData = await response.json();
          alert(`Failed to delete points history: ${errorData.error}`);
        }
      } catch (error) {
        console.error('Error deleting selected points history:', error);
        alert('Error deleting selected points history. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />;
      case 'redeemed':
        return <TrendingDownIcon className="h-4 w-4 text-blue-600" />;
      case 'expired':
        return <ClockIcon className="h-4 w-4 text-red-600" />;
      case 'manual_adjustment':
        return <UserIcon className="h-4 w-4 text-purple-600" />;
      default:
        return <GiftIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned':
        return 'text-green-600';
      case 'redeemed':
        return 'text-blue-600';
      case 'expired':
        return 'text-red-600';
      case 'manual_adjustment':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatPoints = (points: number) => {
    if (points === 0) return '0';
    return points > 0 ? `+${points}` : points.toString();
  };

  const columns = [
    {
      key: 'select',
      title: (
        <input
          type="checkbox"
          checked={selectAll}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      render: (_: any, record: PointsHistory) => (
        <input
          type="checkbox"
          checked={selectedHistory.has(record.id)}
          onChange={(e) => handleSelectHistory(record.id, e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      )
    },
    {
      key: 'transaction',
      title: 'Transaction',
      render: (_: any, record: PointsHistory) => {
        const isRecent = new Date(record.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        return (
          <div className="flex items-center space-x-2">
            {getTransactionIcon(record.transactionType)}
            <div>
              <div className="font-medium capitalize flex items-center space-x-2">
                <span>{record.transactionType.replace('_', ' ')}</span>
                {isRecent && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                    Recent
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {formatDate(record.createdAt)}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'points',
      title: 'Points',
      render: (_: any, record: PointsHistory) => (
        <div className={`font-medium ${getTransactionColor(record.transactionType)}`}>
          {formatPoints(record.points)}
        </div>
      )
    },
    {
      key: 'balance',
      title: 'Balance',
      render: (_: any, record: PointsHistory) => (
        <div className="font-medium">
          {record.pointsBalance}
        </div>
      )
    },
    {
      key: 'description',
      title: 'Description',
      render: (_: any, record: PointsHistory) => (
        <div>
          <div className="text-sm">{record.description}</div>
          {record.orderAmount && (
            <div className="text-xs text-gray-500 mt-1">
              Order Amount: <CurrencySymbol />{Number(record.orderAmount).toFixed(2)}
            </div>
          )}
          {record.discountAmount && (
            <div className="text-xs text-green-600 mt-1">
              Discount Applied: <CurrencySymbol />{Number(record.discountAmount).toFixed(2)}
            </div>
          )}
          {record.metadata && record.metadata.pointsToRedeem && (
            <div className="text-xs text-blue-600 mt-1">
              Redeemed: {record.metadata.pointsToRedeem} points
            </div>
          )}
        </div>
      )
    },
    {
      key: 'expiry',
      title: 'Expires',
      render: (_: any, record: PointsHistory) => (
        <div className="text-sm">
          {record.expiresAt ? (
            <div className={record.isExpired ? 'text-red-600' : 'text-gray-600'}>
              {record.isExpired ? 'Expired' : formatDate(record.expiresAt)}
            </div>
          ) : (
            <span className="text-gray-400">Never</span>
          )}
        </div>
      ),
      mobileHidden: true
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading points history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Points History</h1>
            <p className="text-muted-foreground">
              {user?.name || user?.email}'s loyalty points activity
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={fetchPointsData} 
            disabled={loading} 
            variant="outline"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleDeleteSelected} 
            disabled={loading || selectedHistory.size === 0} 
            variant="destructive"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete Selected ({selectedHistory.size})
          </Button>
          <Button 
            onClick={handleDeleteAllHistory} 
            disabled={loading || history.length === 0} 
            variant="destructive"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete All History
          </Button>
        </div>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-lg">{user?.name || 'No name provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-lg">{user?.phone || 'No phone provided'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Available Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {loyaltyPoints?.availablePoints || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loyaltyPoints?.totalPointsEarned || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Redeemed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loyaltyPoints?.totalPointsRedeemed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loyaltyPoints?.pointsExpiringSoon || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center space-x-1">
              <DollarSignIcon className="h-4 w-4" />
              <span>Total Money Saved</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              <CurrencySymbol />{Number(totalMoneySaved || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangleIcon className="h-5 w-5" />
              <span>Points Expiring Soon</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSoon.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{item.points} points</span>
                  <span className="text-orange-600">
                    Expires: {formatDate(item.expiresAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GiftIcon className="h-5 w-5" />
            <span>Transaction History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <ResponsiveTable
              columns={columns}
              data={history}
              loading={false}
              emptyMessage="No points transactions found"
            />
          ) : (
            <div className="text-center py-8">
              <GiftIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Points Activity</h3>
              <p className="text-gray-500">This user hasn't earned or redeemed any points yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}