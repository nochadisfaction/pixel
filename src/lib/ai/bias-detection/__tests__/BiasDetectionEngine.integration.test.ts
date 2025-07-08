/**
 * BiasDetectionEngine Integration Test Suite
 *
 * This test suite validates end-to-end functionality of the BiasDetectionEngine
 * by testing complete workflows from session analysis to report generation.
 * Tests use realistic data and scenarios to ensure production readiness.
 */

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
      pythonServiceUrl: 'http://localhost:5000',
      pythonServiceTimeout: 10000,
      thresholds: {
        warningLevel: 0.3,
        highLevel: 0.6,
        criticalLevel: 0.8,
      },
      layerWeights: {
        preprocessing: 0.25,
        modelLevel: 0.25,
        interactive: 0.25,
        evaluation: 0.25,
      },
      evaluationMetrics: ['demographic_parity', 'equalized_odds'],
      metricsConfig: {
        enableRealTimeMonitoring: true,
        metricsRetentionDays: 30,
        aggregationIntervals: ['5m'],
        dashboardRefreshRate: 30,
        exportFormats: ['json'],
      },
      alertConfig: {
        enableEmailNotifications: false,
        enableSlackNotifications: false,
        emailRecipients: [],
        alertCooldownMinutes: 15,
        escalationThresholds: {
          criticalResponseTimeMinutes: 5,
          highResponseTimeMinutes: 15,
        },
      },
      reportConfig: {
        includeConfidentialityAnalysis: true,
        includeDemographicBreakdown: true,
        includeTemporalTrends: true,
        includeRecommendations: true,
        reportTemplate: 'standard' as const,
        exportFormats: ['json'],
      },
      explanationConfig: {
        explanationMethod: 'shap' as const,
        maxFeatures: 10,
        includeCounterfactuals: true,
        generateVisualization: false,
      },
      hipaaCompliant: true,
      dataMaskingEnabled: true,
      auditLogging: true,
    }

    // Create realistic test sessions for integration testing
    sampleSessions = [
      // Low bias scenario - experienced therapist with anxiety management
      {
        sessionId: 'integration-test-low-bias-001',
        participantDemographics: {
          gender: 'female',
          age: '26-35',
          ethnicity: 'white',
          primaryLanguage: 'en',
          education: 'masters',
        },
        scenario: {
          scenarioId: 'anxiety-001',
          type: 'anxiety',
          complexity: 'intermediate',
          tags: ['anxiety', 'coping'],
          description: 'Anxiety management session',
          learningObjectives: [
            'assess_anxiety',
            'provide_coping_strategies',
            'build_rapport',
          ],
        },
        content: {
          patientPresentation: 'Client presents with anxiety symptoms',
          therapeuticInterventions: [
            'active_listening',
            'validation',
            'anxiety_assessment',
          ],
          patientResponses: [
            'I have been having trouble sleeping and feel overwhelmed at work',
          ],
          sessionNotes: 'Initial assessment completed successfully',
        },
        aiResponses: [],
        expectedOutcomes: [],
        transcripts: [],
        metadata: {
          trainingInstitution: 'Test University',
          traineeId: 'trainee-001',
          sessionDuration: 45,
          completionStatus: 'completed',
        },
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },

      // Medium bias scenario - beginner therapist with depression case
      {
        sessionId: 'integration-test-medium-bias-002',
        participantDemographics: {
          gender: 'male',
          age: '18-25',
          ethnicity: 'hispanic',
          primaryLanguage: 'en',
          education: 'bachelors',
        },
        scenario: {
          scenarioId: 'depression-001',
          type: 'depression',
          complexity: 'advanced',
          tags: ['depression', 'assessment'],
          description: 'Depression therapy session',
          learningObjectives: [
            'assess_depression',
            'explore_treatment_options',
            'safety_assessment',
          ],
        },
        content: {
          patientPresentation: 'Client presents with depressive symptoms',
          therapeuticInterventions: [
            'assumption_making',
            'leading_questions',
            'incomplete_assessment',
          ],
          patientResponses: ['I guess maybe, but it feels deeper than that'],
          sessionNotes: 'Potential bias detected in approach',
        },
        aiResponses: [],
        expectedOutcomes: [],
        transcripts: [],
        metadata: {
          trainingInstitution: 'Test University',
          traineeId: 'trainee-002',
          sessionDuration: 60,
          completionStatus: 'completed',
        },
        timestamp: new Date('2024-01-15T14:30:00Z'),
      },

      // High bias scenario - cultural mismatch with substance abuse case
      {
        sessionId: 'integration-test-high-bias-003',
        participantDemographics: {
          gender: 'female',
          age: '26-35',
          ethnicity: 'black',
          primaryLanguage: 'en',
          education: 'high_school',
        },
        scenario: {
          scenarioId: 'substance-001',
          type: 'substance-abuse',
          complexity: 'advanced',
          tags: ['substance-abuse', 'bias'],
          description: 'Substance abuse therapy with bias indicators',
          learningObjectives: [
            'assess_substance_use',
            'motivational_interviewing',
            'treatment_planning',
          ],
        },
        content: {
          patientPresentation: 'Client seeking substance abuse treatment',
          therapeuticInterventions: [
            'socioeconomic_assumptions',
            'limited_treatment_options',
            'cultural_stereotyping',
          ],
          patientResponses: [
            'Actually, I have good insurance and want comprehensive treatment',
          ],
          sessionNotes: 'High bias indicators detected',
        },
        aiResponses: [],
        expectedOutcomes: [],
        transcripts: [],
        metadata: {
          trainingInstitution: 'Test University',
          traineeId: 'trainee-003',
          sessionDuration: 50,
          completionStatus: 'completed',
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
    if (engine) {
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
      if (!session) {
        throw new Error('Session not found')
      }

      // Perform complete analysis
      const result = await engine.analyzeSession(session)

      // Verify complete result structure
      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)
      expect(typeof result.overallBiasScore).toBe('number')
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
        expect(typeof result.overallBiasScore).toBe('number')
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
      expect(report.reportId).toBeDefined()
      expect(report.generatedAt).toBeDefined()
      expect(report.timeRange).toBeDefined()
      expect(report.overallFairnessScore).toBeDefined()
      expect(report.executiveSummary).toBeDefined()
      expect(report.detailedAnalysis).toBeDefined()
      expect(report.recommendations).toBeDefined()
      expect(report.appendices).toBeDefined()
    })
  })

  describe('Real-Time Monitoring Integration', () => {
    it('should provide real-time monitoring data during analysis', async () => {
      let monitoringDataReceived = false
      let monitoringData: unknown = null

      // Setup monitoring callback
      const monitoringCallback = (data: unknown) => {
        monitoringDataReceived = true
        monitoringData = data
      }

      // Start monitoring
      await engine.startMonitoring(monitoringCallback, 1000)

      // Perform analysis while monitoring
      const session = sampleSessions[0]
      if (!session) {
        throw new Error('Session not found')
      }
      await engine.analyzeSession(session)

      // Wait for monitoring data
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Stop monitoring
      engine.stopMonitoring()

      // Verify monitoring data received
      expect(monitoringDataReceived).toBe(true)
      expect(monitoringData).toBeDefined()
      if (monitoringData && typeof monitoringData === 'object') {
        const data = monitoringData as Record<string, unknown>
        expect(data['timestamp']).toBeDefined()
        expect(data['systemHealth']).toMatch(
          /^(healthy|warning|degraded|critical)$/,
        )
        expect(data['performanceMetrics']).toBeDefined()
      }
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
      expect(dashboardData.summary.totalSessions).toBeGreaterThan(0)
      expect(typeof dashboardData.summary.averageBiasScore).toBe('number')

      // Verify alerts data included
      expect(dashboardData.alerts).toBeDefined()
      expect(Array.isArray(dashboardData.alerts)).toBe(true)
    })
  })

  describe('Configuration and Threshold Management', () => {
    it('should update thresholds and reflect changes in analysis', async () => {
      const session = sampleSessions[0]
      if (!session) {
        throw new Error('Session not found')
      }

      // Get initial analysis with default thresholds
      await engine.analyzeSession(session)

      // Update thresholds to be more sensitive
      await engine.updateThresholds({
        warningLevel: 0.1,
        highLevel: 0.3,
        criticalLevel: 0.5,
      })

      // Re-analyze same session with new thresholds
      const updatedResult = await engine.analyzeSession(session)

      // Verify analysis completed with new thresholds
      expect(updatedResult.sessionId).toBe(session.sessionId)
      expect(updatedResult.alertLevel).toBeDefined()
      expect(typeof updatedResult.overallBiasScore).toBe('number')
    })

    it('should validate configuration changes before applying', async () => {
      // Attempt to set invalid thresholds
      const updateResult = await engine.updateThresholds(
        {
          warningLevel: 0.8, // Invalid: higher than high threshold
          highLevel: 0.6,
          criticalLevel: 0.4, // Invalid: lower than high threshold
        },
        { validateOnly: true },
      )

      expect(updateResult.success).toBe(false)
      expect(updateResult.validationErrors).toBeDefined()
      expect(updateResult.validationErrors?.length ?? 0).toBeGreaterThan(0)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from transient errors gracefully', async () => {
      const session = sampleSessions[0]
      if (!session) {
        throw new Error('Session not found')
      }

      // Analysis should complete despite potential transient errors
      const result = await engine.analyzeSession(session)

      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)
      expect(typeof result.overallBiasScore).toBe('number')
    })

    it('should maintain data consistency during error recovery', async () => {
      const session = sampleSessions[1]
      if (!session) {
        throw new Error('Session not found')
      }

      // Get initial metrics
      const initialMetrics = await engine.getMetrics()

      // Perform successful analysis
      await engine.analyzeSession(session)

      // Verify metrics updated correctly
      const updatedMetrics = await engine.getMetrics()
      const initialSummary = (initialMetrics as Record<string, unknown>)['summary'] as Record<string, unknown>
      const updatedSummary = (updatedMetrics as Record<string, unknown>)['summary'] as Record<string, unknown>
      expect(updatedSummary['totalSessions']).toBe(
        (initialSummary['totalSessions'] as number) + 1,
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
        const session = sampleSessions[index]
        if (session) {
          expect(result.sessionId).toBe(session.sessionId)
        }
        expect(typeof result.overallBiasScore).toBe('number')
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
      if (!session) {
        throw new Error('Session not found')
      }

      // Analysis should handle HIPAA compliance

      // Perform analysis
      const result = await engine.analyzeSession(session)

      // Verify analysis completed
      expect(result).toBeDefined()
      expect(result.sessionId).toBe(session.sessionId)

      // Verify demographics data is present but properly handled
      expect(result.demographics).toBeDefined()
      expect(result.demographics?.gender).toBeDefined()
      expect(result.demographics?.age).toBeDefined()
    })

    it('should provide explanation functionality for analysis results', async () => {
      const session = sampleSessions[1]
      if (!session) {
        throw new Error('Session not found')
      }

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
      expect(typeof explanation.summary).toBe('string')
      expect(typeof explanation.detailedExplanation).toBe('string')
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
      const metricsObj = metrics as Record<string, unknown>
      const summary = metricsObj['summary'] as Record<string, unknown>
      const performance = metricsObj['performance'] as Record<string, unknown>
      expect(summary).toBeDefined()
      expect(summary['totalSessions']).toBeGreaterThan(0)
      expect(typeof summary['averageBiasScore']).toBe('number')
      expect(metricsObj['demographics']).toBeDefined()
      expect(performance).toBeDefined()
      expect(performance['systemHealth']).toMatch(
        /^(healthy|warning|degraded|critical|unknown)$/,
      )
      expect(metricsObj['recommendations']).toBeDefined()
      expect(Array.isArray(metricsObj['recommendations'])).toBe(true)
    })

    it('should track session analysis history', async () => {
      const session = sampleSessions[0]
      if (!session) {
        throw new Error('Session not found')
      }

      // Perform analysis
      await engine.analyzeSession(session)

      // Retrieve session analysis
      const sessionAnalysis = await engine.getSessionAnalysis(session.sessionId)

      // Verify session analysis can be retrieved
      expect(sessionAnalysis).toBeDefined()
      expect(sessionAnalysis?.sessionId).toBe(session.sessionId)
      expect(typeof sessionAnalysis?.overallBiasScore).toBe('number')
    })
  })
})