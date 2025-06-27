import { getLogger } from '@/lib/utils/logger';
import type {
  LLMInvoker,
  RoutingInput,
  RoutingContext,
  RoutingDecision,
  LLMRoutingResponse,
  IMentalHealthTaskRouter,
} from '../types/mentalLLaMATypes';

const logger = getLogger('MentalHealthTaskRouter');

// Default confidence scores for different methods if not provided by the method itself
const DEFAULT_CONFIDENCE = {
  KEYWORD: 0.85,
  CONTEXTUAL_RULE: 0.75,
  EXPLICIT_HINT: 0.95,
  LLM: 0.8, // Production confidence for LLM classification
  LLM_FALLBACK: 0.3, // Confidence when LLM fails and fallback is used
  DEFAULT: 0.05,
};

// Map LLM output categories to internal analyzer targets and critical flags
// This allows flexibility in how LLMs categorize vs. how we route internally.
export const LLM_CATEGORY_TO_ANALYZER_MAP: Record<string, { targetAnalyzer: string; isCritical?: boolean }> = {
  crisis_severe: { targetAnalyzer: 'crisis', isCritical: true },
  crisis_moderate: { targetAnalyzer: 'crisis', isCritical: true },
  suicidal_ideation: { targetAnalyzer: 'crisis', isCritical: true },
  self_harm_intent: { targetAnalyzer: 'crisis', isCritical: true },
  depression_high_risk: { targetAnalyzer: 'depression', isCritical: true }, // Example: high risk depression might also be critical
  depression: { targetAnalyzer: 'depression' },
  anxiety: { targetAnalyzer: 'anxiety' },
  stress: { targetAnalyzer: 'stress' },
  wellness: { targetAnalyzer: 'wellness' },
  general_mental_health: { targetAnalyzer: 'general_mental_health' },
  unknown: { targetAnalyzer: 'unknown' },
  // Add more mappings as LLM outputs are defined
};

// Define keyword-based routing rules. Order matters: more critical/specific rules should come first.
interface KeywordRule {
  analyzer: string;
  keywords: (string | RegExp)[];
  isCritical?: boolean;
  confidence?: number; // Optional: override default confidence for this rule
}

export const KEYWORD_ROUTING_RULES: KeywordRule[] = [
  {
    analyzer: 'crisis',
    keywords: [
      'kill myself', 'want to die', 'ending it all', 'can\'t go on',
      /suicid(al|e)/i, /self-harm/i, 'overdose', 'hopeless and want out',
      'no reason to live',
    ],
    isCritical: true,
    confidence: 0.98, // Higher confidence for direct crisis keywords
  },
  {
    analyzer: 'depression',
    keywords: [
      'depressed', 'empty inside', 'worthless', 'no pleasure', 'always sad',
      'feeling down for weeks', 'lost interest in everything',
    ],
  },
  {
    analyzer: 'anxiety',
    keywords: [
      'anxious', 'panic attack', 'constantly worried', 'overwhelmed with fear',
      'nervous all the time', 'dread',
    ],
  },
  {
    analyzer: 'stress',
    keywords: ['stressed out', 'under pressure', 'burnt out', 'overworked', 'can\'t cope'],
  },
  {
    analyzer: 'wellness',
    keywords: ['feeling good', 'happy', 'content', 'doing well', 'positive outlook'],
  },
  // Add more rules as needed
];

/**
 * Configuration options for MentalHealthTaskRouter
 */
export interface MentalHealthTaskRouterOptions {
  /** Default analyzer to use when no routing rules match (default: 'general_mental_health') */
  defaultTargetAnalyzer?: string;
  /** Default confidence score when no routing rules match (default: 0.05) */
  defaultConfidence?: number;
  /** Function to dynamically calculate default confidence based on context */
  getDefaultConfidence?: (context?: RoutingContext) => number;
  /** Maximum number of retry attempts for LLM calls (default: 2) */
  maxRetries?: number;
  /** Timeout for LLM calls in milliseconds (default: 30000) */
  llmTimeoutMs?: number;
  /** Whether to use fallback classification when LLM fails (default: true) */
  enableFallbackClassification?: boolean;
}

/**
 * Production-grade Mental health task router that determines which analyzer should handle a given input.
 * Features:
 * - Configurable default routing behavior
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Input validation and sanitization
 * - Context-aware prompting
 * - Fallback classification
 * - Comprehensive error handling
 * - Response validation
 * 
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const router = new MentalHealthTaskRouter(llmInvoker);
 * 
 * // With custom configuration for production
 * const router = new MentalHealthTaskRouter(llmInvoker, {
 *   defaultTargetAnalyzer: 'crisis',
 *   defaultConfidence: 0.3,
 *   maxRetries: 3,
 *   llmTimeoutMs: 45000,
 *   enableFallbackClassification: true,
 *   getDefaultConfidence: (context) => {
 *     if (context?.sessionType === 'crisis_intervention_follow_up') return 0.4;
 *     return 0.2;
 *   }
 * });
 * ```
 */
export class MentalHealthTaskRouter implements IMentalHealthTaskRouter {
  private llmInvoker: LLMInvoker;
  private defaultTargetAnalyzer: string;
  private defaultConfidence: number;
  private getDefaultConfidence?: ((context?: RoutingContext) => number) | undefined;
  private maxRetries: number;
  private llmTimeoutMs: number;
  private enableFallbackClassification: boolean;

  /**
   * Creates a new MentalHealthTaskRouter instance.
   * 
   * @param llmInvoker - Function to invoke LLM for classification
   * @param options - Optional configuration for default routing behavior
   */
  constructor(llmInvoker: LLMInvoker, options?: MentalHealthTaskRouterOptions) {
    this.llmInvoker = llmInvoker;
    this.defaultTargetAnalyzer = options?.defaultTargetAnalyzer ?? 'general_mental_health';
    this.defaultConfidence = options?.defaultConfidence ?? DEFAULT_CONFIDENCE.DEFAULT;
    this.getDefaultConfidence = options?.getDefaultConfidence ?? undefined;
    this.maxRetries = options?.maxRetries ?? 2;
    this.llmTimeoutMs = options?.llmTimeoutMs ?? 30000;
    this.enableFallbackClassification = options?.enableFallbackClassification ?? true;
    
    logger.info('MentalHealthTaskRouter initialized.', {
      defaultTargetAnalyzer: this.defaultTargetAnalyzer,
      defaultConfidence: this.defaultConfidence,
      hasCustomDefaultConfidenceFunction: !!this.getDefaultConfidence,
      maxRetries: this.maxRetries,
      llmTimeoutMs: this.llmTimeoutMs,
      enableFallbackClassification: this.enableFallbackClassification
    });
  }

  private matchKeywords(text: string): Partial<RoutingDecision> | null {
    const lowerText = text.toLowerCase();
    for (const rule of KEYWORD_ROUTING_RULES) {
      for (const keyword of rule.keywords) {
        if (typeof keyword === 'string' && lowerText.includes(keyword)) {
          return {
            targetAnalyzer: rule.analyzer,
            confidence: rule.confidence || DEFAULT_CONFIDENCE.KEYWORD,
            isCritical: !!rule.isCritical,
            method: 'keyword',
            insights: { matchedKeyword: keyword, ruleAnalyzer: rule.analyzer },
          };
        }
        if (keyword instanceof RegExp && keyword.test(text)) {
          return {
            targetAnalyzer: rule.analyzer,
            confidence: rule.confidence || DEFAULT_CONFIDENCE.KEYWORD,
            isCritical: !!rule.isCritical,
            method: 'keyword',
            insights: { matchedKeyword: keyword.source, ruleAnalyzer: rule.analyzer },
          };
        }
      }
    }
    return null;
  }

  /**
   * Enhanced LLM-based classification with production-grade features:
   * - Retry logic with exponential backoff
   * - Timeout handling
   * - Input validation and sanitization  
   * - Context-aware prompting
   * - Fallback classification
   * - Comprehensive error handling
   * - Response validation
   */
  private async performBroadClassificationLLM(
    text: string,
    context?: RoutingContext
  ): Promise<Partial<RoutingDecision> | null> {
    const startTime = Date.now();
    
    // Input validation
    if (!text || text.trim().length === 0) {
      logger.warn('Empty or whitespace-only text provided for LLM classification');
      return null;
    }

    // Sanitize and limit input length
    const sanitizedText = text.trim().slice(0, 4000); // Prevent extremely long inputs
    if (sanitizedText.length !== text.trim().length) {
      logger.warn('Input text was truncated for LLM classification', { 
        originalLength: text.length, 
        truncatedLength: sanitizedText.length 
      });
    }

    const availableCategories = Object.keys(LLM_CATEGORY_TO_ANALYZER_MAP);
    
    // Build context-aware system prompt
    const systemPrompt = this.buildClassificationPrompt(availableCategories, context);
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: sanitizedText },
    ];

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`LLM classification attempt ${attempt + 1}/${this.maxRetries + 1}`, {
          textLength: sanitizedText.length,
          hasContext: !!context,
          sessionType: context?.sessionType,
          explicitHint: context?.explicitTaskHint
        });

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('LLM request timeout')), this.llmTimeoutMs)
        );

        // Execute LLM call with timeout
        const responsePromise = this.llmInvoker(messages, { 
          temperature: 0.2, 
          max_tokens: 200,
          top_p: 0.9,
          frequency_penalty: 0.0,
          presence_penalty: 0.0
        });

        const rawResponse = await Promise.race([responsePromise, timeoutPromise]);

        if (!rawResponse) {
          throw new Error('LLM returned empty response');
        }

        // Parse and validate response
        const llmResponse = this.parseAndValidateResponse(rawResponse);
        if (!llmResponse) {
          if (attempt === this.maxRetries) {
            logger.error('Failed to get valid LLM response after all retries');
            return this.getFallbackClassification(sanitizedText, context, 'parse_failure');
          }
          continue; // Retry on parse failure
        }

        // Map LLM category to internal analyzer
        const mappingResult = this.mapLLMCategoryToAnalyzer(llmResponse, sanitizedText, context);
        
        const processingTime = Date.now() - startTime;
        logger.info('LLM classification successful', {
          category: llmResponse.category,
          confidence: llmResponse.confidence,
          isCritical: mappingResult.isCritical,
          targetAnalyzer: mappingResult.targetAnalyzer,
          processingTime,
          attempts: attempt + 1
        });

        return {
          targetAnalyzer: mappingResult.targetAnalyzer,
          confidence: mappingResult.confidence,
          isCritical: mappingResult.isCritical,
          method: 'llm',
          insights: {
            llmCategory: llmResponse.category,
            llmReasoning: llmResponse.reasoning || 'No reasoning provided',
            llmConfidence: llmResponse.confidence,
            llmIsCriticalIntent: llmResponse.is_critical_intent || false,
            processingTime,
            attemptsUsed: attempt + 1,
            modelVersion: 'gpt-3.5-turbo', // Could be dynamic based on LLM invoker
            contextUsed: !!context,
            alternativeRoutes: this.getAlternativeRoutes(llmResponse, availableCategories)
          },
        };

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTimeoutError = errorMessage.includes('timeout');
        const isRateLimitError = errorMessage.includes('rate limit') || errorMessage.includes('429');
        
        logger.warn(`LLM classification attempt ${attempt + 1} failed`, {
          error: errorMessage,
          isTimeoutError,
          isRateLimitError,
          willRetry: attempt < this.maxRetries
        });

        // Calculate backoff delay
        if (attempt < this.maxRetries) {
          const baseDelay = isRateLimitError ? 2000 : 1000; // Longer delay for rate limits
          const backoffDelay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          // Final attempt failed, use fallback
          logger.error('All LLM classification attempts failed', {
            totalAttempts: attempt + 1,
            finalError: errorMessage,
            processingTime: Date.now() - startTime
          });
          
          return this.getFallbackClassification(sanitizedText, context, 'llm_failure');
        }
      }
    }

    // This should never be reached due to the loop logic, but TypeScript requires it
    return this.getFallbackClassification(sanitizedText, context, 'unexpected_fallthrough');
  }

  /**
   * Build a context-aware system prompt for LLM classification
   */
  private buildClassificationPrompt(availableCategories: string[], context?: RoutingContext): string {
    const basePrompt = `You are an expert mental health text classification assistant specialized in crisis detection and mental health categorization.

Your task is to analyze user text and classify it into one of these categories: ${availableCategories.join(', ')}.

CRITICAL PRIORITY: Always prioritize detecting immediate risk of self-harm or harm to others. If there is ANY indication of crisis intent, mark is_critical_intent as true.`;

    let contextualGuidance = '';
    
    if (context?.sessionType === 'crisis_intervention_follow_up') {
      contextualGuidance += '\n\nCONTEXT: This is a follow-up session after a crisis intervention. Be especially vigilant for continued risk indicators or signs of improvement.';
    }
    
    if (context?.explicitTaskHint === 'safety_screen') {
      contextualGuidance += '\n\nCONTEXT: This is a safety screening session. Apply heightened scrutiny for any signs of risk.';
    }
    
    if (context?.previousConversationState?.riskLevel) {
      contextualGuidance += `\n\nCONTEXT: Previous risk level was "${context.previousConversationState.riskLevel}". Consider this in your assessment.`;
    }

    const responseFormat = `

Respond ONLY with a valid JSON object matching this exact schema:
{
  "category": "string (must be one of: ${availableCategories.join(', ')})",
  "confidence": "number (0.0 to 1.0, your confidence in this classification)",
  "reasoning": "string (brief explanation for your classification - 1-2 sentences)",
  "is_critical_intent": "boolean (true if ANY indication of immediate self-harm or harm to others)"
}

Ensure the response is valid JSON that can be parsed programmatically.`;

    return basePrompt + contextualGuidance + responseFormat;
  }

  /**
   * Parse and validate LLM response with comprehensive error handling
   */
  private parseAndValidateResponse(rawResponse: unknown): LLMRoutingResponse | null {
    try {
      let parsedResponse: unknown;

      if (typeof rawResponse === 'string') {
        // Try to extract JSON from response (LLM might include extra text)
        const jsonMatch = rawResponse.match(/\{[^}]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : rawResponse;
        parsedResponse = JSON.parse(jsonString);
      } else if (typeof rawResponse === 'object' && rawResponse !== null) {
        parsedResponse = rawResponse;
      } else {
        logger.error('Invalid response type from LLM', { responseType: typeof rawResponse });
        return null;
      }

      // Type validation
      const response = parsedResponse as Record<string, unknown>;
      
      if (!this.isValidLLMResponse(response)) {
        logger.error('LLM response failed validation', { response: parsedResponse });
        return null;
      }

      return response as unknown as LLMRoutingResponse;

    } catch (error) {
      logger.error('Failed to parse LLM response', { 
        error: error instanceof Error ? error.message : String(error),
        rawResponse: typeof rawResponse === 'string' ? rawResponse.slice(0, 200) : rawResponse
      });
      return null;
    }
  }

  /**
   * Validate LLM response structure and content
   */
  private isValidLLMResponse(response: Record<string, unknown>): boolean {
    // Check required fields exist
    if (!response.category || !response.confidence || !response.reasoning) {
      return false;
    }

    // Validate types
    if (typeof response.category !== 'string' || 
        typeof response.confidence !== 'number' || 
        typeof response.reasoning !== 'string') {
      return false;
    }

    // Validate category is in allowed list
    if (!Object.keys(LLM_CATEGORY_TO_ANALYZER_MAP).includes(response.category.toLowerCase())) {
      logger.warn('LLM returned invalid category', { category: response.category });
      return false;
    }

    // Validate confidence range
    if (response.confidence < 0 || response.confidence > 1) {
      logger.warn('LLM returned invalid confidence', { confidence: response.confidence });
      return false;
    }

    // Validate reasoning length
    if (response.reasoning.length < 5 || response.reasoning.length > 500) {
      logger.warn('LLM reasoning length invalid', { reasoningLength: response.reasoning.length });
      return false;
    }

    return true;
  }

  /**
   * Map LLM category to internal analyzer with enhanced logic
   */
  private mapLLMCategoryToAnalyzer(
    llmResponse: LLMRoutingResponse, 
    text: string, 
    context?: RoutingContext
  ): { targetAnalyzer: string; confidence: number; isCritical: boolean } {
    const categoryKey = llmResponse.category.toLowerCase();
    const mapping = LLM_CATEGORY_TO_ANALYZER_MAP[categoryKey];
    
    if (!mapping) {
      logger.warn('Unknown LLM category, using fallback', { category: llmResponse.category });
      return {
        targetAnalyzer: 'general_mental_health',
        confidence: DEFAULT_CONFIDENCE.LLM_FALLBACK,
        isCritical: false
      };
    }

    // Calculate adjusted confidence based on various factors
    let adjustedConfidence = Math.max(0, Math.min(1, llmResponse.confidence));
    
    // Boost confidence for crisis detection
    if (mapping.isCritical || llmResponse.is_critical_intent) {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.1);
    }
    
    // Context-based confidence adjustments
    if (context?.sessionType === 'crisis_intervention_follow_up' && mapping.targetAnalyzer === 'crisis') {
      adjustedConfidence = Math.min(1.0, adjustedConfidence + 0.05);
    }

    // Length-based confidence adjustment (very short texts are harder to classify)
    if (text.length < 50) {
      adjustedConfidence *= 0.9;
    }

    const isCritical = !!(mapping.isCritical || llmResponse.is_critical_intent);

    return {
      targetAnalyzer: mapping.targetAnalyzer,
      confidence: adjustedConfidence,
      isCritical
    };
  }

  /**
   * Generate alternative routing suggestions
   */
  private getAlternativeRoutes(
    llmResponse: LLMRoutingResponse, 
    availableCategories: string[]
  ): Array<{ analyzer: string; confidence: number; reason: string }> {
    const alternatives: Array<{ analyzer: string; confidence: number; reason: string }> = [];
    
    // If confidence is low, suggest other plausible categories
    if (llmResponse.confidence < 0.7) {
      for (const category of availableCategories) {
        if (category !== llmResponse.category.toLowerCase()) {
          const mapping = LLM_CATEGORY_TO_ANALYZER_MAP[category];
          if (mapping) {
            alternatives.push({
              analyzer: mapping.targetAnalyzer,
              confidence: llmResponse.confidence * 0.6, // Lower confidence for alternatives
              reason: `Alternative classification for low-confidence primary decision`
            });
          }
        }
      }
    }

    return alternatives.slice(0, 2); // Limit to 2 alternatives
  }

  /**
   * Provide fallback classification when LLM fails
   */
  private getFallbackClassification(
    text: string, 
    context?: RoutingContext, 
    failureReason?: string
  ): Partial<RoutingDecision> | null {
    if (!this.enableFallbackClassification) {
      logger.info('Fallback classification disabled, returning null');
      return null;
    }

    logger.info('Using fallback classification', { failureReason });

    // Try keyword-based fallback first
    const keywordResult = this.matchKeywords(text);
    if (keywordResult) {
      return {
        ...keywordResult,
        method: 'keyword_fallback',
        insights: {
          ...keywordResult.insights,
          fallbackReason,
          llmFailed: true
        }
      };
    }

    // Context-based fallback
    if (context?.explicitTaskHint === 'safety_screen' || context?.sessionType === 'crisis_intervention_follow_up') {
      return {
        targetAnalyzer: 'crisis',
        confidence: DEFAULT_CONFIDENCE.LLM_FALLBACK,
        isCritical: true,
        method: 'context_fallback',
        insights: {
          fallbackReason,
          contextHint: context.explicitTaskHint || context.sessionType,
          llmFailed: true
        }
      };
    }

    // Final fallback to general mental health
    return {
      targetAnalyzer: 'general_mental_health',
      confidence: DEFAULT_CONFIDENCE.LLM_FALLBACK,
      isCritical: false,
      method: 'default_fallback',
      insights: {
        fallbackReason,
        llmFailed: true
      }
    };
  }

  private applyContextualRules(
    currentDecision: RoutingDecision,
    context?: RoutingContext
  ): RoutingDecision {
    if (!context) {
      return currentDecision;
    }

    let updatedDecision = { ...currentDecision };
    const insights = { ...updatedDecision.insights, contextualRulesApplied: [] as string[] };

    // Example contextual rule: If sessionType is 'crisis_intervention_follow_up' and keywords detected stress,
    // but not crisis, elevate confidence or re-route if specific distress cues appear.
    if (context.sessionType === 'crisis_intervention_follow_up' && currentDecision.targetAnalyzer === 'stress' && updatedDecision.method === 'keyword') {
          updatedDecision.confidence = Math.min(1.0, updatedDecision.confidence + 0.1);
          (insights.contextualRulesApplied as string[]).push('Boosted stress confidence due to crisis_follow_up session type.');
    }

    // Example: If explicitTaskHint is 'safety_screen' and current decision is not crisis, ensure it's treated with higher scrutiny
    // or even default to a crisis check if confidence for other non-critical categories is low.
    if (context.explicitTaskHint === 'safety_screen' && !updatedDecision.isCritical && (updatedDecision.targetAnalyzer !== 'crisis' && updatedDecision.confidence < 0.7)) {
          (insights.contextualRulesApplied as string[]).push('Safety_screen hint noted; current decision is not critical but should be reviewed carefully.');
    }

    updatedDecision.insights = insights;
    return updatedDecision;
  }

  public async determineRoute(input: RoutingInput): Promise<RoutingDecision> {
    const { text, context } = input;
    let decision: RoutingDecision | null = null;

    // 1. Check for explicit hints in context (highest precedence)
    if (context?.explicitTaskHint) {
      const hint = context.explicitTaskHint.toLowerCase();
      const mappedHint = LLM_CATEGORY_TO_ANALYZER_MAP[hint] ||
                         Object.values(LLM_CATEGORY_TO_ANALYZER_MAP).find(m => m.targetAnalyzer === hint);

      if (mappedHint) {
        decision = {
          targetAnalyzer: mappedHint.targetAnalyzer,
          confidence: DEFAULT_CONFIDENCE.EXPLICIT_HINT,
          isCritical: !!mappedHint.isCritical,
          method: 'explicit_hint',
          insights: { hintUsed: context.explicitTaskHint },
        };
        logger.info(`Routing based on explicit hint: ${context.explicitTaskHint} -> ${decision.targetAnalyzer}`);
      }
    }

    // 2. Keyword-based matching (high precedence, especially for crisis)
    if (!decision || !decision.isCritical) { // Only run if no critical decision from hint
        const keywordMatch = this.matchKeywords(text);
        if (keywordMatch && (!decision || (keywordMatch.isCritical && !decision.isCritical) || (keywordMatch.confidence && decision.confidence && keywordMatch.confidence > decision.confidence))) {
              decision = { // Ensure all fields of RoutingDecision are present
                 targetAnalyzer: keywordMatch.targetAnalyzer || 'unknown',
                 confidence: keywordMatch.confidence || DEFAULT_CONFIDENCE.KEYWORD,
                 isCritical: !!keywordMatch.isCritical,
                 method: 'keyword',
                 insights: keywordMatch.insights || {},
              };
              logger.info(`Routing based on keyword match: ${decision.targetAnalyzer}`);
        }
    }

    // 3. LLM-based classification - run if no critical decision yet or to augment
    // This runs when we need additional confidence or when keyword matching isn't sufficient.
    if (!decision || !decision.isCritical || (decision.confidence < 0.85 && decision.targetAnalyzer !== 'crisis')) {
      const llmDecisionPartial = await this.performBroadClassificationLLM(text, context);
      if (llmDecisionPartial) {
        if (!decision || (llmDecisionPartial.isCritical && !decision.isCritical) || (llmDecisionPartial.confidence && decision.confidence && llmDecisionPartial.confidence > decision.confidence)) {
          // Favor LLM if it's critical and current decision isn't, or if LLM confidence is higher for non-critical.
          decision = {
            targetAnalyzer: llmDecisionPartial.targetAnalyzer || 'unknown',
            confidence: llmDecisionPartial.confidence || DEFAULT_CONFIDENCE.LLM,
            isCritical: !!llmDecisionPartial.isCritical,
            method: llmDecisionPartial.method || 'llm',
            insights: llmDecisionPartial.insights || {},
          };
          logger.info(`Routing updated/based on LLM classification: ${decision.targetAnalyzer}`);
        } else if (decision && llmDecisionPartial.targetAnalyzer === decision.targetAnalyzer) {
          // If they agree, potentially boost confidence (simple average for now)
          decision.confidence = (decision.confidence + (llmDecisionPartial.confidence || 0)) / 2;
          decision.insights = {...decision.insights, ...llmDecisionPartial.insights, llmAgreed: true };
        }
      }
    }

    // 4. Apply contextual rules to the current best decision
    if (decision) {
      decision = this.applyContextualRules(decision, context);
    }

    // 5. Fallback / Default
    if (!decision) {
      const defaultTarget = this.defaultTargetAnalyzer;
      const defaultConfidence = typeof this.getDefaultConfidence === 'function'
        ? this.getDefaultConfidence(context)
        : this.defaultConfidence;

      decision = {
        targetAnalyzer: defaultTarget, // Configurable fallback
        confidence: defaultConfidence,
        isCritical: false,
        method: 'default',
        insights: { reason: 'No specific routing rule matched.' },
      };
      logger.warn(
        `No specific routing rule matched. Falling back to default: ${defaultTarget} (confidence: ${defaultConfidence})`
      );
    }

    // Ensure critical flag is consistent if target is 'crisis'
    if (decision.targetAnalyzer === 'crisis') {
      decision.isCritical = true;
    }

    logger.info('Final routing decision:', decision);
    return decision;
  }

  // Implementation of IMentalHealthTaskRouter interface
  public async route(input: RoutingInput): Promise<RoutingDecision> {
    return this.determineRoute(input);
  }

  public getAvailableAnalyzers(): string[] {
    // Extract unique analyzers from keyword rules and LLM category map
    const keywordAnalyzers = Array.from(new Set(KEYWORD_ROUTING_RULES.map(rule => rule.analyzer)));
    const llmAnalyzers = Array.from(new Set(Object.values(LLM_CATEGORY_TO_ANALYZER_MAP).map(mapping => mapping.targetAnalyzer)));
    
    // Combine and deduplicate
    return Array.from(new Set([...keywordAnalyzers, ...llmAnalyzers]));
  }

  public updateRoutingRules?(rules: Record<string, unknown>): void {
    // Optional method - could be implemented to dynamically update routing rules
    logger.info('updateRoutingRules called but not implemented', { rules });
  }
}
