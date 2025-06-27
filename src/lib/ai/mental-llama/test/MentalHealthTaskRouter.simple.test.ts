import { MentalHealthTaskRouter } from '../routing/MentalHealthTaskRouter';
import type { LLMResponse } from '../types/mentalLLaMATypes';

// Mock logger to avoid import issues
vi.mock('@/lib/utils/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })
}));

describe('MentalHealthTaskRouter - Production Implementation', () => {
  let router: MentalHealthTaskRouter;
  let mockLLMInvoker: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLLMInvoker = vi.fn();
    router = new MentalHealthTaskRouter(mockLLMInvoker, {
      defaultTargetAnalyzer: 'general_mental_health',
      defaultConfidence: 0.1,
      maxRetries: 3,
      llmTimeoutMs: 30000,
      enableFallbackClassification: true
    });
  });

  describe('Basic Routing Functionality', () => {
    test('should route crisis text using keyword matching', async () => {
      const result = await router.route({
        text: 'I want to kill myself',
        context: { sessionType: 'crisis_intervention' }
      });

      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('keyword');
    });

    test('should route anxiety text using keyword matching', async () => {
      const result = await router.route({
        text: 'I am having panic attacks constantly',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('anxiety');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.method).toBe('keyword');
    });

    test('should use LLM when keywords don\'t match clearly', async () => {
      const mockResponse: LLMResponse = {
        content: '{"category": "depression", "confidence": 0.85, "reasoning": "Depression indicators detected", "is_critical_intent": false}'
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      const result = await router.route({
        text: 'I feel empty and lost',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('depression');
      expect(result.confidence).toBe(0.85);
      expect(result.method).toBe('llm');
      expect(mockLLMInvoker).toHaveBeenCalledTimes(1);
    });

    test('should handle empty input with default routing', async () => {
      const result = await router.route({
        text: '   ',
        context: {}
      });

      expect(result.targetAnalyzer).toBe('general_mental_health');
      expect(result.confidence).toBe(0.1);
      expect(result.method).toBe('default');
      expect(result.isCritical).toBe(false);
    });
  });

  describe('LLM Integration and Fallback', () => {
    test('should use fallback when LLM fails', async () => {
      mockLLMInvoker.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await router.route({
        text: 'I feel very anxious about everything',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('anxiety'); // Should fallback to keyword matching
      expect(result.method).toBe('keyword');
      expect(mockLLMInvoker).toHaveBeenCalledTimes(3); // Should retry 3 times
    });

    test('should retry LLM calls on failure', async () => {
      const successResponse: LLMResponse = {
        content: '{"category": "stress", "confidence": 0.8, "reasoning": "Work stress indicators", "is_critical_intent": false}'
      };

      // First two calls fail, third succeeds
      mockLLMInvoker
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(successResponse);

      const result = await router.route({
        text: 'Work is overwhelming me',
        context: { sessionType: 'wellness_check' }
      });

      expect(result.targetAnalyzer).toBe('stress');
      expect(result.confidence).toBe(0.8);
      expect(result.method).toBe('llm');
      expect(mockLLMInvoker).toHaveBeenCalledTimes(3);
    });

    test('should handle invalid LLM responses gracefully', async () => {
      mockLLMInvoker.mockResolvedValue({
        content: 'malformed json that cannot be parsed'
      } as LLMResponse);

      const result = await router.route({
        text: 'I feel stressed',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('stress'); // Should fallback to keyword matching
      expect(result.method).toBe('keyword');
      expect(mockLLMInvoker).toHaveBeenCalledTimes(3); // Should retry 3 times
    });
  });

  describe('Context-Aware Routing', () => {
    test('should prioritize explicit task hints', async () => {
      const result = await router.route({
        text: 'How are you?',
        context: { 
          sessionType: 'wellness_check',
          explicitTaskHint: 'crisis'
        }
      });

      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.confidence).toBe(0.95); // Explicit hint confidence
      expect(result.method).toBe('explicit_hint');
      expect(result.isCritical).toBe(true);
    });

    test('should handle crisis intervention follow-up context', async () => {
      const result = await router.route({
        text: 'I want to end it all',
        context: { 
          sessionType: 'crisis_intervention_follow_up',
          previousConversationState: { riskLevel: 'high' }
        }
      });

      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('keyword');
    });

    test('should adjust confidence based on context', async () => {
      const mockResponse: LLMResponse = {
        content: '{"category": "anxiety", "confidence": 0.7, "reasoning": "Some anxiety indicators", "is_critical_intent": false}'
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      const result = await router.route({
        text: 'I feel a bit nervous',
        context: { 
          sessionType: 'crisis_intervention_follow_up',
          previousConversationState: { riskLevel: 'high' }
        }
      });

      // Should boost confidence due to crisis follow-up context
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.method).toBe('llm');
    });
  });

  describe('Production Features', () => {
    test('should track routing insights and metadata', async () => {
      const result = await router.route({
        text: 'I feel stressed at work',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.insights).toBeDefined();
      expect(result.insights?.matchedKeyword).toBeDefined();
      expect(result.insights?.ruleAnalyzer).toBe('stress');
      expect(result.insights?.['processingTimeMs']).toBeGreaterThan(0);
    });

    test('should return available analyzers', () => {
      const analyzers = router.getAvailableAnalyzers();
      
      expect(analyzers).toContain('crisis');
      expect(analyzers).toContain('anxiety');
      expect(analyzers).toContain('depression');
      expect(analyzers).toContain('stress');
      expect(analyzers).toContain('wellness');
      expect(analyzers.length).toBeGreaterThan(0);
    });

    test('should handle very long text input gracefully', async () => {
      const longText = 'This is a very long message about stress. '.repeat(150); // ~6000 chars
      
      const result = await router.route({
        text: longText,
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('stress'); // Should match keywords
      expect(result.method).toBe('keyword');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    test('should truncate very long text for LLM calls', async () => {
      const longText = 'I feel anxious. '.repeat(300); // Very long text
      
      const mockResponse: LLMResponse = {
        content: '{"category": "anxiety", "confidence": 0.8, "reasoning": "Anxiety detected", "is_critical_intent": false}'
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      await router.route({
        text: longText,
        context: { sessionType: 'therapeutic_session' }
      });

      // Should use LLM with truncated text if no keyword match
      expect(mockLLMInvoker).toHaveBeenCalledWith(
        expect.stringContaining('I feel anxious'),
        expect.any(Object)
      );
      
      // Check that the prompt was truncated (should be under 4000 chars)
      const callArgs = mockLLMInvoker.mock.calls[0];
      expect(callArgs[0].length).toBeLessThan(4000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should maintain crisis priority over other methods', async () => {
      const mockResponse: LLMResponse = {
        content: '{"category": "wellness", "confidence": 0.9, "reasoning": "Positive indicators", "is_critical_intent": false}'
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      const result = await router.route({
        text: 'I want to kill myself but also feel happy today', // Mixed signals
        context: { sessionType: 'therapeutic_session' }
      });

      // Keywords should take priority over LLM for crisis detection
      expect(result.targetAnalyzer).toBe('crisis');
      expect(result.isCritical).toBe(true);
      expect(result.method).toBe('keyword');
    });

    test('should handle LLM timeout gracefully', async () => {
      mockLLMInvoker.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await router.route({
        text: 'I feel overwhelmed by anxiety',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('anxiety'); // Should fallback to keywords
      expect(result.method).toBe('keyword');
    });

    test('should handle unknown LLM categories', async () => {
      const mockResponse: LLMResponse = {
        content: '{"category": "unknown_category_not_in_map", "confidence": 0.8, "reasoning": "Unknown", "is_critical_intent": false}'
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      const result = await router.route({
        text: 'I feel confused about things',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('general_mental_health'); // Should fallback to default
      expect(result.method).toBe('llm');
    });

    test('should handle missing LLM response fields', async () => {
      const mockResponse: LLMResponse = {
        content: '{"category": "anxiety"}' // Missing confidence and other fields
      };

      mockLLMInvoker.mockResolvedValue(mockResponse);

      const result = await router.route({
        text: 'I feel nervous',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.targetAnalyzer).toBe('anxiety');
      expect(result.confidence).toBeGreaterThan(0); // Should have default confidence
      expect(result.method).toBe('llm');
    });
  });

  describe('Alternative Routes and Insights', () => {
    test('should provide alternative routes when available', async () => {
      const result = await router.route({
        text: 'I feel stressed and anxious',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.alternativeRoutes).toBeDefined();
      expect(result.alternativeRoutes!.length).toBeGreaterThan(0);
      expect(result.alternativeRoutes).toContain('anxiety'); // Should contain alternative match
    });

    test('should track keyword matches in insights', async () => {
      const result = await router.route({
        text: 'I am having a panic attack',
        context: { sessionType: 'therapeutic_session' }
      });

      expect(result.insights?.matchedKeyword).toBeDefined();
      expect(result.insights?.matchedKeyword).toContain('panic');
    });
  });
});
