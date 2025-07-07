/**
 * Bias Alert System
 * 
 * Handles real-time alerts, notifications, and escalation for bias detection.
 * Extracted from BiasDetectionEngine.ts for better separation of concerns.
 */

import { getLogger } from '../../utils/logger'
import { PythonBiasDetectionBridge } from './python-bridge'
import type {
  BiasAnalysisResult,
} from './types'
import type {
  AlertLevel,
  AlertData,
  AlertRegistration,
  AlertResponse,
  AlertAcknowledgment,
  AlertEscalation,
  AlertStatistics,
  NotificationData,
  SystemNotificationData,
  TimeRange,
} from './bias-detection-interfaces'

const logger = getLogger('BiasAlertSystem')

/**
 * Production alert system that connects to Python Flask service
 * Handles real-time alerts, notifications, and escalation
 */
export class BiasAlertSystem {
  private monitoringCallbacks: Array<(data: any) => void> = []
  private pythonBridge: PythonBiasDetectionBridge
  public alertQueue: Array<{
    id: string
    timestamp: Date
    level: string
    sessionId: string
    message: string
    acknowledged: boolean
    escalated: boolean
  }> = []
  private notificationChannels: Map<string, any> = new Map()
  private alertRules: Array<{
    id: string
    condition: (result: BiasAnalysisResult) => boolean
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    escalationDelay: number
    recipients: string[]
  }> = []

  constructor(
    public config: any,
    pythonBridge?: PythonBiasDetectionBridge,
  ) {
    this.pythonBridge =
      pythonBridge ||
      new PythonBiasDetectionBridge(
        config.pythonServiceUrl || 'http://localhost:5000',
        config.timeout || 30000,
      )

    // Initialize collections
    this.alertQueue = []
    this.monitoringCallbacks = []
    this.notificationChannels = new Map()
    this.alertRules = []

    this.initializeDefaultAlertRules()
    this.initializeNotificationChannels()
  }

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-bias-score',
        condition: (result) => result.overallBiasScore > 0.7,
        severity: 'high',
        message: 'High bias score detected in therapeutic session',
        escalationDelay: 300000, // 5 minutes
        recipients: ['therapist-supervisor', 'ethics-committee'],
      },
      {
        id: 'critical-bias-score',
        condition: (result) => result.overallBiasScore > 0.9,
        severity: 'critical',
        message:
          'Critical bias score detected - immediate intervention required',
        escalationDelay: 60000, // 1 minute
        recipients: ['chief-supervisor', 'ethics-committee', 'system-admin'],
      },
      {
        id: 'demographic-disparity',
        condition: (result) => this.detectDemographicDisparity(result),
        severity: 'medium',
        message: 'Significant demographic bias disparity detected',
        escalationDelay: 600000, // 10 minutes
        recipients: ['diversity-officer', 'therapist-supervisor'],
      },
      {
        id: 'low-confidence',
        condition: (result) =>
          result.confidence < 0.5 && result.overallBiasScore > 0.5,
        severity: 'medium',
        message: 'Low confidence bias detection with elevated score',
        escalationDelay: 900000, // 15 minutes
        recipients: ['technical-team', 'therapist-supervisor'],
      },
    ]
  }

  private initializeNotificationChannels(): void {
    // Initialize notification channels (email, Slack, webhook, etc.)
    this.notificationChannels.set('email', {
      enabled: this.config.notifications?.email?.enabled || false,
      config: this.config.notifications?.email || {},
    })

    this.notificationChannels.set('slack', {
      enabled: this.config.notifications?.slack?.enabled || false,
      config: this.config.notifications?.slack || {},
    })

    this.notificationChannels.set('webhook', {
      enabled: this.config.notifications?.webhook?.enabled || false,
      config: this.config.notifications?.webhook || {},
    })
  }

  /**
   * Detect demographic disparities by comparing bias metrics across demographic groups
   * Returns true if significant disparities are found, even when overall bias score is low
   */
  private detectDemographicDisparity(result: BiasAnalysisResult): boolean {
    try {
      // Configuration for disparity detection
      const MIN_OVERALL_BIAS_FOR_BASIC_CHECK = 0.6 // Original threshold for fallback
      const LAYER_DISPARITY_THRESHOLD = 0.25 // Threshold for layer-specific disparities
      const HIGH_INDIVIDUAL_BIAS_THRESHOLD = 0.7 // Threshold for individual layer bias scores

      // Check if we have demographic data to analyze
      if (!result.demographics || !result.layerResults) {
        // Fallback to original overall bias score check if no demographic data
        return result.overallBiasScore > MIN_OVERALL_BIAS_FOR_BASIC_CHECK
      }

      // 1. Check for overall bias score disparity indicator
      const hasElevatedOverallBias =
        result.overallBiasScore > MIN_OVERALL_BIAS_FOR_BASIC_CHECK

      // 2. Analyze layer-specific bias scores for demographic concerns
      const layerBiasScores = [
        result.layerResults.preprocessing?.biasScore || 0,
        result.layerResults.modelLevel?.biasScore || 0,
        result.layerResults.interactive?.biasScore || 0,
        result.layerResults.evaluation?.biasScore || 0,
      ]

      // Check for high individual layer bias scores
      const hasHighLayerBias = layerBiasScores.some(
        (score) => score > HIGH_INDIVIDUAL_BIAS_THRESHOLD,
      )

      // Calculate layer bias score disparity
      const maxLayerBias = Math.max(...layerBiasScores)
      const minLayerBias = Math.min(...layerBiasScores)
      const layerDisparity = maxLayerBias - minLayerBias
      const hasSignificantLayerDisparity =
        layerDisparity > LAYER_DISPARITY_THRESHOLD

      // 3. Analyze demographic-specific patterns in layer results
      const demographicDisparityIndicators =
        this.analyzeDemographicLayerDisparities(result)

      // 4. Check for demographic fairness metric disparities
      const fairnessDisparityIndicators =
        this.analyzeFairnessMetricDisparities(result)

      // 5. Analyze counterfactual and feature importance disparities
      const counterfactualDisparityIndicators =
        this.analyzeCounterfactualDisparities(result)

      // Combine all disparity indicators
      const disparityIndicators = [
        hasElevatedOverallBias,
        hasHighLayerBias,
        hasSignificantLayerDisparity,
        ...demographicDisparityIndicators,
        ...fairnessDisparityIndicators,
        ...counterfactualDisparityIndicators,
      ]

      // Count positive indicators
      const positiveIndicators = disparityIndicators.filter(
        (indicator) => indicator,
      ).length
      const totalIndicators = disparityIndicators.length

      // Trigger alert if:
      // - Multiple disparity indicators are present (>= 30% of total indicators)
      // - OR any high-severity individual indicator is present
      const INDICATOR_THRESHOLD_PERCENTAGE = 0.3
      const multipleIndicatorsDetected =
        positiveIndicators >=
        Math.ceil(totalIndicators * INDICATOR_THRESHOLD_PERCENTAGE)

      const shouldAlert =
        multipleIndicatorsDetected || hasElevatedOverallBias || hasHighLayerBias

      if (shouldAlert) {
        logger.info('Demographic disparity detected', {
          sessionId: result.sessionId,
          overallBiasScore: result.overallBiasScore,
          layerDisparity,
          positiveIndicators,
          totalIndicators,
          demographicData: result.demographics
            ? {
                age: result.demographics.age,
                gender: result.demographics.gender,
                ethnicity: result.demographics.ethnicity,
              }
            : null,
          layerScores: {
            preprocessing: layerBiasScores[0],
            modelLevel: layerBiasScores[1],
            interactive: layerBiasScores[2],
            evaluation: layerBiasScores[3],
          },
        })
      }

      return shouldAlert
    } catch (error) {
      logger.error('Error in demographic disparity detection', {
        error: error instanceof Error ? error.message : String(error),
        sessionId: result.sessionId,
      })

      // Fallback to original logic if disparity detection fails
      return result.overallBiasScore > 0.6
    }
  }

  /**
   * Analyze demographic-specific patterns in layer results
   */
  private analyzeDemographicLayerDisparities(
    result: BiasAnalysisResult,
  ): boolean[] {
    const indicators: boolean[] = []

    try {
      // Check preprocessing layer for demographic representation issues
      if (result.layerResults.preprocessing?.representationAnalysis) {
        const repr = result.layerResults.preprocessing.representationAnalysis
        // Check for underrepresented groups
        const hasUnderrepresentedGroups =
          repr.underrepresentedGroups?.length > 0
        // Check for low diversity index
        const hasLowDiversity = repr.diversityIndex < 0.3
        indicators.push(hasUnderrepresentedGroups, hasLowDiversity)
      }

      // Check model level for fairness metric disparities
      if (result.layerResults.modelLevel?.fairnessMetrics) {
        const fairness = result.layerResults.modelLevel.fairnessMetrics
        // Check for demographic parity issues
        const hasDemographicParityIssue = fairness.demographicParity < 0.6
        // Check for equalized odds issues
        const hasEqualizedOddsIssue = fairness.equalizedOdds < 0.6
        indicators.push(hasDemographicParityIssue, hasEqualizedOddsIssue)
      }

      // Check interactive layer for engagement pattern disparities
      if (
        result.layerResults.interactive?.counterfactualAnalysis
          ?.problematicScenarios
      ) {
        const scenarios =
          result.layerResults.interactive.counterfactualAnalysis
            .problematicScenarios
        // Check for age-related disparities
        const hasAgeDisparity = scenarios.some(
          (scenario: any) =>
            scenario.biasType === 'age_bias' && scenario.severity === 'medium',
        )
        // Check for gender-related disparities
        const hasGenderDisparity = scenarios.some(
          (scenario: any) =>
            scenario.biasType === 'gender_bias' &&
            scenario.severity === 'medium',
        )
        indicators.push(hasAgeDisparity, hasGenderDisparity)
      }
    } catch (error) {
      logger.warn('Error analyzing demographic layer disparities', { error })
    }

    return indicators
  }

  /**
   * Analyze fairness metric disparities across demographics
   */
  private analyzeFairnessMetricDisparities(
    result: BiasAnalysisResult,
  ): boolean[] {
    const indicators: boolean[] = []

    try {
      // Check evaluation layer for Hugging Face fairness metrics
      if (result.layerResults.evaluation?.huggingFaceMetrics) {
        const metrics = result.layerResults.evaluation.huggingFaceMetrics

        // Check bias metric
        const hasHighBias = metrics.bias > 0.3
        // Check stereotype metric
        const hasHighStereotype = metrics.stereotype > 0.2
        // Check regard disparity (significant difference between positive and negative)
        const regardPositive = metrics.regard
          ? (metrics.regard as any)['positive'] || 0
          : 0
        const regardNegative = metrics.regard
          ? (metrics.regard as any)['negative'] || 0
          : 0
        const regardDisparity = Math.abs(regardPositive - regardNegative)
        const hasRegardDisparity = regardDisparity > 0.4

        indicators.push(hasHighBias, hasHighStereotype, hasRegardDisparity)
      }

      // Check custom therapeutic metrics
      if (result.layerResults.evaluation?.customMetrics) {
        const custom = result.layerResults.evaluation.customMetrics

        // Check therapeutic bias
        const hasTherapeuticBias = custom.therapeuticBias > 0.2
        // Check cultural sensitivity
        const hasLowCulturalSensitivity = custom.culturalSensitivity < 0.7

        indicators.push(hasTherapeuticBias, hasLowCulturalSensitivity)
      }
    } catch (error) {
      logger.warn('Error analyzing fairness metric disparities', { error })
    }

    return indicators
  }

  /**
   * Analyze counterfactual analysis for demographic disparities
   */
  private analyzeCounterfactualDisparities(
    result: BiasAnalysisResult,
  ): boolean[] {
    const indicators: boolean[] = []

    try {
      // Check interactive layer feature importance for demographic sensitivity
      if (result.layerResults.interactive?.featureImportance) {
        const features = result.layerResults.interactive.featureImportance

        features.forEach((feature: any) => {
          // Check if demographic features have high bias contribution
          if (
            feature.feature === 'participant_age' &&
            feature.biasContribution > 0.2
          ) {
            indicators.push(true)
          }

          // Check demographic sensitivity across different groups
          if (feature.demographicSensitivity) {
            const sensitivityValues = Object.values(
              feature.demographicSensitivity,
            ) as number[]
            const maxSensitivity = Math.max(...sensitivityValues)
            const minSensitivity = Math.min(...sensitivityValues)
            const sensitivityDisparity = maxSensitivity - minSensitivity

            if (sensitivityDisparity > 0.3) {
              indicators.push(true)
            }
          }
        })
      }

      // Check temporal analysis for intervention effectiveness disparities
      if (
        result.layerResults.evaluation?.temporalAnalysis
          ?.interventionEffectiveness
      ) {
        const interventions =
          result.layerResults.evaluation.temporalAnalysis
            .interventionEffectiveness

        interventions.forEach((intervention: any) => {
          // Check if bias mitigation effectiveness is low
          if (intervention.improvement < 0.1) {
            indicators.push(true)
          }

          // Check sustainability of interventions
          if (intervention.sustainabilityScore < 0.7) {
            indicators.push(true)
          }
        })
      }
    } catch (error) {
      logger.warn('Error analyzing counterfactual disparities', { error })
    }

    return indicators
  }

  async initialize(): Promise<void> {
    try {
      await this.pythonBridge.initialize()

      // Try to register alert system with Python service
      try {
        await this.pythonBridge.registerAlertSystem({
          system_id: 'typescript-alert-system',
          alert_levels: ['low', 'medium', 'high', 'critical'],
          enabled: true,
        })
        logger.info('BiasAlertSystem registered with Python service', {
          alertRules: this.alertRules.length,
          notificationChannels: this.notificationChannels.size,
        })
      } catch (alertRegisterError) {
        logger.warn(
          'Python service does not support alert registration, operating in local-only mode',
          {
            error: alertRegisterError,
          },
        )
      }

      logger.info(
        'BiasAlertSystem initialized successfully (local processing enabled)',
        {
          alertRules: this.alertRules.length,
          notificationChannels: this.notificationChannels.size,
        },
      )
    } catch (error) {
      logger.warn('BiasAlertSystem falling back to local-only mode', { error })

      // Initialize in fallback mode - no Python service connection
      logger.info('BiasAlertSystem initialized in fallback mode')
    }
  }

  async checkAlerts(result: BiasAnalysisResult): Promise<void> {
    try {
      logger.debug('Checking alerts for session', {
        sessionId: result.sessionId,
      })

      // Try to send analysis result to Python service for server-side alert processing
      let serverAlerts: any = { alerts: [] }
      try {
        serverAlerts = await this.pythonBridge.checkAlerts({
          sessionId: result.sessionId,
          alertLevel: result.alertLevel,
          message: `Alert for session ${result.sessionId}`,
          timestamp: new Date().toISOString(),
        })
      } catch (alertCheckError) {
        logger.debug(
          'Python service does not support alert checking, using local processing only',
          {
            error: alertCheckError,
            sessionId: result.sessionId,
          },
        )
      }

      // Process local alert rules
      const localAlerts: any[] = []
      for (const rule of this.alertRules) {
        try {
          if (rule.condition(result)) {
            const alert = {
              id: `${rule.id}-${result.sessionId}-${Date.now()}`,
              timestamp: new Date(),
              level: rule.severity,
              sessionId: result.sessionId,
              message: rule.message,
              acknowledged: false,
              escalated: false,
              ruleId: rule.id,
              biasScore: result.overallBiasScore,
              recipients: rule.recipients,
            }

            localAlerts.push(alert)
            this.alertQueue.push(alert)

            // Schedule escalation if needed
            this.scheduleEscalation(alert, rule.escalationDelay)
          }
        } catch (error) {
          logger.error(`Error evaluating alert rule ${rule.id}`, {
            error,
            sessionId: result.sessionId,
          })
        }
      }

      // Combine server and local alerts
      const allAlerts = [...(serverAlerts.alerts || []), ...localAlerts]

      if (allAlerts.length > 0) {
        logger.info(
          `Generated ${allAlerts.length} alerts for session ${result.sessionId}`,
          {
            alertLevels: allAlerts.map((a) => a.level),
          },
        )

        // Send notifications for high/critical alerts
        for (const alert of allAlerts) {
          if (alert.level === 'high' || alert.level === 'critical') {
            await this.sendNotifications(alert)
          }
        }

        // Trigger monitoring callbacks
        this.triggerMonitoringCallbacks(allAlerts, result)
      }

      // Try to store alerts in Python service for persistence
      if (allAlerts.length > 0) {
        try {
          await this.pythonBridge.storeAlerts(allAlerts.map(alert => ({
            sessionId: alert.sessionId,
            alertLevel: alert.level,
            message: alert.message,
            timestamp: alert.timestamp.toISOString(),
          })))
        } catch (alertStoreError) {
          logger.debug(
            'Python service does not support alert storage, alerts stored locally only',
            {
              error: alertStoreError,
              sessionId: result.sessionId,
              alertCount: allAlerts.length,
            },
          )
        }
      }
    } catch (error) {
      logger.error('Alert checking failed', {
        error,
        sessionId: result.sessionId,
      })
      throw error
    }
  }

  private scheduleEscalation(alert: any, delayMs: number): void {
    setTimeout(async () => {
      try {
        if (!alert.acknowledged && !alert.escalated) {
          alert.escalated = true
          await this.escalateAlert(alert)
        }
      } catch (error) {
        logger.error('Alert escalation failed', { error, alertId: alert.id })
      }
    }, delayMs)
  }

  private async escalateAlert(alert: any): Promise<void> {
    logger.warn('Escalating unacknowledged alert', {
      alertId: alert.id,
      level: alert.level,
    })

    // Send escalation notification
    await this.sendNotifications({
      ...alert,
      message: `[ESCALATED] ${alert.message}`,
      escalated: true,
    })

    // Try to notify Python service of escalation
    try {
      await this.pythonBridge.escalateAlert({
        alert_id: alert.id,
        escalation_level: 1,
        escalated_to: alert.recipients || [],
        reason: 'Unacknowledged alert escalation',
      })
    } catch (error) {
      logger.debug(
        'Python service does not support alert escalation, escalation logged locally only',
        {
          error,
          alertId: alert.id,
        },
      )
    }
  }

  private triggerMonitoringCallbacks(
    alerts: any[],
    result: BiasAnalysisResult,
  ): void {
    if (this.monitoringCallbacks.length === 0) {
      return
    }

    const callbackData = {
      alerts,
      sessionId: result.sessionId,
      timestamp: result.timestamp,
      overallBiasScore: result.overallBiasScore,
      alertLevel: result.alertLevel,
      recommendations: result.recommendations,
      highestSeverity: this.getHighestSeverity(alerts),
    }

    this.monitoringCallbacks.forEach((callback) => {
      try {
        callback(callbackData)
      } catch (error) {
        logger.error('Error in monitoring callback', { error })
      }
    })
  }

  private getHighestSeverity(alerts: any[]): string {
    const severityOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    }
    return alerts.reduce((highest, alert) => {
      return (severityOrder[alert.level] || 0) > (severityOrder[highest] || 0)
        ? alert.level
        : highest
    }, 'low')
  }

  private async sendNotifications(alert: any): Promise<void> {
    const notifications: Promise<void>[] = []

    // Send to each enabled notification channel
    for (const [channel, config] of Array.from(
      this.notificationChannels.entries(),
    )) {
      if (config.enabled) {
        notifications.push(
          this.sendNotificationToChannel(channel, alert, config.config),
        )
      }
    }

    // Wait for all notifications to complete
    try {
      await Promise.allSettled(notifications)
    } catch (error) {
      logger.error('Some notifications failed to send', {
        error,
        alertId: alert.id,
      })
    }
  }

  private async sendNotificationToChannel(
    channel: string,
    alert: any,
    config: any,
  ): Promise<void> {
    try {
      await this.pythonBridge.sendNotification({
        message: alert.message,
        recipients: alert.recipients || [],
        severity: alert.level,
        metadata: {
          channel,
          config,
          alert,
          timestamp: new Date().toISOString(),
        },
      })

      logger.debug(`Notification sent via ${channel}`, { alertId: alert.id })
    } catch (error) {
      logger.debug(
        `Python service does not support notifications for ${channel}, logging notification locally`,
        {
          error,
          alertId: alert.id,
          alertLevel: alert.level,
          message: alert.message,
        },
      )

      // Fallback: Log notification as a warning so it's still visible
      logger.warn(
        `[${channel.toUpperCase()}] Alert notification: ${alert.message}`,
        {
          alertId: alert.id,
          level: alert.level,
          sessionId: alert.sessionId,
          timestamp: new Date().toISOString(),
        },
      )
    }
  }

  addMonitoringCallback(callback: (data: any) => void): void {
    this.monitoringCallbacks.push(callback)
    logger.debug('Monitoring callback added', {
      totalCallbacks: this.monitoringCallbacks.length,
    })
  }

  removeMonitoringCallback(callback: (data: any) => void): void {
    const index = this.monitoringCallbacks.indexOf(callback)
    if (index > -1) {
      this.monitoringCallbacks.splice(index, 1)
      logger.debug('Monitoring callback removed', {
        totalCallbacks: this.monitoringCallbacks.length,
      })
    }
  }

  async getActiveAlerts(): Promise<any[]> {
    try {
      // Get alerts from Python service
      const serverAlerts = await this.pythonBridge.getActiveAlerts()

      // Combine with local queue
      const localActive = this.alertQueue.filter((alert) => !alert.acknowledged)

      return [...(serverAlerts || []), ...localActive]
    } catch (error) {
      logger.error('Failed to fetch active alerts', { error })
      return this.alertQueue.filter((alert) => !alert.acknowledged)
    }
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
  ): Promise<void> {
    try {
      // Acknowledge in Python service
      await this.pythonBridge.acknowledgeAlert({
        alert_id: alertId,
        acknowledged_by: acknowledgedBy,
        timestamp: new Date().toISOString(),
      })

      // Acknowledge locally
      const localAlert = this.alertQueue.find((alert) => alert.id === alertId)
      if (localAlert) {
        localAlert.acknowledged = true
      }

      logger.info('Alert acknowledged', { alertId, acknowledgedBy })
    } catch (error) {
      logger.error('Failed to acknowledge alert', { error, alertId })
      throw error
    }
  }

  async sendSystemNotification(
    message: string,
    recipients: string[],
  ): Promise<void> {
    try {
      await this.pythonBridge.sendSystemNotification({
        message,
        recipients,
        severity: 'medium',
        system_component: 'bias-detection-engine',
      })

      logger.info('System notification sent', { message, recipients })
    } catch (error) {
      logger.error('Failed to send system notification', {
        error,
        message,
        recipients,
      })
      throw error
    }
  }

  async getRecentAlerts(timeRangeMs: number = 86400000): Promise<any[]> {
    try {
      const response = await this.pythonBridge.getRecentAlerts({
        start: new Date(Date.now() - timeRangeMs).toISOString(),
        end: new Date().toISOString(),
      })

      return response || []
    } catch (error) {
      logger.error('Failed to fetch recent alerts', { error })

      // Fallback to local alerts
      const cutoffTime = new Date(Date.now() - timeRangeMs)
      return this.alertQueue.filter((alert) => alert.timestamp >= cutoffTime)
    }
  }

  async getAlertStatistics(timeRangeMs: number = 86400000): Promise<{
    total: number
    byLevel: Record<string, number>
    acknowledged: number
    escalated: number
    averageResponseTime: number
  }> {
    try {
      const response = await this.pythonBridge.getAlertStatistics({
        start: new Date(Date.now() - timeRangeMs).toISOString(),
        end: new Date().toISOString(),
      })

      return {
        total: response.total_alerts,
        byLevel: response.alerts_by_level,
        acknowledged: 0, // Would need to be calculated
        escalated: 0, // Would need to be calculated
        averageResponseTime: response.average_response_time,
      }
    } catch (error) {
      logger.error('Failed to fetch alert statistics', { error })

      // Fallback to local calculation
      const cutoffTime = new Date(Date.now() - timeRangeMs)
      const recentAlerts = this.alertQueue.filter(
        (alert) => alert.timestamp >= cutoffTime,
      )

      const byLevel: Record<string, number> = {}
      recentAlerts.forEach((alert) => {
        byLevel[alert.level] = (byLevel[alert.level] || 0) + 1
      })

      return {
        total: recentAlerts.length,
        byLevel,
        acknowledged: recentAlerts.filter((a) => a.acknowledged).length,
        escalated: recentAlerts.filter((a) => a.escalated).length,
        averageResponseTime: 0, // Would need more data to calculate properly
      }
    }
  }

  async dispose(): Promise<void> {
    try {
      // Unregister from Python service
      await this.pythonBridge.unregisterAlertSystem({
        system_id: 'typescript-alert-system',
      })

      // Clear local state
      this.alertQueue.length = 0
      this.monitoringCallbacks.length = 0

      await this.pythonBridge.dispose()

      logger.info('BiasAlertSystem disposed successfully')
    } catch (error) {
      logger.error('Error disposing BiasAlertSystem', { error })
    }
  }

  async processAlert(alertData: {
    sessionId: string
    level: string
    biasScore: number
    analysisResult: any
  }): Promise<void> {
    try {
      const alert = {
        id: `${alertData.sessionId}-${Date.now()}`,
        timestamp: new Date(),
        level: alertData.level,
        sessionId: alertData.sessionId,
        message: `Alert triggered for session ${alertData.sessionId} with bias score ${alertData.biasScore}`,
        acknowledged: false,
        escalated: false,
        biasScore: alertData.biasScore,
      }

      this.alertQueue.push(alert)

      // Send notifications if needed
      await this.sendNotifications(alert)

      // Trigger monitoring callbacks
      this.triggerMonitoringCallbacks([alert], alertData.analysisResult)

      logger.info('Alert processed successfully', {
        alertId: alert.id,
        sessionId: alertData.sessionId,
        level: alertData.level,
      })
    } catch (error) {
      logger.error('Failed to process alert', {
        error,
        sessionId: alertData.sessionId,
      })
      throw error
    }
  }
}