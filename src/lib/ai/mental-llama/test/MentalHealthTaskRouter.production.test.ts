import { describe, test, expect, vi, beforeEach } from 'vitest';
import { MentalHealthTaskRouter } from '../routing/MentalHealthTaskRouter';
import type { LLMInvoker, RoutingContext, LLMResponse } from '../types/mentalLLaMATypes';

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })
}));

describe('MentalHealthTaskRouter - Production Grade', () => {
  let mockLLMInvoker: LLMInvoker;
  let router: MentalHealthTaskRouter;

  beforeEach(() => {
    mockLLMInvoker = vi.fn();
    router = new MentalHealthTaskRouter(mockLLMInvoker, {
      maxRetries: 2,
      llmTimeoutMs: 5000,
      enableFallbackClassification: true,
    });
  });

  describe('Retry Logic and Error Handling', () => {
    test('should retry on LLM failures with exponential backoff', async () => {
      // First two calls fail, third succeeds
      mockLLMInvoker
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce({
          category: 'crisis_severe',
          confidence: 0.95,
          reasoning: 'Direct mention of self-harm intent',
          is_critical_intent: true
        } as LLMResponse);

      const result = await router.route({
        text: 'I want to kill myself',
        context: { sessionType: 'crisis_intervention_follow_up' }
      });

      expect(mockLLMInvoker).toHaveBeenCalledTimes(3);
      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('llm');
      expect(result.insights?.attemptsUsed).toBe(3);
    });

    test('should use fallback classification when all retries fail', async () => {
      // All LLM calls fail
      mockLLMInvoker.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await router.route({
        text: 'I want to kill myself',
        context: {}
      });

      expect(mockLLMInvoker).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('keyword_fallback');
      expect(result.insights?.llmFailed).toBe(true);
    });

    test('should handle timeout errors with appropriate fallback', async () => {
      // Mock a hanging promise that never resolves
      mockLLMInvoker.mockImplementation(() => new Promise(() => {}));

      const router = new MentalHealthTaskRouter(mockLLMInvoker, {
        maxRetries: 1,
        llmTimeoutMs: 100, // Very short timeout for testing
        enableFallbackClassification: true,
      });

      const result = await router.route({
        text: 'I am feeling very anxious',
        context: {}
      });

      // Should fallback to keyword matching for anxiety
      expect(result.targetAnalyzer).toBe('anxiety');
      expect(result.method).toBe('keyword_fallback');
      expect(result.insights?.llmFailed).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should handle empty or whitespace-only input', async () => {
      const result = await router.route({
        text: '   \\n\\t   ',
        context: {}
      });

      expect(result.targetAnalyzer).toBe('general_mental_health');
      expect(result.method).toBe('default');
      expect(mockLLMInvoker).not.toHaveBeenCalled();
    });

    test('should truncate very long inputs and log warning', async () => {
      const longText = 'a'.repeat(5000);
      
      mockLLMInvoker.mockResolvedValue({
        category: 'general_mental_health',
        confidence: 0.7,
        reasoning: 'General mental health content',
        is_critical_intent: false
      } as LLMResponse);

      const result = await router.route({
        text: longText,
        context: {}
      });

      // Should have been called with truncated text (4000 chars max)
      const call = mockLLMInvoker.mock.calls[0];
      const userMessage = call[0][1].content;
      expect(userMessage.length).toBe(4000);
      expect(result.targetAnalyzer).toBe('general_mental_health');
    });
  });

  describe('Context-Aware Prompting', () => {
    test('should adapt prompt based on crisis intervention follow-up context', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'stress',
        confidence: 0.8,
        reasoning: 'Work-related stress indicators',
        is_critical_intent: false
      } as LLMResponse);

      const context: RoutingContext = {
        sessionType: 'crisis_intervention_follow_up',
        previousConversationState: {
          riskLevel: 'high'
        }
      };

      await router.route({
        text: 'I am feeling overwhelmed with work',
        context
      });

      // Check that the system prompt includes context-specific guidance
      const call = mockLLMInvoker.mock.calls[0];
      const systemPrompt = call[0][0].content;
      expect(systemPrompt).toContain('crisis intervention');
      expect(systemPrompt).toContain('follow-up session');
      expect(systemPrompt).toContain('Previous risk level was "high"');
    });

    test('should include safety screening context in prompt', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'wellness',
        confidence: 0.9,
        reasoning: 'Positive outlook indicators',
        is_critical_intent: false
      } as LLMResponse);

      const context: RoutingContext = {
        explicitTaskHint: 'safety_screen'
      };

      await router.route({
        text: 'I am doing well today',
        context
      });

      const call = mockLLMInvoker.mock.calls[0];
      const systemPrompt = call[0][0].content;
      expect(systemPrompt).toContain('safety screening');
      expect(systemPrompt).toContain('heightened scrutiny');
    });
  });

  describe('Response Validation', () => {
    test('should reject invalid LLM responses and retry', async () => {
      // First response invalid, second valid
      mockLLMInvoker
        .mockResolvedValueOnce({
          category: 'invalid_category',
          confidence: 0.8,
          reasoning: 'Some reasoning'
        } as LLMResponse)
        .mockResolvedValueOnce({
          category: 'depression',
          confidence: 0.85,
          reasoning: 'Clear indicators of depressive symptoms',
          is_critical_intent: false
        } as LLMResponse);

      const result = await router.route({
        text: 'I feel empty and worthless',
        context: {}
      });

      expect(mockLLMInvoker).toHaveBeenCalledTimes(2);
      expect(result.targetAnalyzer).toBe('depression');
      expect(result.method).toBe('llm');
    });

    test('should reject responses with invalid confidence values', async () => {
      mockLLMInvoker
        .mockResolvedValueOnce({
          category: 'anxiety',
          confidence: 1.5, // Invalid confidence > 1
          reasoning: 'Anxiety indicators'
        } as LLMResponse)
        .mockResolvedValueOnce({
          category: 'anxiety',
          confidence: 0.8,
          reasoning: 'Valid anxiety classification',
          is_critical_intent: false
        } as LLMResponse);

      const result = await router.route({
        text: 'I am very anxious',
        context: {}
      });

      expect(mockLLMInvoker).toHaveBeenCalledTimes(2);
      expect(result.confidence).toBe(0.8);
    });

    test('should handle malformed JSON responses gracefully', async () => {
      mockLLMInvoker.mockResolvedValue('This is not valid JSON');

      const result = await router.route({
        text: 'I am feeling sad',
        context: {}
      });

      // Should fallback since LLM response is invalid
      expect(result.method).toContain('fallback');
      expect(result.insights?.llmFailed).toBe(true);
    });
  });

  describe('Confidence Adjustment Logic', () => {
    test('should boost confidence for crisis detection', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'crisis_severe',
        confidence: 0.8,
        reasoning: 'Crisis indicators detected',
        is_critical_intent: true
      } as LLMResponse);

      const result = await router.route({
        text: 'I want to end my life',
        context: {}
      });

      // Confidence should be boosted by 0.1 for crisis
      expect(result.confidence).toBe(0.9);
      expect(result.isCritical).toBe(true);
    });

    test('should reduce confidence for very short text', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'stress',
        confidence: 0.8,
        reasoning: 'Brief stress indication',
        is_critical_intent: false
      } as LLMResponse);

      const result = await router.route({
        text: 'stressed', // Very short text
        context: {}
      });

      // Confidence should be reduced by 10% for short text
      expect(result.confidence).toBe(0.72); // 0.8 * 0.9
    });
  });

  describe('Alternative Routes Generation', () => {
    test('should generate alternative routes for low-confidence decisions', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'depression',
        confidence: 0.6, // Low confidence
        reasoning: 'Uncertain classification',
        is_critical_intent: false
      } as LLMResponse);

      const result = await router.route({
        text: 'I feel down sometimes',
        context: {}
      });

      expect(result.insights?.alternativeRoutes).toBeDefined();
      expect(result.insights?.alternativeRoutes?.length).toBeGreaterThan(0);
      expect(result.insights?.alternativeRoutes?.[0]).toHaveProperty('analyzer');
      expect(result.insights?.alternativeRoutes?.[0]).toHaveProperty('confidence');
      expect(result.insights?.alternativeRoutes?.[0]).toHaveProperty('reason');
    });
  });

  describe('Performance Monitoring', () => {
    test('should track processing time and attempts', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'wellness',
        confidence: 0.9,
        reasoning: 'Positive indicators',
        is_critical_intent: false
      } as LLMResponse);

      const result = await router.route({
        text: 'I am feeling great today',
        context: {}
      });

      expect(result.insights?.processingTime).toBeDefined();
      expect(typeof result.insights?.processingTime).toBe('number');
      expect(result.insights?.attemptsUsed).toBe(1);
      expect(result.insights?.modelVersion).toBe('gpt-3.5-turbo');
    });
  });

  describe('Integration with Keyword Matching', () => {
    test('should prioritize keyword matching for crisis detection', async () => {
      // LLM would return non-crisis, but keywords should take precedence
      mockLLMInvoker.mockResolvedValue({
        category: 'depression',
        confidence: 0.7,
        reasoning: 'Depressive indicators',
        is_critical_intent: false
      } as LLMResponse);

      const result = await router.route({
        text: 'I want to kill myself and end the pain',
        context: {}
      });

      // Should be routed as crisis due to keyword match, not LLM result
      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('keyword');
    });

    test('should boost confidence when LLM agrees with keyword matching', async () => {
      mockLLMInvoker.mockResolvedValue({
        category: 'crisis_severe',
        confidence: 0.95,
        reasoning: 'Crisis indicators confirmed',
        is_critical_intent: true
      } as LLMResponse);

      const result = await router.route({
        text: 'I am suicidal and need help',
        context: {}
      });

      // Confidence should be averaged between keyword (0.98) and LLM (0.95+0.1 boost)
      expect(result.insights?.llmAgreed).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });
});
