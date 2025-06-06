'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  PieChart,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';

interface TokenUsageData {
  totalTokens: number;
  totalCost: number;
  operationBreakdown: Record<string, { tokens: number; cost: number; count: number }>;
  cachedSavings: { tokens: number; cost: number };
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalTokensSaved: number;
  costSaved: number;
  avgResponseTime: number;
}

interface AnalyticsData {
  tokenUsage: TokenUsageData;
  cacheStats: CacheStats;
  userSummary: {
    totalGenerations: number;
    totalNotes: number;
    cacheHitRate: number;
    monthlyCost: number;
    savings: { tokens: number; cost: number };
  };
}

interface TokenUsageAnalyticsProps {
  className?: string;
}

export function TokenUsageAnalytics({ className }: TokenUsageAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('month');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/enhanced-generate');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  if (loading && !analytics) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 mb-4">No analytics data available</p>
          <Button onClick={fetchAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  const { tokenUsage, cacheStats, userSummary } = analytics;

  // Calculate percentages for operation breakdown
  const operationData = Object.entries(tokenUsage.operationBreakdown).map(([operation, data]) => ({
    operation,
    ...data,
    percentage: (data.tokens / tokenUsage.totalTokens) * 100
  }));

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 3
  }).format(amount);

  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Token Usage Analytics</h2>
          <p className="text-gray-600">Track your AI generation costs and usage patterns</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Tokens</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {formatNumber(tokenUsage.totalTokens)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last {timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {formatCurrency(tokenUsage.totalCost)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last {timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Cache Hit Rate</span>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {(cacheStats.hitRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(cacheStats.totalEntries)} cached entries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Cost Saved</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {formatCurrency(tokenUsage.cachedSavings.cost)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatNumber(tokenUsage.cachedSavings.tokens)} tokens saved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="caching" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Caching
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Operation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {operationData.map(({ operation, tokens, cost, count, percentage }) => (
                  <div key={operation} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{operation}</span>
                        <Badge variant="secondary" className="text-xs">
                          {count} operations
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatNumber(tokens)} tokens • {formatCurrency(cost)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}% of total usage
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Generated:</span>
                    <span className="font-medium">{userSummary.totalGenerations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Tokens/Summary:</span>
                    <span className="font-medium">
                      {userSummary.totalGenerations > 0 
                        ? Math.round(tokenUsage.operationBreakdown.summary?.tokens / userSummary.totalGenerations || 0)
                        : 0
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Cost/Summary:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        userSummary.totalGenerations > 0 
                          ? (tokenUsage.operationBreakdown.summary?.cost || 0) / userSummary.totalGenerations
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Generated:</span>
                    <span className="font-medium">{userSummary.totalNotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Tokens/Notes:</span>
                    <span className="font-medium">
                      {userSummary.totalNotes > 0 
                        ? Math.round(tokenUsage.operationBreakdown.notes?.tokens / userSummary.totalNotes || 0)
                        : 0
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Cost/Notes:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        userSummary.totalNotes > 0 
                          ? (tokenUsage.operationBreakdown.notes?.cost || 0) / userSummary.totalNotes
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Hit Rate:</span>
                      <span className="font-medium">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={cacheStats.hitRate * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Entries:</span>
                      <span className="font-medium">{formatNumber(cacheStats.totalEntries)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Response Time:</span>
                      <span className="font-medium">{cacheStats.avgResponseTime}ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Savings Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(cacheStats.costSaved)}
                    </p>
                    <p className="text-sm text-gray-600">Total cost saved</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatNumber(cacheStats.totalTokensSaved)}
                      </p>
                      <p className="text-xs text-gray-600">Tokens saved</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-purple-600">
                        {((cacheStats.totalTokensSaved / tokenUsage.totalTokens) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">Efficiency gain</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cache Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round((tokenUsage.cachedSavings.cost / tokenUsage.totalCost) * 100)}%
                  </p>
                  <p className="text-sm text-green-700">Cost reduction</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(cacheStats.avgResponseTime / 10)}ms
                  </p>
                  <p className="text-sm text-blue-700">Faster responses</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(cacheStats.totalTokensSaved / 1000)}K
                  </p>
                  <p className="text-sm text-purple-700">Tokens avoided</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  Trend visualization coming soon. Currently tracking {formatNumber(tokenUsage.totalTokens)} tokens 
                  across {Object.values(tokenUsage.operationBreakdown).reduce((sum, op) => sum + op.count, 0)} operations.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 