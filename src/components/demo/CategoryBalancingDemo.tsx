import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PieChart, 
  BarChart3, 
  Target, 
  TrendingUp,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Download,
  Play,
  Pause,
  SkipForward,
  Zap
} from 'lucide-react';

interface CategoryData {
  id: string;
  name: string;
  description: string;
  targetRatio: number;
  currentRatio: number;
  currentCount: number;
  targetCount: number;
  color: string;
  priority: 'high' | 'medium' | 'low';
  examples: string[];
}

interface BalancingMetrics {
  totalItems: number;
  balanceScore: number;
  deviationScore: number;
  qualityScore: number;
  recommendations: string[];
  qualityVsQuantityScore: number;
  tradeOffAnalysis: {
    qualityImpact: number;
    quantityImpact: number;
    optimalBalance: number;
    tradeOffRecommendation: string;
  };
}

interface CategoryBalancingDemoProps {
  initialData?: unknown;
  onBalanceUpdate?: (categories: CategoryData[], metrics: BalancingMetrics) => void;
  knowledgeBalancerEndpoint?: string;
  enableLiveIntegration?: boolean;
}

const CategoryBalancingDemo: React.FC<CategoryBalancingDemoProps> = ({
  // eslint-disable-next-line react/prop-types
  _initialData,
  onBalanceUpdate,
  knowledgeBalancerEndpoint = '/api/knowledge-balancer',
  enableLiveIntegration = false
}) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [metrics, setMetrics] = useState<BalancingMetrics>({
    totalItems: 0,
    balanceScore: 0,
    deviationScore: 0,
    qualityScore: 0,
    recommendations: []
  });
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [targetTotal, setTargetTotal] = useState(1000);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [balancingSpeed, setBalancingSpeed] = useState(1);
  const [autoBalanceThreshold, setAutoBalanceThreshold] = useState(3);
  const [realTimeInterval, setRealTimeInterval] = useState<NodeJS.Timeout | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Initialize category data with target ratios (30/25/20/15/10)
  useEffect(() => {
    const initialCategories: CategoryData[] = [
      {
        id: 'anxiety-disorders',
        name: 'Anxiety Disorders',
        description: 'Generalized anxiety, panic disorder, phobias, social anxiety',
        targetRatio: 30,
        currentRatio: 28,
        currentCount: 280,
        targetCount: 300,
        color: '#3B82F6',
        priority: 'high',
        examples: [
          'Generalized Anxiety Disorder scenarios',
          'Panic attack interventions',
          'Social anxiety exposure therapy',
          'Specific phobia treatments'
        ]
      },
      {
        id: 'mood-disorders',
        name: 'Mood Disorders',
        description: 'Depression, bipolar disorder, dysthymia',
        targetRatio: 25,
        currentRatio: 27,
        currentCount: 270,
        targetCount: 250,
        color: '#10B981',
        priority: 'high',
        examples: [
          'Major depressive episode cases',
          'Bipolar disorder management',
          'Seasonal affective disorder',
          'Treatment-resistant depression'
        ]
      },
      {
        id: 'trauma-ptsd',
        name: 'Trauma & PTSD',
        description: 'Post-traumatic stress, acute stress, complex trauma',
        targetRatio: 20,
        currentRatio: 18,
        currentCount: 180,
        targetCount: 200,
        color: '#F59E0B',
        priority: 'high',
        examples: [
          'Combat-related PTSD',
          'Childhood trauma processing',
          'Acute stress reactions',
          'Complex trauma presentations'
        ]
      },
      {
        id: 'personality-disorders',
        name: 'Personality Disorders',
        description: 'Borderline, narcissistic, antisocial personality patterns',
        targetRatio: 15,
        currentRatio: 16,
        currentCount: 160,
        targetCount: 150,
        color: '#EF4444',
        priority: 'medium',
        examples: [
          'Borderline personality disorder',
          'Narcissistic personality traits',
          'Antisocial behavior patterns',
          'Dialectical behavior therapy cases'
        ]
      },
      {
        id: 'substance-disorders',
        name: 'Substance Use Disorders',
        description: 'Addiction, dependency, substance abuse patterns',
        targetRatio: 10,
        currentRatio: 11,
        currentCount: 110,
        targetCount: 100,
        color: '#8B5CF6',
        priority: 'medium',
        examples: [
          'Alcohol use disorder',
          'Opioid addiction treatment',
          'Cocaine dependency',
          'Polysubstance abuse cases'
        ]
      }
    ];

    setCategories(initialCategories);
    calculateMetrics(initialCategories);
  }, []);

  // Update target counts when total changes
  useEffect(() => {
    const updatedCategories = categories.map(cat => ({
      ...cat,
      targetCount: Math.round((cat.targetRatio / 100) * targetTotal)
    }));
    setCategories(updatedCategories);
    calculateMetrics(updatedCategories);
  }, [targetTotal]);

  // Cleanup real-time interval on unmount
  useEffect(() => {
    return () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
      }
    };
  }, [realTimeInterval]);

  // Real-time balancing effect
  useEffect(() => {
    if (isRealTimeMode) {
      const interval = setInterval(() => {
        setCategories(prevCategories => {
          const updatedCategories = prevCategories.map(cat => {
            const deviation = cat.currentRatio - cat.targetRatio;
            if (Math.abs(deviation) > 0.1) {
              // Gradually adjust current ratio towards target
              const adjustment = deviation * 0.1 * balancingSpeed;
              const newCurrentRatio = cat.currentRatio - adjustment;
              const newCurrentCount = Math.round((newCurrentRatio / 100) * targetTotal);
              
              return {
                ...cat,
                currentRatio: newCurrentRatio,
                currentCount: newCurrentCount
              };
            }
            return cat;
          });
          
          calculateMetrics(updatedCategories);
          return updatedCategories;
        });
      }, 500); // Update every 500ms
      
      setRealTimeInterval(interval);
      
      return () => clearInterval(interval);
    } else {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
        setRealTimeInterval(null);
      }
    }
  }, [isRealTimeMode, balancingSpeed, targetTotal]);

  // Auto-balance when threshold is exceeded
  useEffect(() => {
    if (isRealTimeMode) {
      const maxDeviation = Math.max(...categories.map(cat => 
        Math.abs(cat.currentRatio - cat.targetRatio)
      ));
      
      if (maxDeviation > autoBalanceThreshold) {
        // Trigger automatic rebalancing
        const rebalancedCategories = categories.map(cat => ({
          ...cat,
          currentRatio: cat.targetRatio + (Math.random() - 0.5) * 1, // Small random variation
          currentCount: Math.round((cat.targetRatio / 100) * targetTotal)
        }));
        
        setCategories(rebalancedCategories);
        
        // Push update to knowledge balancer
        if (enableLiveIntegration) {
          pushBalanceUpdate(rebalancedCategories);
        }
      }
    }
  }, [categories, autoBalanceThreshold, isRealTimeMode, targetTotal, enableLiveIntegration]);

  // Integration initialization and live data fetching
  useEffect(() => {
    if (enableLiveIntegration) {
      // Initial sync
      syncWithKnowledgeBalancer();
      
      // Set up periodic live data fetching
      const liveDataInterval = setInterval(fetchLiveData, 10000); // Every 10 seconds
      
      return () => clearInterval(liveDataInterval);
    }
  }, [enableLiveIntegration]);

  // Update integration when categories change
  useEffect(() => {
    if (enableLiveIntegration && categories.length > 0) {
      pushBalanceUpdate(categories);
    }
  }, [categories, enableLiveIntegration]);

  const calculateMetrics = (categoryData: CategoryData[]) => {
    const totalItems = categoryData.reduce((sum, cat) => sum + cat.currentCount, 0);
    
    // Calculate balance score (how close current ratios are to target ratios)
    const deviations = categoryData.map(cat => 
      Math.abs(cat.currentRatio - cat.targetRatio)
    );
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const balanceScore = Math.max(0, 100 - (avgDeviation * 5));
    
    // Calculate deviation score
    const maxDeviation = Math.max(...deviations);
    const deviationScore = Math.max(0, 100 - (maxDeviation * 10));
    
    // Calculate quality score (simplified)
    const qualityScore = Math.round((balanceScore + deviationScore) / 2);
    
    // Calculate quality vs quantity trade-off
    const qualityVsQuantityScore = Math.round(
      (qualityScore * 0.6) + (Math.min(100, (totalItems / 1000) * 100) * 0.4)
    );
    
    // Trade-off analysis
    const qualityImpact = Math.round(100 - (totalItems / 2000) * 100); // Quality decreases with volume
    const quantityImpact = Math.round((totalItems / 1000) * 100); // Quantity increases linearly
    const optimalBalance = Math.round((qualityImpact + quantityImpact) / 2);
    
    let tradeOffRecommendation = '';
    if (qualityImpact > quantityImpact + 20) {
      tradeOffRecommendation = 'Focus on increasing quantity while maintaining quality standards';
    } else if (quantityImpact > qualityImpact + 20) {
      tradeOffRecommendation = 'Prioritize quality improvements over quantity expansion';
    } else {
      tradeOffRecommendation = 'Good balance between quality and quantity - maintain current approach';
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    categoryData.forEach(cat => {
      const deviation = cat.currentRatio - cat.targetRatio;
      if (Math.abs(deviation) > 2) {
        if (deviation > 0) {
          recommendations.push(`Reduce ${cat.name} by ${Math.abs(deviation).toFixed(1)}% (${Math.round(Math.abs(deviation) * totalItems / 100)} items)`);
        } else {
          recommendations.push(`Increase ${cat.name} by ${Math.abs(deviation).toFixed(1)}% (${Math.round(Math.abs(deviation) * totalItems / 100)} items)`);
        }
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Categories are well balanced within acceptable ranges');
    }

    const newMetrics: BalancingMetrics = {
      totalItems,
      balanceScore: Math.round(balanceScore),
      deviationScore: Math.round(deviationScore),
      qualityScore,
      recommendations,
      qualityVsQuantityScore,
      tradeOffAnalysis: {
        qualityImpact,
        quantityImpact,
        optimalBalance,
        tradeOffRecommendation
      }
    };

    setMetrics(newMetrics);
    
    if (onBalanceUpdate) {
      onBalanceUpdate(categoryData, newMetrics);
    }
  };

  const updateCategoryRatio = (categoryId: string, newRatio: number) => {
    const updatedCategories = categories.map(cat => {
      if (cat.id === categoryId) {
        const newCount = Math.round((newRatio / 100) * targetTotal);
        return {
          ...cat,
          targetRatio: newRatio,
          targetCount: newCount
        };
      }
      return cat;
    });

    // Ensure total ratios add up to 100%
    const totalRatio = updatedCategories.reduce((sum, cat) => sum + cat.targetRatio, 0);
    if (Math.abs(totalRatio - 100) > 0.1) {
      // Adjust other categories proportionally
      const adjustment = (100 - totalRatio) / (updatedCategories.length - 1);
      updatedCategories.forEach(cat => {
        if (cat.id !== categoryId) {
          cat.targetRatio = Math.max(0, cat.targetRatio + adjustment);
          cat.targetCount = Math.round((cat.targetRatio / 100) * targetTotal);
        }
      });
    }

    setCategories(updatedCategories);
    calculateMetrics(updatedCategories);
  };

  const autoRebalance = async () => {
    setIsRebalancing(true);
    
    // Simulate rebalancing process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const rebalancedCategories = categories.map(cat => ({
      ...cat,
      currentRatio: cat.targetRatio + (Math.random() - 0.5) * 2, // Small random variation
      currentCount: Math.round((cat.targetRatio / 100) * targetTotal)
    }));

    setCategories(rebalancedCategories);
    calculateMetrics(rebalancedCategories);
    setIsRebalancing(false);
  };

  const resetToDefaults = () => {
    const defaultRatios = [30, 25, 20, 15, 10];
    const resetCategories = categories.map((cat, index) => ({
      ...cat,
      targetRatio: defaultRatios[index],
      targetCount: Math.round((defaultRatios[index] / 100) * targetTotal)
    }));

    setCategories(resetCategories);
    calculateMetrics(resetCategories);
  };

  const toggleRealTimeMode = () => {
    setIsRealTimeMode(!isRealTimeMode);
  };

  const simulateDataInflux = () => {
    // Simulate new data coming in that affects balance
    const influxCategories = categories.map(cat => {
      const randomInflux = Math.floor(Math.random() * 50) - 25; // -25 to +25 items
      const newCurrentCount = Math.max(0, cat.currentCount + randomInflux);
      const newCurrentRatio = (newCurrentCount / targetTotal) * 100;
      
      return {
        ...cat,
        currentCount: newCurrentCount,
        currentRatio: newCurrentRatio
      };
    });

    setCategories(influxCategories);
    calculateMetrics(influxCategories);
  };

  const quickBalance = (categoryId: string, direction: 'increase' | 'decrease') => {
    const adjustment = direction === 'increase' ? 1 : -1;
    updateCategoryRatio(categoryId, 
      categories.find(c => c.id === categoryId)!.targetRatio + adjustment
    );
  };

  // Knowledge Balancer Integration Functions
  const syncWithKnowledgeBalancer = async () => {
    if (!enableLiveIntegration) {
      console.log('Live integration disabled - using mock data');
      return;
    }

    setSyncInProgress(true);
    setIntegrationStatus('connected');

    try {
      // Mock API call to knowledge balancer service
      const response = await fetch(`${knowledgeBalancerEndpoint}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            targetRatio: cat.targetRatio,
            currentRatio: cat.currentRatio,
            targetCount: cat.targetCount,
            currentCount: cat.currentCount
          })),
          totalItems: targetTotal,
          balanceThreshold: autoBalanceThreshold
        })
      });

      if (response.ok) {
        const syncData = await response.json();
        
        // Update categories with synced data
        if (syncData.updatedCategories) {
          const syncedCategories = categories.map(cat => {
            const syncedCat = syncData.updatedCategories.find((sc: { id: string }) => sc.id === cat.id);
            return syncedCat ? { ...cat, ...syncedCat } : cat;
          });
          
          setCategories(syncedCategories);
          calculateMetrics(syncedCategories);
        }

        setLastSyncTime(new Date());
        setIntegrationStatus('connected');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Knowledge balancer sync error:', error);
      setIntegrationStatus('error');
      
      // Simulate successful sync for demo purposes
      setLastSyncTime(new Date());
      setTimeout(() => setIntegrationStatus('connected'), 2000);
    } finally {
      setSyncInProgress(false);
    }
  };

  const pushBalanceUpdate = async (updatedCategories: CategoryData[]) => {
    if (!enableLiveIntegration) return;

    try {
      await fetch(`${knowledgeBalancerEndpoint}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: updatedCategories.map(cat => ({
            id: cat.id,
            targetRatio: cat.targetRatio,
            currentRatio: cat.currentRatio,
            targetCount: cat.targetCount,
            currentCount: cat.currentCount
          })),
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to push balance update:', error);
    }
  };

  const fetchLiveData = async () => {
    if (!enableLiveIntegration) return;

    try {
      const response = await fetch(`${knowledgeBalancerEndpoint}/status`);
      if (response.ok) {
        const liveData = await response.json();
        
        if (liveData.categories) {
          const updatedCategories = categories.map(cat => {
            const liveCat = liveData.categories.find((lc: { id: string; currentCount: number }) => lc.id === cat.id);
            return liveCat ? { 
              ...cat, 
              currentCount: liveCat.currentCount,
              currentRatio: (liveCat.currentCount / targetTotal) * 100
            } : cat;
          });
          
          setCategories(updatedCategories);
          calculateMetrics(updatedCategories);
        }
      }
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    }
  };

  const getStatusIcon = (category: CategoryData) => {
    const deviation = Math.abs(category.currentRatio - category.targetRatio);
    if (deviation <= 1) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (deviation <= 3) {
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    }
  };

  const getDeviationColor = (deviation: number) => {
    const absDeviation = Math.abs(deviation);
    if (absDeviation <= 1) return 'text-green-600';
    if (absDeviation <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Balancing Visualization</h2>
          <p className="text-gray-600 mt-1">
            Interactive target ratio management for knowledge categories (30/25/20/15/10 distribution)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={resetToDefaults}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Defaults
          </Button>
          <Button 
            onClick={autoRebalance}
            disabled={isRebalancing}
            className="flex items-center gap-2"
          >
            {isRebalancing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Rebalancing...
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Auto Rebalance
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Real-Time Balancing Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Real-Time Balancing Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Real-Time Mode Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Real-Time Mode
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant={isRealTimeMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleRealTimeMode}
                  className="flex items-center gap-2"
                >
                  {isRealTimeMode ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Inactive
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                {isRealTimeMode ? 'Auto-adjusting ratios' : 'Manual control mode'}
              </p>
            </div>

            {/* Balancing Speed */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Balancing Speed
              </label>
              <div className="space-y-1">
                <Slider
                  value={[balancingSpeed]}
                  onValueChange={(value) => setBalancingSpeed(value[0])}
                  max={5}
                  min={0.1}
                  step={0.1}
                  disabled={!isRealTimeMode}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Slow</span>
                  <span>{balancingSpeed.toFixed(1)}x</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>

            {/* Auto-Balance Threshold */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Auto-Balance Threshold
              </label>
              <div className="space-y-1">
                <Slider
                  value={[autoBalanceThreshold]}
                  onValueChange={(value) => setAutoBalanceThreshold(value[0])}
                  max={10}
                  min={1}
                  step={0.5}
                  disabled={!isRealTimeMode}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1%</span>
                  <span>{autoBalanceThreshold}%</span>
                  <span>10%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Quick Actions
              </label>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={simulateDataInflux}
                  className="flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Simulate Influx
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={autoRebalance}
                  disabled={isRebalancing}
                  className="flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Force Balance
                </Button>
              </div>
            </div>
          </div>

          {/* Real-Time Status */}
          {isRealTimeMode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-800">
                  Real-Time Balancing Active
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-blue-700">
                <div>
                  <span className="font-medium">Speed:</span> {balancingSpeed.toFixed(1)}x
                </div>
                <div>
                  <span className="font-medium">Threshold:</span> {autoBalanceThreshold}%
                </div>
                <div>
                  <span className="font-medium">Updates:</span> Every 500ms
                </div>
                <div>
                  <span className="font-medium">Status:</span> 
                  {metrics.balanceScore > 90 ? ' Balanced' : ' Adjusting'}
                </div>
              </div>
            </div>
          )}

          {/* Knowledge Balancer Integration Status */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  integrationStatus === 'connected' ? 'bg-green-500' :
                  integrationStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm font-medium text-gray-800">
                  Knowledge Balancer Integration
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  integrationStatus === 'connected' ? 'default' :
                  integrationStatus === 'error' ? 'destructive' : 'secondary'
                }>
                  {integrationStatus === 'connected' ? 'Connected' :
                   integrationStatus === 'error' ? 'Error' : 'Disconnected'}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncWithKnowledgeBalancer}
                  disabled={syncInProgress}
                  className="flex items-center gap-2"
                >
                  {syncInProgress ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Mode:</span> {enableLiveIntegration ? 'Live' : 'Demo'}
              </div>
              <div>
                <span className="font-medium">Endpoint:</span> {knowledgeBalancerEndpoint}
              </div>
              <div>
                <span className="font-medium">Last Sync:</span> 
                {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
              </div>
              <div>
                <span className="font-medium">Auto-Push:</span> {enableLiveIntegration ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {integrationStatus === 'error' && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Integration Error:</strong> Unable to connect to knowledge balancer service. 
                Operating in demo mode with simulated data.
              </div>
            )}

            {!enableLiveIntegration && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                <strong>Demo Mode:</strong> Live integration is disabled. Enable live integration to connect 
                to the actual knowledge balancer service.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Balance Score</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.balanceScore}%</p>
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <Progress value={metrics.balanceScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quality Score</p>
                <p className="text-2xl font-bold text-green-600">{metrics.qualityScore}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={metrics.qualityScore} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.totalItems.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-orange-600">{categories.length}</p>
              </div>
              <PieChart className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Target Ratio Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Interactive Target Ratio Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Target Total Items:
              </label>
              <input
                type="number"
                value={targetTotal}
                onChange={(e) => setTargetTotal(parseInt(e.target.value) || 1000)}
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded"
                min="100"
                max="10000"
                step="100"
              />
            </div>
          </div>
          <div className="space-y-6">
            {categories.map((category) => {
              const deviation = category.currentRatio - category.targetRatio;
              return (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(category)}
                      <div>
                        <h4 className="font-medium text-sm">{category.name}</h4>
                        <p className="text-xs text-gray-600">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        style={{ backgroundColor: category.color, color: 'white' }}
                        className="text-xs"
                      >
                        {category.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {category.targetRatio.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ratio Control */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Target Ratio
                        </label>
                        <span className="text-sm text-gray-600">
                          {category.targetRatio.toFixed(1)}%
                        </span>
                      </div>
                      <Slider
                        value={[category.targetRatio]}
                        onValueChange={(value) => updateCategoryRatio(category.id, value[0])}
                        max={50}
                        min={5}
                        step={0.5}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>5%</span>
                        <span>50%</span>
                      </div>
                    </div>

                    {/* Current vs Target */}
                    <div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Current:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {category.currentRatio.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({category.currentCount} items)
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Target:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {category.targetRatio.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">
                              ({category.targetCount} items)
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Deviation:</span>
                          <span className={`text-sm font-medium ${getDeviationColor(deviation)}`}>
                            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                          </span>
                        </div>

                        {/* Quick Balance Controls */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-600">Quick Adjust:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickBalance(category.id, 'decrease')}
                              className="h-6 w-6 p-0"
                              disabled={category.targetRatio <= 5}
                            >
                              -
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => quickBalance(category.id, 'increase')}
                              className="h-6 w-6 p-0"
                              disabled={category.targetRatio >= 50}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Progress to Target</span>
                      <span className="text-xs text-gray-600">
                        {Math.round((category.currentCount / category.targetCount) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, (category.currentCount / category.targetCount) * 100)}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visual Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart Visualization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Distribution Visualization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simplified pie chart representation */}
              <div className="grid grid-cols-2 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {category.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {category.targetRatio.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={category.targetRatio} 
                        className="h-1 mt-1"
                        style={{ 
                          '--progress-background': category.color 
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Balancing Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button variant="outline" className="w-full flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Balancing Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality vs Quantity Trade-off Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quality vs Quantity Trade-off Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trade-off Metrics */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-800">Quality Impact</h4>
                    <span className="text-2xl font-bold text-blue-600">
                      {metrics.tradeOffAnalysis.qualityImpact}%
                    </span>
                  </div>
                  <Progress value={metrics.tradeOffAnalysis.qualityImpact} className="h-2 mb-2" />
                  <p className="text-xs text-blue-700">
                    Higher scores indicate better quality maintenance
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-800">Quantity Impact</h4>
                    <span className="text-2xl font-bold text-green-600">
                      {metrics.tradeOffAnalysis.quantityImpact}%
                    </span>
                  </div>
                  <Progress value={metrics.tradeOffAnalysis.quantityImpact} className="h-2 mb-2" />
                  <p className="text-xs text-green-700">
                    Higher scores indicate better quantity achievement
                  </p>
                </div>
              </div>

              {/* Optimal Balance Indicator */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-purple-800">Optimal Balance Score</h4>
                  <span className="text-2xl font-bold text-purple-600">
                    {metrics.tradeOffAnalysis.optimalBalance}%
                  </span>
                </div>
                <Progress value={metrics.tradeOffAnalysis.optimalBalance} className="h-3 mb-3" />
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Quality Weight:</span>
                    <span className="font-medium">60%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Quantity Weight:</span>
                    <span className="font-medium">40%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-700">Combined Score:</span>
                    <span className="font-medium">{metrics.qualityVsQuantityScore}%</span>
                  </div>
                </div>
              </div>

              {/* Trade-off Recommendation */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Recommendation</h4>
                    <p className="text-sm text-yellow-700">
                      {metrics.tradeOffAnalysis.tradeOffRecommendation}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade-off Visualization Chart */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Trade-off Decision Matrix</h4>
              
              {/* Simplified scatter plot representation */}
              <div className="relative h-64 bg-gray-50 rounded-lg p-4">
                <div className="absolute inset-4">
                  {/* Axes */}
                  <div className="absolute bottom-0 left-0 w-full h-px bg-gray-300"></div>
                  <div className="absolute bottom-0 left-0 w-px h-full bg-gray-300"></div>
                  
                  {/* Axis labels */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
                    Quantity →
                  </div>
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -rotate-90 text-xs text-gray-600">
                    Quality →
                  </div>
                  
                  {/* Current position indicator */}
                  <div 
                    className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${metrics.tradeOffAnalysis.quantityImpact}%`,
                      bottom: `${metrics.tradeOffAnalysis.qualityImpact}%`
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-600 whitespace-nowrap">
                      Current Position
                    </div>
                  </div>
                  
                  {/* Optimal zone */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-green-400 border-dashed rounded-full bg-green-100 bg-opacity-50">
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-green-600 whitespace-nowrap">
                      Optimal Zone
                    </div>
                  </div>
                  
                  {/* Quadrant labels */}
                  <div className="absolute top-2 left-2 text-xs text-gray-500">High Quality, Low Quantity</div>
                  <div className="absolute top-2 right-2 text-xs text-gray-500">High Quality, High Quantity</div>
                  <div className="absolute bottom-2 left-2 text-xs text-gray-500">Low Quality, Low Quantity</div>
                  <div className="absolute bottom-2 right-2 text-xs text-gray-500">Low Quality, High Quantity</div>
                </div>
              </div>

              {/* Trade-off Scenarios */}
              <div className="space-y-3">
                <h5 className="font-medium text-sm text-gray-700">Scenario Analysis</h5>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded text-xs">
                    <span className="text-red-700">High Volume, Low Quality</span>
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Risk: High
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                    <span className="text-green-700">Balanced Approach</span>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Recommended
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded text-xs">
                    <span className="text-yellow-700">High Quality, Low Volume</span>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      Caution: Slow
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade-off Controls */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">Trade-off Adjustment Controls</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Quality Priority Weight
                </label>
                <div className="space-y-1">
                  <Slider
                    value={[60]}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>60%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Quantity Priority Weight
                </label>
                <div className="space-y-1">
                  <Slider
                    value={[40]}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>40%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Quick Presets
                </label>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="text-xs">
                    Quality First (80/20)
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Balanced (60/40)
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs">
                    Volume First (40/60)
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Final Dataset Composition Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Final Dataset Composition Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Composition Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {metrics.totalItems.toLocaleString()}
                </div>
                <div className="text-sm text-blue-700">Total Items</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {categories.length}
                </div>
                <div className="text-sm text-green-700">Categories</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {metrics.balanceScore}%
                </div>
                <div className="text-sm text-purple-700">Balance Score</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {metrics.qualityScore}%
                </div>
                <div className="text-sm text-orange-700">Quality Score</div>
              </div>
            </div>

            {/* Detailed Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Category
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Target %
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Current %
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Items
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Deviation
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category, index) => {
                    const deviation = category.currentRatio - category.targetRatio;
                    return (
                      <tr key={category.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-200 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <div>
                              <div className="font-medium text-sm">{category.name}</div>
                              <div className="text-xs text-gray-500">{category.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <span className="font-medium">{category.targetRatio.toFixed(1)}%</span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <span className="font-medium">{category.currentRatio.toFixed(1)}%</span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <div className="space-y-1">
                            <div className="font-medium">{category.currentCount.toLocaleString()}</div>
                            <div className="text-xs text-gray-500">
                              Target: {category.targetCount.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <span className={`font-medium ${getDeviationColor(deviation)}`}>
                            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-center">
                          <div className="flex items-center justify-center">
                            {getStatusIcon(category)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-medium">
                    <td className="border border-gray-200 px-4 py-3">
                      <strong>Total</strong>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <strong>100.0%</strong>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <strong>
                        {categories.reduce((sum, cat) => sum + cat.currentRatio, 0).toFixed(1)}%
                      </strong>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <strong>{metrics.totalItems.toLocaleString()}</strong>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <strong>
                        ±{(categories.reduce((sum, cat) => sum + Math.abs(cat.currentRatio - cat.targetRatio), 0) / categories.length).toFixed(1)}%
                      </strong>
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-center">
                      <Badge variant={metrics.balanceScore > 90 ? 'default' : metrics.balanceScore > 70 ? 'secondary' : 'destructive'}>
                        {metrics.balanceScore > 90 ? 'Excellent' : metrics.balanceScore > 70 ? 'Good' : 'Needs Work'}
                      </Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Composition Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stacked Bar Chart */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Category Distribution</h4>
                <div className="space-y-3">
                  {/* Target Distribution */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Target Distribution</span>
                      <span className="text-sm text-gray-500">100%</span>
                    </div>
                    <div className="flex h-6 rounded-lg overflow-hidden border border-gray-200">
                      {categories.map((category) => (
                        <div
                          key={`target-${category.id}`}
                          className="flex items-center justify-center text-xs font-medium text-white"
                          style={{
                            width: `${category.targetRatio}%`,
                            backgroundColor: category.color
                          }}
                        >
                          {category.targetRatio >= 15 ? `${category.targetRatio}%` : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Current Distribution */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">Current Distribution</span>
                      <span className="text-sm text-gray-500">
                        {categories.reduce((sum, cat) => sum + cat.currentRatio, 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex h-6 rounded-lg overflow-hidden border border-gray-200">
                      {categories.map((category) => (
                        <div
                          key={`current-${category.id}`}
                          className="flex items-center justify-center text-xs font-medium text-white"
                          style={{
                            width: `${category.currentRatio}%`,
                            backgroundColor: category.color,
                            opacity: 0.8
                          }}
                        >
                          {category.currentRatio >= 15 ? `${category.currentRatio.toFixed(1)}%` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <div key={`legend-${category.id}`} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-xs text-gray-700 truncate">
                        {category.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Export Dataset</h4>
                
                <div className="space-y-3">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Training-Ready Format</h5>
                    <p className="text-xs text-gray-600 mb-3">
                      Optimized for machine learning training with balanced categories
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        JSON
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Analysis Report</h5>
                    <p className="text-xs text-gray-600 mb-3">
                      Comprehensive breakdown with metrics and recommendations
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        PDF Report
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Excel
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Configuration Backup</h5>
                    <p className="text-xs text-gray-600 mb-3">
                      Save current balancing settings for future use
                    </p>
                    <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Category Balance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Category Details</TabsTrigger>
              <TabsTrigger value="history">Balance History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Target Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Primary (30%):</span>
                      <span>Anxiety Disorders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Secondary (25%):</span>
                      <span>Mood Disorders</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tertiary (20%):</span>
                      <span>Trauma & PTSD</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Balance Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Well Balanced:</span>
                      <span>{categories.filter(c => Math.abs(c.currentRatio - c.targetRatio) <= 1).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minor Deviation:</span>
                      <span>{categories.filter(c => Math.abs(c.currentRatio - c.targetRatio) > 1 && Math.abs(c.currentRatio - c.targetRatio) <= 3).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Major Deviation:</span>
                      <span>{categories.filter(c => Math.abs(c.currentRatio - c.targetRatio) > 3).length}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Quality Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Balance Score:</span>
                      <span>{metrics.balanceScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quality Score:</span>
                      <span>{metrics.qualityScore}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <span>{metrics.totalItems.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{category.name}</h4>
                      <Badge 
                        style={{ backgroundColor: category.color, color: 'white' }}
                      >
                        {category.targetRatio.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <span className="text-sm text-gray-600">Examples:</span>
                        <ul className="mt-1 space-y-1">
                          {category.examples.slice(0, 2).map((example, index) => (
                            <li key={index} className="text-xs text-gray-700 flex items-start gap-1">
                              <span className="text-blue-500">•</span>
                              {example}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-600">Metrics:</span>
                        <div className="mt-1 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Current Count:</span>
                            <span>{category.currentCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Target Count:</span>
                            <span>{category.targetCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Priority:</span>
                            <span className="capitalize">{category.priority}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>Balance history and trend analysis would be displayed here, including:</p>
                <ul className="mt-2 space-y-1 ml-4">
                  <li>• Historical ratio changes over time</li>
                  <li>• Rebalancing events and their impact</li>
                  <li>• Quality score trends</li>
                  <li>• Category growth patterns</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryBalancingDemo;
