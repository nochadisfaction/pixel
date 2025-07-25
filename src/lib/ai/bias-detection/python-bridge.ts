/**
 * Python Bias Detection Service Bridge
 * 
 * Handles communication with the Python Flask service for bias detection analysis.
 * Extracted from BiasDetectionEngine.ts for better separation of concerns.
 */

import { getLogger } from '../../utils/logger'
import type {
  TherapeuticSession,
  PreprocessingAnalysisResult,
  ModelLevelAnalysisResult,
  InteractiveAnalysisResult,
  EvaluationAnalysisResult,
  BiasReport,
  BiasDetectionConfig,
  BiasAnalysisResult,
  DemographicGroup,
} from './types'
import type {
  PythonSessionData,
  PythonAnalysisResult,
  PythonHealthResponse,
  MetricData,
  MetricsBatchResponse,
  DashboardOptions,
  DashboardMetrics,
  PerformanceMetrics,
  AlertData,
  AlertRegistration,
  AlertResponse,
  AlertAcknowledgment,
  AlertEscalation,
  AlertStatistics,
  NotificationData,
  SystemNotificationData,
  TimeRange,
  ReportGenerationOptions,
  FallbackAnalysisResult,
  AlertLevel,
} from './bias-detection-interfaces'

const logger = getLogger('PythonBiasDetectionBridge')

/**
 * Production HTTP client for Python Bias Detection Service
 * Connects to Flask service running on localhost:5000 (configurable)
 */
export class PythonBiasDetectionBridge {
  private baseUrl: string
  private timeout: number
  private authToken?: string | undefined
  private retryAttempts: number = 3
  private retryDelay: number = 1000 // ms

  constructor(
    public url: string = 'http://localhost:5000',
    public timeoutMs: number = 30000,
  ) {
    this.baseUrl = url.replace(/\/$/, '') // Remove trailing slash
    this.timeout = timeoutMs
    this.authToken = process.env['BIAS_DETECTION_AUTH_TOKEN']
  }

  async initialize(): Promise<void> {
    try {
      // Check service health
      const response = await this.makeRequest('/health', 'GET') as PythonHealthResponse
      if (response.status !== 'healthy') {
        throw new Error(`Python service not healthy: ${response.message || 'Unknown error'}`)
      }
      logger.info('PythonBiasDetectionBridge initialized successfully', {
        serviceUrl: this.baseUrl,
        serviceStatus: response.status,
      })
    } catch (error) {
      logger.error('Failed to initialize PythonBiasDetectionBridge', { error })
      throw new Error(
        `Python service initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    data?: unknown,
  ): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Pixelated-Empathy-TypeScript-Client/1.0',
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    }

    if (data && method === 'POST') {
      fetchOptions.body = JSON.stringify(data)
    }

    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        logger.debug(
          `Making request to ${url} (attempt ${attempt}/${this.retryAttempts})`,
        )

        const response = await fetch(url, fetchOptions)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const result = await response.json()
        logger.debug(`Request successful: ${method} ${endpoint}`)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        logger.warn(`Request attempt ${attempt} failed: ${lastError.message}`, {
          url,
          method,
          attempt,
          error: lastError.message,
        })

        if (attempt < this.retryAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.retryDelay * attempt),
          )
        }
      }
    }

    throw new Error(
      `Request failed after ${this.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`,
    )
  }

  async runPreprocessingAnalysis(sessionData: TherapeuticSession): Promise<PreprocessingAnalysisResult> {
    try {
      const result = await this.analyze_session(sessionData) as PythonAnalysisResult
      const layerResult = result.layer_results?.preprocessing

      if (layerResult) {
        // Map Python response structure to TypeScript expectations
        return {
          biasScore: layerResult.bias_score,
          linguisticBias: {
            genderBiasScore: layerResult.metrics?.linguistic_bias?.gender_bias_score || layerResult.bias_score * 0.5,
            racialBiasScore: layerResult.metrics?.linguistic_bias?.racial_bias_score || layerResult.bias_score * 0.4,
            ageBiasScore: layerResult.metrics?.linguistic_bias?.age_bias_score || layerResult.bias_score * 0.3,
            culturalBiasScore: layerResult.metrics?.linguistic_bias?.cultural_bias_score || layerResult.bias_score * 0.4,
            biasedTerms: [],
            sentimentAnalysis: {
              overallSentiment: 0.5,
              emotionalValence: 0.5,
              subjectivity: 0.5,
              demographicVariations: {}
            }
          },
          representationAnalysis: {
            demographicDistribution: {},
            underrepresentedGroups: [],
            overrepresentedGroups: [],
            diversityIndex: 0.5,
            intersectionalityAnalysis: []
          },
          dataQualityMetrics: {
            completeness: 0.8,
            consistency: 0.8,
            accuracy: 0.8,
            timeliness: 0.8,
            validity: 0.8,
            missingDataByDemographic: {}
          },
          recommendations: layerResult.recommendations || [],
        }
      }

      // Fallback for missing layer result
      return {
        biasScore: result.overall_bias_score * 0.8,
        linguisticBias: {
          genderBiasScore: result.overall_bias_score * 0.5,
          racialBiasScore: result.overall_bias_score * 0.4,
          ageBiasScore: result.overall_bias_score * 0.3,
          culturalBiasScore: result.overall_bias_score * 0.4,
          biasedTerms: [],
          sentimentAnalysis: {
            overallSentiment: 0.5,
            emotionalValence: 0.5,
            subjectivity: 0.5,
            demographicVariations: {}
          }
        },
        representationAnalysis: {
          demographicDistribution: {},
          underrepresentedGroups: [],
          overrepresentedGroups: [],
          diversityIndex: 0.5,
          intersectionalityAnalysis: []
        },
        dataQualityMetrics: {
          completeness: 0.8,
          consistency: 0.8,
          accuracy: 0.8,
          timeliness: 0.8,
          validity: 0.8,
          missingDataByDemographic: {}
        },
        recommendations: [],
      }
    } catch (error) {
      logger.error('Preprocessing analysis failed', {
        error,
        sessionId: sessionData?.sessionId,
      })
      throw error
    }
  }

  async runModelLevelAnalysis(sessionData: TherapeuticSession): Promise<ModelLevelAnalysisResult> {
    try {
      const result = await this.analyze_session(sessionData) as PythonAnalysisResult
      const layerResult = result.layer_results?.model_level

      if (layerResult) {
        // Map Python response structure to TypeScript expectations
        return {
          biasScore: layerResult.bias_score,
          fairnessMetrics: {
            demographicParity: layerResult.metrics?.fairness?.demographic_parity || 0.75,
            equalizedOdds: layerResult.metrics?.fairness?.equalized_odds || 0.8,
            equalOpportunity: layerResult.metrics?.fairness?.equal_opportunity || 0.8,
            calibration: layerResult.metrics?.fairness?.calibration || 0.8,
            individualFairness: layerResult.metrics?.fairness?.individual_fairness || 0.8,
            counterfactualFairness: layerResult.metrics?.fairness?.counterfactual_fairness || 0.8,
          },
          performanceMetrics: {
            accuracy: 0.8,
            precision: 0.8,
            recall: 0.8,
            f1Score: 0.8,
            auc: 0.8,
            calibrationError: 0.1,
            demographicBreakdown: {}
          },
          groupPerformanceComparison: [],
          recommendations: layerResult.recommendations || [],
        }
      }

      // Fallback for missing layer result
      return {
        biasScore: result.overall_bias_score * 1.1,
        fairnessMetrics: {
          demographicParity: 0.75,
          equalizedOdds: 0.8,
          equalOpportunity: 0.8,
          calibration: 0.8,
          individualFairness: 0.8,
          counterfactualFairness: 0.8,
        },
        performanceMetrics: {
          accuracy: 0.8,
          precision: 0.8,
          recall: 0.8,
          f1Score: 0.8,
          auc: 0.8,
          calibrationError: 0.1,
          demographicBreakdown: {}
        },
        groupPerformanceComparison: [],
        recommendations: [],
      }
    } catch (error) {
      logger.error('Model-level analysis failed', {
        error,
        sessionId: sessionData?.sessionId,
      })
      throw error
    }
  }

  async runInteractiveAnalysis(sessionData: TherapeuticSession): Promise<InteractiveAnalysisResult> {
    try {
      const result = await this.analyze_session(sessionData) as PythonAnalysisResult
      const layerResult = result.layer_results?.interactive

      if (layerResult) {
        // Map Python response structure to TypeScript expectations
        return {
          biasScore: layerResult.bias_score,
          counterfactualAnalysis: {
            scenariosAnalyzed: layerResult.metrics?.interaction_patterns?.pattern_consistency || 3,
            biasDetected: layerResult.bias_score > 0.5,
            consistencyScore: Math.max(0.15, (1 - layerResult.bias_score) * 0.2),
            problematicScenarios: [],
          },
          featureImportance: [],
          whatIfScenarios: [],
          recommendations: layerResult.recommendations || [],
        }
      }

      // Fallback for missing layer result
      return {
        biasScore: result.overall_bias_score * 0.9,
        counterfactualAnalysis: {
          scenariosAnalyzed: 3,
          biasDetected: result.overall_bias_score > 0.5,
          consistencyScore: 0.15,
          problematicScenarios: [],
        },
        featureImportance: [],
        whatIfScenarios: [],
        recommendations: [],
      }
    } catch (error) {
      logger.error('Interactive analysis failed', {
        error,
        sessionId: sessionData?.sessionId,
      })
      throw error
    }
  }

  async runEvaluationAnalysis(sessionData: TherapeuticSession): Promise<EvaluationAnalysisResult> {
    try {
      const result = await this.analyze_session(sessionData) as PythonAnalysisResult
      const layerResult = result.layer_results?.evaluation

      if (layerResult) {
        // Map Python response structure to TypeScript expectations
        return {
          biasScore: layerResult.bias_score,
          huggingFaceMetrics: {
            toxicity: layerResult.metrics?.performance_disparities?.bias_score || 0.05,
            bias: layerResult.bias_score,
            regard: {},
            stereotype: layerResult.bias_score * 0.8,
            fairness: 1 - layerResult.bias_score,
          },
          customMetrics: {
            therapeuticBias: layerResult.bias_score * 0.9,
            culturalSensitivity: 1 - layerResult.bias_score * 0.7,
            professionalEthics: 1 - layerResult.bias_score * 0.8,
            patientSafety: 1 - layerResult.bias_score * 0.6,
          },
          temporalAnalysis: {
            trendDirection: 'stable',
            changeRate: 0,
            seasonalPatterns: [],
            interventionEffectiveness: [],
          },
          recommendations: layerResult.recommendations || [],
        }
      }

      // Fallback for missing layer result
      return {
        biasScore: result.overall_bias_score * 1.0,
        huggingFaceMetrics: {
          toxicity: 0.05,
          bias: result.overall_bias_score,
          regard: {},
          stereotype: result.overall_bias_score * 0.8,
          fairness: 1 - result.overall_bias_score,
        },
        customMetrics: {
          therapeuticBias: result.overall_bias_score * 0.9,
          culturalSensitivity: 1 - result.overall_bias_score * 0.7,
          professionalEthics: 1 - result.overall_bias_score * 0.8,
          patientSafety: 1 - result.overall_bias_score * 0.6,
        },
        temporalAnalysis: {
          trendDirection: 'stable',
          changeRate: 0,
          seasonalPatterns: [],
          interventionEffectiveness: [],
        },
        recommendations: [],
      }
    } catch (error) {
      logger.error('Evaluation analysis failed', {
        error,
        sessionId: sessionData?.sessionId,
      })
      throw error
    }
  }

  async generateComprehensiveReport(
    sessions: TherapeuticSession[],
    timeRange: TimeRange,
    options: ReportGenerationOptions,
  ): Promise<BiasReport> {
    try {
      const requestData = {
        sessions: sessions.map((session) => ({
          session_id: session.sessionId,
          participant_demographics: session.participantDemographics,
          training_scenario: session.scenario,
          content: session.content,
          ai_responses: session.aiResponses || [],
          expected_outcomes: session.expectedOutcomes || [],
          transcripts: session.transcripts || [],
          metadata: session.metadata || {},
        })),
        time_range: timeRange,
        options: {
          format: options?.format || 'json',
          include_raw_data: options?.includeRawData || false,
          include_trends: options?.includeTrends || true,
          include_recommendations: options?.includeRecommendations || true,
        },
      }

      return await this.makeRequest('/export', 'POST', requestData) as BiasReport
    } catch (error) {
      logger.error('Report generation failed', {
        error,
        sessionCount: sessions.length,
      })
      throw error
    }
  }

  async updateConfiguration(config: Partial<BiasDetectionConfig>): Promise<void> {
    try {
      await this.makeRequest('/config', 'POST', config)
      logger.info('Python service configuration updated successfully')
    } catch (error) {
      logger.error('Configuration update failed', { error })
      throw error
    }
  }

  async explainBiasDetection(
    result: BiasAnalysisResult,
    demographic?: DemographicGroup,
    includeCounterfactuals: boolean = true,
  ): Promise<unknown> {
    try {
      const requestData = {
        analysis_result: result,
        demographic_group: demographic,
        include_counterfactuals: includeCounterfactuals,
      }

      return await this.makeRequest('/explain', 'POST', requestData)
    } catch (error) {
      logger.error('Bias explanation failed', { error })
      throw error
    }
  }

  async analyze_session(sessionData: TherapeuticSession): Promise<PythonAnalysisResult> {
    try {
      // Convert TypeScript session format to Python service format
      const requestData: PythonSessionData = {
        session_id: sessionData.sessionId,
        participant_demographics: sessionData.participantDemographics || {},
        training_scenario: (sessionData.scenario as unknown as Record<string, unknown>) || {},
        content: sessionData.content || {},
        ai_responses: sessionData.aiResponses || [],
        expected_outcomes: sessionData.expectedOutcomes || [],
        transcripts: sessionData.transcripts || [],
        metadata: {
          ...sessionData.metadata,
          timestamp: new Date().toISOString(),
          client: 'typescript-engine',
          analysis_layers: ['preprocessing', 'model_level', 'interactive', 'evaluation'],
        },
      }

      const result = await this.makeRequest('/analyze', 'POST', requestData) as PythonAnalysisResult

      // Ensure result has expected structure
      const normalizedResult: PythonAnalysisResult = {
        overall_bias_score: result.overall_bias_score || 0.5,
        confidence: result.confidence || 0.7,
        alert_level: result.alert_level || this.calculateAlertLevel(result.overall_bias_score || 0.5),
        layer_results: result.layer_results || {
          preprocessing: { bias_score: 0.4, metrics: {}, detected_biases: [], recommendations: [], layer: 'preprocessing' },
          model_level: { bias_score: 0.5, metrics: {}, detected_biases: [], recommendations: [], layer: 'model_level' },
          interactive: { bias_score: 0.6, metrics: {}, detected_biases: [], recommendations: [], layer: 'interactive' },
          evaluation: { bias_score: 0.3, metrics: {}, detected_biases: [], recommendations: [], layer: 'evaluation' }
        },
        recommendations: result.recommendations || [],
        timestamp: new Date().toISOString(),
        session_id: sessionData.sessionId
      }

      logger.info('Session analysis completed', {
        sessionId: sessionData.sessionId,
        biasScore: normalizedResult.overall_bias_score,
        alertLevel: normalizedResult.alert_level,
      })

      return normalizedResult
    } catch (error) {
      logger.error('Session analysis failed', {
        error,
        sessionId: sessionData?.sessionId,
      })
      
      // Return fallback analysis result instead of throwing
      return this.generateFallbackAnalysisResult(sessionData, error)
    }
  }

  private calculateAlertLevel(biasScore: number): string {
    if (biasScore >= 0.8) {
      return 'critical'
    }
    if (biasScore >= 0.6) {
      return 'high'
    }
    if (biasScore >= 0.4) {
      return 'medium'
    }
    return 'low'
  }

  private generateFallbackAnalysisResult(sessionData: TherapeuticSession | unknown, error: Error | unknown): FallbackAnalysisResult {
    logger.warn('Generating fallback analysis result due to service failure', {
      sessionId: (sessionData as TherapeuticSession)?.sessionId,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      overall_bias_score: 0.5, // Neutral fallback score
      confidence: 0.3, // Low confidence for fallback
      alert_level: 'medium' as AlertLevel,
      layer_results: {
        preprocessing: { 
          bias_score: 0.4, 
          metrics: { linguistic_bias: { overall_bias_score: 0.4 } }, 
          detected_biases: ['service_unavailable'], 
          recommendations: ['Python service unavailable - using fallback analysis'],
          layer: 'preprocessing'
        },
        model_level: { 
          bias_score: 0.5, 
          metrics: { fairness: { equalized_odds: 0.7, demographic_parity: 0.6 } }, 
          detected_biases: ['service_unavailable'], 
          recommendations: ['Python service unavailable - using fallback analysis'],
          layer: 'model_level'
        },
        interactive: { 
          bias_score: 0.6, 
          metrics: { interaction_patterns: { pattern_consistency: 3 } }, 
          detected_biases: ['service_unavailable'], 
          recommendations: ['Python service unavailable - using fallback analysis'],
          layer: 'interactive'
        },
        evaluation: { 
          bias_score: 0.3, 
          metrics: { outcome_fairness: { bias_score: 0.3 }, performance_disparities: { bias_score: 0.2 } }, 
          detected_biases: ['service_unavailable'], 
          recommendations: ['Python service unavailable - using fallback analysis'],
          layer: 'evaluation'
        }
      },
      recommendations: [
        'Python bias detection service is currently unavailable',
        'Results are based on fallback analysis with limited accuracy',
        'Please retry analysis when service is restored'
      ],
      timestamp: new Date().toISOString(),
      session_id: (sessionData as TherapeuticSession)?.sessionId || 'unknown',
      fallback_mode: true,
      service_error: error instanceof Error ? error.message : String(error)
    }
  }

  // Metrics-specific public methods
  async sendMetricsBatch(metrics: MetricData[]): Promise<MetricsBatchResponse> {
    try {
      return await this.makeRequest('/metrics/batch', 'POST', { metrics }) as MetricsBatchResponse
    } catch (error) {
      logger.warn('Failed to send metrics batch to Python service', { error, metricsCount: metrics.length })
      return { 
        success: false, 
        processed: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      }
    }
  }

  async sendAnalysisMetric(metricData: MetricData): Promise<void> {
    await this.makeRequest('/metrics/analysis', 'POST', metricData)
  }

  async getDashboardMetrics(options?: DashboardOptions): Promise<DashboardMetrics> {
    // Always use GET method for dashboard data retrieval
    // Convert options to query parameters for consistent REST API design
    if (options) {
      const queryParams = new URLSearchParams({
        time_range: options.time_range || '24h',
        include_details: options.include_details?.toString() || 'false',
        aggregation_type: options.aggregation_type || 'hourly',
      }).toString()
      return await this.makeRequest(`/dashboard?${queryParams}`, 'GET') as DashboardMetrics
    }
    return await this.makeRequest('/dashboard', 'GET') as DashboardMetrics
  }

  async recordReportMetric(reportData: MetricData): Promise<void> {
    await this.makeRequest('/metrics/report', 'POST', reportData)
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return await this.makeRequest('/metrics/performance', 'GET') as PerformanceMetrics
  }

  async getSessionData(sessionId: string): Promise<TherapeuticSession> {
    return await this.makeRequest(`/sessions/${sessionId}`, 'GET') as TherapeuticSession
  }

  async storeMetrics(storeData: MetricData[]): Promise<void> {
    await this.makeRequest('/metrics/store', 'POST', { metrics: storeData })
  }

  // Alert-specific public methods
  async registerAlertSystem(registrationData: AlertRegistration): Promise<AlertResponse> {
    return await this.makeRequest('/alerts/register', 'POST', registrationData) as AlertResponse
  }

  async checkAlerts(alertData: AlertData): Promise<AlertResponse[]> {
    return await this.makeRequest('/alerts/check', 'POST', alertData) as AlertResponse[]
  }

  async storeAlerts(alertsData: AlertData[]): Promise<void> {
    await this.makeRequest('/alerts/store', 'POST', { alerts: alertsData })
  }

  async escalateAlert(escalationData: AlertEscalation): Promise<AlertResponse> {
    return await this.makeRequest('/alerts/escalate', 'POST', escalationData) as AlertResponse
  }

  async getActiveAlerts(): Promise<AlertData[]> {
    return await this.makeRequest('/alerts/active', 'GET') as AlertData[]
  }

  async acknowledgeAlert(acknowledgeData: AlertAcknowledgment): Promise<AlertResponse> {
    return await this.makeRequest('/alerts/acknowledge', 'POST', acknowledgeData) as AlertResponse
  }

  async getRecentAlerts(timeRangeData: TimeRange): Promise<AlertData[]> {
    return await this.makeRequest('/alerts/recent', 'POST', timeRangeData) as AlertData[]
  }

  async getAlertStatistics(statisticsData: TimeRange): Promise<AlertStatistics> {
    return await this.makeRequest('/alerts/statistics', 'POST', statisticsData) as AlertStatistics
  }

  async unregisterAlertSystem(unregisterData: { system_id: string }): Promise<AlertResponse> {
    return await this.makeRequest('/alerts/unregister', 'POST', unregisterData) as AlertResponse
  }

  // Notification-specific public methods
  async sendNotification(notificationData: NotificationData): Promise<void> {
    await this.makeRequest('/notifications/send', 'POST', notificationData)
  }

  async sendSystemNotification(systemNotificationData: SystemNotificationData): Promise<void> {
    await this.makeRequest('/notifications/system', 'POST', systemNotificationData)
  }

  async dispose(): Promise<void> {
    logger.info('PythonBiasDetectionBridge disposed')
    // No active connections to close for HTTP client
  }
}