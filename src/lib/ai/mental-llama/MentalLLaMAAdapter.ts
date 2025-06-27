import { getLogger } from '@/lib/utils/logger';
import type {
  MentalLLaMAAdapterOptions,
  MentalHealthAnalysisResult,
  ExpertGuidedAnalysisResult,
  ExpertGuidance,
  RoutingContext,
  CrisisContext,
  ICrisisNotificationHandler,
  IMentalHealthTaskRouter,
  IModelProvider,
} from './types/mentalLLaMATypes';

const logger = getLogger('MentalLLaMAAdapter');

export class MentalLLaMAAdapter {
  private modelProvider: IModelProvider | undefined;
  private crisisNotifier: ICrisisNotificationHandler | undefined;
  private taskRouter: IMentalHealthTaskRouter | undefined;

  constructor(options: MentalLLaMAAdapterOptions) {
    this.modelProvider = options.modelProvider;
    this.crisisNotifier = options.crisisNotifier;
    this.taskRouter = options.taskRouter;

    logger.info('MentalLLaMAAdapter initialized.', {
      hasCrisisNotifier: !!this.crisisNotifier,
      hasTaskRouter: !!this.taskRouter,
    });

    if (!this.taskRouter) {
      logger.warn(
        'MentalLLaMAAdapter initialized without a TaskRouter. Analysis will be limited.'
      );
    }
    if (!this.modelProvider) {
        logger.warn(
            'MentalLLaMAAdapter initialized without a ModelProvider. Analysis capabilities will be significantly limited.'
        );
    }
  }

  public async analyzeMentalHealth(
    text: string,
    routingContextParams?: Partial<RoutingContext>
  ): Promise<MentalHealthAnalysisResult> {
    const analysisTimestamp = new Date().toISOString();

    if (!this.taskRouter) {
      logger.error('TaskRouter not available, cannot perform analysis.');
      return {
        hasMentalHealthIssue: false,
        mentalHealthCategory: 'unknown',
        confidence: 0,
        explanation: 'Analysis unavailable: TaskRouter not configured.',
        isCrisis: false,
        timestamp: analysisTimestamp,
      };
    }

    if (!this.modelProvider) {
        logger.error('ModelProvider not available, cannot perform detailed analysis.');
         // Fallback to router-based crisis detection if model provider is missing
    }

    const routingInput = { 
      text, 
      ...(routingContextParams && { context: routingContextParams as RoutingContext })
    };
    const routingDecision = await this.taskRouter.route(routingInput);

    const { isCritical, targetAnalyzer, confidence: routingConfidence, insights } = routingDecision;
    let isCrisis = isCritical || targetAnalyzer === 'crisis';
    let mentalHealthCategory = targetAnalyzer;
    let confidence = routingConfidence;
    let explanation = `Analysis based on routing to ${mentalHealthCategory}. Further details require full model integration.`; // Default explanation
    // Initialize supportingEvidence array early to ensure it's available throughout the method scope
    let supportingEvidence: string[] = []; // Populated by specific analysis if ModelProvider is available

    if (isCrisis) {
      explanation = `Potential crisis detected. Routing decision: ${routingDecision.method}. Insights: ${JSON.stringify(insights || {})}. Immediate review advised.`;
      logger.warn('Crisis detected by TaskRouter.', { userId: routingContextParams?.userId, sessionId: routingContextParams?.sessionId, decision: routingDecision });

      if (this.crisisNotifier) {
      const crisisContext: CrisisContext = {
        ...(routingContextParams?.userId && { userId: routingContextParams.userId }),
        ...(routingContextParams?.sessionId && { sessionId: routingContextParams.sessionId }),
        ...(routingContextParams?.sessionType && { sessionType: routingContextParams.sessionType }),
        analysisResult: {
        hasMentalHealthIssue: true,
        mentalHealthCategory: 'crisis',
        confidence: routingConfidence,
        explanation: '',
        isCrisis: true,
        timestamp: analysisTimestamp
        },
        ...(routingContextParams?.explicitTaskHint && { explicitTaskHint: routingContextParams.explicitTaskHint }),
        textSample: text.substring(0, 500), // Send a sample of the text
          timestamp: analysisTimestamp,
          decisionDetails: routingDecision,
        };
        try {
          await this.crisisNotifier.sendCrisisAlert(crisisContext);
          logger.info('Crisis alert dispatched successfully.', { userId: routingContextParams?.userId });

          // Flag session for immediate review
          try {
            const { CrisisSessionFlaggingService } = await import('../crisis/CrisisSessionFlaggingService');
            const flaggingService = new CrisisSessionFlaggingService();

            const crisisId = crypto.randomUUID();
            await flaggingService.flagSessionForReview({
              userId: crisisContext.userId || 'unknown',
              sessionId: crisisContext.sessionId || 'unknown',
              crisisId,
              timestamp: crisisContext.timestamp,
              reason: 'Crisis detected by MentalLLaMA',
              severity: 'high',
              detectedRisks: (routingDecision.insights?.['detectedRisks'] as string[]) || ['crisis_detected'],
              confidence: routingConfidence,
              textSample: text.substring(0, 500),
              routingDecision: routingDecision
            });

            logger.info('Session flagged for review successfully.', {
              userId: routingContextParams?.userId,
              sessionId: routingContextParams?.sessionId,
              crisisId
            });
          } catch (flagError) {
            logger.error('Failed to flag session for review.', {
              error: flagError,
              userId: routingContextParams?.userId,
              sessionId: routingContextParams?.sessionId
            });
            explanation += " Failed to flag session for immediate review.";
          }
        } catch (error) {
          logger.error('Failed to dispatch crisis alert via notifier.', { error, userId: routingContextParams?.userId });
          // Potentially add this failure information to the explanation or result
          explanation += " Failed to dispatch crisis alert notification.";
        }
      } else {
        logger.warn('Crisis detected, but no crisisNotifier is configured. Alert not sent.');
        explanation += " No crisis notification service configured.";
      }
    } else {
      // Placeholder for non-crisis analysis based on routingDecision.targetAnalyzer
      // This would involve calling the appropriate model/logic via this.modelProvider

      if (this.modelProvider && mentalHealthCategory === 'general_mental_health') {
        logger.info(`Performing detailed analysis for 'general_mental_health' using ModelProvider.`);
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
        ];

        try {
          const llmResponse = await this.modelProvider.invoke(generalAnalysisMessages, { temperature: 0.5, max_tokens: 300 });
          if (llmResponse.content) {
            try {
              const parsedContent = JSON.parse(llmResponse.content);
              explanation = `Assessment: ${parsedContent.assessment}. Explanation: ${parsedContent.explanation}`;
              supportingEvidence = parsedContent.supportingEvidence || [];
              // Optionally, adjust confidence based on LLM's assessment if possible, or keep router's confidence.
            } catch (e) {
              logger.error('Failed to parse JSON response from ModelProvider for general_mental_health analysis.', { content: llmResponse.content, error: e });
              explanation = `Detailed analysis for ${mentalHealthCategory} received malformed response.`;
            }
          } else {
            explanation = `Detailed analysis for ${mentalHealthCategory} returned no content.`;
          }
        } catch (error) {
          logger.error('Exception during ModelProvider call for general_mental_health analysis:', error);
          explanation = `Exception during detailed analysis for ${mentalHealthCategory}.`;
        }
      } else if (this.modelProvider && mentalHealthCategory !== 'unknown') {
         logger.info(`Text routed to ${mentalHealthCategory} analyzer. Detailed analysis for this category is STUBBED.`, { decision: routingDecision });
         explanation = `Text routed for ${mentalHealthCategory} analysis. Detailed analysis for this specific category is currently a stub.`;
      } else {
        logger.info(`Text routed to ${mentalHealthCategory} analyzer. Full analysis logic is pending or ModelProvider unavailable.`, { decision: routingDecision });
        explanation = `Text routed for ${mentalHealthCategory} analysis. Currently, detailed analysis for this category is a stub or ModelProvider is unavailable.`;
      }

      if ((mentalHealthCategory === 'unknown' && confidence < 0.1) || (mentalHealthCategory === 'general_mental_health' && confidence < 0.1)) {
        confidence = routingDecision.confidence > 0 ? routingDecision.confidence : 0.1; // Ensure some confidence for default/unknown
      }
    }

    return {
      hasMentalHealthIssue: isCrisis || (mentalHealthCategory !== 'none' && mentalHealthCategory !== 'wellness' && mentalHealthCategory !== 'unknown' && mentalHealthCategory !== 'general_mental_health'),
      mentalHealthCategory,
      confidence,
      explanation,
      supportingEvidence: supportingEvidence || [],
      isCrisis,
      timestamp: analysisTimestamp,
      _routingDecision: routingDecision,
    };
  }

  public async analyzeMentalHealthWithExpertGuidance(
    text: string,
    fetchExpertGuidance: boolean = true,
    routingContextParams?: Partial<RoutingContext>
  ): Promise<ExpertGuidedAnalysisResult> {
    const analysisTimestamp = new Date().toISOString();
    logger.info('analyzeMentalHealthWithExpertGuidance called', {
      fetchExpertGuidance,
      userId: routingContextParams?.userId,
      sessionId: routingContextParams?.sessionId,
    });

    try {
      // Step 1: Perform base analysis with enhanced routing context
      const enhancedContext = {
        ...routingContextParams,
        explicitTaskHint: routingContextParams?.explicitTaskHint || 'expert_guided_analysis',
      };

      const baseAnalysis = await this.analyzeMentalHealth(text, enhancedContext);
      
      // Step 2: Fetch expert guidance if requested and available
      let expertGuidance: ExpertGuidance | undefined;
      if (fetchExpertGuidance) {
        expertGuidance = await this.fetchExpertGuidance(
          baseAnalysis.mentalHealthCategory,
          text,
          baseAnalysis
        );
      }

      // Step 3: Generate expert-guided analysis using LLM with clinical prompts
      const expertGuidedAnalysis = await this.generateExpertGuidedAnalysis(
        text,
        baseAnalysis,
        expertGuidance
      );

      // Step 4: Perform comprehensive risk assessment
      const riskAssessment = await this.performRiskAssessment(
        text,
        baseAnalysis,
        expertGuidance
      );

      // Step 5: Generate clinical recommendations
      const clinicalRecommendations = await this.generateClinicalRecommendations(
        baseAnalysis,
        expertGuidance,
        riskAssessment
      );

      // Step 6: Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(
        expertGuidedAnalysis,
        expertGuidance,
        baseAnalysis
      );

      // Step 7: Update routing decision insights
      const updatedRoutingDecision = baseAnalysis._routingDecision ? {
        ...baseAnalysis._routingDecision,
        insights: {
          ...baseAnalysis._routingDecision.insights,
          expertGuidanceApplied: true,
          expertGuidanceSource: fetchExpertGuidance ? 'clinical_knowledge_base' : 'llm_only',
          clinicalEnhancement: true,
        },
      } : undefined;

      // Step 8: Construct final expert-guided result
      const result: ExpertGuidedAnalysisResult = {
        ...baseAnalysis,
        expertGuided: true,
        explanation: expertGuidedAnalysis.explanation,
        confidence: expertGuidedAnalysis.confidence,
        supportingEvidence: expertGuidedAnalysis.supportingEvidence,
        ...(expertGuidance && { expertGuidance }),
        clinicalRecommendations,
        riskAssessment,
        qualityMetrics,
        ...(updatedRoutingDecision && { _routingDecision: updatedRoutingDecision }),
        timestamp: analysisTimestamp,
      };

      // Step 9: Handle crisis scenarios with expert guidance
      if (result.isCrisis && expertGuidance) {
        await this.handleCrisisWithExpertGuidance(result, routingContextParams);
      }

      logger.info('Expert-guided analysis completed successfully', {
        userId: routingContextParams?.userId,
        category: result.mentalHealthCategory,
        expertGuided: result.expertGuided,
        overallRisk: result.riskAssessment?.overallRisk,
        recommendationCount: result.clinicalRecommendations?.length || 0,
      });

      return result;

    } catch (error) {
      logger.error('Error in expert-guided analysis', {
        error,
        userId: routingContextParams?.userId,
        sessionId: routingContextParams?.sessionId,
      });

      // Fallback to base analysis with error indication
      const fallbackAnalysis = await this.analyzeMentalHealth(text, routingContextParams);
      
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
            ...(fallbackAnalysis._routingDecision && { context: fallbackAnalysis._routingDecision }),
          },
        ],
        timestamp: analysisTimestamp,
      };
    }
  }

  public async evaluateExplanationQuality(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _explanation: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _textContext?: string // Original text that led to the explanation
  ): Promise<unknown> {
    logger.info('evaluateExplanationQuality called (STUBBED)');
    // This is a stub. A real implementation would:
    // 1. Use an LLM or a set of heuristics to evaluate fluency, completeness, reliability, etc.
    // 2. Potentially use the pythonBridge if specific libraries are needed.
    return {
      fluency: 0.0,
      completeness: 0.0,
      reliability: 0.0,
      overall: 0.0,
      message: 'Not implemented. This is a stubbed response.',
    };
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

  // --- Expert Guidance Helper Methods ---

  /**
   * Fetches expert guidance from clinical knowledge base and guidelines.
   */
  private async fetchExpertGuidance(
    category: string,
    text: string,
    baseAnalysis: MentalHealthAnalysisResult
  ): Promise<ExpertGuidance> {
    logger.info('Fetching expert guidance', { category });

    try {
      // Clinical guidelines database (in production, this would be a real knowledge base)
      const clinicalGuidelines = this.getClinicalGuidelines(category);
      
      // Risk factors assessment
      const riskFactors = this.assessRiskFactors(text, category, baseAnalysis);
      
      // Intervention suggestions based on category and severity
      const interventionSuggestions = this.getInterventionSuggestions(category, baseAnalysis);
      
      // Clinical context and considerations
      const clinicalContext = this.getClinicalContext(category, baseAnalysis);
      
      // Evidence base for recommendations
      const evidenceBase = this.getEvidenceBase(category);

      return {
        guidelines: clinicalGuidelines || [],
        riskFactors,
        interventionSuggestions,
        clinicalContext,
        evidenceBase,
      };
    } catch (error) {
      logger.error('Error fetching expert guidance', { error, category });
      
      // Return minimal guidance on error
      return {
        guidelines: [{
          category: 'general',
          rule: 'Follow standard clinical assessment protocols',
          priority: 'medium',
          source: 'fallback_guidance',
        }],
        riskFactors: [],
        interventionSuggestions: [],
        clinicalContext: {},
        evidenceBase: [],
      };
    }
  }

  /**
   * Generates expert-guided analysis using LLM with clinical prompts.
   */
  private async generateExpertGuidedAnalysis(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ): Promise<{
    explanation: string;
    confidence: number;
    supportingEvidence: string[];
  }> {
    if (!this.modelProvider) {
      logger.warn('ModelProvider not available for expert-guided analysis');
      return {
        explanation: baseAnalysis.explanation,
        confidence: baseAnalysis.confidence,
        supportingEvidence: baseAnalysis.supportingEvidence || [],
      };
    }

    const clinicalPrompt = this.buildClinicalPrompt(text, baseAnalysis, expertGuidance);
    
    try {
      const llmResponse = await this.modelProvider.invoke(clinicalPrompt, {
        temperature: 0.3, // Lower temperature for more consistent clinical analysis
        max_tokens: 800,
      });

      const parsedResponse = this.parseClinicalResponse(llmResponse.content);
      
      return {
        explanation: parsedResponse.explanation || baseAnalysis.explanation,
        confidence: Math.min(parsedResponse.confidence || baseAnalysis.confidence, 1.0),
        supportingEvidence: parsedResponse.supportingEvidence || baseAnalysis.supportingEvidence || [],
      };
    } catch (error) {
      logger.error('Error in expert-guided LLM analysis', { error });
      return {
        explanation: `${baseAnalysis.explanation} [Clinical analysis enhanced with expert guidelines]`,
        confidence: baseAnalysis.confidence * 0.9, // Slightly reduce confidence due to error
        supportingEvidence: baseAnalysis.supportingEvidence || [],
      };
    }
  }

  /**
   * Performs comprehensive risk assessment.
   */
  private async performRiskAssessment(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ): Promise<{
    overallRisk: 'critical' | 'high' | 'moderate' | 'low';
    specificRisks: Array<{
      type: string;
      level: 'critical' | 'high' | 'moderate' | 'low';
      indicators: string[];
    }>;
    protectiveFactors?: string[];
  }> {
    const riskIndicators = this.identifyRiskIndicators(text, baseAnalysis);
    const protectiveFactors = this.identifyProtectiveFactors(text);
    
    // Calculate overall risk based on multiple factors
    let overallRisk: 'critical' | 'high' | 'moderate' | 'low' = 'low';
    
    if (baseAnalysis.isCrisis) {
      overallRisk = 'critical';
    } else if (expertGuidance?.riskFactors.some(rf => rf.severity === 'critical')) {
      overallRisk = 'critical';
    } else if (expertGuidance?.riskFactors.some(rf => rf.severity === 'high') || 
               baseAnalysis.confidence > 0.8 && baseAnalysis.hasMentalHealthIssue) {
      overallRisk = 'high';
    } else if (baseAnalysis.hasMentalHealthIssue && baseAnalysis.confidence > 0.5) {
      overallRisk = 'moderate';
    }

    const specificRisks = riskIndicators.map(indicator => ({
      type: indicator.type,
      level: indicator.severity,
      indicators: indicator.indicators,
    }));

    return {
      overallRisk,
      specificRisks,
      protectiveFactors,
    };
  }

  /**
   * Generates clinical recommendations based on analysis and expert guidance.
   */
  private async generateClinicalRecommendations(
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance,
    riskAssessment?: {
      overallRisk: 'critical' | 'high' | 'moderate' | 'low';
      specificRisks: Array<{
        type: string;
        level: 'critical' | 'high' | 'moderate' | 'low';
        indicators: string[];
      }>;
      protectiveFactors?: string[];
    }
  ): Promise<Array<{
    recommendation: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    timeframe: string;
    rationale: string;
  }>> {
    const recommendations: Array<{
      recommendation: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      timeframe: string;
      rationale: string;
    }> = [];

    // Crisis recommendations
    if (baseAnalysis.isCrisis) {
      recommendations.push({
        recommendation: 'Immediate crisis intervention and safety assessment required',
        priority: 'critical',
        timeframe: 'Immediate (within 1 hour)',
        rationale: 'Crisis indicators detected in analysis requiring immediate professional intervention',
      });
    }

    // Category-specific recommendations
    const categoryRecommendations = this.getCategorySpecificRecommendations(
      baseAnalysis.mentalHealthCategory,
      riskAssessment?.overallRisk
    );
    recommendations.push(...categoryRecommendations);

    // Expert guidance recommendations
    if (expertGuidance?.interventionSuggestions) {
      expertGuidance.interventionSuggestions.forEach(intervention => {
        recommendations.push({
          recommendation: intervention.intervention,
          priority: intervention.urgency === 'immediate' ? 'critical' : 
                   intervention.urgency === 'urgent' ? 'high' : 'medium',
          timeframe: this.mapUrgencyToTimeframe(intervention.urgency),
          rationale: intervention.rationale,
        });
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculates quality metrics for the expert-guided analysis.
   */
  private calculateQualityMetrics(
    expertGuidedAnalysis: {
      explanation: string;
      confidence: number;
      supportingEvidence: string[];
    },
    expertGuidance?: ExpertGuidance,
    baseAnalysis?: MentalHealthAnalysisResult
  ): {
    guidanceRelevance: number;
    evidenceStrength: number;
    clinicalCoherence: number;
  } {
    // Calculate guidance relevance (0-1)
    const guidanceRelevance = expertGuidance ? 
      Math.min(1.0, (expertGuidance.guidelines.length * 0.2) + 
                    (expertGuidance.riskFactors.length * 0.15) + 
                    (expertGuidance.interventionSuggestions.length * 0.1)) : 0.0;

    // Calculate evidence strength based on sources
    const evidenceStrength = expertGuidance?.evidenceBase ? 
      expertGuidance.evidenceBase.reduce((acc, evidence) => {
        const reliabilityScore = evidence.reliability === 'high' ? 0.9 : 
                               evidence.reliability === 'medium' ? 0.6 : 0.3;
        return acc + reliabilityScore;
      }, 0) / expertGuidance.evidenceBase.length : 0.5;

    // Calculate clinical coherence based on consistency
    const clinicalCoherence = baseAnalysis ? 
      Math.min(1.0, baseAnalysis.confidence + 
                    (expertGuidedAnalysis.supportingEvidence?.length || 0) * 0.1) : 0.5;

    return {
      guidanceRelevance: Math.min(1.0, guidanceRelevance),
      evidenceStrength: Math.min(1.0, evidenceStrength),
      clinicalCoherence: Math.min(1.0, clinicalCoherence),
    };
  }

  /**
   * Handles crisis scenarios with expert guidance.
   */
  private async handleCrisisWithExpertGuidance(
    result: ExpertGuidedAnalysisResult,
    routingContextParams?: Partial<RoutingContext>
  ): Promise<void> {
    logger.warn('Handling crisis with expert guidance', {
      userId: routingContextParams?.userId,
      overallRisk: result.riskAssessment?.overallRisk,
    });

    // Enhanced crisis context with expert guidance
    if (this.crisisNotifier) {
      const enhancedCrisisContext: CrisisContext = {
        ...(routingContextParams?.userId && { userId: routingContextParams.userId }),
        ...(routingContextParams?.sessionId && { sessionId: routingContextParams.sessionId }),
        ...(routingContextParams?.sessionType && { sessionType: routingContextParams.sessionType }),
        ...(routingContextParams?.explicitTaskHint && { explicitTaskHint: routingContextParams.explicitTaskHint }),
        textSample: result.supportingEvidence?.join(' | ') || 'No evidence available',
        timestamp: result.timestamp,
        decisionDetails: result._routingDecision || {},
        analysisResult: {
          ...result,
          explanation: `[EXPERT-GUIDED] ${result.explanation}`,
        },
      };

      try {
        await this.crisisNotifier.sendCrisisAlert(enhancedCrisisContext);
        logger.info('Enhanced crisis alert sent successfully');
      } catch (error) {
        logger.error('Failed to send enhanced crisis alert', { error });
      }
    }
  }

  // --- Clinical Knowledge Base Methods ---

  private getClinicalGuidelines(category: string) {
    const guidelinesMap: Record<string, Array<{
      category: string;
      rule: string;
      priority: 'high' | 'medium' | 'low';
      source: string;
    }>> = {
      crisis: [
        {
          category: 'crisis',
          rule: 'Immediate safety assessment and intervention required',
          priority: 'high',
          source: 'crisis_intervention_protocols',
        },
        {
          category: 'crisis',
          rule: 'Contact emergency services if imminent danger present',
          priority: 'high',
          source: 'emergency_protocols',
        },
      ],
      depression: [
        {
          category: 'depression',
          rule: 'Assess for suicidal ideation using standardized screening tools',
          priority: 'high',
          source: 'DSM-5',
        },
        {
          category: 'depression',
          rule: 'Consider severity level for treatment planning',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
      anxiety: [
        {
          category: 'anxiety',
          rule: 'Differentiate between anxiety disorders and normal stress responses',
          priority: 'medium',
          source: 'DSM-5',
        },
        {
          category: 'anxiety',
          rule: 'Assess functional impairment and duration of symptoms',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
      general_mental_health: [
        {
          category: 'general',
          rule: 'Conduct comprehensive mental status examination',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
    };

    return guidelinesMap[category] || guidelinesMap['general_mental_health'];
  }

  private assessRiskFactors(text: string, _category: string, baseAnalysis: MentalHealthAnalysisResult) {
    const riskFactors: Array<{
      factor: string;
      severity: 'critical' | 'high' | 'moderate' | 'low';
      description: string;
    }> = [];

    // Crisis-specific risk factors
    if (baseAnalysis.isCrisis) {
      riskFactors.push({
        factor: 'Crisis indicators present',
        severity: 'critical',
        description: 'Text contains indicators suggesting immediate risk',
      });
    }

    // Text-based risk assessment
    const riskKeywords = {
      critical: ['suicide', 'kill myself', 'end it all', 'no point living'],
      high: ['hopeless', 'worthless', 'burden', 'trapped'],
      moderate: ['sad', 'anxious', 'worried', 'stressed'],
    };

    Object.entries(riskKeywords).forEach(([severity, keywords]) => {
      const matchedKeywords = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        riskFactors.push({
          factor: `Language indicators: ${matchedKeywords.join(', ')}`,
          severity: severity as 'critical' | 'high' | 'moderate',
          description: `Text contains ${severity} risk language patterns`,
        });
      }
    });

    return riskFactors;
  }

  private getInterventionSuggestions(category: string, baseAnalysis: MentalHealthAnalysisResult) {
    const interventions: Array<{
      intervention: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      rationale: string;
    }> = [];

    if (baseAnalysis.isCrisis) {
      interventions.push({
        intervention: 'Crisis intervention and safety planning',
        urgency: 'immediate',
        rationale: 'Crisis indicators require immediate professional intervention',
      });
    }

    const categoryInterventions: Record<string, Array<{
      intervention: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      rationale: string;
    }>> = {
      depression: [
        {
          intervention: 'Comprehensive depression screening and assessment',
          urgency: 'urgent',
          rationale: 'Early identification and treatment improve outcomes',
        },
        {
          intervention: 'Consider evidence-based psychotherapy (CBT, IPT)',
          urgency: 'routine',
          rationale: 'Psychotherapy is first-line treatment for mild to moderate depression',
        },
      ],
      anxiety: [
        {
          intervention: 'Anxiety disorder screening and differential diagnosis',
          urgency: 'urgent',
          rationale: 'Proper diagnosis guides appropriate treatment selection',
        },
        {
          intervention: 'Relaxation techniques and coping strategies',
          urgency: 'routine',
          rationale: 'Self-management techniques can provide immediate relief',
        },
      ],
    };

    return interventions.concat(categoryInterventions[category] || []);
  }

  private getClinicalContext(category: string, _baseAnalysis: MentalHealthAnalysisResult) {
    const contextMap: Record<string, {
      relevantDiagnoses?: string[];
      contraindications?: string[];
      specialConsiderations?: string[];
    }> = {
      crisis: {
        relevantDiagnoses: ['Major Depressive Disorder', 'Bipolar Disorder', 'Substance Use Disorder'],
        contraindications: ['Immediate safety concerns override standard protocols'],
        specialConsiderations: ['Legal and ethical obligations for duty to warn/protect'],
      },
      depression: {
        relevantDiagnoses: ['Major Depressive Disorder', 'Persistent Depressive Disorder', 'Bipolar Disorder'],
        contraindications: ['Active psychosis', 'Severe cognitive impairment'],
        specialConsiderations: ['Assess for bipolar disorder before treatment', 'Monitor for suicidal ideation'],
      },
      anxiety: {
        relevantDiagnoses: ['Generalized Anxiety Disorder', 'Panic Disorder', 'Social Anxiety Disorder'],
        contraindications: ['Substance-induced anxiety', 'Medical conditions causing anxiety'],
        specialConsiderations: ['Rule out medical causes', 'Assess functional impairment'],
      },
    };

    return contextMap[category] || {};
  }

  private getEvidenceBase(category: string) {
    const evidenceMap: Record<string, Array<{
      source: string;
      reliability: 'high' | 'medium' | 'low';
      summary: string;
    }>> = {
      crisis: [
        {
          source: 'Crisis Intervention Guidelines (APA)',
          reliability: 'high',
          summary: 'Immediate intervention protocols for crisis situations',
        },
      ],
      depression: [
        {
          source: 'APA Practice Guidelines for Depression',
          reliability: 'high',
          summary: 'Evidence-based treatment recommendations for depression',
        },
        {
          source: 'Cochrane Reviews on Depression Treatment',
          reliability: 'high',
          summary: 'Systematic reviews of depression treatment efficacy',
        },
      ],
      anxiety: [
        {
          source: 'APA Practice Guidelines for Anxiety Disorders',
          reliability: 'high',
          summary: 'Evidence-based treatment recommendations for anxiety disorders',
        },
      ],
    };

    return evidenceMap[category] || [];
  }

  private buildClinicalPrompt(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ) {
    const guidelinesText = expertGuidance?.guidelines
      .map(g => `- ${g.rule} (${g.source})`)
      .join('\n') || 'No specific guidelines available';

    const riskFactorsText = expertGuidance?.riskFactors
      .map(rf => `- ${rf.factor}: ${rf.description} (${rf.severity} severity)`)
      .join('\n') || 'No specific risk factors identified';

    return [
      {
        role: 'system' as const,
        content: `You are a clinical mental health expert providing analysis based on established guidelines and evidence-based practices.

Clinical Guidelines:
${guidelinesText}

Risk Factors to Consider:
${riskFactorsText}

Base Analysis: ${baseAnalysis.mentalHealthCategory} (confidence: ${baseAnalysis.confidence})

Provide a comprehensive clinical analysis in JSON format:
{
  "explanation": "Detailed clinical explanation incorporating guidelines and evidence",
  "confidence": 0.0-1.0,
  "supportingEvidence": ["key phrases or indicators from the text"],
  "clinicalReasoning": "Step-by-step clinical reasoning process"
}`,
      },
      {
        role: 'user' as const,
        content: `Please analyze this text: "${text}"`,
      },
    ];
  }

  private parseClinicalResponse(content: string) {
    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse clinical response', { error, content });
      return {
        explanation: content,
        confidence: 0.5,
        supportingEvidence: [],
      };
    }
  }

  private identifyRiskIndicators(_text: string, baseAnalysis: MentalHealthAnalysisResult) {
    const indicators: Array<{
      type: string;
      severity: 'critical' | 'high' | 'moderate' | 'low';
      indicators: string[];
    }> = [];

    // Implement risk indicator identification logic
    if (baseAnalysis.isCrisis) {
      indicators.push({
        type: 'crisis_risk',
        severity: 'critical',
        indicators: ['Crisis detected by base analysis'],
      });
    }

    return indicators;
  }

  private identifyProtectiveFactors(text: string): string[] {
    const protectiveKeywords = [
      'support', 'family', 'friends', 'hope', 'future', 'goals', 
      'therapy', 'treatment', 'help', 'better', 'improve'
    ];

    return protectiveKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private getCategorySpecificRecommendations(
    category: string,
    _riskLevel?: string
  ) {
    const categoryMap: Record<string, Array<{
      recommendation: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      timeframe: string;
      rationale: string;
    }>> = {
      depression: [
        {
          recommendation: 'Professional mental health evaluation',
          priority: 'high',
          timeframe: 'Within 1-2 weeks',
          rationale: 'Depression requires professional assessment and treatment planning',
        },
      ],
      anxiety: [
        {
          recommendation: 'Anxiety screening and coping strategies assessment',
          priority: 'medium',
          timeframe: 'Within 2-4 weeks',
          rationale: 'Early intervention can prevent symptom escalation',
        },
      ],
    };

    return categoryMap[category] || [];
  }

  private mapUrgencyToTimeframe(urgency: 'immediate' | 'urgent' | 'routine'): string {
    const timeframeMap = {
      immediate: 'Within 1 hour',
      urgent: 'Within 24 hours',
      routine: 'Within 1-2 weeks',
    };
    return timeframeMap[urgency];
  }
}
