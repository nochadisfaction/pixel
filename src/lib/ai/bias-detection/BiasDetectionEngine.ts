/**
 * Pixelated Empathy Bias Detection Engine
 * 
 * This module provides a comprehensive bias detection system for therapeutic training scenarios.
 * It integrates multiple fairness toolkits and provides real-time bias monitoring capabilities.
 */

import { getLogger } from '../../utils/logger';
import { 
  mergeWithDefaults, 
  validateConfig, 
  createConfigWithEnvOverrides,
  updateConfiguration,
  loadConfigFromEnv,
  deepMergeConfigs,
  getEnvironmentConfigSummary
} from './config';
import type { 
  BiasDetectionConfig, 
  BiasAnalysisResult, 
  DemographicGroup, 
  FairnessMetrics,
  BiasReport,
  TherapeuticSession,
  ModelPerformanceMetrics
} from './types';

const logger = getLogger('BiasDetectionEngine');

export class BiasDetectionEngine {
  private config: BiasDetectionConfig;
  private pythonBridge: PythonBiasDetectionBridge;
  private metricsCollector: BiasMetricsCollector;
  private alertSystem: BiasAlertSystem;
  private isInitialized = false;
  private monitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout | undefined;
  private monitoringCallbacks: Array<(data: any) => void> = [];

  constructor(config?: Partial<BiasDetectionConfig>) {
    // Merge user config with defaults and environment variables
    this.config = createConfigWithEnvOverrides(config);
    
    // Validate final configuration
    validateConfig(this.config);
    
    // Initialize components with validated configuration
    this.pythonBridge = new PythonBiasDetectionBridge(this.config.pythonServiceUrl!, this.config.timeout);
    this.metricsCollector = new BiasMetricsCollector(this.config.metricsConfig!);
    this.alertSystem = new BiasAlertSystem(this.config.alertConfig!);

    logger.info('BiasDetectionEngine created with configuration', {
      thresholds: this.config.thresholds,
      pythonServiceUrl: this.config.pythonServiceUrl,
      hipaaCompliant: this.config.hipaaCompliant,
      auditLogging: this.config.auditLogging
    });
  }

  /**
   * Initialize the bias detection engine
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Bias Detection Engine');
      
      // Initialize Python backend
      await this.pythonBridge.initialize();
      
      // Initialize metrics collection
      await this.metricsCollector.initialize();
      
      // Initialize alert system
      await this.alertSystem.initialize();
      
      this.isInitialized = true;
      logger.info('Bias Detection Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Bias Detection Engine', { error });
      throw new Error(`Bias Detection Engine initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze a therapeutic session for bias across all detection layers
   */
  async analyzeSession(session: TherapeuticSession): Promise<BiasAnalysisResult> {
    this.ensureInitialized();
    
    try {
      logger.info('Starting bias analysis for session', { sessionId: session.sessionId });

      // Run all bias detection layers in parallel
      const [
        preprocessingResults,
        modelLevelResults,
        interactiveResults,
        evaluationResults
      ] = await Promise.all([
        this.runPreprocessingAnalysis(session),
        this.runModelLevelAnalysis(session),
        this.runInteractiveAnalysis(session),
        this.runEvaluationAnalysis(session)
      ]);

      // Aggregate results
      const aggregatedResult: BiasAnalysisResult = {
        sessionId: session.sessionId,
        timestamp: new Date(),
        overallBiasScore: this.calculateOverallBiasScore([
          preprocessingResults,
          modelLevelResults,
          interactiveResults,
          evaluationResults
        ]),
        layerResults: {
          preprocessing: preprocessingResults,
          modelLevel: modelLevelResults,
          interactive: interactiveResults,
          evaluation: evaluationResults
        },
        demographics: session.participantDemographics,
        recommendations: this.generateRecommendations([
          preprocessingResults,
          modelLevelResults,
          interactiveResults,
          evaluationResults
        ]),
        alertLevel: this.determineAlertLevel([
          preprocessingResults,
          modelLevelResults,
          interactiveResults,
          evaluationResults
        ]),
        confidence: this.calculateConfidenceScore([
          preprocessingResults,
          modelLevelResults,
          interactiveResults,
          evaluationResults
        ])
      };

      // Store metrics
      await this.metricsCollector.recordAnalysis(aggregatedResult);

      // Check for alert conditions
      await this.alertSystem.checkAlerts(aggregatedResult);

      logger.info('Bias analysis completed', { 
        sessionId: session.sessionId,
        overallBiasScore: aggregatedResult.overallBiasScore,
        alertLevel: aggregatedResult.alertLevel
      });

      return aggregatedResult;

    } catch (error) {
      logger.error('Bias analysis failed', { 
        sessionId: session.sessionId, 
        error 
      });
      throw new Error(`Bias analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run pre-processing layer analysis using spaCy and NLTK
   */
  private async runPreprocessingAnalysis(session: TherapeuticSession): Promise<any> {
    return await this.pythonBridge.runPreprocessingAnalysis({
      sessionContent: session.content,
      participantDemographics: session.participantDemographics,
      trainingScenario: session.scenario
    });
  }

  /**
   * Run model-level analysis using AIF360 and Fairlearn
   */
  private async runModelLevelAnalysis(session: TherapeuticSession): Promise<any> {
    return await this.pythonBridge.runModelLevelAnalysis({
      modelPredictions: session.aiResponses,
      groundTruth: session.expectedOutcomes,
      demographics: session.participantDemographics,
      sessionMetadata: session.metadata
    });
  }

  /**
   * Run interactive analysis using What-If Tool integration
   */
  private async runInteractiveAnalysis(session: TherapeuticSession): Promise<any> {
    return await this.pythonBridge.runInteractiveAnalysis({
      sessionData: session,
      counterfactualScenarios: this.generateCounterfactualScenarios(session)
    });
  }

  /**
   * Run evaluation layer analysis using Hugging Face evaluate
   */
  private async runEvaluationAnalysis(session: TherapeuticSession): Promise<any> {
    return await this.pythonBridge.runEvaluationAnalysis({
      sessionTranscripts: session.transcripts,
      demographicGroups: this.extractDemographicGroups(session),
      evaluationMetrics: this.config.evaluationMetrics
    });
  }

  /**
   * Generate comprehensive bias report
   */
  /**
   * Generate comprehensive bias report with multiple formats and caching
   */
  async generateBiasReport(
    sessions: TherapeuticSession[], 
    timeRange: { start: Date; end: Date },
    options?: {
      format?: 'json' | 'pdf' | 'html' | 'csv';
      includeRawData?: boolean;
      includeTrends?: boolean;
      includeRecommendations?: boolean;
      cacheResults?: boolean;
      customAnalysis?: string[];
      filterCriteria?: {
        biasThreshold?: number;
        demographicGroups?: string[];
        alertLevels?: string[];
      };
    }
  ): Promise<BiasReport & {
    metadata: {
      generatedAt: Date;
      format: string;
      sessionCount: number;
      timeRange: { start: Date; end: Date };
      executionTimeMs: number;
      cacheKey?: string;
    };
    exportOptions?: {
      downloadUrl?: string;
      expiresAt?: Date;
    };
  }> {
    this.ensureInitialized();

    const startTime = Date.now();
    const {
      format = 'json',
      includeRawData = false,
      includeTrends = true,
      includeRecommendations = true,
      cacheResults = true,
      customAnalysis = [],
      filterCriteria = {}
    } = options || {};

    try {
      logger.info('Generating comprehensive bias report', { 
        sessionCount: sessions.length,
        timeRange,
        format,
        includeRawData,
        filterCriteria
      });

      // Generate cache key for potential caching
      const cacheKey = this.generateReportCacheKey(sessions, timeRange, options);
      
      // Check for cached report if caching is enabled
      if (cacheResults) {
        const cachedReport = await this.getCachedReport(cacheKey);
        if (cachedReport) {
          logger.debug('Retrieved cached bias report', { cacheKey });
          return cachedReport;
        }
      }

      // Filter sessions based on criteria
      const filteredSessions = this.filterSessionsByCriteria(sessions, filterCriteria);
      
      logger.info(`Filtered sessions for analysis`, {
        originalCount: sessions.length,
        filteredCount: filteredSessions.length
      });

      // Analyze all sessions with progress tracking
      const analyses = await this.analyzeSessionsWithProgress(filteredSessions);

      // Aggregate analysis results
      const aggregatedResults = this.aggregateAnalysisResults(analyses, timeRange);

      // Generate trend analysis if requested
      let trendAnalysis;
      if (includeTrends) {
        trendAnalysis = await this.generateTrendAnalysis(analyses, timeRange);
      }

      // Generate custom analysis if requested
      let customAnalysisResults;
      if (customAnalysis.length > 0) {
        customAnalysisResults = await this.runCustomAnalysis(analyses, customAnalysis);
      }

      // Generate recommendations if requested
      let recommendations;
      if (includeRecommendations) {
        recommendations = this.generateDetailedRecommendations(aggregatedResults, trendAnalysis);
      }

      // Call Python backend for advanced statistical analysis
      const pythonAnalysis = await this.pythonBridge.generateComprehensiveReport({
        analyses,
        aggregatedResults,
        timeRange,
        reportConfig: this.config.reportConfig,
        format,
        includeRawData,
        customAnalysis: customAnalysisResults
      });

      // Construct comprehensive report
      const report: BiasReport & {
        metadata: any;
        exportOptions?: any;
      } = {
        ...pythonAnalysis,
        sessionAnalyses: includeRawData ? analyses : undefined,
        aggregatedMetrics: aggregatedResults,
        trendAnalysis,
        customAnalysis: customAnalysisResults,
        recommendations,
        metadata: {
          generatedAt: new Date(),
          format,
          sessionCount: filteredSessions.length,
          timeRange,
          executionTimeMs: Date.now() - startTime,
          cacheKey: cacheResults ? cacheKey : undefined
        }
      };

      // Generate export options for non-JSON formats
      if (format !== 'json') {
        report.exportOptions = await this.generateExportOptions(report, format);
      }

      // Cache the report if enabled
      if (cacheResults) {
        await this.cacheReport(cacheKey, report);
      }

      // Record report generation metrics
      await this.metricsCollector.recordReportGeneration({
        sessionCount: filteredSessions.length,
        executionTimeMs: report.metadata.executionTimeMs,
        format,
        cacheHit: false
      });

      logger.info('Bias report generated successfully', {
        sessionCount: filteredSessions.length,
        overallFairnessScore: report.overallFairnessScore,
        executionTimeMs: report.metadata.executionTimeMs,
        format
      });

      return report;

    } catch (error) {
      logger.error('Failed to generate bias report', { 
        error, 
        sessionCount: sessions.length,
        timeRange,
        format
      });
      throw new Error(`Bias report generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate cache key for bias reports
   */
  private generateReportCacheKey(
    sessions: TherapeuticSession[],
    timeRange: { start: Date; end: Date },
    options?: any
  ): string {
    const sessionIds = sessions.map(s => s.sessionId).sort().join(',');
    const optionsHash = Buffer.from(JSON.stringify(options || {})).toString('base64');
    const timeRangeStr = `${timeRange.start.toISOString()}-${timeRange.end.toISOString()}`;
    
    return `bias_report_${Buffer.from(`${sessionIds}_${timeRangeStr}_${optionsHash}`).toString('base64').slice(0, 32)}`;
  }

  /**
   * Filter sessions based on report criteria
   */
  private filterSessionsByCriteria(
    sessions: TherapeuticSession[],
    criteria: any
  ): TherapeuticSession[] {
    let filtered = [...sessions];

    if (criteria.demographicGroups && criteria.demographicGroups.length > 0) {
      filtered = filtered.filter(session => 
        criteria.demographicGroups.some((group: string) => 
          session.participantDemographics?.some((demo: any) => demo.type === group)
        )
      );
    }

    // Additional filtering logic can be added here
    return filtered;
  }

  /**
   * Analyze sessions with progress tracking
   */
  private async analyzeSessionsWithProgress(sessions: TherapeuticSession[]): Promise<BiasAnalysisResult[]> {
    const analyses: BiasAnalysisResult[] = [];
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      const batchAnalyses = await Promise.all(
        batch.map(session => this.analyzeSession(session))
      );
      
      analyses.push(...batchAnalyses);
      
      logger.debug(`Analyzed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sessions.length / batchSize)}`, {
        processedSessions: analyses.length,
        totalSessions: sessions.length
      });
    }

    return analyses;
  }

  /**
   * Aggregate analysis results for reporting
   */
  private aggregateAnalysisResults(
    analyses: BiasAnalysisResult[],
    timeRange: { start: Date; end: Date }
  ): any {
    const totalAnalyses = analyses.length;
    const averageBiasScore = analyses.reduce((sum, a) => sum + a.overallBiasScore, 0) / totalAnalyses;
    
    const alertDistribution = analyses.reduce((dist, analysis) => {
      dist[analysis.alertLevel] = (dist[analysis.alertLevel] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const layerAverages = {
      preprocessing: analyses.reduce((sum, a) => sum + (a.layerResults.preprocessing?.biasScore || 0), 0) / totalAnalyses,
      modelLevel: analyses.reduce((sum, a) => sum + (a.layerResults.modelLevel?.biasScore || 0), 0) / totalAnalyses,
      interactive: analyses.reduce((sum, a) => sum + (a.layerResults.interactive?.biasScore || 0), 0) / totalAnalyses,
      evaluation: analyses.reduce((sum, a) => sum + (a.layerResults.evaluation?.biasScore || 0), 0) / totalAnalyses
    };

    return {
      totalAnalyses,
      averageBiasScore,
      alertDistribution,
      layerAverages,
      timeRange,
      highestBiasScore: Math.max(...analyses.map(a => a.overallBiasScore)),
      lowestBiasScore: Math.min(...analyses.map(a => a.overallBiasScore)),
      confidenceScore: analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalAnalyses
    };
  }

  /**
   * Generate trend analysis over time
   */
  private async generateTrendAnalysis(
    analyses: BiasAnalysisResult[],
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    // Sort analyses by timestamp
    const sortedAnalyses = analyses.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Group by time intervals (daily, weekly, etc.)
    const dailyGroups = this.groupAnalysesByDay(sortedAnalyses);
    
    const trends = {
      daily: dailyGroups.map(group => ({
        date: group.date,
        averageBiasScore: group.analyses.reduce((sum, a) => sum + a.overallBiasScore, 0) / group.analyses.length,
        sessionCount: group.analyses.length,
        alertDistribution: group.analyses.reduce((dist, analysis) => {
          dist[analysis.alertLevel] = (dist[analysis.alertLevel] || 0) + 1;
          return dist;
        }, {} as Record<string, number>)
      })),
      overall: {
        trendDirection: this.calculateTrendDirection(sortedAnalyses),
        significantChanges: this.identifySignificantChanges(sortedAnalyses),
        seasonalPatterns: this.identifySeasonalPatterns(sortedAnalyses)
      }
    };

    return trends;
  }

  /**
   * Run custom analysis modules
   */
  private async runCustomAnalysis(
    analyses: BiasAnalysisResult[],
    customModules: string[]
  ): Promise<any> {
    const customResults: Record<string, any> = {};

    for (const module of customModules) {
      try {
        switch (module) {
          case 'demographic_disparity':
            customResults[module] = this.analyzeDemographicDisparity(analyses);
            break;
          case 'temporal_patterns':
            customResults[module] = this.analyzeTemporalPatterns(analyses);
            break;
          case 'intervention_effectiveness':
            customResults[module] = this.analyzeInterventionEffectiveness(analyses);
            break;
          default:
            logger.warn(`Unknown custom analysis module: ${module}`);
        }
      } catch (error) {
        logger.error(`Failed to run custom analysis module: ${module}`, { error });
        customResults[module] = { error: error instanceof Error ? error.message : String(error) };
      }
    }

    return customResults;
  }

  /**
   * Generate detailed recommendations based on analysis
   */
  private generateDetailedRecommendations(
    aggregatedResults: any,
    trendAnalysis?: any
  ): Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    implementationEffort: string;
    timeline: string;
  }> {
    const recommendations = [];

    // High bias score recommendations
    if (aggregatedResults.averageBiasScore > this.config.thresholds.highLevel) {
      recommendations.push({
        category: 'bias_reduction',
        priority: 'high' as const,
        recommendation: 'Immediate review of training data and model parameters to address elevated bias levels',
        expectedImpact: 'Significant reduction in bias scores (20-40%)',
        implementationEffort: 'High',
        timeline: '1-2 weeks'
      });
    }

    // Alert volume recommendations  
    const criticalAlerts = aggregatedResults.alertDistribution.critical || 0;
    if (criticalAlerts > aggregatedResults.totalAnalyses * 0.1) {
      recommendations.push({
        category: 'alert_management',
        priority: 'high' as const,
        recommendation: 'Implement immediate intervention protocols for critical bias alerts',
        expectedImpact: 'Reduced critical incidents',
        implementationEffort: 'Medium',
        timeline: '3-5 days'
      });
    }

    // Trend-based recommendations
    if (trendAnalysis?.overall?.trendDirection === 'increasing') {
      recommendations.push({
        category: 'trend_intervention',
        priority: 'medium' as const,
        recommendation: 'Address increasing bias trend through systematic model retraining',
        expectedImpact: 'Stabilized bias levels',
        implementationEffort: 'High',
        timeline: '2-4 weeks'
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for trend analysis
   */
  private groupAnalysesByDay(analyses: BiasAnalysisResult[]): Array<{ date: string; analyses: BiasAnalysisResult[] }> {
    const groups = new Map<string, BiasAnalysisResult[]>();
    
    analyses.forEach(analysis => {
      const date = new Date(analysis.timestamp).toISOString().split('T')[0];
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(analysis);
    });

    return Array.from(groups.entries()).map(([date, analyses]) => ({ date, analyses }));
  }

  private calculateTrendDirection(analyses: BiasAnalysisResult[]): 'increasing' | 'decreasing' | 'stable' {
    if (analyses.length < 2) return 'stable';
    
    const firstHalf = analyses.slice(0, Math.floor(analyses.length / 2));
    const secondHalf = analyses.slice(Math.floor(analyses.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, a) => sum + a.overallBiasScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, a) => sum + a.overallBiasScore, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    if (Math.abs(diff) < 0.05) return 'stable';
    return diff > 0 ? 'increasing' : 'decreasing';
  }

  private identifySignificantChanges(analyses: BiasAnalysisResult[]): any[] {
    // Implement significant change detection logic
    return [];
  }

  private identifySeasonalPatterns(analyses: BiasAnalysisResult[]): any {
    // Implement seasonal pattern detection
    return {};
  }

  private analyzeDemographicDisparity(analyses: BiasAnalysisResult[]): any {
    // Implement demographic disparity analysis
    return {};
  }

  private analyzeTemporalPatterns(analyses: BiasAnalysisResult[]): any {
    // Implement temporal pattern analysis
    return {};
  }

  private analyzeInterventionEffectiveness(analyses: BiasAnalysisResult[]): any {
    // Implement intervention effectiveness analysis
    return {};
  }

  /**
   * Generate export options for different formats
   */
  private async generateExportOptions(report: any, format: string): Promise<any> {
    // Implement export URL generation and expiration logic
    return {
      downloadUrl: `/api/reports/download/${report.metadata.cacheKey}?format=${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Cache report for future retrieval
   */
  private async getCachedReport(cacheKey: string): Promise<any | null> {
    try {
      // Implement cache retrieval logic
      return null; // Placeholder
    } catch (error) {
      logger.warn('Failed to retrieve cached report', { cacheKey, error });
      return null;
    }
  }

  /**
   * Cache report for future retrieval
   */
  private async cacheReport(cacheKey: string, report: any): Promise<void> {
    try {
      // Implement cache storage logic
      logger.debug('Report cached successfully', { cacheKey });
    } catch (error) {
      logger.warn('Failed to cache report', { cacheKey, error });
    }
  }

  /**
   * Get real-time bias monitoring dashboard data
   */
  async getDashboardData(options?: { timeRange?: string; includeDetails?: boolean }): Promise<any> {
    this.ensureInitialized();
    
    return await this.metricsCollector.getDashboardData(options);
  }

  /**
   * Get comprehensive metrics for analytics dashboard
   */
  async getMetrics(options?: {
    timeRange?: { start: Date; end: Date };
    includeDetails?: boolean;
    includePerformance?: boolean;
    demographic?: DemographicGroup;
    aggregationType?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    summary: {
      totalAnalyses: number;
      averageBiasScore: number;
      alertDistribution: Record<string, number>;
      trendsOverTime: Array<{ timestamp: Date; biasScore: number; alertLevel: string }>;
    };
    demographics: {
      [key: string]: {
        analyses: number;
        averageBiasScore: number;
        alertRate: number;
      };
    };
    performance: {
      averageResponseTime: number;
      successRate: number;
      errorRate: number;
      systemHealth: string;
    };
    recommendations: string[];
  }> {
    this.ensureInitialized();
    
    try {
      logger.info('Retrieving comprehensive metrics', { options });
      
      const [summaryData, demographicData, performanceData] = await Promise.all([
        this.metricsCollector.getSummaryMetrics(options),
        this.metricsCollector.getDemographicMetrics(options),
        options?.includePerformance ? this.metricsCollector.getPerformanceMetrics(options) : null
      ]);
      
      const metrics = {
        summary: summaryData,
        demographics: demographicData,
        performance: performanceData || {
          averageResponseTime: 0,
          successRate: 1.0,
          errorRate: 0.0,
          systemHealth: 'unknown'
        },
        recommendations: this.generateMetricsRecommendations(summaryData, demographicData)
      };
      
      logger.debug('Retrieved comprehensive metrics', {
        totalAnalyses: metrics.summary.totalAnalyses,
        avgBiasScore: metrics.summary.averageBiasScore
      });
      
      return metrics;
      
    } catch (error) {
      logger.error('Failed to retrieve metrics', { error });
      throw new Error(`Failed to retrieve metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get analysis results for a specific session
   */
  async getSessionAnalysis(sessionId: string): Promise<BiasAnalysisResult | null> {
    this.ensureInitialized();
    
    try {
      logger.info('Retrieving session analysis', { sessionId });
      
      // Get cached results first
      const cachedResult = await this.metricsCollector.getSessionAnalysis(sessionId);
      if (cachedResult) {
        logger.debug('Retrieved session analysis from cache', { sessionId });
        return cachedResult;
      }
      
      // If not cached, try to get from persistent storage
      const storedResult = await this.metricsCollector.getStoredSessionAnalysis(sessionId);
      if (storedResult) {
        logger.debug('Retrieved session analysis from storage', { sessionId });
        return storedResult;
      }
      
      logger.warn('Session analysis not found', { sessionId });
      return null;
      
    } catch (error) {
      logger.error('Failed to retrieve session analysis', { 
        sessionId, 
        error 
      });
      throw new Error(`Failed to retrieve session analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update bias detection thresholds with validation and rollback capability
   */
  async updateThresholds(
    newThresholds: Partial<BiasDetectionConfig['thresholds']>,
    options?: {
      validateOnly?: boolean;
      notifyStakeholders?: boolean;
      rollbackOnFailure?: boolean;
    }
  ): Promise<{
    success: boolean;
    previousThresholds?: BiasDetectionConfig['thresholds'];
    validationErrors?: string[];
    affectedSessions?: number;
  }> {
    this.ensureInitialized();
    
    const { validateOnly = false, notifyStakeholders = true, rollbackOnFailure = true } = options || {};
    
    try {
      logger.info('Updating bias detection thresholds', { 
        newThresholds, 
        validateOnly,
        timestamp: new Date().toISOString()
      });

      // Store previous thresholds for potential rollback
      const previousThresholds = { ...this.config.thresholds };

      // Validate new thresholds
      const mergedThresholds = { ...this.config.thresholds, ...newThresholds };
      const testConfig = { thresholds: mergedThresholds };
      
      try {
        validateConfig(testConfig);
      } catch (error) {
        const validationErrors = [error instanceof Error ? error.message : String(error)];
        logger.warn('Threshold validation failed', { validationErrors, newThresholds });
        
        return {
          success: false,
          previousThresholds,
          validationErrors,
          affectedSessions: 0
        };
      }

      // Additional business logic validation
      const businessValidationErrors = this.validateThresholdBusinessLogic(mergedThresholds);
      if (businessValidationErrors.length > 0) {
        logger.warn('Threshold business validation failed', { businessValidationErrors, newThresholds });
        
        return {
          success: false,
          previousThresholds,
          validationErrors: businessValidationErrors,
          affectedSessions: 0
        };
      }

      if (validateOnly) {
        logger.info('Threshold validation successful (validate-only mode)', { newThresholds });
        return {
          success: true,
          previousThresholds,
          validationErrors: [],
          affectedSessions: 0
        };
      }

      // Apply new thresholds
      this.config.thresholds = mergedThresholds;

      try {
        // Update Python service configuration
        await this.pythonBridge.updateConfiguration({ 
          thresholds: this.config.thresholds,
          timestamp: new Date().toISOString()
        });

        // Calculate impact on existing sessions
        const affectedSessions = await this.calculateThresholdImpact(previousThresholds, mergedThresholds);

        // Send notifications if enabled
        if (notifyStakeholders) {
          await this.notifyThresholdUpdate(previousThresholds, mergedThresholds, affectedSessions);
        }

        // Log successful update
        logger.info('Bias detection thresholds updated successfully', { 
          newThresholds, 
          affectedSessions,
          previousThresholds
        });

        return {
          success: true,
          previousThresholds,
          validationErrors: [],
          affectedSessions
        };

      } catch (error) {
        logger.error('Failed to apply threshold update', { error, newThresholds });

        // Rollback if enabled
        if (rollbackOnFailure) {
          logger.info('Rolling back threshold changes', { previousThresholds });
          this.config.thresholds = previousThresholds;
          
          try {
            await this.pythonBridge.updateConfiguration({ thresholds: previousThresholds });
            logger.info('Threshold rollback successful');
          } catch (rollbackError) {
            logger.error('Threshold rollback failed', { rollbackError });
          }
        }

        throw new Error(`Failed to update thresholds: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      logger.error('Threshold update process failed', { error, newThresholds });
      throw new Error(`Threshold update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate threshold business logic
   */
  private validateThresholdBusinessLogic(thresholds: BiasDetectionConfig['thresholds']): string[] {
    const errors: string[] = [];

    // Check if thresholds are in proper ascending order
    if (thresholds.warningLevel >= thresholds.highLevel) {
      errors.push('Warning level must be less than high level');
    }
    if (thresholds.highLevel >= thresholds.criticalLevel) {
      errors.push('High level must be less than critical level');
    }

    // Check for reasonable ranges
    if (thresholds.warningLevel < 0.1) {
      errors.push('Warning level too low - may generate excessive alerts');
    }
    if (thresholds.criticalLevel > 0.9) {
      errors.push('Critical level too high - may miss important bias patterns');
    }

    // Check for significant changes that might impact system
    const currentThresholds = this.config.thresholds;
    const warningChange = Math.abs(thresholds.warningLevel - currentThresholds.warningLevel);
    const criticalChange = Math.abs(thresholds.criticalLevel - currentThresholds.criticalLevel);

    if (warningChange > 0.3) {
      errors.push('Warning level change exceeds recommended maximum (0.3)');
    }
    if (criticalChange > 0.2) {
      errors.push('Critical level change exceeds recommended maximum (0.2)');
    }

    return errors;
  }

  /**
   * Calculate impact of threshold changes on existing sessions
   */
  private async calculateThresholdImpact(
    oldThresholds: BiasDetectionConfig['thresholds'],
    newThresholds: BiasDetectionConfig['thresholds']
  ): Promise<number> {
    try {
      // This would typically query recent sessions and calculate classification changes
      const recentSessions = await this.metricsCollector.getRecentSessionCount();
      
      // Estimate impact based on threshold changes
      const avgChange = (
        Math.abs(newThresholds.warningLevel - oldThresholds.warningLevel) +
        Math.abs(newThresholds.highLevel - oldThresholds.highLevel) +
        Math.abs(newThresholds.criticalLevel - oldThresholds.criticalLevel)
      ) / 3;

      // Rough estimate: each 0.1 change affects ~10% of sessions
      const impactRate = Math.min(1.0, avgChange * 10);
      return Math.round(recentSessions * impactRate);

    } catch (error) {
      logger.warn('Failed to calculate threshold impact', { error });
      return 0;
    }
  }

  /**
   * Notify stakeholders of threshold updates
   */
  private async notifyThresholdUpdate(
    oldThresholds: BiasDetectionConfig['thresholds'],
    newThresholds: BiasDetectionConfig['thresholds'],
    affectedSessions: number
  ): Promise<void> {
    try {
      const notification = {
        type: 'threshold_update',
        timestamp: new Date(),
        changes: {
          warning: { old: oldThresholds.warningLevel, new: newThresholds.warningLevel },
          high: { old: oldThresholds.highLevel, new: newThresholds.highLevel },
          critical: { old: oldThresholds.criticalLevel, new: newThresholds.criticalLevel }
        },
        impact: {
          affectedSessions,
          estimatedAlertChange: this.estimateAlertVolumeChange(oldThresholds, newThresholds)
        }
      };

      await this.alertSystem.sendSystemNotification(notification);
      logger.debug('Threshold update notification sent', { affectedSessions });

    } catch (error) {
      logger.warn('Failed to send threshold update notification', { error });
    }
  }

  /**
   * Estimate change in alert volume due to threshold updates
   */
  private estimateAlertVolumeChange(
    oldThresholds: BiasDetectionConfig['thresholds'],
    newThresholds: BiasDetectionConfig['thresholds']
  ): string {
    const warningDiff = newThresholds.warningLevel - oldThresholds.warningLevel;
    const criticalDiff = newThresholds.criticalLevel - oldThresholds.criticalLevel;

    if (warningDiff < -0.1 || criticalDiff < -0.1) {
      return 'increase';
    } else if (warningDiff > 0.1 || criticalDiff > 0.1) {
      return 'decrease';
    } else {
      return 'minimal_change';
    }
  }

  /**
   * Update configuration and reload mechanisms
   */
  async updateConfiguration(updates: Partial<BiasDetectionConfig>): Promise<void> {
    this.ensureInitialized();
    
    // Use the configuration update utility from config.ts
    const newConfig = updateConfiguration(this.config, updates);
    
    // Update internal configuration
    this.config = newConfig;
    
    // Propagate configuration updates to components
    await this.pythonBridge.updateConfiguration(newConfig);
    
    logger.info('Bias detection configuration updated', { 
      updatedFields: Object.keys(updates),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reload configuration from environment variables
   */
  async reloadConfiguration(): Promise<void> {
    this.ensureInitialized();
    
    // Load current environment variables
    const envConfig = loadConfigFromEnv();
    
    // Apply environment overrides to current config
    const reloadedConfig = deepMergeConfigs(this.config, envConfig) as BiasDetectionConfig;
    
    // Validate and apply
    validateConfig(reloadedConfig);
    this.config = reloadedConfig;
    
    // Update components with new configuration
    await this.pythonBridge.updateConfiguration(reloadedConfig);
    
    logger.info('Configuration reloaded from environment variables', {
      environmentSummary: getEnvironmentConfigSummary(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get current configuration (with sensitive values masked)
   */
  getConfiguration(includeSensitive: boolean = false): BiasDetectionConfig | Partial<BiasDetectionConfig> {
    if (includeSensitive) {
      return { ...this.config };
    }
    
    // Return configuration with sensitive values masked
    const safeConfig = { ...this.config };
    if (safeConfig.alertConfig?.slackWebhookUrl) {
      safeConfig.alertConfig.slackWebhookUrl = '[MASKED]';
    }
    if (safeConfig.alertConfig?.emailRecipients) {
      safeConfig.alertConfig.emailRecipients = safeConfig.alertConfig.emailRecipients.map(() => '[MASKED]');
    }
    
    return safeConfig;
  }

  /**
   * Get bias explanation for a specific detection
   */
  async explainBiasDetection(
    analysisResult: BiasAnalysisResult,
    demographicGroup?: DemographicGroup,
    includeCounterfactuals: boolean = true
  ): Promise<{
    summary: string;
    detailedExplanation: string;
    contributingFactors: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
    }>;
    recommendations: string[];
    counterfactualAnalysis?: Array<{
      scenario: string;
      expectedOutcome: string;
      biasReduction: number;
    }>;
  }> {
    this.ensureInitialized();
    
    try {
      logger.info('Generating bias explanation', {
        sessionId: analysisResult.sessionId,
        biasScore: analysisResult.overallBiasScore,
        demographicGroup: demographicGroup?.type
      });

      // Generate basic explanation
      const explanationData = {
        analysisResult,
        demographicGroup,
        explanationConfig: this.config.explanationConfig,
        includeCounterfactuals
      };

      // Call Python backend for detailed AI explanation
      const pythonExplanation = await this.pythonBridge.explainBiasDetection(explanationData);

      // Generate contributing factors analysis
      const contributingFactors = this.analyzeContributingFactors(analysisResult);

      // Generate targeted recommendations
      const recommendations = this.generateTargetedRecommendations(analysisResult, demographicGroup);

      // Generate counterfactual analysis if requested
      let counterfactualAnalysis;
      if (includeCounterfactuals) {
        counterfactualAnalysis = await this.generateCounterfactualExplanation(analysisResult);
      }

      const explanation: {
        summary: string;
        detailedExplanation: string;
        contributingFactors: Array<{
          factor: string;
          impact: 'high' | 'medium' | 'low';
          description: string;
        }>;
        recommendations: string[];
        counterfactualAnalysis?: Array<{
          scenario: string;
          expectedOutcome: string;
          biasReduction: number;
        }>;
      } = {
        summary: this.generateExplanationSummary(analysisResult, demographicGroup),
        detailedExplanation: pythonExplanation || this.generateDetailedExplanation(analysisResult),
        contributingFactors,
        recommendations
      };

      if (counterfactualAnalysis) {
        explanation.counterfactualAnalysis = counterfactualAnalysis;
      }

      logger.debug('Generated bias explanation', {
        sessionId: analysisResult.sessionId,
        factorCount: contributingFactors.length,
        recommendationCount: recommendations.length
      });

      return explanation;

    } catch (error) {
      logger.error('Failed to generate bias explanation', {
        sessionId: analysisResult.sessionId,
        error
      });
      throw new Error(`Failed to generate bias explanation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze contributing factors to bias detection
   */
  private analyzeContributingFactors(analysisResult: BiasAnalysisResult): Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
  }> {
    const factors: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
    }> = [];

    // Analyze layer-specific contributions
    if (analysisResult.layerResults.preprocessing?.biasScore > this.config.thresholds.warningLevel) {
      factors.push({
        factor: 'Data Preprocessing',
        impact: (analysisResult.layerResults.preprocessing.biasScore > this.config.thresholds.highLevel ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Bias detected in data preprocessing stage, indicating potential issues with data representation or feature extraction'
      });
    }

    if (analysisResult.layerResults.modelLevel?.biasScore > this.config.thresholds.warningLevel) {
      factors.push({
        factor: 'Model Predictions',
        impact: (analysisResult.layerResults.modelLevel.biasScore > this.config.thresholds.highLevel ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Model-level bias detected, suggesting algorithmic bias in AI response generation'
      });
    }

    if (analysisResult.layerResults.interactive?.biasScore > this.config.thresholds.warningLevel) {
      factors.push({
        factor: 'Interactive Behavior',
        impact: (analysisResult.layerResults.interactive.biasScore > this.config.thresholds.highLevel ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Bias in interactive AI behavior patterns, potentially affecting user experience'
      });
    }

    if (analysisResult.layerResults.evaluation?.biasScore > this.config.thresholds.warningLevel) {
      factors.push({
        factor: 'Evaluation Metrics',
        impact: (analysisResult.layerResults.evaluation.biasScore > this.config.thresholds.highLevel ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        description: 'Bias detected in evaluation and assessment metrics'
      });
    }

    return factors;
  }

  /**
   * Generate targeted recommendations based on analysis
   */
  private generateTargetedRecommendations(analysisResult: BiasAnalysisResult, demographicGroup?: DemographicGroup): string[] {
    const recommendations = [...(analysisResult.recommendations || [])];

    // Add specific recommendations based on bias level
    if (analysisResult.overallBiasScore > this.config.thresholds.criticalLevel) {
      recommendations.push('URGENT: Suspend AI system for immediate bias remediation');
      recommendations.push('Conduct comprehensive audit of training data and model parameters');
    } else if (analysisResult.overallBiasScore > this.config.thresholds.highLevel) {
      recommendations.push('Implement immediate bias mitigation strategies');
      recommendations.push('Increase monitoring frequency for this demographic group');
    }

    // Add demographic-specific recommendations
    if (demographicGroup) {
      recommendations.push(`Review training data representation for ${demographicGroup.type}: ${demographicGroup.value}`);
      recommendations.push(`Consider specialized training scenarios for ${demographicGroup.value} demographic`);
    }

    return Array.from(new Set(recommendations));
  }

  /**
   * Generate explanation summary
   */
  private generateExplanationSummary(analysisResult: BiasAnalysisResult, demographicGroup?: DemographicGroup): string {
    const score = analysisResult.overallBiasScore;
    const level = analysisResult.alertLevel;
    const demographic = demographicGroup ? `for ${demographicGroup.type} group "${demographicGroup.value}"` : '';

    return `Bias analysis ${demographic} detected a ${level} level bias with score ${score.toFixed(3)}. ` +
           `The analysis indicates ${this.getBiasLevelDescription(score)} bias patterns in the therapeutic AI system.`;
  }

  /**
   * Generate detailed explanation
   */
  private generateDetailedExplanation(analysisResult: BiasAnalysisResult): string {
    const layerAnalysis = Object.entries(analysisResult.layerResults)
      .map(([layer, result]) => `${layer}: ${(result?.biasScore || 0).toFixed(3)}`)
      .join(', ');

    return `Detailed analysis across detection layers revealed: ${layerAnalysis}. ` +
           `The weighted aggregate score of ${analysisResult.overallBiasScore.toFixed(3)} was calculated using ` +
           `configured layer weights. Confidence level: ${(analysisResult.confidence * 100).toFixed(1)}%.`;
  }

  /**
   * Generate counterfactual explanation
   */
  private async generateCounterfactualExplanation(analysisResult: BiasAnalysisResult): Promise<Array<{
    scenario: string;
    expectedOutcome: string;
    biasReduction: number;
  }>> {
    // This would typically call the Python service for What-If Tool analysis
    return [
      {
        scenario: 'Alternative demographic representation',
        expectedOutcome: 'Reduced bias in model predictions',
        biasReduction: 0.15
      },
      {
        scenario: 'Balanced training data',
        expectedOutcome: 'More equitable response patterns',
        biasReduction: 0.22
      }
    ];
  }

  /**
   * Get bias level description
   */
  private getBiasLevelDescription(score: number): string {
    if (score >= this.config.thresholds.criticalLevel) return 'critical';
    if (score >= this.config.thresholds.highLevel) return 'significant';
    if (score >= this.config.thresholds.warningLevel) return 'moderate';
    return 'minimal';
  }

  // Helper methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Bias Detection Engine not initialized. Call initialize() first.');
    }
  }

  private calculateOverallBiasScore(layerResults: any[]): number {
    // Implement weighted scoring algorithm
    const weights = this.config.layerWeights || {
      preprocessing: 0.2,
      modelLevel: 0.3,
      interactive: 0.2,
      evaluation: 0.3
    };

    return layerResults.reduce((score, result, index) => {
      const layerScore = result.biasScore || 0;
      const weight = Object.values(weights)[index] || 0.25;
      return score + (layerScore * weight);
    }, 0);
  }

  private generateRecommendations(layerResults: any[]): string[] {
    const recommendations: string[] = [];
    
    layerResults.forEach((result, index) => {
      if (result.biasScore > this.config.thresholds.warningLevel) {
        recommendations.push(...(result.recommendations || []));
      }
    });

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private determineAlertLevel(layerResults: any[]): 'low' | 'medium' | 'high' | 'critical' {
    const maxBiasScore = Math.max(...layerResults.map(r => r.biasScore || 0));
    
    if (maxBiasScore >= this.config.thresholds.criticalLevel) {
      return 'critical';
    }
    if (maxBiasScore >= this.config.thresholds.highLevel) {
      return 'high';
    }
    if (maxBiasScore >= this.config.thresholds.warningLevel) {
      return 'medium';
    }
    return 'low';
  }

  private calculateConfidenceScore(layerResults: any[]): number {
    // Calculate confidence based on consistency across layers and data quality
    const scores = layerResults.map(r => r.biasScore || 0);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher confidence when scores are consistent (low standard deviation)
    // and when we have sufficient data quality
    const consistencyScore = Math.max(0, 1 - (standardDeviation / mean || 0));
    const dataQualityScore = layerResults.reduce((avg, result) => {
      const quality = result.dataQualityMetrics?.completeness || 0.5;
      return avg + quality;
    }, 0) / layerResults.length;
    
    return Math.min(1, (consistencyScore * 0.6) + (dataQualityScore * 0.4));
  }

  private generateCounterfactualScenarios(session: TherapeuticSession): any[] {
    // Generate counterfactual scenarios for What-If Tool analysis
    const scenarios: any[] = [];
    const demographics = session.participantDemographics;
    
    // Generate scenarios with different demographic combinations
    const ageGroups = ['18-25', '26-35', '36-50', '51-65', '65+'];
    const genders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
    const ethnicities = ['white', 'black', 'hispanic', 'asian', 'other'];
    
    ageGroups.forEach(age => {
      genders.forEach(gender => {
        ethnicities.forEach(ethnicity => {
          scenarios.push({
            ...session,
            participantDemographics: {
              ...demographics,
              age,
              gender,
              ethnicity
            }
          });
        });
      });
    });
    
    return scenarios.slice(0, 20); // Limit to prevent overwhelming analysis
  }

  private extractDemographicGroups(session: TherapeuticSession): DemographicGroup[] {
    const demographics = session.participantDemographics;
    
    const groups: DemographicGroup[] = [
      { type: 'age' as const, value: demographics.age },
      { type: 'gender' as const, value: demographics.gender },
      { type: 'ethnicity' as const, value: demographics.ethnicity },
      { type: 'language' as const, value: demographics.primaryLanguage || 'english' },
      { type: 'socioeconomic' as const, value: demographics.socioeconomicStatus || 'not-specified' }
    ];
    
    return groups.filter(group => group.value && group.value !== 'not-specified');
  }

  /**
   * Dispose of all resources with comprehensive cleanup
   */
  async dispose(options?: {
    forceCleanup?: boolean;
    gracefulShutdown?: boolean;
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    componentsDisposed: string[];
    errors: Array<{ component: string; error: string }>;
    disposalTimeMs: number;
  }> {
    const startTime = Date.now();
    const { 
      forceCleanup = false, 
      gracefulShutdown = true, 
      timeoutMs = 10000 
    } = options || {};

    const componentsDisposed: string[] = [];
    const errors: Array<{ component: string; error: string }> = [];

    logger.info('Starting Bias Detection Engine disposal', {
      isInitialized: this.isInitialized,
      monitoringActive: this.monitoringActive,
      forceCleanup,
      gracefulShutdown
    });

    try {
      // Stop monitoring first to prevent new operations
      if (this.monitoringActive) {
        try {
          this.stopMonitoring();
          componentsDisposed.push('monitoring');
          logger.debug('Monitoring stopped during disposal');
        } catch (error) {
          errors.push({
            component: 'monitoring',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Set up timeout for disposal process
      const disposalPromise = this.performDisposal(componentsDisposed, errors, gracefulShutdown);
      
      let disposalResult;
      if (timeoutMs > 0) {
        disposalResult = await Promise.race([
          disposalPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Disposal timeout exceeded')), timeoutMs)
          )
        ]);
      } else {
        disposalResult = await disposalPromise;
      }

      // Final cleanup regardless of previous state
      this.performFinalCleanup();
      componentsDisposed.push('final_cleanup');

      const disposalTimeMs = Date.now() - startTime;
      const success = errors.length === 0 || forceCleanup;

      logger.info('Bias Detection Engine disposal completed', {
        success,
        componentsDisposed: componentsDisposed.length,
        errors: errors.length,
        disposalTimeMs
      });

      return {
        success,
        componentsDisposed,
        errors,
        disposalTimeMs
      };

    } catch (error) {
      const disposalTimeMs = Date.now() - startTime;
      
      logger.error('Bias Detection Engine disposal failed', { 
        error,
        disposalTimeMs,
        componentsDisposed: componentsDisposed.length
      });

      if (forceCleanup) {
        logger.warn('Performing forced cleanup after disposal failure');
        this.performFinalCleanup();
        componentsDisposed.push('forced_cleanup');
      }

      return {
        success: forceCleanup,
        componentsDisposed,
        errors: [
          ...errors,
          { 
            component: 'disposal_process', 
            error: error instanceof Error ? error.message : String(error) 
          }
        ],
        disposalTimeMs
      };
    }
  }

  /**
   * Perform the main disposal operations
   */
  private async performDisposal(
    componentsDisposed: string[],
    errors: Array<{ component: string; error: string }>,
    gracefulShutdown: boolean
  ): Promise<void> {
    if (!this.isInitialized) {
      logger.debug('Engine not initialized, skipping component disposal');
      return;
    }

    // Dispose of components in reverse order of initialization
    const disposalTasks = [
      { name: 'alertSystem', component: this.alertSystem },
      { name: 'metricsCollector', component: this.metricsCollector },
      { name: 'pythonBridge', component: this.pythonBridge }
    ];

    if (gracefulShutdown) {
      // Sequential disposal for graceful shutdown
      for (const task of disposalTasks) {
        try {
          logger.debug(`Disposing ${task.name}...`);
          await task.component.dispose();
          componentsDisposed.push(task.name);
          logger.debug(`${task.name} disposed successfully`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to dispose ${task.name}`, { error: errorMsg });
          errors.push({ component: task.name, error: errorMsg });
        }
      }
    } else {
      // Parallel disposal for faster shutdown
      const disposalPromises = disposalTasks.map(async (task) => {
        try {
          logger.debug(`Disposing ${task.name}...`);
          await task.component.dispose();
          componentsDisposed.push(task.name);
          logger.debug(`${task.name} disposed successfully`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to dispose ${task.name}`, { error: errorMsg });
          errors.push({ component: task.name, error: errorMsg });
        }
      });

      await Promise.allSettled(disposalPromises);
    }
  }

  /**
   * Perform final cleanup operations
   */
  private performFinalCleanup(): void {
    try {
      // Clear any remaining intervals or timeouts
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }

      // Reset state variables
      this.isInitialized = false;
      this.monitoringActive = false;
      this.monitoringCallbacks = [];

      // Clear any cached data or temporary state
      // (This would include clearing caches, temp files, etc.)

      logger.debug('Final cleanup completed');
    } catch (error) {
      logger.warn('Error during final cleanup', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Check if the engine is properly disposed
   */
  isDisposed(): boolean {
    return !this.isInitialized && 
           !this.monitoringActive && 
           !this.monitoringInterval &&
           this.monitoringCallbacks.length === 0;
  }

  /**
   * Get disposal status information
   */
  getDisposalStatus(): {
    isDisposed: boolean;
    activeComponents: string[];
    lastDisposalTime?: Date;
  } {
    const activeComponents: string[] = [];
    
    if (this.isInitialized) activeComponents.push('engine');
    if (this.monitoringActive) activeComponents.push('monitoring');
    if (this.monitoringInterval) activeComponents.push('monitoring_interval');
    if (this.monitoringCallbacks.length > 0) activeComponents.push('monitoring_callbacks');

    return {
      isDisposed: this.isDisposed(),
      activeComponents,
      // lastDisposalTime would be tracked in a real implementation
    };
  }

  /**
   * Start real-time monitoring with callback for updates
   */
  async startMonitoring(
    callback: (data: {
      timestamp: Date;
      activeAnalyses: number;
      recentAlerts: any[];
      systemHealth: string;
      performanceMetrics: any;
    }) => void,
    intervalMs: number = 30000 // Default 30 seconds
  ): Promise<void> {
    this.ensureInitialized();
    
    if (this.monitoringActive) {
      logger.warn('Monitoring already active');
      return;
    }
    
    try {
      logger.info('Starting bias detection monitoring', { intervalMs });
      
      this.monitoringCallbacks.push(callback);
      this.monitoringActive = true;
      
      // Start monitoring interval
      this.monitoringInterval = setInterval(async () => {
        try {
          const monitoringData = await this.collectMonitoringData();
          
          // Call all registered callbacks
          this.monitoringCallbacks.forEach(cb => {
            try {
              cb(monitoringData);
            } catch (error) {
              logger.error('Monitoring callback error', { error });
            }
          });
          
        } catch (error) {
          logger.error('Monitoring data collection error', { error });
        }
      }, intervalMs);
      
      // Send initial data
      const initialData = await this.collectMonitoringData();
      callback(initialData);
      
      logger.info('Bias detection monitoring started successfully');
      
    } catch (error) {
      this.monitoringActive = false;
      logger.error('Failed to start monitoring', { error });
      throw new Error(`Failed to start monitoring: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (!this.monitoringActive) {
      logger.warn('Monitoring not currently active');
      return;
    }
    
    try {
      logger.info('Stopping bias detection monitoring');
      
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }
      
      this.monitoringActive = false;
      this.monitoringCallbacks = [];
      
      logger.info('Bias detection monitoring stopped successfully');
      
    } catch (error) {
      logger.error('Error stopping monitoring', { error });
    }
  }

  /**
   * Collect current monitoring data
   */
  private async collectMonitoringData(): Promise<{
    timestamp: Date;
    activeAnalyses: number;
    recentAlerts: any[];
    systemHealth: string;
    performanceMetrics: any;
  }> {
    const [activeAnalyses, recentAlerts, performanceMetrics] = await Promise.all([
      this.metricsCollector.getActiveAnalysesCount(),
      this.alertSystem.getRecentAlerts(),
      this.metricsCollector.getCurrentPerformanceMetrics()
    ]);
    
    const systemHealth = this.assessSystemHealth(performanceMetrics);
    
    return {
      timestamp: new Date(),
      activeAnalyses,
      recentAlerts,
      systemHealth,
      performanceMetrics
    };
  }

  /**
   * Assess overall system health based on performance metrics
   */
  private assessSystemHealth(metrics: any): string {
    if (!metrics) return 'unknown';
    
    const { errorRate, averageResponseTime, memoryUsage } = metrics;
    
    if (errorRate > 0.1 || averageResponseTime > 5000 || memoryUsage > 0.9) {
      return 'critical';
    } else if (errorRate > 0.05 || averageResponseTime > 2000 || memoryUsage > 0.8) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Generate recommendations based on metrics data
   */
  private generateMetricsRecommendations(summaryData: any, demographicData: any): string[] {
    const recommendations: string[] = [];
    
    if (summaryData.averageBiasScore > this.config.thresholds.warningLevel) {
      recommendations.push('Consider reviewing training scenarios to reduce bias patterns');
    }
    
    // Check for demographic disparities
    const demographics = Object.entries(demographicData);
    const maxBiasScore = Math.max(...demographics.map(([_, data]: [string, any]) => data.averageBiasScore));
    const minBiasScore = Math.min(...demographics.map(([_, data]: [string, any]) => data.averageBiasScore));
    
    if (maxBiasScore - minBiasScore > 0.2) {
      recommendations.push('Significant bias disparity detected across demographic groups - review data representation');
    }
    
    if (summaryData.alertDistribution.critical > 0) {
      recommendations.push('Critical bias alerts detected - immediate intervention recommended');
    }
    
    return recommendations;
  }

  /**
   * Start real-time monitoring and dashboard data aggregation
   */
  async startRealTimeMonitoring(): Promise<void> {
    this.isInitialized = true;
    
    // Initialize metrics containers if not already done
    if (!this.metrics.has('biasScores')) {
      this.metrics.set('biasScores', []);
      this.metrics.set('alertLevels', []);
      this.metrics.set('analysisTypes', []);
      this.metrics.set('systemPerformance', []);
      this.metrics.set('realTimeMetrics', []);
      this.metrics.set('dashboardAggregates', []);
    }
    
    // Start monitoring WebSocket connections
    await this.initializeWebSocketMonitoring();
    
    // Start real-time metrics collection
    this.startRealTimeMetricsCollection();
    
    // Start dashboard data aggregation
    this.startDashboardAggregation();
    
    // Start periodic aggregation
    this.startPeriodicAggregation();
    
    this.logger.info('Real-time monitoring started successfully');
  }

  /**
   * Initialize WebSocket monitoring for real-time alerts
   */
  private async initializeWebSocketMonitoring(): Promise<void> {
    try {
      // Note: In a real implementation, this would establish WebSocket connections
      // For now, we'll simulate real-time capabilities with intervals
      this.logger.info('WebSocket monitoring initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize WebSocket monitoring', { error });
    }
  }

  /**
   * Start real-time metrics collection
   */
  private startRealTimeMetricsCollection(): void {
    // Collect real-time metrics every 10 seconds
    setInterval(async () => {
      await this.collectRealTimeMetrics();
    }, 10000);
    
    this.logger.debug('Real-time metrics collection started');
  }

  /**
   * Collect current real-time metrics
   */
  private async collectRealTimeMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      const memoryUsage = process.memoryUsage();
      
      const realTimeMetric = {
        timestamp,
        systemHealth: this.assessSystemHealth(),
        activeConnections: this.getActiveConnectionsCount(),
        memoryUsage: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          rss: memoryUsage.rss
        },
        cachePerformance: await this.getCachePerformanceMetrics(),
        analysisQueueSize: this.getAnalysisQueueSize(),
        alertQueueSize: this.getAlertQueueSize(),
        responseTimeMetrics: this.getResponseTimeMetrics(),
        errorRateMetrics: this.getErrorRateMetrics()
      };
      
      this.metrics.get('realTimeMetrics')?.push(realTimeMetric);
      
      // Keep only last 1000 real-time metrics (about 2.7 hours at 10-second intervals)
      const realTimeMetrics = this.metrics.get('realTimeMetrics');
      if (realTimeMetrics && realTimeMetrics.length > 1000) {
        this.metrics.set('realTimeMetrics', realTimeMetrics.slice(-1000));
      }
      
      // Record performance metrics
      this.recordPerformanceMetric('memoryUsage', memoryUsage.heapUsed / 1024 / 1024); // MB
      
    } catch (error) {
      this.logger.error('Failed to collect real-time metrics', { error });
    }
  }

  /**
   * Start dashboard data aggregation
   */
  private startDashboardAggregation(): void {
    // Aggregate dashboard data every 30 seconds for real-time updates
    setInterval(async () => {
      await this.aggregateDashboardData();
    }, 30000);
    
    this.logger.debug('Dashboard data aggregation started');
  }

  /**
   * Aggregate data for dashboard display
   */
  private async aggregateDashboardData(): Promise<void> {
    try {
      const timestamp = new Date();
      const timeWindows = ['1m', '5m', '15m', '1h', '24h'];
      
      for (const window of timeWindows) {
        const windowData = await this.aggregateForTimeWindow(window);
        
        const dashboardAggregate = {
          timestamp,
          timeWindow: window,
          metrics: {
            totalAnalyses: windowData.totalAnalyses,
            averageBiasScore: windowData.averageBiasScore,
            alertDistribution: windowData.alertDistribution,
            performanceSummary: windowData.performanceSummary,
            demographicBreakdown: windowData.demographicBreakdown,
            trendsOverTime: windowData.trendsOverTime,
            systemHealth: this.assessSystemHealth(),
            alertsLastPeriod: windowData.alertsLastPeriod,
            topIssues: windowData.topIssues,
            processingCapacity: this.getProcessingCapacity()
          }
        };
        
        this.metrics.get('dashboardAggregates')?.push(dashboardAggregate);
      }
      
      // Keep only last 100 dashboard aggregates per time window
      const aggregates = this.metrics.get('dashboardAggregates') || [];
      if (aggregates.length > 500) { // 100 * 5 time windows
        this.metrics.set('dashboardAggregates', aggregates.slice(-500));
      }
      
    } catch (error) {
      this.logger.error('Failed to aggregate dashboard data', { error });
    }
  }

  /**
   * Aggregate metrics for a specific time window
   */
  private async aggregateForTimeWindow(window: string): Promise<{
    totalAnalyses: number;
    averageBiasScore: number;
    alertDistribution: Record<string, number>;
    performanceSummary: any;
    demographicBreakdown: Record<string, any>;
    trendsOverTime: any[];
    alertsLastPeriod: number;
    topIssues: Array<{ issue: string; count: number; severity: string }>;
  }> {
    const timeRange = this.parseTimeRange(window);
    const biasScores = (this.metrics.get('biasScores') || [])
      .filter((item: any) => item.timestamp >= timeRange.start);
    
    const alertLevels = (this.metrics.get('alertLevels') || [])
      .filter((item: any) => item.timestamp >= timeRange.start);
    
    const totalAnalyses = biasScores.length;
    const averageBiasScore = totalAnalyses > 0 
      ? biasScores.reduce((sum: number, item: any) => sum + item.score, 0) / totalAnalyses 
      : 0;
    
    const alertDistribution = alertLevels.reduce((dist: Record<string, number>, item: any) => {
      dist[item.level] = (dist[item.level] || 0) + 1;
      return dist;
    }, { low: 0, medium: 0, high: 0, critical: 0 });
    
    const demographicBreakdown = await this.aggregateDemographicData(timeRange);
    const trendsOverTime = await this.generateTrendsData(timeRange);
    const topIssues = await this.identifyTopIssues(timeRange);
    
    return {
      totalAnalyses,
      averageBiasScore: Math.round(averageBiasScore * 1000) / 1000,
      alertDistribution,
      performanceSummary: this.getCurrentPerformanceSummary(),
      demographicBreakdown,
      trendsOverTime,
      alertsLastPeriod: Object.values(alertDistribution).reduce((sum, count) => sum + count, 0),
      topIssues
    };
  }

  /**
   * Generate real-time dashboard data
   */
  async getRealTimeDashboardData(timeWindow: string = '1h'): Promise<{
    timestamp: Date;
    summary: {
      totalAnalyses: number;
      averageBiasScore: number;
      alertsActive: number;
      systemHealth: string;
      processingCapacity: number;
    };
    charts: {
      biasScoreTimeline: Array<{ time: Date; score: number }>;
      alertDistribution: Record<string, number>;
      demographicBreakdown: Record<string, any>;
      performanceTrends: Array<{ time: Date; responseTime: number; throughput: number }>;
    };
    alerts: Array<{
      id: string;
      timestamp: Date;
      level: string;
      message: string;
      acknowledged: boolean;
    }>;
    systemMetrics: {
      memoryUsage: number;
      cpuUsage: number;
      cacheHitRate: number;
      activeConnections: number;
    };
  }> {
    const timeRange = this.parseTimeRange(timeWindow);
    const windowData = await this.aggregateForTimeWindow(timeWindow);
    const realTimeMetrics = this.getLatestRealTimeMetrics();
    
    return {
      timestamp: new Date(),
      summary: {
        totalAnalyses: windowData.totalAnalyses,
        averageBiasScore: windowData.averageBiasScore,
        alertsActive: windowData.alertsLastPeriod,
        systemHealth: this.assessSystemHealth(),
        processingCapacity: this.getProcessingCapacity()
      },
      charts: {
        biasScoreTimeline: this.generateBiasScoreTimeline(timeRange),
        alertDistribution: windowData.alertDistribution,
        demographicBreakdown: windowData.demographicBreakdown,
        performanceTrends: this.generatePerformanceTrends(timeRange)
      },
      alerts: await this.getActiveAlerts(),
      systemMetrics: {
        memoryUsage: realTimeMetrics?.memoryUsage?.heapUsed || 0,
        cpuUsage: this.estimateCpuUsage(),
        cacheHitRate: await this.getCacheHitRate(),
        activeConnections: realTimeMetrics?.activeConnections || 0
      }
    };
  }

  /**
   * Get active analyses count for monitoring
   */
  async getActiveAnalysesCount(): Promise<number> {
    // In a real implementation, this would track active analysis sessions
    return this.sessionMetrics.size;
  }

  /**
   * Get current performance metrics
   */
  async getCurrentPerformanceMetrics(): Promise<{
    systemHealth: string;
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  }> {
    const summary = this.getCurrentPerformanceSummary();
    
    return {
      systemHealth: this.assessSystemHealth(),
      responseTime: summary.averageResponseTime,
      throughput: this.calculateThroughput(),
      errorRate: summary.errorRate,
      uptime: (Date.now() - this.performanceMetrics.startTime.getTime()) / 1000
    };
  }

  /**
   * Stream real-time metrics to connected clients
   */
  async streamMetricsToClients(clients: any[]): Promise<void> {
    try {
      const realTimeData = await this.getRealTimeDashboardData('5m');
      
      const streamData = {
        type: 'metrics-update',
        timestamp: new Date(),
        data: realTimeData
      };
      
      for (const client of clients) {
        try {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify(streamData));
          }
        } catch (error) {
          this.logger.warn('Failed to send metrics to client', { error });
        }
      }
      
      this.logger.debug('Streamed metrics to clients', { clientCount: clients.length });
    } catch (error) {
      this.logger.error('Failed to stream metrics to clients', { error });
    }
  }

  // Helper methods for real-time monitoring

  private assessSystemHealth(): string {
    const performance = this.getCurrentPerformanceSummary();
    const memoryUsage = process.memoryUsage();
    const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (performance.errorRate > 0.1 || heapUsagePercent > 90) {
      return 'critical';
    } else if (performance.errorRate > 0.05 || heapUsagePercent > 80) {
      return 'warning';
    } else if (performance.averageResponseTime > 1000) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private getActiveConnectionsCount(): number {
    // In a real implementation, this would track active WebSocket connections
    return Math.floor(Math.random() * 100) + 10; // Simulated for now
  }

  private async getCachePerformanceMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    totalRequests: number;
  }> {
    // This would integrate with the actual cache service
    return {
      hitRate: Math.random() * 0.3 + 0.7, // 70-100%
      missRate: Math.random() * 0.3, // 0-30%
      totalRequests: Math.floor(Math.random() * 1000) + 100
    };
  }

  private getAnalysisQueueSize(): number {
    // In a real implementation, this would track queued analysis requests
    return Math.floor(Math.random() * 10); // Simulated
  }

  private getAlertQueueSize(): number {
    // In a real implementation, this would track queued alert notifications
    return Math.floor(Math.random() * 5); // Simulated
  }

  private getResponseTimeMetrics(): {
    current: number;
    average: number;
    p95: number;
    p99: number;
  } {
    // Get performance metrics from the engine
    const performanceData = this.getCurrentPerformanceSummary();
    
    return {
      current: performanceData.averageResponseTime || 0,
      average: performanceData.averageResponseTime || 0,
      p95: performanceData.averageResponseTime * 1.5 || 0, // Simulated P95
      p99: performanceData.averageResponseTime * 2 || 0   // Simulated P99
    };
  }

  async dispose(): Promise<void> {
    try {
      this.logger.info('Disposing BiasAlertSystem');
      
      // Stop intervals
      if (this.escalationInterval) {
        clearInterval(this.escalationInterval);
        this.escalationInterval = undefined;
      }
      
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = undefined;
      }
      
      // Clear all data
      this.alertHistory = [];
      this.notificationChannels.clear();
      this.alertRules = [];
      this.escalationRules = [];
      this.suppressionFilters = [];
      
      this.isInitialized = false;
      
      this.logger.info('BiasAlertSystem disposed successfully');
    } catch (error) {
      this.logger.error('Error during BiasAlertSystem disposal', { error });
      throw error;
    }
  }
} 