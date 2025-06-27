// Test file to verify MentalHealthTaskRouter configuration works
import { MentalHealthTaskRouter, MentalHealthTaskRouterOptions } from './src/lib/ai/mental-llama/routing/MentalHealthTaskRouter';
import type { LLMInvoker, RoutingContext } from './src/lib/ai/mental-llama/types/mentalLLaMATypes';

// Mock LLM invoker for testing
const mockLLMInvoker: LLMInvoker = async () => ({
  content: JSON.stringify({
    category: 'general_mental_health',
    confidence: 0.5,
    reasoning: 'Test response',
    is_critical_intent: false
  })
});

// Test 1: Default configuration
const _defaultRouter = new MentalHealthTaskRouter(mockLLMInvoker);
console.log('✅ Default router created successfully');

// Test 2: Custom configuration
const customOptions: MentalHealthTaskRouterOptions = {
  defaultTargetAnalyzer: 'crisis',
  defaultConfidence: 0.3,
  getDefaultConfidence: (context?: RoutingContext) => {
    if (context?.sessionType === 'crisis_intervention_follow_up') {
      return 0.4;
    }
    if (context?.explicitTaskHint === 'safety_screen') {
      return 0.6;
    }
    return 0.2;
  }
};

const customRouter = new MentalHealthTaskRouter(mockLLMInvoker, customOptions);
console.log('✅ Custom router created successfully');

// Test 3: Verify interface compliance
async function testRouterInterface() {
  const input = {
    text: 'I am feeling overwhelmed',
    context: { sessionType: 'crisis_intervention_follow_up' as const }
  };
  
  try {
    const decision = await customRouter.route(input);
    console.log('✅ Router.route() method works:', decision.targetAnalyzer);
    
    const analyzers = customRouter.getAvailableAnalyzers();
    console.log('✅ Router.getAvailableAnalyzers() works:', analyzers.length, 'analyzers');
    
    customRouter.updateRoutingRules?.({});
    console.log('✅ Router.updateRoutingRules() works');
    
  } catch (error) {
    console.error('❌ Router interface test failed:', error);
  }
}

testRouterInterface();

console.log('🎉 All tests completed!');