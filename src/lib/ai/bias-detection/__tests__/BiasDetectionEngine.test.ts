import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BiasDetectionEngine } from '../BiasDetectionEngine'
import type { SessionData, BiasDetectionConfig } from '../types'

// Mock the missing support classes
const mockPythonBridge = {
  initialize: vi.fn().mockResolvedValue(undefined),
  runPreprocessingAnalysis: vi.fn().mockResolvedValue({
    biasScore: 0.2,
    linguisticBias: 0.1,
    confidence: 0.85,
  }),
  runModelLevelAnalysis: vi.fn().mockResolvedValue({
    biasScore: 0.3,
    fairnessMetrics: { equalizedOdds: 0.8, demographicParity: 0.75 },
    confidence: 0.9,
  }),
  runInteractiveAnalysis: vi.fn().mockResolvedValue({
    biasScore: 0.2,
    counterfactualAnalysis: { scenarios: 3, improvements: 0.15 },
    confidence: 0.85,
  }),
  runEvaluationAnalysis: vi.fn().mockResolvedValue({
    biasScore: 0.3,
    nlpBiasMetrics: { sentimentBias: 0.1, toxicityBias: 0.05 },
    confidence: 0.95,
  }),
  analyze_session: vi.fn().mockResolvedValue({
    session_id: 'test-session',
    overall_bias_score: 0.25,
    alert_level: 'low',
    layer_results: {
      preprocessing: { bias_score: 0.2 },
      model_level: { bias_score: 0.3 },
      interactive: { bias_score: 0.2 },
      evaluation: { bias_score: 0.3 },
    },
    recommendations: ['System performing within acceptable parameters'],
    confidence: 0.85,
  }),
}

const mockMetricsCollector = {
  initialize: vi.fn().mockResolvedValue(undefined),
  recordAnalysis: vi.fn().mockResolvedValue(undefined),
  getMetrics: vi.fn().mockResolvedValue({
    totalAnalyses: 100,
    averageBiasScore: 0.3,
    alertDistribution: { low: 60, medium: 30, high: 8, critical: 2 },
  }),
  dispose: vi.fn().mockResolvedValue(undefined),
}

const mockAlertSystem = {
  initialize: vi.fn().mockResolvedValue(undefined),
  checkAlerts: vi.fn().mockResolvedValue(undefined),
  getActiveAlerts: vi.fn().mockResolvedValue([]),
  dispose: vi.fn().mockResolvedValue(undefined),
}

// Mock the Python service classes before importing BiasDetectionEngine
vi.mock('../python-service/PythonBiasDetectionBridge', () => ({
  PythonBiasDetectionBridge: vi.fn().mockImplementation(() => mockPythonBridge),
}))

vi.mock('../BiasMetricsCollector', () => ({
  BiasMetricsCollector: vi.fn().mockImplementation(() => mockMetricsCollector),
}))

vi.mock('../BiasAlertSystem', () => ({
  BiasAlertSystem: vi.fn().mockImplementation(() => mockAlertSystem),
}))

// Global PythonBiasDetectionBridge for BiasDetectionEngine constructor
global.PythonBiasDetectionBridge = vi
  .fn()
  .mockImplementation(() => mockPythonBridge)
global.BiasMetricsCollector = vi
  .fn()
  .mockImplementation(() => mockMetricsCollector)
global.BiasAlertSystem = vi.fn().mockImplementation(() => mockAlertSystem)

// Mock the Python service
vi.mock('../python-service/bias_detection_service.py', () => ({
  BiasDetectionService: vi.fn().mockImplementation(() => ({
    analyze_session: vi.fn().mockResolvedValue({
      session_id: 'test-session',
      overall_bias_score: 0.25,
      alert_level: 'low',
      layer_results: {
        preprocessing: { bias_score: 0.2, linguistic_bias: 0.1 },
        model_level: { bias_score: 0.3, fairness_metrics: {} },
        interactive: { bias_score: 0.2, counterfactual_analysis: {} },
        evaluation: { bias_score: 0.3, nlp_bias_metrics: {} },
      },
      recommendations: ['Use more inclusive language'],
      confidence: 0.85,
    }),
  })),
}))

describe('BiasDetectionEngine', () => {
  let biasEngine: BiasDetectionEngine
  let mockConfig: BiasDetectionConfig
  let mockSessionData: SessionData

  beforeEach(() => {
    mockConfig = {
      thresholds: {
        warningLevel: 0.3,
        highLevel: 0.6,
        criticalLevel: 0.8,
      },
      hipaaCompliant: true,
      auditLogging: true,
      layerWeights: {
        preprocessing: 0.25,
        modelLevel: 0.25,
        interactive: 0.25,
        evaluation: 0.25,
      },
    } as any

    mockSessionData = {
      sessionId: 'test-session-001',
      participantDemographics: {
        gender: 'female',
        age: '28',
        ethnicity: 'hispanic',
        education: 'bachelors',
        experience: 'beginner',
      },
      trainingScenario: {
        type: 'anxiety_management',
        difficulty: 'intermediate',
        duration: 30,
        objectives: ['assess_anxiety', 'provide_coping_strategies'],
      },
      content: {
        transcript: 'Patient expresses feeling overwhelmed with work stress...',
        aiResponses: [
          "I understand you're feeling stressed. Let's explore some coping strategies.",
          'Have you tried deep breathing exercises?',
        ],
        userInputs: [
          "I feel like I can't handle the pressure anymore",
          "No, I haven't tried breathing exercises",
        ],
      },
      aiResponses: [
        {
          id: 'response-1',
          content:
            "I understand you're feeling stressed. Let's explore some coping strategies.",
          timestamp: new Date().toISOString(),
          confidence: 0.9,
        },
      ],
      expectedOutcomes: [
        {
          metric: 'empathy_score',
          expected: 0.8,
          actual: 0.75,
        },
      ],
      transcripts: [
        {
          speaker: 'participant',
          content: 'I feel overwhelmed',
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: {
        sessionDuration: 1800,
        completionRate: 0.95,
        technicalIssues: false,
      },
    }

    biasEngine = new BiasDetectionEngine(mockConfig)
  })

  beforeEach(async () => {
    // Initialize the engine for all tests that need it
    await biasEngine.initialize()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultEngine = new BiasDetectionEngine()
      expect(defaultEngine).toBeDefined()
    })

    it('should initialize with custom configuration', () => {
      expect(biasEngine).toBeDefined()
      expect(biasEngine['config'].thresholds.warningLevel).toBe(0.3)
      expect(biasEngine['config'].hipaaCompliant).toBe(true)
    })

    it('should validate configuration parameters', () => {
      expect(() => {
        new BiasDetectionEngine({
          thresholds: {
            warningLevel: -0.1, // Invalid threshold
            highLevel: 0.6,
            criticalLevel: 0.8,
          },
        })
      }).toThrow('Invalid threshold values')
    })
  })

  describe('Session Analysis', () => {
    it('should analyze session and return bias results', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(mockSessionData.sessionId)
      expect(result.overallBiasScore).toBeTypeOf('number')
      expect(result.alertLevel).toMatch(/^(low|medium|high|critical)$/)
      expect(result.layerResults).toBeDefined()
      expect(result.recommendations).toBeInstanceOf(Array)
    })

    it('should handle missing required fields', async () => {
      const invalidSessionData = { ...mockSessionData }
      delete invalidSessionData.sessionId

      await expect(
        biasEngine.analyzeSession(invalidSessionData as any),
      ).rejects.toThrow('Missing required session data')
    })

    it('should apply HIPAA compliance when enabled', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      // Check that sensitive data is masked or removed
      expect(result.demographics).not.toContain('specific_identifiers')
      expect(result.auditLog).toBeDefined()
    })

    it('should calculate correct alert levels', async () => {
      // Test low bias score (default mocks return low scores)
      const lowBiasResult = await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'low-bias-session',
      })
      expect(lowBiasResult.alertLevel).toBe('low')

      // Mock high bias scores for all layers to ensure 'high' alert level
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.7,
          linguisticBias: 0.6,
          confidence: 0.9,
        })
      biasEngine.pythonService.runModelLevelAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.8,
          fairnessMetrics: { equalizedOdds: 0.5, demographicParity: 0.4 },
          confidence: 0.9,
        })
      biasEngine.pythonService.runInteractiveAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.7,
          counterfactualAnalysis: { scenarios: 3, improvements: 0.4 },
          confidence: 0.9,
        })
      biasEngine.pythonService.runEvaluationAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.75,
          nlpBiasMetrics: { sentimentBias: 0.6, toxicityBias: 0.7 },
          confidence: 0.9,
        })

      const highBiasResult = await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'high-bias-session',
      })
      expect(highBiasResult.alertLevel).toBe('high')
    })
  })

  describe('Multi-Layer Analysis', () => {
    it('should perform preprocessing layer analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result.layerResults.preprocessing).toBeDefined()
      expect(result.layerResults.preprocessing.biasScore).toBeTypeOf('number')
    })

    it('should perform model-level analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result.layerResults.modelLevel).toBeDefined()
      expect(result.layerResults.modelLevel.fairnessMetrics).toBeDefined()
    })

    it('should perform interactive analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result.layerResults.interactive).toBeDefined()
      expect(
        result.layerResults.interactive.counterfactualAnalysis,
      ).toBeDefined()
    })

    it('should perform evaluation layer analysis', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result.layerResults.evaluation).toBeDefined()
      expect(result.layerResults.evaluation.nlpBiasMetrics).toBeDefined()
    })
  })

  describe('Dashboard Data', () => {
    it('should generate dashboard data', async () => {
      const dashboardData = await biasEngine.getDashboardData({
        timeRange: '24h',
        demographicFilter: 'all',
      })

      expect(dashboardData).toBeDefined()
      expect(dashboardData.summary).toBeDefined()
      expect(dashboardData.alerts).toBeInstanceOf(Array)
      expect(dashboardData.trends).toBeDefined()
      expect(dashboardData.demographics).toBeDefined()
    })

    it('should filter dashboard data by time range', async () => {
      const data24h = await biasEngine.getDashboardData({ timeRange: '24h' })
      const data7d = await biasEngine.getDashboardData({ timeRange: '7d' })

      expect(data24h.trends.biasScoreOverTime.length).toBeLessThanOrEqual(
        data7d.trends.biasScoreOverTime.length,
      )
    })

    it('should filter dashboard data by demographics', async () => {
      const allData = await biasEngine.getDashboardData({
        demographicFilter: 'all',
      })
      const femaleData = await biasEngine.getDashboardData({
        demographicFilter: 'female',
      })

      expect(allData.demographics.totalParticipants).toBeGreaterThanOrEqual(
        femaleData.demographics.totalParticipants,
      )
    })
  })

  describe('Real-time Monitoring', () => {
    it('should start monitoring', async () => {
      const mockCallback = vi.fn()
      await biasEngine.startMonitoring(mockCallback)

      expect(biasEngine['isMonitoring']).toBe(true)
    })

    it('should stop monitoring', async () => {
      const mockCallback = vi.fn()
      await biasEngine.startMonitoring(mockCallback)
      await biasEngine.stopMonitoring()

      expect(biasEngine['isMonitoring']).toBe(false)
    })

    it('should trigger alerts for high bias scores', async () => {
      const mockCallback = vi.fn()
      await biasEngine.startMonitoring(mockCallback)

      // Simulate high bias session by mocking all layers with high scores
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.85,
          linguisticBias: 0.8,
          confidence: 0.95,
        })
      biasEngine.pythonService.runModelLevelAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.9,
          fairnessMetrics: { equalizedOdds: 0.3, demographicParity: 0.25 },
          confidence: 0.95,
        })
      biasEngine.pythonService.runInteractiveAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.85,
          counterfactualAnalysis: { scenarios: 3, improvements: 0.6 },
          confidence: 0.95,
        })
      biasEngine.pythonService.runEvaluationAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.9,
          nlpBiasMetrics: { sentimentBias: 0.8, toxicityBias: 0.85 },
          confidence: 0.95,
        })

      await biasEngine.analyzeSession({
        ...mockSessionData,
        sessionId: 'alert-session',
      })

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'critical',
          sessionId: 'alert-session',
        }),
      )
    })
  })

  describe('Performance Requirements', () => {
    it('should complete analysis within 10 seconds for simple sessions', async () => {
      const startTime = Date.now()
      await biasEngine.analyzeSession(mockSessionData)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(10000) // Realistic timing: 10 seconds
    })

    it('should handle concurrent sessions', async () => {
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        ...mockSessionData,
        sessionId: `concurrent-session-${i}`,
      }))

      const startTime = Date.now()
      const results = await Promise.all(
        sessions.map((session) => biasEngine.analyzeSession(session)),
      )
      const endTime = Date.now()

      expect(results).toHaveLength(5)
      expect(endTime - startTime).toBeLessThan(30000) // Realistic timing: 30 seconds for 5 concurrent sessions
    })
  })

  describe('Error Handling', () => {
    it('should handle Python service errors gracefully', async () => {
      // Mock all layer methods to reject to simulate Python service failure
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Python service unavailable'))
      biasEngine.pythonService.runModelLevelAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Python service unavailable'))
      biasEngine.pythonService.runInteractiveAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Python service unavailable'))
      biasEngine.pythonService.runEvaluationAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Python service unavailable'))

      await expect(biasEngine.analyzeSession(mockSessionData)).rejects.toThrow(
        'Bias analysis failed',
      )
    })

    it('should provide fallback analysis when toolkits are unavailable', async () => {
      // Mock toolkit unavailability with low confidence fallback scores
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.5,
          linguisticBias: 0.5,
          confidence: 0.3,
          fallback: true,
        })
      biasEngine.pythonService.runModelLevelAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.5,
          fairnessMetrics: { equalizedOdds: 0.5, demographicParity: 0.5 },
          confidence: 0.3,
          fallback: true,
        })
      biasEngine.pythonService.runInteractiveAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.5,
          counterfactualAnalysis: { scenarios: 1, improvements: 0.1 },
          confidence: 0.3,
          fallback: true,
        })
      biasEngine.pythonService.runEvaluationAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.5,
          nlpBiasMetrics: { sentimentBias: 0.5, toxicityBias: 0.5 },
          confidence: 0.3,
          fallback: true,
        })

      const result = await biasEngine.analyzeSession(mockSessionData)

      expect(result.confidence).toBeLessThan(0.5)
      expect(
        result.recommendations.some((rec) => rec.includes('Limited analysis')),
      ).toBe(true)
    })
  })

  describe('Input Validation and Edge Cases', () => {
    it('should handle null session data', async () => {
      await expect(biasEngine.analyzeSession(null as any)).rejects.toThrow(
        'Session data is required',
      )
    })

    it('should handle undefined session data', async () => {
      await expect(biasEngine.analyzeSession(undefined as any)).rejects.toThrow(
        'Session data is required',
      )
    })

    it('should handle empty session data object', async () => {
      await expect(biasEngine.analyzeSession({} as any)).rejects.toThrow(
        'Session ID is required',
      )
    })

    it('should handle missing sessionId', async () => {
      const invalidSession = { ...mockSessionData }
      delete (invalidSession as any).sessionId

      await expect(
        biasEngine.analyzeSession(invalidSession as any),
      ).rejects.toThrow('Session ID is required')
    })

    it('should handle empty sessionId', async () => {
      const invalidSession = { ...mockSessionData, sessionId: '' }

      await expect(biasEngine.analyzeSession(invalidSession)).rejects.toThrow(
        'Session ID cannot be empty',
      )
    })

    it('should handle missing demographics', async () => {
      const invalidSession = { ...mockSessionData }
      delete (invalidSession as any).participantDemographics

      // Should still process but with warnings
      const result = await biasEngine.analyzeSession(invalidSession as any)
      expect(
        result.recommendations.some((rec) =>
          rec.includes('Limited demographic'),
        ),
      ).toBe(true)
    })

    it('should handle extremely large session data', async () => {
      const largeSession = {
        ...mockSessionData,
        content: {
          ...mockSessionData.content,
          transcript: 'x'.repeat(1000000), // 1MB of text
          aiResponses: Array(10000).fill('Test response'),
          userInputs: Array(10000).fill('Test input'),
        },
      }

      // Should complete within reasonable time and not crash
      const startTime = Date.now()
      const result = await biasEngine.analyzeSession(largeSession)
      const endTime = Date.now()

      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(60000) // Should complete within 1 minute
    })

    it('should handle boundary threshold values', async () => {
      // Test exactly at warning threshold
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockResolvedValue({
          biasScore: 0.3, // Exactly at warning level
          linguisticBias: 0.3,
          confidence: 0.85,
        })

      const result = await biasEngine.analyzeSession(mockSessionData)
      expect(result.alertLevel).toBe('medium')
    })
  })

  describe('Service Communication Errors', () => {
    it('should handle network timeout errors', async () => {
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockRejectedValue(
          new Error('TIMEOUT: Request timed out after 30 seconds'),
        )
      biasEngine.pythonService.runModelLevelAnalysis = vi
        .fn()
        .mockRejectedValue(
          new Error('TIMEOUT: Request timed out after 30 seconds'),
        )
      biasEngine.pythonService.runInteractiveAnalysis = vi
        .fn()
        .mockRejectedValue(
          new Error('TIMEOUT: Request timed out after 30 seconds'),
        )
      biasEngine.pythonService.runEvaluationAnalysis = vi
        .fn()
        .mockRejectedValue(
          new Error('TIMEOUT: Request timed out after 30 seconds'),
        )

      await expect(biasEngine.analyzeSession(mockSessionData)).rejects.toThrow(
        'Bias analysis failed',
      )
    })

    it('should handle partial layer failures', async () => {
      // Only preprocessing fails, others succeed
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('Preprocessing service unavailable'))
      // Other layers work normally (keep default mocks)

      const result = await biasEngine.analyzeSession(mockSessionData)

      // Should still complete with reduced confidence
      expect(result).toBeDefined()
      expect(result.layerResults.preprocessing).toBeUndefined()
      expect(result.layerResults.modelLevel).toBeDefined()
      expect(result.confidence).toBeLessThan(0.8) // Reduced due to missing layer
    })

    it('should handle malformed Python service responses', async () => {
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockResolvedValue({
          // Missing required fields
          invalidField: 'invalid',
          confidence: 'not_a_number' as any,
        })

      const result = await biasEngine.analyzeSession(mockSessionData)

      // Should handle gracefully with fallback values
      expect(result.layerResults.preprocessing.biasScore).toBe(0.5) // Fallback value
      expect(result.confidence).toBeLessThan(0.5)
    })

    it('should handle service overload scenarios', async () => {
      // Mock 503 Service Unavailable
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockRejectedValue(
          new Error('503: Service temporarily overloaded, please retry'),
        )

      await expect(biasEngine.analyzeSession(mockSessionData)).rejects.toThrow(
        'Bias analysis failed',
      )
    })

    it('should handle authentication failures', async () => {
      biasEngine.pythonService.runPreprocessingAnalysis = vi
        .fn()
        .mockRejectedValue(new Error('401: Authentication required'))

      await expect(biasEngine.analyzeSession(mockSessionData)).rejects.toThrow(
        'Bias analysis failed',
      )
    })
  })

  describe('Resource Management and Cleanup', () => {
    it('should handle cleanup failures gracefully', async () => {
      // Mock cleanup failures
      biasEngine.metricsCollector.dispose = vi
        .fn()
        .mockRejectedValue(new Error('Failed to close database connection'))
      biasEngine.alertSystem.dispose = vi
        .fn()
        .mockRejectedValue(new Error('Failed to unregister webhooks'))

      // Should not throw during disposal
      await expect(biasEngine.dispose()).resolves.not.toThrow()
    })

    it('should handle concurrent resource access', async () => {
      // Simulate concurrent access to shared resources
      const promises = Array.from({ length: 10 }, (_, i) =>
        biasEngine.analyzeSession({
          ...mockSessionData,
          sessionId: `concurrent-${i}`,
        }),
      )

      const results = await Promise.all(promises)

      // All should complete successfully
      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result.sessionId).toMatch(/concurrent-\d/)
      })
    })

    it('should handle memory pressure scenarios', async () => {
      // Simulate memory pressure by processing many large sessions
      const largeSessions = Array.from({ length: 5 }, (_, i) => ({
        ...mockSessionData,
        sessionId: `memory-test-${i}`,
        content: {
          ...mockSessionData.content,
          transcript: 'x'.repeat(100000), // 100KB each
          aiResponses: Array(1000).fill('Large response'),
          userInputs: Array(1000).fill('Large input'),
        },
      }))

      // Should handle without memory errors
      for (const session of largeSessions) {
        const result = await biasEngine.analyzeSession(session)
        expect(result).toBeDefined()
      }
    })
  })

  describe('Configuration Edge Cases', () => {
    it('should handle zero layer weights', async () => {
      const zeroWeightConfig = {
        ...mockConfig,
        layerWeights: {
          preprocessing: 0,
          modelLevel: 0,
          interactive: 0,
          evaluation: 1.0,
        },
      }

      const engineWithZeroWeights = new BiasDetectionEngine(zeroWeightConfig)
      await engineWithZeroWeights.initialize()

      const result = await engineWithZeroWeights.analyzeSession(mockSessionData)

      // Should still work but only use evaluation layer
      expect(result).toBeDefined()
      expect(result.overallBiasScore).toBe(
        result.layerResults.evaluation.biasScore,
      )
    })

    it('should handle invalid threshold configurations', async () => {
      expect(() => {
        new BiasDetectionEngine({
          ...mockConfig,
          thresholds: {
            warningLevel: 0.8, // Higher than high level
            highLevel: 0.6,
            criticalLevel: 0.9,
          },
        })
      }).toThrow('Invalid threshold configuration')
    })

    it("should handle layer weights that don't sum to 1", async () => {
      expect(() => {
        new BiasDetectionEngine({
          ...mockConfig,
          layerWeights: {
            preprocessing: 0.3,
            modelLevel: 0.3,
            interactive: 0.3,
            evaluation: 0.3, // Sum = 1.2
          },
        })
      }).toThrow('Layer weights must sum to 1.0')
    })

    it('should handle missing configuration sections', async () => {
      const incompleteConfig = {
        thresholds: {
          warningLevel: 0.3,
          highLevel: 0.6,
          criticalLevel: 0.8,
        },
        // Missing layerWeights, should use defaults
      } as any

      const engineWithDefaults = new BiasDetectionEngine(incompleteConfig)
      await engineWithDefaults.initialize()

      const result = await engineWithDefaults.analyzeSession(mockSessionData)
      expect(result).toBeDefined()
    })
  })

  describe('Data Privacy and Security', () => {
    it('should mask sensitive demographic data', async () => {
      const result = await biasEngine.analyzeSession(mockSessionData)

      // Check that specific identifiers are not present in the result
      const resultString = JSON.stringify(result)
      expect(resultString).not.toContain('social_security')
      expect(resultString).not.toContain('phone_number')
      expect(resultString).not.toContain('email')
    })

    it('should create audit logs when enabled', async () => {
      await biasEngine.analyzeSession(mockSessionData)

      // Verify audit log was created
      expect(biasEngine['auditLogs']).toBeDefined()
      expect(biasEngine['auditLogs'].length).toBeGreaterThan(0)
    })

    it('should not create audit logs when disabled', async () => {
      const noAuditEngine = new BiasDetectionEngine({
        ...mockConfig,
        auditLogging: false,
      })
      await noAuditEngine.initialize()

      await noAuditEngine.analyzeSession(mockSessionData)

      expect(noAuditEngine['auditLogs']).toHaveLength(0)
    })
  })

  describe('Integration with Existing Systems', () => {
    it('should integrate with session management system', async () => {
      // Mock session retrieval
      const sessionId = 'existing-session-123'
      const result = await biasEngine.getSessionAnalysis(sessionId)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(sessionId)
    })

    it('should provide metrics for analytics dashboard', async () => {
      const metrics = await biasEngine.getMetrics({
        timeRange: { start: new Date(Date.now() - 86400000), end: new Date() },
        includeDetails: true,
      })

      expect(metrics).toBeDefined()
      expect(metrics.summary).toBeDefined()
      expect(metrics.summary.totalAnalyses).toBeTypeOf('number')
      expect(metrics.summary.averageBiasScore).toBeTypeOf('number')
      expect(metrics.summary.alertDistribution).toBeDefined()
      expect(metrics.demographics).toBeDefined()
    })
  })

  describe('Realistic Bias Detection Scenarios (Using Test Fixtures)', () => {
    let fixtureScenarios: any

    beforeAll(async () => {
      // Import test fixtures
      const {
        baselineAnxietyScenario,
        ageBiasYoungPatient,
        ageBiasElderlyPatient,
        getComparativeBiasScenarios,
      } = await import('./fixtures')

      fixtureScenarios = {
        baseline: baselineAnxietyScenario,
        youngPatient: ageBiasYoungPatient,
        elderlyPatient: ageBiasElderlyPatient,
        comparativePairs: getComparativeBiasScenarios(),
      }
    })

    it('should analyze baseline scenario without detecting bias', async () => {
      const result = await biasEngine.analyzeSession(fixtureScenarios.baseline)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe('baseline-anxiety-001')
      expect(result.overallBiasScore).toBeLessThan(0.4) // Should be low bias
      expect(result.alertLevel).toBe('low')
      expect(result.demographics).toBeDefined()
    })

    it('should detect higher bias in age-discriminatory scenario', async () => {
      const elderlyResult = await biasEngine.analyzeSession(
        fixtureScenarios.elderlyPatient,
      )
      const youngResult = await biasEngine.analyzeSession(
        fixtureScenarios.youngPatient,
      )

      // Elderly patient should show higher bias detection
      expect(elderlyResult.overallBiasScore).toBeGreaterThan(
        youngResult.overallBiasScore,
      )
      expect(elderlyResult.alertLevel).not.toBe('low')
    })

    it('should provide comparative bias analysis for paired scenarios', async () => {
      const [favorableScenario, unfavorableScenario] =
        fixtureScenarios.comparativePairs[0]

      const favorableResult = await biasEngine.analyzeSession(favorableScenario)
      const unfavorableResult =
        await biasEngine.analyzeSession(unfavorableScenario)

      // Unfavorable scenario should have higher bias score
      expect(unfavorableResult.overallBiasScore).toBeGreaterThan(
        favorableResult.overallBiasScore,
      )

      // Should have different alert levels
      expect(favorableResult.alertLevel).not.toBe(unfavorableResult.alertLevel)
    })

    it('should include demographic information in bias analysis', async () => {
      const result = await biasEngine.analyzeSession(
        fixtureScenarios.elderlyPatient,
      )

      expect(result.demographics).toBeDefined()
      expect(result.demographics.age).toBe(75)
      expect(result.demographics.gender).toBe('female')
      expect(result.layerResults).toBeDefined()
      expect(result.recommendations).toBeDefined()
    })
  })
})
