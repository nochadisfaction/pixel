import { getLogger } from '@/lib/utils/logger'
import { EvidenceService } from './evidence/EvidenceService'
import { ExpertGuidanceOrchestrator } from './ExpertGuidanceOrchestrator'
import type {
  MentalLLaMAAdapterOptions,
  MentalHealthAnalysisResult,
  ExpertGuidedAnalysisResult,
  RoutingContext,
  CrisisContext,
  ICrisisNotificationHandler,
  IMentalHealthTaskRouter,
  IModelProvider,
  AnalysisFailure,
} from './types/mentalLLaMATypes'

const logger = getLogger('MentalLLaMAAdapter')

export class MentalLLaMAAdapter {
  private modelProvider: IModelProvider | undefined
  private crisisNotifier: ICrisisNotificationHandler | undefined
  private taskRouter: IMentalHealthTaskRouter | undefined
  private evidenceService: EvidenceService
  private expertGuidanceOrchestrator: ExpertGuidanceOrchestrator

  constructor(options: MentalLLaMAAdapterOptions) {
    this.modelProvider = options.modelProvider
    this.crisisNotifier = options.crisisNotifier
    this.taskRouter = options.taskRouter

    // Initialize evidence service with model provider
    this.evidenceService = new EvidenceService(this.modelProvider, {
      enableLLMEnhancement: !!this.modelProvider,
      enableCaching: true,
      enableMetrics: true,
    })

    // Initialize expert guidance orchestrator
    this.expertGuidanceOrchestrator = new ExpertGuidanceOrchestrator(
      this.evidenceService,
      this.modelProvider,
      this.crisisNotifier,
    )

    logger.info('MentalLLaMAAdapter initialized.', {
      hasCrisisNotifier: !!this.crisisNotifier,
      hasTaskRouter: !!this.taskRouter,
      hasEvidenceService: true,
    })

    if (!this.taskRouter) {
      logger.warn(
        'MentalLLaMAAdapter initialized without a TaskRouter. Analysis will be limited.',
      )
    }
    if (!this.modelProvider) {
      logger.warn(
        'MentalLLaMAAdapter initialized without a ModelProvider. Analysis capabilities will be significantly limited.',
      )
    }
  }

  public async analyzeMentalHealth(
    text: string,
    routingContextParams?: Partial<RoutingContext>,
  ): Promise<MentalHealthAnalysisResult> {
    const analysisTimestamp = new Date().toISOString()

    if (!this.taskRouter) {
      logger.error('TaskRouter not available, cannot perform analysis.')
      return {
        hasMentalHealthIssue: false,
        mentalHealthCategory: 'unknown',
        confidence: 0,
        explanation: 'Analysis unavailable: TaskRouter not configured.',
        isCrisis: false,
        timestamp: analysisTimestamp,
      }
    }

    if (!this.modelProvider) {
      logger.error(
        'ModelProvider not available, cannot perform detailed analysis.',
      )
      // Fallback to router-based crisis detection if model provider is missing
    }

    const routingInput = {
      text,
      ...(routingContextParams && {
        context: routingContextParams as RoutingContext,
      }),
    }
    const routingDecision = await this.taskRouter.route(routingInput)

    const {
      isCritical,
      targetAnalyzer,
      confidence: routingConfidence,
      insights,
    } = routingDecision
    let isCrisis = isCritical || targetAnalyzer === 'crisis'
    let mentalHealthCategory = targetAnalyzer
    let confidence = routingConfidence
    let explanation = `Analysis based on routing to ${mentalHealthCategory}. Further details require full model integration.` // Default explanation
    // Initialize supportingEvidence array early to ensure it's available throughout the method scope
    let supportingEvidence: string[] = [] // Populated by specific analysis if ModelProvider is available

    // Track any failures that occur during analysis
    const failures: AnalysisFailure[] = []

    if (isCrisis) {
      explanation = `Potential crisis detected. Routing decision: ${routingDecision.method}. Insights: ${JSON.stringify(insights || {})}. Immediate review advised.`
      logger.warn('Crisis detected by TaskRouter.', {
        userId: routingContextParams?.userId,
        sessionId: routingContextParams?.sessionId,
        decision: routingDecision,
      })

      if (this.crisisNotifier) {
        const crisisContext: CrisisContext = {
          ...(routingContextParams?.userId && {
            userId: routingContextParams.userId,
          }),
          ...(routingContextParams?.sessionId && {
            sessionId: routingContextParams.sessionId,
          }),
          ...(routingContextParams?.sessionType && {
            sessionType: routingContextParams.sessionType,
          }),
          analysisResult: {
            hasMentalHealthIssue: true,
            mentalHealthCategory: 'crisis',
            confidence: routingConfidence,
            explanation: '',
            isCrisis: true,
            timestamp: analysisTimestamp,
          },
          ...(routingContextParams?.explicitTaskHint && {
            explicitTaskHint: routingContextParams.explicitTaskHint,
          }),
          textSample: text.substring(0, 500), // Send a sample of the text
          timestamp: analysisTimestamp,
          decisionDetails: routingDecision,
        }
        try {
          await this.crisisNotifier.sendCrisisAlert(crisisContext)
          logger.info('Crisis alert dispatched successfully.', {
            userId: routingContextParams?.userId,
          })

          // Flag session for immediate review
          try {
            const { CrisisSessionFlaggingService } = await import(
              '../crisis/CrisisSessionFlaggingService'
            )
            const flaggingService = new CrisisSessionFlaggingService()

            const crisisId = crypto.randomUUID()
            await flaggingService.flagSessionForReview({
              userId: crisisContext.userId || 'unknown',
              sessionId: crisisContext.sessionId || 'unknown',
              crisisId,
              timestamp: crisisContext.timestamp,
              reason: 'Crisis detected by MentalLLaMA',
              severity: 'high',
              detectedRisks: (routingDecision.insights?.[
                'detectedRisks'
              ] as string[]) || ['crisis_detected'],
              confidence: routingConfidence,
              textSample: text.substring(0, 500),
              routingDecision: routingDecision,
            })

            logger.info('Session flagged for review successfully.', {
              userId: routingContextParams?.userId,
              sessionId: routingContextParams?.sessionId,
              crisisId,
            })
          } catch (flagError) {
            logger.error('Failed to flag session for review.', {
              error: flagError,
              userId: routingContextParams?.userId,
              sessionId: routingContextParams?.sessionId,
            })
            failures.push({
              type: 'crisis_notification',
              message: 'Failed to flag session for immediate review',
              timestamp: new Date().toISOString(),
              error: flagError,
              context: routingDecision,
            })
            explanation += ' Failed to flag session for immediate review.'
          }
        } catch (error) {
          logger.error('Failed to dispatch crisis alert via notifier.', {
            error,
            userId: routingContextParams?.userId,
          })
          failures.push({
            type: 'crisis_notification',
            message: 'Failed to dispatch crisis alert notification',
            timestamp: new Date().toISOString(),
            error: error,
            context: routingDecision,
          })
          // Potentially add this failure information to the explanation or result
          explanation += ' Failed to dispatch crisis alert notification.'
        }
      } else {
        logger.warn(
          'Crisis detected, but no crisisNotifier is configured. Alert not sent.',
        )
        explanation += ' No crisis notification service configured.'
      }
    } else {
      // Placeholder for non-crisis analysis based on routingDecision.targetAnalyzer
      // This would involve calling the appropriate model/logic via this.modelProvider

      if (
        this.modelProvider &&
        mentalHealthCategory === 'general_mental_health'
      ) {
        logger.info(
          `Performing detailed analysis for 'general_mental_health' using ModelProvider.`,
        )
        const generalAnalysisMessages = [
          {
            role: 'system' as const,
            content: `You are a helpful AI assistant providing a general mental health assessment based on user text.
Analyze the user's text and provide:
1. A concise overall mental health assessment (e.g., "appears to be managing well," "shows signs of mild distress," "no specific acute concerns noted from this text").
2. A brief explanation for your assessment.
3. Identify up to 3 short, key phrases or sentences from the text that support your assessment.

Respond ONLY with a JSON object matching this schema:
{
  "assessment": "string",
  "explanation": "string",
  "supportingEvidence": ["string", "string", ...]
}`,
          },
          { role: 'user' as const, content: text },
        ]

        try {
          const llmResponse = await this.modelProvider.invoke(
            generalAnalysisMessages,
            { temperature: 0.5, max_tokens: 300 },
          )
          if (llmResponse.content) {
            try {
              const parsedContent = JSON.parse(llmResponse.content)
              explanation = `Assessment: ${parsedContent.assessment}. Explanation: ${parsedContent.explanation}`
              supportingEvidence = parsedContent.supportingEvidence || []
              // Optionally, adjust confidence based on LLM's assessment if possible, or keep router's confidence.
            } catch (e) {
              logger.error(
                'Failed to parse JSON response from ModelProvider for general_mental_health analysis.',
                { content: llmResponse.content, error: e },
              )
              explanation = `Detailed analysis for ${mentalHealthCategory} received malformed response.`
            }
          } else {
            explanation = `Detailed analysis for ${mentalHealthCategory} returned no content.`
          }
        } catch (error) {
          logger.error(
            'Exception during ModelProvider call for general_mental_health analysis:',
            error,
          )
          explanation = `Exception during detailed analysis for ${mentalHealthCategory}.`
        }

        // Extract enhanced evidence using the evidence service
        try {
          const evidenceResult =
            await this.evidenceService.extractSupportingEvidence(
              text,
              mentalHealthCategory,
              undefined, // No base analysis yet as we're building it
              routingContextParams,
            )

          // Combine LLM evidence with extracted evidence
          const combinedEvidence = new Set([
            ...supportingEvidence,
            ...evidenceResult.evidenceItems,
          ])
          supportingEvidence = Array.from(combinedEvidence).slice(0, 8)

          logger.info('Enhanced evidence extraction completed', {
            originalCount: supportingEvidence.length,
            extractedCount: evidenceResult.evidenceItems.length,
            finalCount: supportingEvidence.length,
            evidenceStrength:
              evidenceResult.processingMetadata.evidenceStrength,
          })
        } catch (evidenceError) {
          logger.error(
            'Enhanced evidence extraction failed, using basic evidence',
            {
              error: evidenceError,
              category: mentalHealthCategory,
            },
          )
          // Continue with existing evidence from LLM
        }
      } else if (this.modelProvider && mentalHealthCategory !== 'unknown') {
        logger.warn(
          `Text routed to ${mentalHealthCategory} analyzer - detailed analysis is currently a stub implementation`,
          { decision: routingDecision },
        )
        explanation = `Text routed for ${mentalHealthCategory} analysis. Detailed analysis for this specific category is currently a stub.`
      } else {
        logger.info(
          `Text routed to ${mentalHealthCategory} analyzer. Full analysis logic is pending or ModelProvider unavailable.`,
          { decision: routingDecision },
        )
        explanation = `Text routed for ${mentalHealthCategory} analysis. Currently, detailed analysis for this category is a stub or ModelProvider is unavailable.`
      }

      if (
        (mentalHealthCategory === 'unknown' && confidence < 0.1) ||
        (mentalHealthCategory === 'general_mental_health' && confidence < 0.1)
      ) {
        confidence =
          routingDecision.confidence > 0 ? routingDecision.confidence : 0.1 // Ensure some confidence for default/unknown
      }
    }

    const result: MentalHealthAnalysisResult = {
      hasMentalHealthIssue:
        isCrisis ||
        (mentalHealthCategory !== 'none' &&
          mentalHealthCategory !== 'wellness' &&
          mentalHealthCategory !== 'unknown' &&
          mentalHealthCategory !== 'general_mental_health'),
      mentalHealthCategory,
      confidence,
      explanation,
      supportingEvidence: supportingEvidence || [],
      isCrisis,
      timestamp: analysisTimestamp,
      _routingDecision: routingDecision,
    }

    if (failures.length > 0) {
      result._failures = failures
    }

    return result
  }

  public async analyzeMentalHealthWithExpertGuidance(
    text: string,
    fetchExpertGuidance: boolean = true,
    routingContextParams?: Partial<RoutingContext>,
  ): Promise<ExpertGuidedAnalysisResult> {
    const analysisTimestamp = new Date().toISOString()
    logger.info('analyzeMentalHealthWithExpertGuidance called', {
      fetchExpertGuidance,
      userId: routingContextParams?.userId,
      sessionId: routingContextParams?.sessionId,
    })

    try {
      // Step 1: Perform base analysis with enhanced routing context
      const enhancedContext = {
        ...routingContextParams,
        explicitTaskHint:
          routingContextParams?.explicitTaskHint || 'expert_guided_analysis',
      }

      const baseAnalysis = await this.analyzeMentalHealth(text, enhancedContext)

      // Step 2: Use orchestrator for expert-guided analysis
      return await this.expertGuidanceOrchestrator.analyzeWithExpertGuidance(
        text,
        baseAnalysis,
        fetchExpertGuidance,
        routingContextParams,
      )
    } catch (error) {
      logger.error('Error in expert-guided analysis', {
        error,
        userId: routingContextParams?.userId,
        sessionId: routingContextParams?.sessionId,
      })

      // Fallback to base analysis with error indication
      const fallbackAnalysis = await this.analyzeMentalHealth(
        text,
        routingContextParams,
      )

      return {
        ...fallbackAnalysis,
        expertGuided: false,
        explanation: `${fallbackAnalysis.explanation} [Note: Expert guidance unavailable due to system error]`,
        _failures: [
          ...(fallbackAnalysis._failures || []),
          {
            type: 'general',
            message: 'Expert guidance system encountered an error',
            timestamp: analysisTimestamp,
            error,
            ...(fallbackAnalysis._routingDecision && {
              context: fallbackAnalysis._routingDecision,
            }),
          },
        ],
        timestamp: analysisTimestamp,
      }
    }
  }

  public async evaluateExplanationQuality(
    _explanation: string,
    _textContext?: string, // Original text that led to the explanation
  ): Promise<unknown> {
    logger.warn(
      'evaluateExplanationQuality is a stub implementation - expert guidance quality assessment not fully implemented',
    )
    // This is a stub. A real implementation would:
    // 1. Use an LLM or a set of heuristics to evaluate fluency, completeness, reliability, etc.
    // 2. Potentially use the pythonBridge if specific libraries are needed.
    return {
      fluency: 0.0,
      completeness: 0.0,
      reliability: 0.0,
      overall: 0.0,
      message: 'Not implemented. This is a stubbed response.',
    }
  }

  /**
   * Extract detailed supporting evidence for a given text and category
   * Public method to access evidence service capabilities
   */
  public async extractDetailedEvidence(
    text: string,
    category: string,
    baseAnalysis?: MentalHealthAnalysisResult,
    routingContext?: RoutingContext,
  ) {
    try {
      return await this.evidenceService.extractSupportingEvidence(
        text,
        category,
        baseAnalysis,
        routingContext,
      )
    } catch (error) {
      logger.error('Detailed evidence extraction failed', { error, category })
      throw new Error(
        `Evidence extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Get evidence service metrics
   */
  public getEvidenceMetrics() {
    return this.evidenceService.getMetrics()
  }

  /**
   * Clear evidence cache
   */
  public clearEvidenceCache() {
    this.evidenceService.clearCache()
  }

  // --- Scalability and Performance Notes ---
  // TODO (Scaling):
  // 1. TaskRouter LLM Calls: If/when the TaskRouter's LLM classification is fully implemented,
  //    optimize these calls (e.g., through batching if supported by the LLM, caching responses for common introductory phrases).
  // 2. ModelProvider Inference: Optimize inference calls made by the ModelProvider.
  //    This includes caching results for identical inputs/parameters and exploring optimized model endpoints or quantized models.
  // 3. API Load Balancing: If this adapter is exposed via a high-traffic API,
  //    ensure appropriate load balancing and auto-scaling strategies are in place for the API layer.
  // 4. Asynchronous Processing: For potentially long-running analysis sub-tasks (e.g., complex multi-LLM chains,
  //    deep evidential analysis), consider refactoring to allow asynchronous processing to prevent blocking API responses.
  //    The client could poll for results or receive them via a webhook/websocket.

  // TODO (Performance Optimization - Deferred Items):
  // - PythonBridge Optimization: If the PythonBridge is used for specific models or features,
  //    profile its communication overhead (serialization/deserialization, process startup time) and optimize if it's a bottleneck.
  // - Caching Strategies:
  //    - Router Decisions: Cache routing decisions for identical (or highly similar) short input texts, especially if LLM routing is expensive.
  //    - Model Responses: Cache responses from the ModelProvider for identical analysis requests where appropriate (consider data sensitivity).
  // - Batching Requests:
  //    - TaskRouter: If the LLM used by the TaskRouter supports batch inputs, modify `performBroadClassificationLLM` to utilize this.
  //    - ModelProvider: If the underlying models support batch inference, adapt the ModelProvider and this adapter to batch requests.
  // - Asynchronous Sub-tasks: Identify and implement asynchronous execution for any sub-components of `analyzeMentalHealth`
  //    that are I/O bound or computationally intensive and can be run independently (e.g., fetching external enrichment data).
  // - Pre/Post-processing Optimization: Review text cleaning, tokenization (if performed within the adapter or its direct dependencies),
  //    and result formatting steps for performance bottlenecks. Ensure these steps are efficient.

  // TODO (Testing - Future Work):
  // - Design Scalability Tests: Develop and execute load tests that simulate various traffic patterns and data volumes
  //    to identify scaling bottlenecks in the adapter and its dependencies (Router, ModelProvider).
  // - Set Up Reliability Measurement: Implement monitoring and alerting to track:
  //    - Percentage of successful analyses vs. errors.
  //    - Crisis alert delivery rates and latencies.
  //    - Performance of critical code paths (e.g., time taken for routing, time for crisis detection logic).
}
