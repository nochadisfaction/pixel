/**
 * BiasDetectionEngine Integration Test Suite
 *
 * This test suite validates end-to-end functionality of the BiasDetectionEngine
 * by testing complete workflows from session analysis to report generation.
 * Tests use realistic data and scenarios to ensure production readiness.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  beforeAll,
  afterAll,
} from 'vitest'
import { BiasDetectionEngine } from '../BiasDetectionEngine'
import type {
  BiasDetectionConfig,
  TherapeuticSession,
  BiasAnalysisResult,
} from '../types'

// Mock the support services for integration testing
vi.mock('../python-service/bias_detection_service', () => ({
  default: {
    analyze_session: vi.fn(),
    health_check: vi.fn(),
    update_configuration: vi.fn(),
  },
}))

describe('BiasDetectionEngine Integration Tests', () => {
  let engine: BiasDetectionEngine
  let integrationConfig: BiasDetectionConfig
  let sampleSessions: TherapeuticSession[]

  beforeAll(async () => {
    // Setup integration test environment
    integrationConfig = {
      warningThreshold: 0.3,
      highThreshold: 0.6,
      criticalThreshold: 0.8,
      enableHipaaCompliance: true,
      enableAuditLogging: true,
      pythonServiceUrl: 'http://localhost:5000',
      pythonServiceTimeout: 10000,
      layerWeights: {
        preprocessing: 0.25,
        modelLevel: 0.25,
        interactive: 0.25,
        evaluation: 0.25,
      },
      metricsConfig: {
        enableRealTimeMonitoring: true,
        retentionDays: 30,
        aggregationInterval: '5m',
      },
      alertConfig: {
        enableEmailNotifications: false, // Disable for testing
        enableSlackNotifications: false,
        escalationDelayMinutes: 15,
      },
    }

    // Create realistic test sessions for integration testing
    sampleSessions = [
      // Low bias scenario - experienced therapist with anxiety management
      {
        sessionId: 'integration-test-low-bias-001',
        participantDemographics: {
          gender: 'female',
          age: '35',
          ethnicity: 'caucasian',
          education: 'masters',
          experience: 'experienced',
        },
        trainingScenario: {
          type: 'anxiety_management',
          difficulty: 'intermediate',
          duration: 45,
          objectives: [
            'assess_anxiety',
            'provide_coping_strategies',
            'build_rapport',
          ],
        },
        sessionData: {
          transcript:
            'Thank you for coming in today. I can see that you might be feeling anxious. Can you tell me more about what brings you here?',
          responses: [
            'I have been having trouble sleeping and feel overwhelmed at work',
          ],
          interventions: [
            'active_listening',
            'validation',
            'anxiety_assessment',
          ],
          outcomes: [
            'client_engaged',
            'rapport_established',
            'initial_assessment_complete',
          ],
        },
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },

      // Medium bias scenario - beginner therapist with depression case
      {
        sessionId: 'integration-test-medium-bias-002',
        participantDemographics: {
          gender: 'male',
          age: '24',
          ethnicity: 'hispanic',
          education: 'bachelors',
          experience: 'beginner',
        },
        trainingScenario: {
          type: 'depression_therapy',
          difficulty: 'advanced',
          duration: 60,
          objectives: [
            'assess_depression',
            'explore_treatment_options',
            'safety_assessment',
          ],
        },
        sessionData: {
          transcript:
            'So you mentioned feeling sad. Have you considered that it might be because of your situation at home?',
          responses: ['I guess maybe, but it feels deeper than that'],
          interventions: [
            'assumption_making',
            'leading_questions',
            'incomplete_assessment',
          ],
          outcomes: [
            'client_defensive',
            'missed_cues',
            'potential_bias_detected',
          ],
        },
        timestamp: new Date('2024-01-15T14:30:00Z'),
      },

      // High bias scenario - cultural mismatch with substance abuse case
      {
        sessionId: 'integration-test-high-bias-003',
        participantDemographics: {
          gender: 'female',
          age: '28',
          ethnicity: 'african_american',
          education: 'high_school',
          experience: 'intermediate',
        },
        trainingScenario: {
          type: 'substance_abuse',
          difficulty: 'advanced',
          duration: 50,
          objectives: [
            'assess_substance_use',
            'motivational_interviewing',
            'treatment_planning',
          ],
        },
        sessionData: {
          transcript:
            'Based on your background, I assume you probably have limited resources for treatment. Let me suggest some basic options.',
          responses: [
            'Actually, I have good insurance and want comprehensive treatment',
          ],
          interventions: [
            'socioeconomic_assumptions',
            'limited_treatment_options',
            'cultural_stereotyping',
          ],
          outcomes: [
            'client_corrected_assumptions',
            'bias_indicators_high',
            'therapeutic_alliance_damaged',
          ],
        },
        timestamp: new Date('2024-01-15T16:00:00Z'),
      },
    ]
  })

  beforeEach(async () => {
    // Create fresh engine instance for each test
    engine = new BiasDetectionEngine(integrationConfig)
    await engine.initialize()
  })

  afterEach(async () => {
    // Clean up after each test
    if (engine && !engine.isDisposed()) {
      await engine.dispose()
    }
  })

  afterAll(async () => {
    // Clean up integration test environment
    vi.resetAllMocks()
  })

  describe('End-to-End Session Analysis Workflows', () => {
    it('should complete full analysis workflow for session', async () => {
      const session = sampleSessions[0]

      // Perform complete analysis
      const result = await engine.analyzeSession(session)

      // Verify complete result structure
      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)
      expect(result.overallBiasScore).toBeTypeOf('number')
      expect(result.alertLevel).toMatch(/^(low|medium|high|critical)$/)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)

      // Verify all analysis layers completed
      expect(result.layerResults).toBeDefined()
      expect(result.layerResults.preprocessing).toBeDefined()
      expect(result.layerResults.modelLevel).toBeDefined()
      expect(result.layerResults.interactive).toBeDefined()
      expect(result.layerResults.evaluation).toBeDefined()

      // Verify recommendations provided
      expect(result.recommendations).toBeDefined()
      expect(Array.isArray(result.recommendations)).toBe(true)
    })

    it('should handle concurrent session analyses efficiently', async () => {
      const startTime = Date.now()

      // Analyze sessions concurrently
      const analysisPromises = sampleSessions.map((session) =>
        engine.analyzeSession(session),
      )

      const results = await Promise.all(analysisPromises)

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all analyses completed
      expect(results).toHaveLength(sampleSessions.length)
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result.sessionId).toBeDefined()
        expect(result.overallBiasScore).toBeTypeOf('number')
      })

      // Performance requirement: should complete within reasonable time
      expect(totalTime).toBeLessThan(5000) // 5 seconds for concurrent analyses
    })
  })

  describe('Multi-Session Analysis and Reporting', () => {
    it('should analyze multiple sessions and generate comprehensive report', async () => {
      // Analyze all sample sessions
      const analyses: BiasAnalysisResult[] = []

      for (const session of sampleSessions) {
        const analysis = await engine.analyzeSession(session)
        analyses.push(analysis)
      }

      // Generate comprehensive report
      const timeRange = {
        start: new Date('2024-01-15T00:00:00Z'),
        end: new Date('2024-01-15T23:59:59Z'),
      }

      const report = await engine.generateBiasReport(
        sampleSessions,
        timeRange,
        {
          format: 'json',
          includeRawData: true,
          includeTrends: true,
          includeRecommendations: true,
        },
      )

      // Verify report structure
      expect(report).toBeDefined()
      expect(report.metadata).toBeDefined()
      expect(report.metadata.sessionCount).toBe(sampleSessions.length)
      expect(report.metadata.format).toBe('json')

      // Verify report contains analysis summary
      expect(report.summary).toBeDefined()
      expect(report.summary.totalSessions).toBe(sampleSessions.length)
      expect(report.summary.averageBiasScore).toBeTypeOf('number')

      // Verify trend analysis included
      expect(report.trendAnalysis).toBeDefined()
      expect(report.recommendations).toBeDefined()
      expect(Array.isArray(report.recommendations)).toBe(true)
    })
  })

  describe('Real-Time Monitoring Integration', () => {
    it('should provide real-time monitoring data during analysis', async () => {
      let monitoringDataReceived = false
      let monitoringData: any = null

      // Setup monitoring callback
      const monitoringCallback = (data: any) => {
        monitoringDataReceived = true
        monitoringData = data
      }

      // Start monitoring
      await engine.startMonitoring(monitoringCallback, 1000)

      // Perform analysis while monitoring
      const session = sampleSessions[0]
      await engine.analyzeSession(session)

      // Wait for monitoring data
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Stop monitoring
      engine.stopMonitoring()

      // Verify monitoring data received
      expect(monitoringDataReceived).toBe(true)
      expect(monitoringData).toBeDefined()
      expect(monitoringData.timestamp).toBeDefined()
      expect(monitoringData.systemHealth).toMatch(
        /^(healthy|warning|degraded|critical)$/,
      )
      expect(monitoringData.performanceMetrics).toBeDefined()
    })

    it('should aggregate dashboard data from multiple analyses', async () => {
      // Perform multiple analyses
      for (const session of sampleSessions) {
        await engine.analyzeSession(session)
      }

      // Get dashboard data
      const dashboardData = await engine.getDashboardData({
        timeRange: '1h',
        includeDetails: true,
      })

      // Verify dashboard data structure
      expect(dashboardData).toBeDefined()
      expect(dashboardData.summary).toBeDefined()
      expect(dashboardData.summary.totalAnalyses).toBeGreaterThan(0)
      expect(dashboardData.summary.averageBiasScore).toBeTypeOf('number')

      // Verify charts data included
      expect(dashboardData.charts).toBeDefined()
      expect(dashboardData.alerts).toBeDefined()
      expect(Array.isArray(dashboardData.alerts)).toBe(true)
    })
  })

  describe('Configuration and Threshold Management', () => {
    it('should update thresholds and reflect changes in analysis', async () => {
      const session = sampleSessions[0]

      // Get initial analysis with default thresholds
      const initialResult = await engine.analyzeSession(session)

      // Update thresholds to be more sensitive
      await engine.updateThresholds({
        warningThreshold: 0.1,
        highThreshold: 0.3,
        criticalThreshold: 0.5,
      })

      // Re-analyze same session with new thresholds
      const updatedResult = await engine.analyzeSession(session)

      // Verify analysis completed with new thresholds
      expect(updatedResult.sessionId).toBe(session.sessionId)
      expect(updatedResult.alertLevel).toBeDefined()
      expect(updatedResult.overallBiasScore).toBeTypeOf('number')
    })

    it('should validate configuration changes before applying', async () => {
      // Attempt to set invalid thresholds
      const updateResult = await engine.updateThresholds(
        {
          warningThreshold: 0.8, // Invalid: higher than high threshold
          highThreshold: 0.6,
          criticalThreshold: 0.4, // Invalid: lower than high threshold
        },
        { validateOnly: true },
      )

      expect(updateResult.success).toBe(false)
      expect(updateResult.validationErrors).toBeDefined()
      expect(updateResult.validationErrors!.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from transient errors gracefully', async () => {
      const session = sampleSessions[0]

      // Analysis should complete despite potential transient errors
      const result = await engine.analyzeSession(session)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)
      expect(result.overallBiasScore).toBeTypeOf('number')
    })

    it('should maintain data consistency during error recovery', async () => {
      const session = sampleSessions[1]

      // Get initial metrics
      const initialMetrics = await engine.getMetrics()
      const initialAnalysisCount = initialMetrics.summary.totalAnalyses

      // Perform successful analysis
      await engine.analyzeSession(session)

      // Verify metrics updated correctly
      const updatedMetrics = await engine.getMetrics()
      expect(updatedMetrics.summary.totalAnalyses).toBe(
        initialAnalysisCount + 1,
      )
    })
  })

  describe('Performance and Scalability', () => {
    it('should maintain performance with batch session processing', async () => {
      const startTime = Date.now()

      // Process sessions sequentially
      const results = []
      for (const session of sampleSessions) {
        const result = await engine.analyzeSession(session)
        results.push(result)
      }

      const endTime = Date.now()
      const averageTime = (endTime - startTime) / sampleSessions.length

      // Verify all sessions processed
      expect(results).toHaveLength(sampleSessions.length)

      // Performance requirement: reasonable time per session
      expect(averageTime).toBeLessThan(2000) // Less than 2 seconds per session on average

      // Verify results quality maintained
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(sampleSessions[index].sessionId)
        expect(result.overallBiasScore).toBeTypeOf('number')
        expect(result.confidence).toBeGreaterThan(0)
      })
    })

    it('should handle memory efficiently during extended operation', async () => {
      const initialMemory = process.memoryUsage()

      // Perform multiple analysis cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const session of sampleSessions) {
          await engine.analyzeSession({
            ...session,
            sessionId: `${session.sessionId}-cycle-${cycle}`,
          })
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 30MB for integration tests)
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024)
    })
  })

  describe('Audit and Compliance Integration', () => {
    it('should handle HIPAA compliance during analysis', async () => {
      const session = sampleSessions[0]

      // Ensure HIPAA compliance is enabled
      expect(engine.getConfiguration().enableHipaaCompliance).toBe(true)

      // Perform analysis
      const result = await engine.analyzeSession(session)

      // Verify analysis completed
      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)

      // Verify demographics data is present but properly handled
      expect(result.demographics).toBeDefined()
      expect(result.demographics.gender).toBeDefined()
      expect(result.demographics.age).toBeDefined()
    })

    it('should provide explanation functionality for analysis results', async () => {
      const session = sampleSessions[1]

      // Perform analysis
      const result = await engine.analyzeSession(session)

      // Get explanation for the analysis
      const explanation = await engine.explainBiasDetection(
        result,
        undefined,
        true,
      )

      // Verify explanation structure
      expect(explanation).toBeDefined()
      expect(explanation.summary).toBeTypeOf('string')
      expect(explanation.detailedExplanation).toBeTypeOf('string')
      expect(explanation.contributingFactors).toBeDefined()
      expect(Array.isArray(explanation.contributingFactors)).toBe(true)
      expect(explanation.recommendations).toBeDefined()
      expect(Array.isArray(explanation.recommendations)).toBe(true)
    })
  })

  describe('Metrics and Analytics Integration', () => {
    it('should provide comprehensive metrics after multiple analyses', async () => {
      // Perform analyses
      for (const session of sampleSessions) {
        await engine.analyzeSession(session)
      }

      // Get comprehensive metrics
      const metrics = await engine.getMetrics({
        includeDetails: true,
        includePerformance: true,
      })

      // Verify metrics structure
      expect(metrics).toBeDefined()
      expect(metrics.summary).toBeDefined()
      expect(metrics.summary.totalAnalyses).toBeGreaterThan(0)
      expect(metrics.summary.averageBiasScore).toBeTypeOf('number')
      expect(metrics.demographics).toBeDefined()
      expect(metrics.performance).toBeDefined()
      expect(metrics.performance.systemHealth).toMatch(
        /^(healthy|warning|degraded|critical)$/,
      )
      expect(metrics.recommendations).toBeDefined()
      expect(Array.isArray(metrics.recommendations)).toBe(true)
    })

    it('should track session analysis history', async () => {
      const session = sampleSessions[0]

      // Perform analysis
      await engine.analyzeSession(session)

      // Retrieve session analysis
      const sessionAnalysis = await engine.getSessionAnalysis(session.sessionId)

      // Verify session analysis can be retrieved
      expect(sessionAnalysis).toBeDefined()
      expect(sessionAnalysis!.sessionId).toBe(session.sessionId)
      expect(sessionAnalysis!.overallBiasScore).toBeTypeOf('number')
    })
  })
})
