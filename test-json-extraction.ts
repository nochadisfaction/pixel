import { MentalHealthTaskRouter } from './src/lib/ai/mental-llama/routing/MentalHealthTaskRouter';
import type { RoutingInput, LLMResponse } from './src/lib/ai/mental-llama/types/mentalLLaMATypes';

// Test the router's JSON extraction capability through its public interface
async function testRouterJsonParsing() {
  console.log('Testing router JSON parsing through public interface...\n');

  // Test cases that exercise the router's internal JSON extraction
  const testCases = [
    {
      name: 'Simple JSON response',
      llmResponse: 'Here is the result: {"category": "depression", "confidence": 0.8, "reasoning": "User mentions feeling down", "is_critical_intent": false}',
      expectedCategory: 'depression',
      expectedConfidence: 0.8,
      shouldSucceed: true
    },
    {
      name: 'Nested JSON response',
      llmResponse: 'Analysis: {"category": "anxiety", "confidence": 0.9, "reasoning": "Shows signs of worry", "is_critical_intent": false} End of response.',
      expectedCategory: 'anxiety', 
      expectedConfidence: 0.9,
      shouldSucceed: true
    },
    {
      name: 'JSON with escaped quotes',
      llmResponse: 'Result: {"category": "stress", "confidence": 0.7, "reasoning": "Patient says \\"I feel overwhelmed\\" frequently", "is_critical_intent": false}',
      expectedCategory: 'stress',
      expectedConfidence: 0.7,
      shouldSucceed: true
    },
    {
      name: 'Crisis detection with nested structure',
      llmResponse: '{"category": "crisis_severe", "confidence": 0.95, "reasoning": "Direct suicidal ideation expressed", "is_critical_intent": true}',
      expectedCategory: 'crisis_severe',
      expectedConfidence: 0.95,
      shouldSucceed: true
    },
    {
      name: 'Malformed JSON (should fallback)',
      llmResponse: 'This is just plain text with no JSON',
      expectedCategory: null, // Should trigger fallback
      expectedConfidence: null,
      shouldSucceed: false // LLM parsing should fail, triggering fallback
    },
    {
      name: 'Multiple JSON objects (should parse first)',
      llmResponse: '{"category": "depression", "confidence": 0.6, "reasoning": "First response", "is_critical_intent": false} and then {"category": "anxiety", "confidence": 0.8, "reasoning": "Second response", "is_critical_intent": false}',
      expectedCategory: 'depression',
      expectedConfidence: 0.6,
      shouldSucceed: true
    }
  ];

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`LLM Response: ${testCase.llmResponse.slice(0, 100)}${testCase.llmResponse.length > 100 ? '...' : ''}`);
    
    try {
      // Create a mock LLM invoker that returns the test response
      const mockLLMInvoker = async (): Promise<LLMResponse> => ({
        content: testCase.llmResponse,
        finishReason: 'stop' as const,
        tokenUsage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        }
      });

      // Create router instance with the mock
      const router = new MentalHealthTaskRouter(mockLLMInvoker);

      // Test the router with a simple input that will trigger LLM classification
      const routingInput: RoutingInput = {
        text: 'I am feeling very sad and hopeless today',
        context: {
          sessionType: 'chat'
        }
      };

      const decision = await router.route(routingInput);
      
      console.log(`✅ Decision received: ${JSON.stringify({
        targetAnalyzer: decision.targetAnalyzer,
        confidence: decision.confidence,
        method: decision.method,
        isCritical: decision.isCritical
      }, null, 2)}`);

      // Verify the results
      if (testCase.shouldSucceed) {
        const passedCategoryCheck = testCase.expectedCategory ? 
          decision.targetAnalyzer.includes(testCase.expectedCategory.split('_')[0]) : true;
        const passedConfidenceCheck = testCase.expectedConfidence ? 
          Math.abs(decision.confidence - testCase.expectedConfidence) < 0.1 : true;
        
        console.log(`✅ Category check: ${passedCategoryCheck ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Confidence check: ${passedConfidenceCheck ? 'PASS' : 'FAIL'}`);
        console.log(`✅ JSON parsed successfully: ${decision.method === 'llm' ? 'YES' : 'NO'}`);
      } else {
        // For failure cases, expect fallback behavior
        const usedFallback = decision.method.includes('fallback') || decision.method === 'keyword' || decision.method === 'default';
        console.log(`✅ Used fallback as expected: ${usedFallback ? 'YES' : 'NO'}`);
      }

    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      
      if (testCase.shouldSucceed) {
        console.log(`❌ Unexpected failure for test: ${testCase.name}`);
      } else {
        console.log('✅ Expected failure handled gracefully');
      }
    }
    
    console.log('---\n');
  }
}

testRouterJsonParsing().catch(console.error);
