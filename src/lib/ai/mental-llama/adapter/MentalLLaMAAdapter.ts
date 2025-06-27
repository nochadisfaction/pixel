import { getLogger } from '@/lib/utils/logger';
import type {
  MentalLLaMAAnalysisResult,
  RoutingContextParams,
  AnalyzeMentalHealthParams,
  CrisisAlertContext as MentalLLaMACrisisAlertContext, // Renaming to avoid clash if imported from elsewhere
  LLMInvoker,
  Message,
} from '../types';
import type { MentalLLaMAModelProvider } from '../models/MentalLLaMAModelProvider';
import type { MentalHealthTaskRouter } from '../routing/MentalHealthTaskRouter';
import type { ICrisisNotificationHandler, CrisisAlertContext as NotificationServiceCrisisAlertContext } from '@/lib/services/notification/NotificationService';
import { specializedPrompts, buildGeneralAnalysisPrompt } from '../prompts/prompt-templates';
import { ROUTER_LOW_CONFIDENCE_THRESHOLD } from '../constants';

const logger = getLogger('MentalLLaMAAdapter');

export class MentalLLaMAAdapter {
  private modelProvider: MentalLLaMAModelProvider;
  private taskRouter: MentalHealthTaskRouter;
  private crisisNotifier?: ICrisisNotificationHandler;

  constructor(
    modelProvider: MentalLLaMAModelProvider,
    taskRouter: MentalHealthTaskRouter,
    crisisNotifier?: ICrisisNotificationHandler,
  ) {
    this.modelProvider = modelProvider;
    this.taskRouter = taskRouter;
    this.crisisNotifier = crisisNotifier;
    logger.info('MentalLLaMAAdapter initialized.');
  }

  private async handleCrisis(text: string, analysisResult: MentalLLaMAAnalysisResult, routingContext?: RoutingContextParams): Promise<void> {
    if (this.crisisNotifier) {
      const textSample = text.length > 500 ? text.substring(0, 497) + "..." : text;

      // Adapt to the NotificationService's CrisisAlertContext structure
      const alertContext: NotificationServiceCrisisAlertContext = {
        userId: routingContext?.userId || null,
        sessionId: routingContext?.sessionId || null,
        sessionType: routingContext?.sessionType || null,
        explicitTaskHint: analysisResult._routingDecision?.insights?.hint || routingContext?.explicitTaskHint || null,
        timestamp: analysisResult.timestamp,
        textSample: textSample,
        decisionDetails: {
          category: analysisResult.mentalHealthCategory,
          confidence: analysisResult.confidence,
          explanation: analysisResult.explanation,
          routingDecision: analysisResult._routingDecision,
          modelTier: analysisResult.modelTier,
        }
      };

      try {
        logger.warn('Crisis detected, sending notification...', { userId: alertContext.userId, sessionId: alertContext.sessionId });
        await this.crisisNotifier.sendCrisisAlert(alertContext);
      } catch (error) {
        logger.error('Failed to send crisis notification via CrisisNotificationService', { error });
        // Decide if this error should propagate or be handled locally
      }
    } else {
      logger.warn('Crisis detected, but no crisis notification service is configured.');
    }

    // TODO: Implement mechanisms for session/user flagging for immediate review.
    // This could involve:
    // 1. Calling an external API to update user status (e.g., `await userApiService.flagUser(userId, 'crisis_review_pending')`).
    // 2. Writing to a specific database table or collection for flagged sessions/users.
    // 3. Emitting an event that other services can listen to.
    // This needs to be designed based on the broader application architecture and available services.
    // For now, this is a placeholder.
    if (routingContext?.userId) {
      logger.info(`CRISIS_MITIGATION_USER_FLAG: User ID ${routingContext.userId} requires immediate review due to crisis detection. Session ID: ${routingContext.sessionId}`);
    }
    // TODO: Consider adding a specific log event type for "CRISIS_FLAG_USER_FOR_REVIEW" for easier auditing.
  }

  public async analyzeMentalHealth(params: AnalyzeMentalHealthParams): Promise<MentalLLaMAAnalysisResult> {
    // TODO (Performance): Consider implementing request batching if the underlying model provider supports it,
    // especially for high-throughput scenarios.
    // TODO (Performance): Explore caching strategies for responses to identical or very similar short texts,
    // if appropriate for the use case (e.g., for common phrases, not for unique user inputs).
    const { text, categories = 'auto_route', routingContext, options = {} } = params;
    const modelTierToUse = options.modelTier || this.modelProvider.getModelTier();
    // TODO: If modelTierToUse is different from this.modelProvider.getModelTier(),
    // we might need a way to get a provider for that specific tier, or this.modelProvider should handle it.
    // For now, assume this.modelProvider is for the desired/default tier.

    let effectiveCategories: string[] = [];
    let analysisCategory: string = 'none';
    let analysisConfidence: number = 0.0;
    let routingDecisionStore: RoutingDecision | null = null;

    const timestamp = new Date().toISOString();

    if (categories === 'auto_route') {
      const route = await this.taskRouter.determineRoute(text, routingContext, routingContext?.explicitTaskHint as string | null);
      routingDecisionStore = route;
      analysisCategory = route.targetAnalyzer;
      analysisConfidence = route.confidence;
      effectiveCategories = [route.targetAnalyzer];
      logger.info(`Auto-routing determined category: ${analysisCategory} with confidence ${analysisConfidence}`);

      if (route.isCritical || route.targetAnalyzer === 'crisis') {
         logger.warn(`Router flagged text as critical or crisis category: ${route.targetAnalyzer}`);
         // Directly create a crisis result if router is highly confident or explicitly crisis
         if (route.targetAnalyzer === 'crisis' && route.confidence > 0.8) {
            const crisisResult: MentalLLaMAAnalysisResult = {
                hasMentalHealthIssue: true,
                mentalHealthCategory: 'crisis',
                confidence: route.confidence,
                explanation: route.insights?.llmRawOutput?.explanation || "Crisis detected by routing rules or preliminary analysis.",
                supportingEvidence: route.insights?.llmRawOutput?.keywords_matched || (typeof route.insights?.matchedKeyword === 'string' ? [route.insights.matchedKeyword] : []),
                timestamp,
                modelTier: modelTierToUse,
                _routingDecision: route,
            };
            await this.handleCrisis(text, crisisResult, routingContext);
            return crisisResult;
         }
      }
      // If router confidence is low for a non-crisis category, we might default or broaden analysis
      if (!route.isCritical && route.confidence < ROUTER_LOW_CONFIDENCE_THRESHOLD) {
        logger.warn(`Router confidence is low (${route.confidence} for ${route.targetAnalyzer}). Defaulting to general_mental_health for LLM analysis.`);
        effectiveCategories = ['general_mental_health'];
        // Keep `analysisCategory` from router for now, LLM can override
      }

    } else {
      effectiveCategories = categories;
      analysisCategory = categories.join(', '); // Simple join for now if multiple
      analysisConfidence = 0.9; // Assume high confidence if category is explicit (LLM will refine)
      logger.info(`Explicit categories provided: ${analysisCategory}`);
    }

    // Prepare prompt for LLM
    // For simplicity, taking the first effective category if multiple, or using general if 'unknown' etc.
    let categoryForPrompt = effectiveCategories[0] || 'general_mental_health';
    if (categoryForPrompt === 'unknown' || categoryForPrompt === 'none') {
        categoryForPrompt = 'general_mental_health';
    }

    const promptBuilder = (specializedPrompts as any)[categoryForPrompt] || buildGeneralAnalysisPrompt;
    const llmMessages: Message[] = promptBuilder({text, categoryHint: categoryForPrompt });

    let llmAnalysisResult: Partial<MentalLLaMAAnalysisResult> = {
      explanation: "LLM analysis could not be completed.",
      confidence: 0.1,
      mentalHealthCategory: 'unknown',
      supportingEvidence: [],
    };

    try {
      const llmResponseRaw = await this.modelProvider.chat(llmMessages, {
        temperature: 0.3, // Example, could be tuned
        max_tokens: 500,  // Example
      });

      // Attempt to parse LLM response (assuming it's JSON as per prompt instructions)
      try {
        const parsedLlmResponse = JSON.parse(llmResponseRaw);
        llmAnalysisResult.mentalHealthCategory = parsedLlmResponse.mentalHealthCategory || categoryForPrompt; // Fallback to routed/prompted category
        llmAnalysisResult.confidence = parseFloat(parsedLlmResponse.confidence) || analysisConfidence; // Fallback to router confidence
        llmAnalysisResult.explanation = parsedLlmResponse.explanation || "No explanation provided by LLM.";
        llmAnalysisResult.supportingEvidence = parsedLlmResponse.supportingEvidence || [];
        llmAnalysisResult.hasMentalHealthIssue = llmAnalysisResult.mentalHealthCategory !== 'none' && llmAnalysisResult.mentalHealthCategory !== 'wellness' && llmAnalysisResult.mentalHealthCategory !== 'unknown';

        // Override initial router category/confidence if LLM provides a different one and is confident enough
        if (categories === 'auto_route' && routingDecisionStore) {
             if (parsedLlmResponse.mentalHealthCategory && parsedLlmResponse.mentalHealthCategory !== routingDecisionStore.targetAnalyzer && parsedLlmResponse.confidence > routingDecisionStore.confidence) {
                logger.info(`LLM analysis refined category from ${routingDecisionStore.targetAnalyzer} to ${parsedLlmResponse.mentalHealthCategory}`);
                analysisCategory = parsedLlmResponse.mentalHealthCategory;
             }
             // Blend or take higher confidence
             analysisConfidence = Math.max(analysisConfidence, parsedLlmResponse.confidence);
        } else if (parsedLlmResponse.mentalHealthCategory) {
             analysisCategory = parsedLlmResponse.mentalHealthCategory;
             analysisConfidence = parsedLlmResponse.confidence;
        }


      } catch (parseError) {
        logger.error('Failed to parse LLM JSON response for analysis', { rawResponse: llmResponseRaw, error: parseError });
        // If parsing fails, use the raw response as explanation, category remains from router/explicit
        llmAnalysisResult.explanation = `LLM provided a non-JSON response: ${llmResponseRaw}`;
        llmAnalysisResult.mentalHealthCategory = analysisCategory; // from router or explicit
        llmAnalysisResult.confidence = analysisConfidence * 0.5; // Reduce confidence
        llmAnalysisResult.hasMentalHealthIssue = analysisCategory !== 'none' && analysisCategory !== 'wellness' && analysisCategory !== 'unknown';
      }
    } catch (llmError) {
      logger.error('Error during LLM call for analysis', { error: llmError });
      // Keep category from router/explicit, provide error explanation
      llmAnalysisResult.explanation = `Error during LLM analysis: ${llmError instanceof Error ? llmError.message : String(llmError)}`;
      llmAnalysisResult.mentalHealthCategory = analysisCategory;
      llmAnalysisResult.confidence = analysisConfidence * 0.3; // Further reduce confidence
      llmAnalysisResult.hasMentalHealthIssue = analysisCategory !== 'none' && analysisCategory !== 'wellness' && analysisCategory !== 'unknown';
    }

    const finalResult: MentalLLaMAAnalysisResult = {
      hasMentalHealthIssue: llmAnalysisResult.hasMentalHealthIssue ?? (analysisCategory !== 'none' && analysisCategory !== 'wellness' && analysisCategory !== 'unknown'),
      mentalHealthCategory: llmAnalysisResult.mentalHealthCategory || analysisCategory,
      confidence: llmAnalysisResult.confidence ?? analysisConfidence,
      explanation: llmAnalysisResult.explanation || "Analysis incomplete.",
      supportingEvidence: llmAnalysisResult.supportingEvidence || [],
      timestamp,
      modelTier: modelTierToUse,
      _routingDecision: routingDecisionStore,
      _rawModelOutput: llmAnalysisResult // Store what we got from LLM or parsing attempt
    };

    // Final crisis check based on LLM output
    if (finalResult.mentalHealthCategory === 'crisis' && finalResult.confidence > 0.7) { // Threshold for LLM-confirmed crisis
      logger.warn(`LLM analysis confirmed or identified crisis: ${finalResult.mentalHealthCategory} with confidence ${finalResult.confidence}`);
      await this.handleCrisis(text, finalResult, routingContext);
    }

    logger.info('Mental health analysis complete.', { category: finalResult.mentalHealthCategory, confidence: finalResult.confidence });
    return finalResult;
  }

  public async analyzeMentalHealthWithExpertGuidance(
    text: string,
    fetchFullExplanation: boolean = true, // Example param from CLI
    // Potentially add params for expert system IDs, specific rules, etc.
  ): Promise<MentalLLaMAAnalysisResult> {
    logger.info('analyzeMentalHealthWithExpertGuidance called (currently a stub)', { text });
    // This would involve a more complex flow, potentially:
    // 1. Initial analysis (as above).
    // 2. If certain conditions met, query an "expert system" or use different prompts.
    // 3. Combine results.
    // For now, it can just call the standard analysis or return a stubbed expert-guided response.
    const basicAnalysis = await this.analyzeMentalHealth({ text });
    return {
      ...basicAnalysis,
      explanation: `(Expert Guided) ${basicAnalysis.explanation}`, // Simulate expert guidance
      expertGuided: true,
    };
  }

  public async evaluateExplanationQuality(
    explanation: string,
    // Potentially add context, original text, or category for more accurate evaluation
  ): Promise<any> { // Return type should be ExplanationQualityMetrics
    logger.info('evaluateExplanationQuality called (currently a stub)', { explanation });
    // This would ideally call another LLM or a specialized evaluation model/service.
    // For now, return fixed mock values.
    return {
      fluency: 4.5,
      completeness: 4.2,
      reliability: 4.0,
      overall: 4.3,
      // BART_score_F1: 0.88 (example)
    };
  }
}

export default MentalLLaMAAdapter;
