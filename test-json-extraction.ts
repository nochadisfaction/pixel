import { MentalHealthTaskRouter } from './src/lib/ai/mental-llama/routing/MentalHealthTaskRouter';

// Mock LLM invoker for testing
const mockLLMInvoker = async () => ({
  content: JSON.stringify({
    category: 'depression',
    confidence: 0.8,
    reasoning: 'Test reasoning',
    is_critical_intent: false
  }),
  finishReason: 'stop' as const,
  tokenUsage: {
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30
  }
});

// Create router instance
const router = new MentalHealthTaskRouter(mockLLMInvoker);

// Test the extractJsonFromString method
async function testJsonExtraction() {
  console.log('Testing JSON extraction with nested objects...\n');

  // Test cases
  const testCases = [
    {
      name: 'Simple JSON',
      input: 'Here is the result: {"category": "depression", "confidence": 0.8}',
      expected: '{"category": "depression", "confidence": 0.8}'
    },
    {
      name: 'Nested JSON',
      input: 'Analysis: {"category": "anxiety", "confidence": 0.9, "metadata": {"subtype": "panic", "severity": {"level": "high", "score": 8}}} End of response.',
      expected: '{"category": "anxiety", "confidence": 0.9, "metadata": {"subtype": "panic", "severity": {"level": "high", "score": 8}}}'
    },
    {
      name: 'JSON with escaped quotes',
      input: 'Result: {"reasoning": "Patient says \\"I feel anxious\\" frequently", "confidence": 0.7}',
      expected: '{"reasoning": "Patient says \\"I feel anxious\\" frequently", "confidence": 0.7}'
    },
    {
      name: 'Multiple JSON objects (should get first)',
      input: '{"first": "object"} and then {"second": "object"}',
      expected: '{"first": "object"}'
    },
    {
      name: 'No JSON',
      input: 'This is just plain text with no JSON',
      expected: null
    }
  ];

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Input: ${testCase.input}`);
    
    try {
      // Access the private method using type assertion
      const result = (router as unknown as { extractJsonFromString: (text: string) => string | null }).extractJsonFromString(testCase.input);
      console.log(`Result: ${result}`);
      console.log(`Expected: ${testCase.expected}`);
      console.log(`✅ Pass: ${result === testCase.expected ? 'YES' : 'NO'}`);
      
      if (result && testCase.expected) {
        // Try to parse the result to verify it's valid JSON
        const _parsed = JSON.parse(result);
        console.log(`✅ Valid JSON: YES`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('---\n');
  }
}

testJsonExtraction().catch(console.error);
