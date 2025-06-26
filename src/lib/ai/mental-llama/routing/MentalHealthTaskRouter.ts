import { getLogger } from '@/lib/utils/logger';
import type {
  LLMInvoker,
  RoutingInput,
  RoutingContext,
  RoutingDecision,
  LLMRoutingResponse,
} from '../types/mentalLLaMATypes';

const logger = getLogger('MentalHealthTaskRouter');

// Default confidence scores for different methods if not provided by the method itself
const DEFAULT_CONFIDENCE = {
  KEYWORD: 0.85,
  CONTEXTUAL_RULE: 0.75,
  EXPLICIT_HINT: 0.95,
  LLM_STUB: 0.1, // Low confidence for stub
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


export class MentalHealthTaskRouter {
  private llmInvoker: LLMInvoker;

  constructor(llmInvoker: LLMInvoker) {
    this.llmInvoker = llmInvoker;
    logger.info('MentalHealthTaskRouter initialized.');
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

  private async performBroadClassificationLLM(
    text: string,
    _context?: RoutingContext
  ): Promise<Partial<RoutingDecision> | null> {
    // This is a STUB for LLM-based classification.
    // In a real implementation, this would involve:
    // 1. Building a prompt (e.g., using a template system, incorporating context)
    // 2. Calling this.llmInvoker with the prompt messages
    // 3. Parsing the LLM's response (expected to be structured, e.g., JSON)
    // 4. Mapping the LLM's category to an internal analyzer target using LLM_CATEGORY_TO_ANALYZER_MAP
    // 5. Handling errors, retries, etc.

    logger.info('Performing broad classification via LLM');

    const systemPrompt = `You are an expert mental health text classification assistant.
Analyze the following user text and classify it into one of the primary categories:
${Object.keys(LLM_CATEGORY_TO_ANALYZER_MAP).join(', ')}.
Additionally, determine if there is critical intent (e.g., immediate risk of self-harm or harm to others).
Respond ONLY with a JSON object matching this schema:
{
  "category": "string (one of the provided categories)",
  "confidence": "number (0.0 to 1.0, your confidence in the category)",
  "reasoning": "string (brief explanation for your classification)",
  "is_critical_intent": "boolean (true if critical intent is detected, otherwise false)"
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: text },
    ];

    try {
      const rawResponse = await this.llmInvoker(messages, { temperature: 0.2, max_tokens: 150 });

      if (!rawResponse) {
        logger.error('LLM call for broad classification returned undefined or null.');
        return null;
      }

      // rawResponse could be an already parsed object if llmInvoker parses it,
      // or a string if it returns raw LLM output. The current llmInvoker in factory parses JSON.
      let llmResponse: LLMRoutingResponse;
      if (typeof rawResponse === 'string') {
        try {
          llmResponse = JSON.parse(rawResponse);
        } catch (e) {
          logger.error('Failed to parse JSON response from LLM for broad classification.', { rawResponse, error: e });
          return null; // Or a default error-representing decision
        }
      } else if (typeof rawResponse === 'object' && rawResponse !== null && 'category' in rawResponse) {
        llmResponse = rawResponse as LLMRoutingResponse; // Trusting the structure from llmInvoker
      } else {
         logger.error('LLM response for broad classification is not in expected string or object format.', { rawResponse });
        return null;
      }

      logger.info('Received LLM response for broad classification:', { llmResponse });

      const categoryKey = llmResponse.category?.toLowerCase() || 'unknown';
      const mapping = LLM_CATEGORY_TO_ANALYZER_MAP[categoryKey] || LLM_CATEGORY_TO_ANALYZER_MAP['unknown'];
      const confidence = typeof llmResponse.confidence === 'number' ? Math.max(0, Math.min(1, llmResponse.confidence)) : 0.5; // Default confidence if not provided/valid

      return {
        targetAnalyzer: mapping.targetAnalyzer,
        confidence: confidence,
        isCritical: !!mapping.isCritical || !!llmResponse.is_critical_intent,
        method: 'llm', // Updated from 'llm_stub'
        insights: {
            llmCategory: llmResponse.category,
            llmReasoning: llmResponse.reasoning,
            llmConfidence: llmResponse.confidence,
            llmIsCriticalIntent: llmResponse.is_critical_intent,
            // llmRaw: llmResponse // Could be verbose, consider if needed for all logs
        },
      };
    } catch (error) {
      logger.error('Error during LLM call for broad classification:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
      });
      return null; // Or a specific error decision
    }
  }

  private applyContextualRules(
    currentDecision: RoutingDecision,
    context?: RoutingContext
  ): RoutingDecision {
    if (!context) return currentDecision;

    let updatedDecision = { ...currentDecision };
    const insights = { ...updatedDecision.insights, contextualRulesApplied: [] as string[] };

    // Example contextual rule: If sessionType is 'crisis_intervention_follow_up' and keywords detected stress,
    // but not crisis, elevate confidence or re-route if specific distress cues appear.
    if (context.sessionType === 'crisis_intervention_follow_up' && currentDecision.targetAnalyzer === 'stress') {
      // This is a placeholder for more sophisticated logic, perhaps checking text for specific follow-up distress cues.
      // For now, let's slightly boost confidence if it was a keyword match for stress.
      if (updatedDecision.method === 'keyword') {
        updatedDecision.confidence = Math.min(1.0, updatedDecision.confidence + 0.1);
        (insights.contextualRulesApplied as string[]).push('Boosted stress confidence due to crisis_follow_up session type.');
      }
    }

    // Example: If explicitTaskHint is 'safety_screen' and current decision is not crisis, ensure it's treated with higher scrutiny
    // or even default to a crisis check if confidence for other non-critical categories is low.
    if (context.explicitTaskHint === 'safety_screen' && !updatedDecision.isCritical) {
        if (updatedDecision.targetAnalyzer !== 'crisis' && updatedDecision.confidence < 0.7) {
            // This is a simplified example. A real scenario might involve more complex logic or re-routing.
            // For now, we'll just log that a safety screen hint was present.
            (insights.contextualRulesApplied as string[]).push('Safety_screen hint noted; current decision is not critical but should be reviewed carefully.');
        }
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
        if (keywordMatch) {
            if (!decision || (keywordMatch.isCritical && !decision.isCritical) || (keywordMatch.confidence && decision.confidence && keywordMatch.confidence > decision.confidence)) {
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
    }


    // 3. LLM-based classification (STUBBED) - run if no critical decision yet or to augment
    // In a real system, you might run this in parallel or if keyword confidence is low.
    if (!decision || !decision.isCritical || (decision.confidence < 0.85 && decision.targetAnalyzer !== 'crisis')) {
      const llmDecisionPartial = await this.performBroadClassificationLLM(text, context);
      if (llmDecisionPartial) {
        if (!decision || (llmDecisionPartial.isCritical && !decision.isCritical) || (llmDecisionPartial.confidence && decision.confidence && llmDecisionPartial.confidence > decision.confidence)) {
          // Favor LLM if it's critical and current decision isn't, or if LLM confidence is higher for non-critical.
          decision = {
            targetAnalyzer: llmDecisionPartial.targetAnalyzer || 'unknown',
            confidence: llmDecisionPartial.confidence || DEFAULT_CONFIDENCE.LLM_STUB,
            isCritical: !!llmDecisionPartial.isCritical,
            method: llmDecisionPartial.method || 'llm_stub',
            insights: llmDecisionPartial.insights || {},
          };
          logger.info(`Routing updated/based on LLM (stubbed) classification: ${decision.targetAnalyzer}`);
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
      decision = {
        targetAnalyzer: 'general_mental_health', // Default fallback
        confidence: DEFAULT_CONFIDENCE.DEFAULT,
        isCritical: false,
        method: 'default',
        insights: { reason: 'No specific routing rule matched.' },
      };
      logger.warn('No specific routing rule matched. Falling back to default.');
    }

    // Ensure critical flag is consistent if target is 'crisis'
    if (decision.targetAnalyzer === 'crisis') {
        decision.isCritical = true;
    }

    logger.info('Final routing decision:', decision);
    return decision;
  }
}
