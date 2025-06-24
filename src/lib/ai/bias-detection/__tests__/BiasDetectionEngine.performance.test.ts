import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { BiasDetectionEngine } from '../BiasDetectionEngine';
import type { SessionData, BiasDetectionConfig } from '../types';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  SINGLE_ANALYSIS_MAX_TIME: 100, // ms - requirement from task list
  BATCH_ANALYSIS_MAX_TIME_PER_ITEM: 150, // ms
  CONCURRENT_ANALYSIS_MAX_TIME: 200, // ms
  MEMORY_USAGE_MAX_INCREASE: 100 * 1024 * 1024, // 100MB
  THROUGHPUT_MIN_SESSIONS_PER_SECOND: 5
};

// Mock classes for performance testing with realistic delays
const createMockPythonBridge = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  runPreprocessingAnalysis: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return {
      biasScore: Math.random() * 0.5,
      linguisticBias: Math.random() * 0.3,
      confidence: 0.8 + Math.random() * 0.2
    };
  }),
  runModelLevelAnalysis: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return {
      biasScore: Math.random() * 0.6,
      fairnessMetrics: { equalizedOdds: 0.7 + Math.random() * 0.3 },
      confidence: 0.85 + Math.random() * 0.15
    };
  }),
  runInteractiveAnalysis: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 25));
    return {
      biasScore: Math.random() * 0.4,
      counterfactualAnalysis: { scenarios: 3, improvements: Math.random() * 0.2 },
      confidence: 0.8 + Math.random() * 0.2
    };
  }),
  runEvaluationAnalysis: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 35));
    return {
      biasScore: Math.random() * 0.5,
      nlpBiasMetrics: { sentimentBias: Math.random() * 0.2 },
      confidence: 0.9 + Math.random() * 0.1
    };
  }),
  generateComprehensiveReport: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 40));
    return {
      metadata: { reportId: `report-${Date.now()}`, generatedAt: new Date().toISOString() },
      summary: { totalSessions: 1, overallBiasScore: 0.3, alertLevel: 'low' },
      trendAnalysis: { trend: 'stable', changePercent: 0.05 },
      recommendations: ['Continue current practices']
    };
  }),
  explainBiasDetection: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 15));
    return {
      contributingFactors: ['Language patterns'],
      recommendations: ['Use more neutral language'],
      counterfactualAnalysis: { scenarios: 2, outcomes: ['Better outcome'] }
    };
  }),
  updateConfiguration: vi.fn().mockResolvedValue({ success: true }),
  dispose: vi.fn().mockResolvedValue(undefined)
});

const createMockMetricsCollector = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  recordAnalysis: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
  }),
  getMetrics: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      totalAnalyses: 100 + Math.floor(Math.random() * 50),
      averageBiasScore: 0.2 + Math.random() * 0.3,
      alertDistribution: { low: 60, medium: 30, high: 8, critical: 2 }
    };
  }),
  getDashboardData: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 15));
    return {
      summary: { totalSessions: 150, overallBiasScore: 0.25, activeAlerts: 3 },
      charts: { biasScoreTrend: [0.2, 0.25, 0.3] },
      alerts: []
    };
  }),
  dispose: vi.fn().mockResolvedValue(undefined)
});

const createMockAlertSystem = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  checkAlerts: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 8));
  }),
  getActiveAlerts: vi.fn().mockImplementation(async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
    return [];
  }),
  dispose: vi.fn().mockResolvedValue(undefined)
});

// Mock modules
vi.mock('../python-service/PythonBiasDetectionBridge', () => ({
  PythonBiasDetectionBridge: vi.fn().mockImplementation(() => createMockPythonBridge())
}));

vi.mock('../BiasMetricsCollector', () => ({
  BiasMetricsCollector: vi.fn().mockImplementation(() => createMockMetricsCollector())
}));

vi.mock('../BiasAlertSystem', () => ({
  BiasAlertSystem: vi.fn().mockImplementation(() => createMockAlertSystem())
}));

// Global mocks
global.PythonBiasDetectionBridge = vi.fn().mockImplementation(() => createMockPythonBridge());
global.BiasMetricsCollector = vi.fn().mockImplementation(() => createMockMetricsCollector());
global.BiasAlertSystem = vi.fn().mockImplementation(() => createMockAlertSystem());

// Helper functions
const measureExecutionTime = async (operation: () => Promise<any>): Promise<{ result: any; executionTime: number }> => {
  const startTime = performance.now();
  const result = await operation();
  const endTime = performance.now();
  return { result, executionTime: endTime - startTime };
};

const measureMemoryUsage = (): number => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return performance.memory.usedJSHeapSize;
  }
  return process.memoryUsage().heapUsed; // Node.js fallback
};

const createTestSessionData = (sessionId: string): SessionData => ({
  sessionId,
  participantDemographics: {
    gender: 'female',
    age: '28',
    ethnicity: 'hispanic',
    education: 'bachelors',
    experience: 'beginner'
  },
  trainingScenario: {
    type: 'anxiety_management',
    difficulty: 'intermediate',
    duration: 30,
    objectives: ['assess_anxiety', 'provide_coping_strategies']
  },
  content: {
    transcript: `Performance test session ${sessionId} - Patient expresses feeling overwhelmed...`,
    aiResponses: ['I understand you\'re feeling stressed.'],
    userInputs: ['I feel overwhelmed']
  },
  aiResponses: [{
    id: `response-${sessionId}-1`,
    content: 'I understand you\'re feeling stressed.',
    timestamp: new Date().toISOString(),
    confidence: 0.9
  }],
  expectedOutcomes: [{
    metric: 'empathy_score',
    expected: 0.8,
    actual: 0.75
  }],
  transcripts: [{
    speaker: 'participant',
    content: 'I feel overwhelmed',
    timestamp: new Date().toISOString()
  }],
  metadata: {
    sessionDuration: 1800,
    completionRate: 0.95,
    technicalIssues: false
  }
});

describe('BiasDetectionEngine - Performance Benchmarks', () => {
  let biasEngine: BiasDetectionEngine;
  let mockConfig: BiasDetectionConfig;

  beforeAll(() => {
    console.log('🚀 Starting BiasDetectionEngine Performance Benchmarks');
  });

  beforeEach(async () => {
    mockConfig = {
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true,
      pythonServiceTimeout: 30000,
      layerWeights: {
        preprocessing: 0.25,
        modelLevel: 0.25,
        interactive: 0.25,
        evaluation: 0.25
      }
    };

    biasEngine = new BiasDetectionEngine(mockConfig);
    await biasEngine.initialize();
  });

  afterEach(async () => {
    await biasEngine.dispose();
    vi.clearAllMocks();
  });

  describe('Single Session Analysis Performance', () => {
    it('should analyze a single session within performance threshold', async () => {
      const sessionData = createTestSessionData('perf-single-001');
      const memoryBefore = measureMemoryUsage();

      const { result, executionTime } = await measureExecutionTime(async () => {
        return await biasEngine.analyzeSession(sessionData);
      });

      const memoryAfter = measureMemoryUsage();
      const memoryIncrease = memoryAfter - memoryBefore;

      console.log(`📊 Single Analysis: ${executionTime.toFixed(2)}ms, Memory: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionData.sessionId);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_ANALYSIS_MAX_TIME);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX_INCREASE);
    });

    it('should handle multiple sequential analyses efficiently', async () => {
      const sessionCount = 5;
      const results: { executionTime: number; sessionId: string }[] = [];
      
      for (let i = 0; i < sessionCount; i++) {
        const sessionData = createTestSessionData(`perf-sequential-${i + 1}`);
        
        const { result, executionTime } = await measureExecutionTime(async () => {
          return await biasEngine.analyzeSession(sessionData);
        });

        results.push({ executionTime, sessionId: result.sessionId });
      }

      const averageTime = results.reduce((sum, r) => sum + r.executionTime, 0) / sessionCount;
      console.log(`📊 Sequential (${sessionCount}): Avg ${averageTime.toFixed(2)}ms`);

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_ANALYSIS_MAX_TIME);
    });
  });

  describe('Batch Analysis Performance', () => {
    it('should process batch of sessions within performance threshold', async () => {
      const batchSize = 5;
      const sessions = Array.from({ length: batchSize }, (_, i) => 
        createTestSessionData(`perf-batch-${i + 1}`)
      );

      const { result: results, executionTime } = await measureExecutionTime(async () => {
        return await Promise.all(sessions.map(session => biasEngine.analyzeSession(session)));
      });

      const timePerSession = executionTime / batchSize;
      console.log(`📊 Batch (${batchSize}): ${timePerSession.toFixed(2)}ms per session`);

      expect(results).toHaveLength(batchSize);
      expect(timePerSession).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_ANALYSIS_MAX_TIME_PER_ITEM);
    });
  });

  describe('Method Performance Benchmarks', () => {
    it('should benchmark getMetrics performance', async () => {
      const { result, executionTime } = await measureExecutionTime(async () => {
        return await biasEngine.getMetrics({ includeCharts: true });
      });

      console.log(`📊 getMetrics: ${executionTime.toFixed(2)}ms`);
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(50);
    });

    it('should benchmark generateBiasReport performance', async () => {
      const sessionIds = ['test-1', 'test-2'];
      
      const { result, executionTime } = await measureExecutionTime(async () => {
        return await biasEngine.generateBiasReport(sessionIds, 'comprehensive');
      });

      console.log(`📊 generateBiasReport: ${executionTime.toFixed(2)}ms`);
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(200);
    });
  });

  describe('Throughput Testing', () => {
    it('should achieve minimum throughput requirements', async () => {
      const sessionCount = 10;
      const sessions = Array.from({ length: sessionCount }, (_, i) => 
        createTestSessionData(`throughput-${i + 1}`)
      );

      const { result: results, executionTime } = await measureExecutionTime(async () => {
        return await Promise.all(sessions.map(session => biasEngine.analyzeSession(session)));
      });

      const throughput = sessionCount / (executionTime / 1000);
      console.log(`📊 Throughput: ${throughput.toFixed(2)} sessions/second`);

      expect(results).toHaveLength(sessionCount);
      expect(throughput).toBeGreaterThan(PERFORMANCE_THRESHOLDS.THROUGHPUT_MIN_SESSIONS_PER_SECOND);
    });
  });

  describe('Memory Efficiency', () => {
    it('should maintain stable memory usage during extended operation', async () => {
      const sessionCount = 10;
      const initialMemory = measureMemoryUsage();
      
      for (let i = 0; i < sessionCount; i++) {
        const sessionData = createTestSessionData(`memory-test-${i + 1}`);
        await biasEngine.analyzeSession(sessionData);
      }

      const finalMemory = measureMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`📊 Memory (${sessionCount} sessions): ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase`);
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX_INCREASE);
    });
  });
}); 