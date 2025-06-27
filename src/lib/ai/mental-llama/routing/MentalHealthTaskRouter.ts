import { getLogger } from '@/lib/utils/logger';
import type {
  LLMInvoker,
  RoutingDecision,
  RoutingContext,
  KeywordRule,
  LLMCategoryToAnalyzerMap,
  Message, // Assuming Message type is { role, content }
} from '../types';
import { buildRoutingPromptMessages } from '../prompts/prompt-templates';
import { ROUTER_LOW_CONFIDENCE_THRESHOLD } from '../constants';

const logger = getLogger('MentalHealthTaskRouter');

// Default keywords - these should be expanded significantly for production
const DEFAULT_KEYWORD_ROUTING_RULES: KeywordRule[] = [
  {
    id: 'crisis_suicide',
    targetAnalyzer: 'crisis',
    keywords: [/kill myself/i, /want to die/i, /suicidal/i, /end my life/i, /self-harm/i],
    confidence: 0.99,
    isCritical: true,
    priority: 100,
  },
  {
    id: 'depression_general',
    targetAnalyzer: 'depression',
    keywords: ['depressed', 'feeling down', 'empty', 'hopeless', /no energy/i, /lost interest/i],
    confidence: 0.7,
    isCritical: false,
    priority: 10,
  },
  {
    id: 'anxiety_general',
    targetAnalyzer: 'anxiety',
    keywords: ['anxious', 'worried', 'panic attack', 'nervous', 'on edge', /can't relax/i],
    confidence: 0.7,
    isCritical: false,
    priority: 10,
  },
  {
    id: 'stress_general',
    targetAnalyzer: 'stress',
    keywords: ['stressed', 'overwhelmed', 'pressure', /too much to handle/i],
    confidence: 0.65,
    isCritical: false,
    priority: 9,
  },
  {
    id: 'wellness_general',
    targetAnalyzer: 'wellness',
    keywords: ['feeling great', 'happy', 'positive', 'doing well', 'mindfulness'],
    confidence: 0.7,
    isCritical: false,
    priority: 8,
  },
];

// Default LLM category mapping
const DEFAULT_LLM_CATEGORY_MAP: LLMCategoryToAnalyzerMap = {
  crisis: { targetAnalyzer: 'crisis', isCritical: true, confidenceBoost: 0.15 },
  suicidal_ideation: { targetAnalyzer: 'crisis', isCritical: true, confidenceBoost: 0.15 },
  self_harm: { targetAnalyzer: 'crisis', isCritical: true, confidenceBoost: 0.15 },
  depression: { targetAnalyzer: 'depression', isCritical: false },
  anxiety: { targetAnalyzer: 'anxiety', isCritical: false },
  stress: { targetAnalyzer: 'stress', isCritical: false },
  wellness: { targetAnalyzer: 'wellness', isCritical: false },
  general_mental_health: { targetAnalyzer: 'general_mental_health', isCritical: false },
  ptsd: { targetAnalyzer: 'ptsd', isCritical: false }, // Example, add more
  unknown: { targetAnalyzer: 'unknown', isCritical: false },
};

export class MentalHealthTaskRouter {
  private llmInvoker: LLMInvoker;
  private keywordRules: KeywordRule[];
  private llmCategoryMap: LLMCategoryToAnalyzerMap;

  constructor(
    llmInvoker: LLMInvoker,
    keywordRules: KeywordRule[] = DEFAULT_KEYWORD_ROUTING_RULES,
    llmCategoryMap: LLMCategoryToAnalyzerMap = DEFAULT_LLM_CATEGORY_MAP,
  ) {
    this.llmInvoker = llmInvoker;
    this.keywordRules = keywordRules.sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority
    this.llmCategoryMap = llmCategoryMap;
    logger.info('MentalHealthTaskRouter initialized.');
  }

  private matchKeywords(text: string): RoutingDecision | null {
    const lowerText = text.toLowerCase();
    for (const rule of this.keywordRules) {
      for (const keyword of rule.keywords) {
        if (typeof keyword === 'string' && lowerText.includes(keyword.toLowerCase())) {
          return {
            method: 'keyword',
            targetAnalyzer: rule.targetAnalyzer,
            confidence: rule.confidence,
            isCritical: rule.isCritical || false,
            insights: { matchedKeyword: keyword, ruleId: rule.id },
          };
        }
        if (keyword instanceof RegExp && keyword.test(text)) {
          return {
            method: 'keyword',
            targetAnalyzer: rule.targetAnalyzer,
            confidence: rule.confidence,
            isCritical: rule.isCritical || false,
            insights: { matchedKeyword: keyword.source, ruleId: rule.id },
          };
        }
      }
    }
    return null;
  }

  private async performBroadClassification(text: string): Promise<RoutingDecision | null> {
    const messages: Message[] = buildRoutingPromptMessages(text);
    try {
      const llmResponseRaw = await this.llmInvoker(messages, { temperature: 0.2, max_tokens: 150 });
      // Basic sanitization (remove potential markdown, backticks)
      const sanitizedResponse = llmResponseRaw.replace(/```json\n?|\n?```/g, '').trim();

      let llmJsonResponse;
      try {
        llmJsonResponse = JSON.parse(sanitizedResponse);
      } catch (parseError) {
         logger.error('Failed to parse LLM JSON response for routing', { rawResponse: sanitizedResponse, error: parseError });
        return null; // Or a default fallback
      }

      const categoryFromLLM = llmJsonResponse.category?.toLowerCase() || 'unknown';
      const confidenceFromLLM = parseFloat(llmJsonResponse.confidence) || 0.5;

      const mappedEntry = this.llmCategoryMap[categoryFromLLM] || this.llmCategoryMap['unknown'];
      const finalConfidence = Math.min(1.0, confidenceFromLLM + (mappedEntry.confidenceBoost || 0));

      if (mappedEntry.isCritical) {
        logger.warn(`LLM routing classified text as critical: ${categoryFromLLM}`, { llmResponse: llmJsonResponse });
      }

      return {
        method: 'llm_classification',
        targetAnalyzer: mappedEntry.targetAnalyzer,
        confidence: finalConfidence,
        isCritical: mappedEntry.isCritical,
        insights: { llmRawOutput: llmJsonResponse, mappedCategory: categoryFromLLM },
      };
    } catch (error) {
      logger.error('Error during LLM broad classification for routing:', error);
      return null;
    }
  }

  private applyContextualRules(text: string, context: RoutingContext, currentDecision: RoutingDecision): RoutingDecision | null {
    // Placeholder for contextual rule logic.
    // This could involve checking context.sessionType, context.userProfile, etc.
    // For example:
    // if (context.sessionType === 'crisis_intervention_follow_up' && currentDecision.targetAnalyzer !== 'crisis') {
    //   if (text.toLowerCase().includes("still feel awful")) { // Simplified example
    //      logger.info(`Contextual rule: Elevating to crisis due to sessionType and keywords.`);
    //      return { ...currentDecision, targetAnalyzer: 'crisis', isCritical: true, confidence: Math.max(currentDecision.confidence, 0.9), method: 'contextual_rule', insights: { ...currentDecision.insights, ruleId: 'crisis_follow_up_distress' } };
    //   }
    // }
    // if (context.explicitTaskHint === 'wellness_check' && currentDecision.targetAnalyzer !== 'wellness') {
    //    logger.info(`Contextual rule: Aligning to wellness due to explicitTaskHint.`);
    //    return { ...currentDecision, targetAnalyzer: 'wellness', isCritical: false, confidence: Math.max(currentDecision.confidence, 0.75), method: 'contextual_rule', insights: { ...currentDecision.insights, ruleId: 'align_to_wellness_hint' } };
    // }
    return null; // No contextual rule applied
  }

  public async determineRoute(
    text: string,
    context?: RoutingContext,
    explicitTaskHint?: string | null,
  ): Promise<RoutingDecision> {
    logger.info('Determining route for text...', { hasContext: !!context, explicitTaskHint });

    // 1. Explicit Hint (Highest Priority)
    if (explicitTaskHint) {
      const mappedEntry = this.llmCategoryMap[explicitTaskHint.toLowerCase()] || { targetAnalyzer: explicitTaskHint, isCritical: false };
      let baseDecision: RoutingDecision = {
        method: 'explicit_hint',
        targetAnalyzer: mappedEntry.targetAnalyzer,
        confidence: 0.99, // High confidence for explicit hints
        isCritical: mappedEntry.isCritical,
        insights: { hint: explicitTaskHint },
      };
       if (context) {
        const contextualAdjustment = this.applyContextualRules(text, context, baseDecision);
        if (contextualAdjustment) return contextualAdjustment;
      }
      return baseDecision;
    }

    // 2. Keyword Matching & LLM Classification (Parallel or Sequential)
    const keywordDecision = this.matchKeywords(text);
    const llmDecision = await this.performBroadClassification(text);

    let bestPreliminaryDecision: RoutingDecision | null = null;

    if (keywordDecision && llmDecision) {
      // Both available, compare
      if (keywordDecision.isCritical && !llmDecision.isCritical) bestPreliminaryDecision = keywordDecision;
      else if (!keywordDecision.isCritical && llmDecision.isCritical) bestPreliminaryDecision = llmDecision;
      else if (keywordDecision.isCritical && llmDecision.isCritical) { // Both critical
        bestPreliminaryDecision = keywordDecision.confidence >= llmDecision.confidence ? keywordDecision : llmDecision;
      } else if (keywordDecision.targetAnalyzer === llmDecision.targetAnalyzer) { // Agree on target
        bestPreliminaryDecision = keywordDecision; // Or combine confidence: Math.min(1, keywordDecision.confidence + llmDecision.confidence * 0.5)
        bestPreliminaryDecision.confidence = Math.min(1, keywordDecision.confidence + (llmDecision.confidence * 0.3)); // Boost if agree
      } else { // Disagree, neither critical
        bestPreliminaryDecision = keywordDecision.confidence >= llmDecision.confidence ? keywordDecision : llmDecision;
      }
    } else if (keywordDecision) {
      bestPreliminaryDecision = keywordDecision;
    } else if (llmDecision) {
      bestPreliminaryDecision = llmDecision;
    }

    // 3. Apply Contextual Rules to the best preliminary decision
    if (bestPreliminaryDecision && context) {
      const contextualAdjustment = this.applyContextualRules(text, context, bestPreliminaryDecision);
      if (contextualAdjustment) {
        logger.info('Route adjusted by contextual rules.', { original: bestPreliminaryDecision, new: contextualAdjustment });
        return contextualAdjustment;
      }
    }

    if (bestPreliminaryDecision) {
      // Low confidence check
      if (bestPreliminaryDecision.confidence < ROUTER_LOW_CONFIDENCE_THRESHOLD && bestPreliminaryDecision.targetAnalyzer !== 'crisis') {
         logger.warn(`Routing decision for "${bestPreliminaryDecision.targetAnalyzer}" has low confidence (${bestPreliminaryDecision.confidence}). Defaulting.`, { decision: bestPreliminaryDecision });
         // Consider defaulting to 'general_mental_health' or 'unknown' more aggressively here
         // For now, let it pass, adapter can handle low confidence.
      }
      logger.info(`Final route determined: ${bestPreliminaryDecision.targetAnalyzer} by ${bestPreliminaryDecision.method}`);
      return bestPreliminaryDecision;
    }

    // 4. Default Fallback
    logger.warn('No specific route determined by keywords or LLM. Using default fallback.');
    return {
      method: 'default_fallback',
      targetAnalyzer: 'general_mental_health', // Or 'unknown'
      confidence: 0.1,
      isCritical: false,
      insights: { reason: "No rules matched, and LLM classification failed or was inconclusive." }
    };
  }
}
export default MentalHealthTaskRouter;
