"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line 
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Zap,
  RefreshCw,
  Shield,
  XCircle
} from 'lucide-react';
import { getApiStats, getCircuitBreakerStatus, resetApiStats } from '@/lib/apiOptimization';

interface ApiStats {
  endpoint: string;
  callCount: number;
  failureCount: number;
  avgResponseTime: number;
  lastCalled: number;
}

interface CircuitBreakerStatus {
  endpoint: string;
  state: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    nextAttempt: number;
  };
}

export const ApiMonitoringDashboard: React.FC = () => {
  const [apiStats, setApiStats] = useState<ApiStats[]>([]);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerStatus[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch monitoring data
  const refreshData = () => {
    const stats = getApiStats();
    const breakers = getCircuitBreakerStatus();
    
    setApiStats(stats);
    setCircuitBreakers(breakers);
  };

  // Auto-refresh every 10 seconds when visible
  useEffect(() => {
    if (isVisible) {
      refreshData();
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  // Calculate totals
  const totalCalls = apiStats.reduce((sum, stat) => sum + stat.callCount, 0);
  const totalFailures = apiStats.reduce((sum, stat) => sum + stat.failureCount, 0);
  const avgResponseTime = apiStats.length > 0 
    ? apiStats.reduce((sum, stat) => sum + stat.avgResponseTime, 0) / apiStats.length 
    : 0;
  
  const successRate = totalCalls > 0 ? ((totalCalls - totalFailures) / totalCalls) * 100 : 100;

  // Get status color for circuit breaker
  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'bg-green-100 text-green-800';
      case 'OPEN': return 'bg-red-100 text-red-800';
      case 'HALF_OPEN': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon for circuit breaker
  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'CLOSED': return <CheckCircle className="w-4 h-4" />;
      case 'OPEN': return <XCircle className="w-4 h-4" />;
      case 'HALF_OPEN': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Format endpoint name for display
  const formatEndpoint = (endpoint: string) => {
    return endpoint.replace('/api/', '').replace(/\//g, ' › ');
  };

  if (!isVisible) {
    return (
      <Button 
        onClick={() => setIsVisible(true)}
        variant="outline" 
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white hover:bg-blue-700"
      >
        <Activity className="w-4 h-4 mr-2" />
        API Monitor
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">API Monitoring Dashboard</h2>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => resetApiStats()} variant="outline" size="sm">
              Reset Stats
            </Button>
            <Button onClick={() => setIsVisible(false)} variant="outline" size="sm">
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg Response</p>
                    <p className="text-2xl font-bold">{avgResponseTime.toFixed(0)}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Failures</p>
                    <p className="text-2xl font-bold">{totalFailures.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Calls Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                API Call Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apiStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={apiStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="endpoint" 
                      tickFormatter={formatEndpoint}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => formatEndpoint(label)}
                      formatter={(value: any, name: string) => [
                        value,
                        name === 'callCount' ? 'Total Calls' : 
                        name === 'failureCount' ? 'Failures' : 'Avg Response (ms)'
                      ]}
                    />
                    <Bar dataKey="callCount" fill="#3b82f6" name="callCount" />
                    <Bar dataKey="failureCount" fill="#ef4444" name="failureCount" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  No API calls recorded yet
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Circuit Breaker Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Circuit Breaker Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {circuitBreakers.length > 0 ? (
                  <div className="space-y-3">
                    {circuitBreakers.map((breaker) => (
                      <div 
                        key={breaker.endpoint} 
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getCircuitBreakerIcon(breaker.state.state)}
                          <div>
                            <p className="font-medium">{formatEndpoint(breaker.endpoint)}</p>
                            <p className="text-sm text-gray-600">
                              Failures: {breaker.state.failureCount}
                            </p>
                          </div>
                        </div>
                        <Badge className={getCircuitBreakerColor(breaker.state.state)}>
                          {breaker.state.state}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    All circuit breakers healthy
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Response Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {apiStats.length > 0 ? (
                  <div className="space-y-3">
                    {apiStats
                      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
                      .slice(0, 5)
                      .map((stat) => (
                        <div key={stat.endpoint} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm font-medium">
                            {formatEndpoint(stat.endpoint)}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-bold">
                              {stat.avgResponseTime.toFixed(0)}ms
                            </span>
                            <p className="text-xs text-gray-500">
                              {stat.callCount} calls
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500">
                    No response time data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed API Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {apiStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Endpoint</th>
                        <th className="text-right p-2">Calls</th>
                        <th className="text-right p-2">Failures</th>
                        <th className="text-right p-2">Success Rate</th>
                        <th className="text-right p-2">Avg Response</th>
                        <th className="text-right p-2">Last Called</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiStats.map((stat) => {
                        const successRate = stat.callCount > 0 
                          ? ((stat.callCount - stat.failureCount) / stat.callCount) * 100 
                          : 100;
                        
                        return (
                          <tr key={stat.endpoint} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{formatEndpoint(stat.endpoint)}</td>
                            <td className="text-right p-2">{stat.callCount}</td>
                            <td className="text-right p-2">{stat.failureCount}</td>
                            <td className="text-right p-2">
                              <span className={successRate >= 95 ? 'text-green-600' : 'text-red-600'}>
                                {successRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="text-right p-2">{stat.avgResponseTime.toFixed(0)}ms</td>
                            <td className="text-right p-2">
                              {new Date(stat.lastCalled).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-500">
                  No API statistics available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
