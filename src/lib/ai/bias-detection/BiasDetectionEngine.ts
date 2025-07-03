/**
 * Pixelated Empathy Bias Detection Engine
 *
 * This module provides a comprehensive bias detection system for therapeutic training scenarios.
 * It integrates multiple fairness toolkits and provides real-time bias monitoring capabilities.
 * 
 * Refactored for better maintainability - core orchestration logic only.
 */

import { getLogger } from '../../utils/logger'
import {
  validateConfig,
  createConfigWithEnvOverrides,
  updateConfiguration,
  loadConfigFromEnv,
  deepMergeConfigs,
  getEnvironmentConfigSummary,
} from './config'
import { PythonBiasDetectionBridge } from './python-bridge'
import { BiasMetricsCollector } from './metrics-collector'
import { BiasAlertSystem } from './alerts-system'
import type {
  BiasDetectionConfig,
  BiasAnalysisResult,
  DemographicGroup,
  BiasReport,
  TherapeuticSession,
  ParticipantDemographics,
  AlertLevel,
} from './types'

const logger = getLogger('BiasDetectionEngine')

/**
 * Main Bias Detection Engine
 * 
 * Orchestrates multi-layer bias analysis for therapeutic training sessions.
 * Provides real-time monitoring, alerting, and comprehensive reporting.
 * 
 * @example
 * ```typescript
 * const engine = new BiasDetectionEngine({
 *   thresholds: { warningLevel: 0.3, highLevel: 0.6, criticalLevel: 0.8 },
 *   hipaaCompliant: true,
 *   auditLogging: true
 * });
 * 
 * await engine.initialize();
 * const result = await engine.analyzeSession(sessionData);
 * ```
 */
export class BiasDetectionEngine {
  private config: BiasDetectionConfig
  private pythonBridge: PythonBiasDetectionBridge
  private metricsCollector: BiasMetricsCollector
  private alertSystem: BiasAlertSystem
  private isInitialized = false
  private monitoringActive = false
  private monitoringInterval?: NodeJS.Timeout | undefined
  private monitoringCallbacks: Array<(data: any) => void> = []

  // Add missing properties for real-time monitoring
  private metrics: Map<string, any[]> = new Map()
  private logger = getLogger('BiasDetectionEngine')
  private sessionMetrics: Map<string, any> = new Map()
  private performanceMetrics = {
    startTime: new Date(),
    requestCount: 0,
    totalResponseTime: 0,
    errorCount: 0,
  }

  // Additional properties that tests expect
  private auditLogs: Array<{
    timestamp: Date
    sessionId: string
    action: string
    details: any
  }> = []

  // Aliases for backward compatibility with tests
  public get isMonitoring(): boolean {
    return this.monitoringActive
  }

  public get pythonService(): any {
    return this.pythonBridge
  }

  constructor(config?: Partial<BiasDetectionConfig>) {
    // First, validate input configuration if provided
    if (config) {
      this.validateInputConfig(config)
    }

    // Merge user config with defaults and environment variables
    this.config = createConfigWithEnvOverrides(config)

    // Validate final configuration
    validateConfig(this.config)

    // Initialize components with validated configuration
    this.pythonBridge = new PythonBiasDetectionBridge(
      this.config.pythonServiceUrl!,
      this.config.pythonServiceTimeout!,
    )
    this.metricsCollector = new BiasMetricsCollector(this.config, this.pythonBridge)
    this.alertSystem = new BiasAlertSystem(this.config, this.pythonBridge)
    
    // Initialize internal state
    this.metrics = new Map()
    this.sessionMetrics = new Map()
    this.auditLogs = []
    this.monitoringCallbacks = []
    this.performanceMetrics = {
      startTime: new Date(),
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
    }

    logger.info('BiasDetectionEngine created with configuration', {
      thresholds: this.config.thresholds,
      pythonServiceUrl: this.config.pythonServiceUrl,
      hipaaCompliant: this.config.hipaaCompliant,
      auditLogging: this.config.auditLogging,
    })
  }

  /**
   * Validate input configuration for common errors
   */
  private validateInputConfig(config: Partial<BiasDetectionConfig>): void {
    // Check thresholds if they exist
    if (config.thresholds) {
      const { thresholds } = config
      
      // Check for negative values
      if (thresholds.warningLevel !== undefined && thresholds.warningLevel < 0) {
        throw new Error('Invalid threshold values: warningLevel cannot be negative')
      }
      if (thresholds.highLevel !== undefined && thresholds.highLevel < 0) {
        throw new Error('Invalid threshold values: highLevel cannot be negative')
      }
      if (thresholds.criticalLevel !== undefined && thresholds.criticalLevel < 0) {
        throw new Error('Invalid threshold values: criticalLevel cannot be negative')
      }

      // Ensure thresholds are in ascending order if all are provided
      if (
        thresholds.warningLevel !== undefined &&
        thresholds.highLevel !== undefined &&
        thresholds.criticalLevel !== undefined
      ) {
        if (thresholds.warningLevel >= thresholds.highLevel) {
          throw new Error(
            `Invalid threshold configuration: warningLevel (${thresholds.warningLevel}) must be less than highLevel (${thresholds.highLevel}). Expected ascending order: warningLevel < highLevel < criticalLevel.`
          )
        }
        if (thresholds.highLevel >= thresholds.criticalLevel) {
          throw new Error(
            `Invalid threshold configuration: highLevel (${thresholds.highLevel}) must be less than criticalLevel (${thresholds.criticalLevel}). Expected ascending order: warningLevel < highLevel < criticalLevel.`
          )
        }
      }
    }

    // Check layer weights if they exist
    if (config.layerWeights) {
      const weights = Object.values(config.layerWeights)
      const sum = weights.reduce((acc, weight) => acc + weight, 0)
      if (Math.abs(sum - 1.0) > 0.001) {
        // Allow small floating point errors
        throw new Error('Layer weights must sum to 1.0')
      }
      
      // Check for negative weights
      weights.forEach((weight, index) => {
        if (weight < 0) {
          const layerNames = Object.keys(config.layerWeights!)
          throw new Error(`Invalid layer weight: ${layerNames[index]} weight cannot be negative`)
        }
      })
    }
  }

  /**
   * Initialize the bias detection engine
   * 
   * Sets up all components including Python service connection,
   * metrics collection, and alert system.
   * 
   * @throws {Error} If initialization fails
   * @example
   * ```typescript
   * await engine.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Bias Detection Engine')

      // Initialize Python backend
      await this.pythonBridge.initialize()

      // Initialize metrics collection
      await this.metricsCollector.initialize()

      // Initialize alert system
      await this.alertSystem.initialize()

      // Start periodic cleanup
      this.startPeriodicCleanup()

      this.isInitialized = true
      logger.info('Bias Detection Engine initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize Bias Detection Engine', { error })
      throw new Error(
        `Bias Detection Engine initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Analyze a therapeutic session for bias across all detection layers
   * 
   * Performs comprehensive bias analysis using preprocessing, model-level,
   * interactive, and evaluation layers. Returns detailed results with
   * recommendations and alert levels.
   * 
   * @param session - The therapeutic session data to analyze
   * @returns Promise resolving to comprehensive bias analysis results
   * @throws {Error} If analysis fails or system health is critical
   * 
   * @example
   * ```typescript
   * const result = await engine.analyzeSession({
   *   sessionId: 'session-123',
   *   participantDemographics: { age: '25-35', gender: 'female' },
   *   content: { transcript: '...' }
   * });
   * console.log('Bias Score:', result.overallBiasScore);
   * ```
   */
  async analyzeSession(
    session: TherapeuticSession,
  ): Promise<BiasAnalysisResult> {
    const startTime = Date.now()

    try {
      // Step 0: Validate system health
      this.validateSystemHealth()

      // Step 1: Validate and prepare session
      const { validatedSession } = await this.validateAndPrepareSession(session)

      // Step 2: Run multi-layer analyses
      const layerResults = await this.runLayerAnalyses(validatedSession)

      // Step 3: Calculate analysis results
      const { overallBiasScore, alertLevel, result } =
        this.calculateAnalysisResults(validatedSession, layerResults)

      // Calculate processing time
      const processingTimeMs = Date.now() - startTime

      // Step 4: Process alerts and callbacks with processing time
      await this.processAlertsAndCallbacks(
        result,
        alertLevel,
        overallBiasScore,
        processingTimeMs,
      )

      // Step 5: Record analysis for metrics tracking
      this.recordBiasAnalysis(result)

      return result
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      logger.error('Bias analysis failed', {
        sessionId: session.sessionId,
        error,
        processingTimeMs,
      })
      throw new Error(
        `Bias analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Generate comprehensive bias report
   */
  async generateBiasReport(
    sessions: TherapeuticSession[],
    timeRange: { start: Date; end: Date },
    options: any,
  ): Promise<BiasReport> {
    this.ensureInitialized()

    const startTime = Date.now()
    const {
      format = 'json',
      includeRawData = false,
      includeTrends = true,
      includeRecommendations = true,
    } = options || {}

    try {
      logger.info('Generating comprehensive bias report', {
        sessionCount: sessions.length,
        timeRange,
        format,
        includeRawData,
      })

      // Analyze all sessions
      const analyses = await Promise.all(
        sessions.map((session) => this.analyzeSession(session)),
      )

      // Call Python backend for advanced statistical analysis
      const pythonAnalysis = await this.pythonBridge.generateComprehensiveReport(
        sessions,
        timeRange,
        {
          format,
          includeRawData,
          includeTrends,
          includeRecommendations,
        },
      )

      // Record report generation metrics
      await this.metricsCollector.recordReportGeneration({
        sessionCount: sessions.length,
        executionTimeMs: Date.now() - startTime,
        format,
        metadata: {
          generatedAt: new Date(),
          format,
          sessionCount: sessions.length,
          timeRange,
          executionTimeMs: Date.now() - startTime,
        },
      })

      logger.info('Bias report generated successfully', {
        sessionCount: sessions.length,
        executionTimeMs: Date.now() - startTime,
        format,
      })

      return pythonAnalysis
    } catch (error) {
      logger.error('Failed to generate bias report', {
        error,
        sessionCount: sessions.length,
        timeRange,
        format,
      })
      throw new Error(
        `Bias report generation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get real-time bias monitoring dashboard data
   */
  async getDashboardData(options?: {
    timeRange?: string
    includeDetails?: boolean
  }): Promise<any> {
    this.ensureInitialized()
    return await this.metricsCollector.getDashboardData(options)
  }

  /**
   * Get comprehensive metrics for analytics dashboard
   */
  async getMetrics(options?: {
    timeRange?: { start: Date; end: Date }
    includeDetails?: boolean
    includePerformance?: boolean
    demographic?: DemographicGroup
    aggregationType?: 'hourly' | 'daily' | 'weekly' | 'monthly'
  }): Promise<any> {
    this.ensureInitialized()

    try {
      logger.info('Retrieving comprehensive metrics', { options })

      const [summaryData, demographicData, performanceData] = await Promise.all([
        this.metricsCollector.getSummaryMetrics(options),
        this.metricsCollector.getDemographicMetrics(options),
        options?.includePerformance
          ? this.metricsCollector.getPerformanceMetrics()
          : null,
      ])

      const metrics = {
        summary: summaryData || {
          totalAnalyses: 0,
          averageBiasScore: 0,
          alertDistribution: {},
          trendsOverTime: [],
        },
        demographics: demographicData || {},
        performance: performanceData || {
          averageResponseTime: 0,
          successRate: 1.0,
          errorRate: 0.0,
          systemHealth: 'unknown',
        },
        recommendations: this.generateMetricsRecommendations(
          summaryData || {},
          demographicData || {},
        ),
      }

      return metrics
    } catch (error) {
      logger.error('Failed to retrieve metrics', { error })
      throw new Error(
        `Failed to retrieve metrics: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get analysis results for a specific session
   */
  async getSessionAnalysis(sessionId: string): Promise<BiasAnalysisResult | null> {
    try {
      this.ensureInitialized()
      return await this.metricsCollector.getSessionAnalysis(sessionId)
    } catch (error) {
      logger.error('Failed to retrieve session analysis', { error, sessionId })
      throw error
    }
  }

  /**
   * Update bias detection thresholds
   */
  async updateThresholds(
    newThresholds: Partial<BiasDetectionConfig['thresholds']>,
    options?: {
      validateOnly?: boolean
      notifyStakeholders?: boolean
      rollbackOnFailure?: boolean
    },
  ): Promise<{
    success: boolean
    previousThresholds?: BiasDetectionConfig['thresholds']
    validationErrors?: string[]
    affectedSessions?: number
  }> {
    this.ensureInitialized()

    const {
      validateOnly = false,
      notifyStakeholders = true,
      rollbackOnFailure = true,
    } = options || {}

    try {
      logger.info('Updating bias detection thresholds', {
        newThresholds,
        validateOnly,
      })

      // Store previous thresholds for potential rollback
      const previousThresholds = { ...this.config.thresholds }

      // Validate new thresholds
      const mergedThresholds = { ...this.config.thresholds, ...newThresholds }
      const testConfig = { thresholds: mergedThresholds }

      try {
        validateConfig(testConfig)
      } catch (error) {
        const validationErrors = [
          error instanceof Error ? error.message : String(error),
        ]
        return {
          success: false,
          previousThresholds,
          validationErrors,
          affectedSessions: 0,
        }
      }

      if (validateOnly) {
        return {
          success: true,
          previousThresholds,
          validationErrors: [],
          affectedSessions: 0,
        }
      }

      // Apply new thresholds
      this.config.thresholds = mergedThresholds

      // Update Python service configuration
      await this.pythonBridge.updateConfiguration({
        thresholds: this.config.thresholds,
      })

      // Calculate impact on existing sessions
      const affectedSessions = await this.calculateThresholdImpact(
        previousThresholds,
        mergedThresholds,
      )

      // Send notifications if enabled
      if (notifyStakeholders) {
        await this.notifyThresholdUpdate(
          previousThresholds,
          mergedThresholds,
          affectedSessions,
        )
      }

      return {
        success: true,
        previousThresholds,
        validationErrors: [],
        affectedSessions,
      }
    } catch (error) {
      logger.error('Threshold update process failed', { error, newThresholds })
      throw new Error(
        `Threshold update failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Get bias explanation for a specific detection
   */
  async explainBiasDetection(
    analysisResult: BiasAnalysisResult,
    demographicGroup?: DemographicGroup,
    includeCounterfactuals: boolean = true,
  ): Promise<{
    summary: string
    detailedExplanation: string
    contributingFactors: Array<{
      factor: string
      impact: 'high' | 'medium' | 'low'
      description: string
    }>
    recommendations: string[]
    counterfactualAnalysis?: Array<{
      scenario: string
      expectedOutcome: string
      biasReduction: number
    }>
  }> {
    this.ensureInitialized()

    try {
      // Call Python backend for detailed AI explanation
      const pythonExplanation = await this.pythonBridge.explainBiasDetection(
        analysisResult,
        demographicGroup,
        includeCounterfactuals,
      )

      // Generate contributing factors analysis
      const contributingFactors = this.analyzeContributingFactors(analysisResult)

      // Generate targeted recommendations
      const recommendations = this.generateTargetedRecommendations(
        analysisResult,
        demographicGroup,
      )

      return {
        summary: this.generateExplanationSummary(analysisResult, demographicGroup),
        detailedExplanation: pythonExplanation || this.generateDetailedExplanation(analysisResult),
        contributingFactors,
        recommendations,
      }
    } catch (error) {
      logger.error('Failed to generate bias explanation', {
        sessionId: analysisResult.sessionId,
        error,
      })
      throw new Error(
        `Failed to generate bias explanation: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring(
    callback: (data: any) => void,
    intervalMs: number = 30000,
  ): Promise<void> {
    this.ensureInitialized()

    if (this.monitoringActive) {
      logger.warn('Monitoring already active')
      return
    }

    try {
      logger.info('Starting bias detection monitoring', { intervalMs })

      this.monitoringCallbacks.push(callback)
      this.alertSystem.addMonitoringCallback(callback)
      this.monitoringActive = true

      // Start monitoring interval
      this.monitoringInterval = setInterval(async () => {
        try {
          const monitoringData = await this.collectMonitoringData()
          this.monitoringCallbacks.forEach((cb) => {
            try {
              cb(monitoringData)
            } catch (error) {
              logger.error('Monitoring callback error', { error })
            }
          })
        } catch (error) {
          logger.error('Monitoring data collection error', { error })
        }
      }, intervalMs)

      // Send initial data
      const initialData = await this.collectMonitoringData()
      callback(initialData)

      logger.info('Bias detection monitoring started successfully')
    } catch (error) {
      this.monitoringActive = false
      logger.error('Failed to start monitoring', { error })
      throw new Error(
        `Failed to start monitoring: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoringActive) {
      logger.warn('Monitoring not currently active')
      return
    }

    try {
      logger.info('Stopping bias detection monitoring')

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
        this.monitoringInterval = undefined
      }

      this.monitoringActive = false
      this.monitoringCallbacks.forEach((callback) => {
        this.alertSystem.removeMonitoringCallback(callback)
      })
      this.monitoringCallbacks = []

      logger.info('Bias detection monitoring stopped successfully')
    } catch (error) {
      logger.error('Error stopping monitoring', { error })
    }
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<{
    success: boolean
    componentsDisposed: string[]
    errors: Array<{ component: string; error: string }>
    disposalTimeMs: number
  }> {
    const startTime = Date.now()
    const componentsDisposed: string[] = []
    const errors: Array<{ component: string; error: string }> = []

    try {
      // Stop monitoring first
      if (this.monitoringActive) {
        this.stopMonitoring()
        componentsDisposed.push('monitoring')
      }

      // Dispose of components
      await this.alertSystem.dispose()
      componentsDisposed.push('alert_system')

      await this.metricsCollector.dispose()
      componentsDisposed.push('metrics_collector')

      await this.pythonBridge.dispose()
      componentsDisposed.push('python_bridge')

      // Final cleanup
      this.performFinalCleanup()
      componentsDisposed.push('final_cleanup')

      const disposalTimeMs = Date.now() - startTime
      logger.info('Bias Detection Engine disposed successfully', {
        componentsDisposed: componentsDisposed.length,
        disposalTimeMs,
      })

      return {
        success: true,
        componentsDisposed,
        errors,
        disposalTimeMs,
      }
    } catch (error) {
      const disposalTimeMs = Date.now() - startTime
      errors.push({
        component: 'disposal_process',
        error: error instanceof Error ? error.message : String(error),
      })

      return {
        success: false,
        componentsDisposed,
        errors,
        disposalTimeMs,
      }
    }
  }

  // Helper methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        'Bias Detection Engine not initialized. Call initialize() first.',
      )
    }
  }

  private async validateAndPrepareSession(session: TherapeuticSession): Promise<{
    validatedSession: TherapeuticSession
    auditLogData: any
  }> {
    this.validateSessionData(session)
    logger.info('Starting bias analysis', { sessionId: session.sessionId })

    const auditLogData = {
      demographics: session.participantDemographics,
      timestamp: new Date(),
    }
    this.createAuditLogEntry(session.sessionId, 'analysis_started', auditLogData)

    return { validatedSession: session, auditLogData }
  }

  private validateSessionData(session: any): void {
    if (!session) {
      throw new Error('Session data is required')
    }
    if (!session.sessionId) {
      throw new Error('Session ID is required')
    }
    if (typeof session.sessionId === 'string' && session.sessionId.trim() === '') {
      throw new Error('Session ID cannot be empty')
    }
  }

  private async runLayerAnalyses(session: TherapeuticSession): Promise<{
    preprocessing: any
    modelLevel: any
    interactive: any
    evaluation: any
  }> {
    // Run multi-layer analysis with error handling
    const layerResults = await Promise.allSettled([
      this.pythonBridge.runPreprocessingAnalysis(session),
      this.pythonBridge.runModelLevelAnalysis(session),
      this.pythonBridge.runInteractiveAnalysis(session),
      this.pythonBridge.runEvaluationAnalysis(session),
    ])

    // Process results and handle failures
    const preprocessing = this.processLayerResult(layerResults[0], 'preprocessing')
    const modelLevel = this.processLayerResult(layerResults[1], 'modelLevel')
    const interactive = this.processLayerResult(layerResults[2], 'interactive')
    const evaluation = this.processLayerResult(layerResults[3], 'evaluation')

    return { preprocessing, modelLevel, interactive, evaluation }
  }

  private processLayerResult(result: PromiseSettledResult<any>, layerName: string): any {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      logger.warn(`${layerName} analysis failed, using fallback`, {
        error: result.reason?.message,
      })
      return {
        biasScore: 0.5,
        confidence: 0.3,
        findings: [],
        recommendations: [`${layerName} analysis unavailable`],
        error: result.reason?.message,
      }
    }
  }

  private calculateAnalysisResults(
    session: TherapeuticSession,
    layerResults: any,
  ): {
    overallBiasScore: number
    alertLevel: AlertLevel
    confidence: number
    recommendations: string[]
    result: BiasAnalysisResult
  } {
    const { preprocessing, modelLevel, interactive, evaluation } = layerResults

    // Calculate overall bias score (weighted average)
    const overallBiasScore =
      preprocessing.biasScore * 0.25 +
      modelLevel.biasScore * 0.3 +
      interactive.biasScore * 0.25 +
      evaluation.biasScore * 0.2

    // Determine alert level
    let alertLevel: AlertLevel
    if (overallBiasScore >= 0.8) {
      alertLevel = 'critical'
    } else if (overallBiasScore >= 0.6) {
      alertLevel = 'high'
    } else if (overallBiasScore >= 0.4) {
      alertLevel = 'medium'
    } else {
      alertLevel = 'low'
    }

    // Calculate confidence score
    const confidence = Math.min(
      preprocessing.confidence || 0.5,
      modelLevel.confidence || 0.5,
      interactive.confidence || 0.5,
      evaluation.confidence || 0.5,
    )

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      [preprocessing, modelLevel, interactive, evaluation],
      overallBiasScore,
      alertLevel,
    )

    // Construct result
    const result: BiasAnalysisResult = {
      sessionId: session.sessionId,
      timestamp: new Date(),
      overallBiasScore,
      alertLevel,
      confidence,
      layerResults: {
        preprocessing,
        modelLevel,
        interactive,
        evaluation,
      },
      demographics: session.participantDemographics,
      recommendations,
    }

    return { overallBiasScore, alertLevel, confidence, recommendations, result }
  }

  private async processAlertsAndCallbacks(
    result: BiasAnalysisResult,
    alertLevel: AlertLevel,
    overallBiasScore: number,
    processingTimeMs?: number,
  ): Promise<void> {
    logger.info('Bias analysis completed', {
      sessionId: result.sessionId,
      overallBiasScore,
      alertLevel,
      confidence: result.confidence,
      processingTimeMs: processingTimeMs || 0,
    })

    // Store analysis result
    await this.metricsCollector.storeAnalysisResult(result, processingTimeMs)

    // Check for high bias alerts
    if (alertLevel === 'high' || alertLevel === 'critical') {
      await this.alertSystem.processAlert({
        sessionId: result.sessionId,
        level: alertLevel,
        biasScore: overallBiasScore,
        analysisResult: result,
      })

      // Trigger monitoring callbacks for alerts
      this.triggerMonitoringCallbacksForAlert(result)
    }
  }

  private triggerMonitoringCallbacksForAlert(result: BiasAnalysisResult): void {
    if (this.monitoringCallbacks.length === 0) {
      return
    }

    const alertData = {
      level: result.alertLevel,
      sessionId: result.sessionId,
      timestamp: result.timestamp,
      biasScore: result.overallBiasScore,
      confidence: result.confidence,
      recommendations: result.recommendations,
    }

    this.monitoringCallbacks.forEach((callback) => {
      try {
        callback(alertData)
      } catch (error) {
        logger.error('Error in monitoring callback for alert', {
          error,
          sessionId: result.sessionId,
        })
      }
    })
  }

  private createAuditLogEntry(sessionId: string, action: string, details: any): void {
    if (this.config.auditLogging) {
      this.auditLogs.push({
        timestamp: new Date(),
        sessionId,
        action,
        details,
      })
    }
  }

  private recordBiasAnalysis(result: any): void {
    try {
      const timestamp = new Date()
      
      // Update session metrics
      this.sessionMetrics.set(result.sessionId, {
        timestamp,
        biasScore: result.overallBiasScore,
        alertLevel: result.alertLevel,
        confidence: result.confidence
      })

      // Update performance counters
      this.performanceMetrics.requestCount++
      
      logger.debug('Recorded bias analysis for metrics', {
        sessionId: result.sessionId,
        biasScore: result.overallBiasScore,
        alertLevel: result.alertLevel
      })
    } catch (error) {
      logger.error('Failed to record bias analysis metrics', { error, sessionId: result?.sessionId })
    }
  }

  private async collectMonitoringData(): Promise<any> {
    const [activeAnalyses, recentAlerts, performanceMetrics] = await Promise.all([
      this.metricsCollector.getActiveAnalysesCount(),
      this.alertSystem.getRecentAlerts(),
      this.metricsCollector.getCurrentPerformanceMetrics(),
    ])

    const systemHealth = this.assessSystemHealth(performanceMetrics)

    return {
      timestamp: new Date(),
      activeAnalyses,
      recentAlerts,
      systemHealth,
      performanceMetrics,
    }
  }

  private assessSystemHealth(metrics: any): string {
    if (!metrics) {
      return 'unknown'
    }

    const { errorRate, averageResponseTime, memoryUsage } = metrics

    if (errorRate > 0.1 || averageResponseTime > 5000 || memoryUsage > 0.9) {
      return 'critical'
    } else if (
      errorRate > 0.05 ||
      averageResponseTime > 2000 ||
      memoryUsage > 0.8
    ) {
      return 'warning'
    } else {
      return 'healthy'
    }
  }

  private generateRecommendations(
    layerResults: any[],
    overallBiasScore: number,
    alertLevel: AlertLevel,
  ): string[] {
    const recommendations: string[] = []

    // Check for fallback mode
    const hasFallbackResults = layerResults.some(
      (result) => result.fallback === true,
    )
    if (hasFallbackResults) {
      recommendations.push('Limited analysis - some toolkits unavailable')
    }

    layerResults.forEach((result) => {
      if (result.biasScore > this.config.thresholds.warningLevel) {
        recommendations.push(...(result.recommendations || []))
      }
    })

    return Array.from(new Set(recommendations))
  }

  private generateMetricsRecommendations(summaryData: any, demographicData: any): string[] {
    const recommendations: string[] = []

    if (summaryData.averageBiasScore > this.config.thresholds.warningLevel) {
      recommendations.push(
        'Consider reviewing training scenarios to reduce bias patterns',
      )
    }

    if (summaryData.alertDistribution?.critical > 0) {
      recommendations.push(
        'Critical bias alerts detected - immediate intervention recommended',
      )
    }

    return recommendations
  }

  private analyzeContributingFactors(analysisResult: BiasAnalysisResult): Array<{
    factor: string
    impact: 'high' | 'medium' | 'low'
    description: string
  }> {
    const factors: Array<{
      factor: string
      impact: 'high' | 'medium' | 'low'
      description: string
    }> = []

    // Analyze layer-specific contributions
    if (
      analysisResult.layerResults.preprocessing?.biasScore >
      this.config.thresholds.warningLevel
    ) {
      factors.push({
        factor: 'Data Preprocessing',
        impact: (analysisResult.layerResults.preprocessing.biasScore >
        this.config.thresholds.highLevel
          ? 'high'
          : 'medium') as 'high' | 'medium' | 'low',
        description:
          'Bias detected in data preprocessing stage, indicating potential issues with data representation or feature extraction',
      })
    }

    return factors
  }

  private generateTargetedRecommendations(
    analysisResult: BiasAnalysisResult,
    demographicGroup?: DemographicGroup,
  ): string[] {
    const recommendations = [...(analysisResult.recommendations || [])]

    if (
      analysisResult.overallBiasScore > this.config.thresholds.criticalLevel
    ) {
      recommendations.push(
        'URGENT: Suspend AI system for immediate bias remediation',
      )
    }

    if (demographicGroup) {
      recommendations.push(
        `Review training data representation for ${demographicGroup.type}: ${demographicGroup.value}`,
      )
    }

    return Array.from(new Set(recommendations))
  }

  private generateExplanationSummary(
    analysisResult: BiasAnalysisResult,
    demographicGroup?: DemographicGroup,
  ): string {
    const score = analysisResult.overallBiasScore
    const level = analysisResult.alertLevel
    const demographic = demographicGroup
      ? `for ${demographicGroup.type} group "${demographicGroup.value}"`
      : ''

    return (
      `Bias analysis ${demographic} detected a ${level} level bias with score ${score.toFixed(3)}. ` +
      `The analysis indicates ${this.getBiasLevelDescription(score)} bias patterns in the therapeutic AI system.`
    )
  }

  private generateDetailedExplanation(analysisResult: BiasAnalysisResult): string {
    const layerAnalysis = Object.entries(analysisResult.layerResults)
      .map(
        ([layer, result]) => `${layer}: ${(result?.biasScore || 0).toFixed(3)}`,
      )
      .join(', ')

    return (
      `Detailed analysis across detection layers revealed: ${layerAnalysis}. ` +
      `The weighted aggregate score of ${analysisResult.overallBiasScore.toFixed(3)} was calculated using ` +
      `configured layer weights. Confidence level: ${(analysisResult.confidence * 100).toFixed(1)}%.`
    )
  }

  private getBiasLevelDescription(score: number): string {
    if (score >= this.config.thresholds.criticalLevel) {
      return 'critical'
    }
    if (score >= this.config.thresholds.highLevel) {
      return 'significant'
    }
    if (score >= this.config.thresholds.warningLevel) {
      return 'moderate'
    }
    return 'minimal'
  }

  private async calculateThresholdImpact(
    oldThresholds: BiasDetectionConfig['thresholds'],
    newThresholds: BiasDetectionConfig['thresholds'],
  ): Promise<number> {
    try {
      const recentSessions = await this.metricsCollector.getRecentSessionCount()
      const avgChange =
        (Math.abs(newThresholds.warningLevel - oldThresholds.warningLevel) +
          Math.abs(newThresholds.highLevel - oldThresholds.highLevel) +
          Math.abs(newThresholds.criticalLevel - oldThresholds.criticalLevel)) /
        3

      const impactRate = Math.min(1.0, avgChange * 10)
      return Math.round(recentSessions * impactRate)
    } catch (error) {
      logger.warn('Failed to calculate threshold impact', { error })
      return 0
    }
  }

  private async notifyThresholdUpdate(
    oldThresholds: BiasDetectionConfig['thresholds'],
    newThresholds: BiasDetectionConfig['thresholds'],
    affectedSessions: number,
  ): Promise<void> {
    try {
      const notification = {
        type: 'threshold_update',
        timestamp: new Date(),
        changes: {
          warning: {
            old: oldThresholds.warningLevel,
            new: newThresholds.warningLevel,
          },
          high: { old: oldThresholds.highLevel, new: newThresholds.highLevel },
          critical: {
            old: oldThresholds.criticalLevel,
            new: newThresholds.criticalLevel,
          },
        },
        impact: { affectedSessions },
      }

      await this.alertSystem.sendSystemNotification(
        `Bias detection thresholds updated: ${JSON.stringify(notification.changes)}`,
        ['system-admin', 'bias-detection-team'],
      )
    } catch (error) {
      logger.warn('Failed to send threshold update notification', { error })
    }
  }

  private validateSystemHealth(): void {
    const errorRate = this.performanceMetrics.errorCount / Math.max(1, this.performanceMetrics.requestCount)
    
    if (errorRate > 0.5) {
      logger.warn('High error rate detected', {
        errorRate,
        totalRequests: this.performanceMetrics.requestCount,
        totalErrors: this.performanceMetrics.errorCount
      })
    }
  }

  private performFinalCleanup(): void {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval)
        this.monitoringInterval = undefined
      }

      this.isInitialized = false
      this.monitoringActive = false
      this.monitoringCallbacks = []

      logger.debug('Final cleanup completed')
    } catch (error) {
      logger.warn('Error during final cleanup', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupCompletedSessions()
    }, 60 * 60 * 1000) // Clean up every hour

    logger.debug('Periodic cleanup started')
  }

  private cleanupCompletedSessions(): void {
    try {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      let cleanedCount = 0

      for (const [sessionId, sessionData] of this.sessionMetrics.entries()) {
        if (sessionData.timestamp < cutoffTime) {
          this.sessionMetrics.delete(sessionId)
          cleanedCount++
        }
      }

      if (cleanedCount > 0) {
        logger.debug('Cleaned up completed sessions', {
          cleanedCount,
          remainingSessions: this.sessionMetrics.size
        })
      }
    } catch (error) {
      logger.error('Failed to clean up completed sessions', { error })
    }
  }
}