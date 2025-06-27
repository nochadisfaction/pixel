import { getLogger } from '@/lib/utils/logger';
import { config } from '@/config/env.config';
import { z } from 'zod';

import { MentalLLaMAAdapter } from './MentalLLaMAAdapter';
import { MentalHealthTaskRouter } from './routing/MentalHealthTaskRouter';
import { SlackNotificationService } from '../../services/notification/SlackNotificationService';
import type { 
  LLMInvoker, 
  ICrisisNotificationHandler, 
  RoutingContext, 
  MentalLLaMAAdapterOptions, 
  IModelProvider as MentalLLaMAIModelProvider, 
  LLMInvocationOptions, 
  LLMResponse 
} from './types/mentalLLaMATypes';
import { OpenAIModelProvider } from './providers/OpenAIModelProvider';
import type { IModelProvider, ModelProviderOptions } from './providers/types';

const logger = getLogger('MentalLLaMAFactory');

/**
 * Enhanced error types for better error handling
 */
enum LLMInvokerErrorType {
  PROVIDER_UNAVAILABLE = 'provider_unavailable',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
  INVALID_RESPONSE = 'invalid_response',
  PARSING_ERROR = 'parsing_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Circuit breaker for reliability
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number,
    private resetTimeMs: number
  ) {}

  canExecute(): boolean {
    if (this.state === 'closed') {
      return true;
    }
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    // half-open state
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Metrics collector for monitoring
 */
class LLMInvokerMetrics {
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private totalLatency = 0;
  private lastResetTime = Date.now();

  recordRequest(success: boolean, latencyMs: number): void {
    this.totalRequests++;
    this.totalLatency += latencyMs;
    
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
  }

  getMetrics() {
    const now = Date.now();
    const uptimeMs = now - this.lastResetTime;
    
    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: this.totalRequests > 0 ? this.successfulRequests / this.totalRequests : 0,
      averageLatencyMs: this.totalRequests > 0 ? this.totalLatency / this.totalRequests : 0,
      uptimeMs,
      requestsPerMinute: this.totalRequests > 0 ? (this.totalRequests / uptimeMs) * 60000 : 0
    };
  }

  reset(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.totalLatency = 0;
    this.lastResetTime = Date.now();
  }
}

/**
 * Creates a production-grade LLM invoker with comprehensive error handling,
 * retry logic, circuit breaker, timeout management, and monitoring.
 * 
 * This function returns an LLMInvoker that maintains type compatibility while
 * providing robust production features. The router expects JSON responses,
 * so this invoker handles the JSON parsing and returns the content as a string
 * that the router can then parse.
 */
async function createProductionLLMInvoker(
  modelProvider: IModelProvider | undefined,
  routerConfig: typeof DEFAULT_PRODUCTION_CONFIG.router
): Promise<LLMInvoker> {
  const circuitBreaker = routerConfig.enableCircuitBreaker 
    ? new CircuitBreaker(routerConfig.circuitBreakerFailureThreshold, routerConfig.circuitBreakerResetTimeoutMs)
    : null;
  
  const metrics = new LLMInvokerMetrics();
  const invokerLogger = getLogger('ProductionLLMInvoker');

  /**
   * Validates routing response structure
   */
  const validateRoutingResponse = (response: unknown): boolean => {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const r = response as Record<string, unknown>;
    
    // Required fields for routing
    if (typeof r['category'] !== 'string' || r['category'].trim().length === 0) {
      invokerLogger.warn('Invalid category in routing response', { category: r['category'] });
      return false;
    }

    if (typeof r['confidence'] !== 'number' || r['confidence'] < 0 || r['confidence'] > 1) {
      invokerLogger.warn('Invalid confidence in routing response', { confidence: r['confidence'] });
      return false;
    }

    if (typeof r['reasoning'] !== 'string' || r['reasoning'].trim().length < 5) {
      invokerLogger.warn('Invalid reasoning in routing response', { 
        reasoning: typeof r['reasoning'] === 'string' ? r['reasoning'].slice(0, 50) : r['reasoning'] 
      });
      return false;
    }

    return true;
  };

  /**
   * Creates a fallback routing response
   */
  const createFallbackRoutingResponse = (
    errorType: LLMInvokerErrorType,
    errorMessage: string,
    hasModelProvider: boolean
  ): Record<string, unknown> => {
    const baseResponse = {
      category: 'general_mental_health',
      confidence: hasModelProvider ? 0.1 : 0.05,
      reasoning: `Fallback response due to ${errorType}: ${errorMessage}`,
      is_critical_intent: false
    };

    // Adjust response based on error type
    switch (errorType) {
      case LLMInvokerErrorType.TIMEOUT:
        baseResponse.confidence = 0.15;
        baseResponse.reasoning = 'LLM request timed out, using conservative fallback classification';
        break;
      case LLMInvokerErrorType.RATE_LIMITED:
        baseResponse.confidence = 0.2;
        baseResponse.reasoning = 'LLM rate limited, using fallback classification';
        break;
      case LLMInvokerErrorType.PROVIDER_UNAVAILABLE:
        baseResponse.confidence = hasModelProvider ? 0.1 : 0.05;
        baseResponse.reasoning = hasModelProvider 
          ? 'Model provider temporarily unavailable, using fallback'
          : 'No model provider configured, using stub response';
        break;
      default:
        // Keep base response
        break;
    }

    return baseResponse;
  };

  /**
   * Implements exponential backoff with jitter
   */
  const calculateRetryDelay = (attempt: number): number => {
    const exponentialDelay = Math.min(
      1000 * Math.pow(2, attempt),
      10000
    );
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
    return Math.max(100, exponentialDelay + jitter);
  };

  /**
   * Determines if an error is retryable
   */
  const isRetryableError = (error: unknown): boolean => {
    if (!error) {
      return false;
    }
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    // Network errors are generally retryable
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return true;
    }
    
    // Timeout errors are retryable
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return true;
    }
    
    // Rate limiting is retryable with backoff
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return true;
    }
    
    // Server errors (5xx) are generally retryable
    if (errorMessage.includes('500') || errorMessage.includes('502') || 
        errorMessage.includes('503') || errorMessage.includes('504')) {
      return true;
    }
    
    // Client errors (4xx except rate limiting) are generally not retryable
    if (errorMessage.includes('400') || errorMessage.includes('401') || 
        errorMessage.includes('403') || errorMessage.includes('404')) {
      return false;
    }
    
    return true; // Default to retryable for unknown errors
  };

  /**
   * Categorizes error type for better handling
   */
  const categorizeError = (error: unknown): LLMInvokerErrorType => {
    if (!error) {
      return LLMInvokerErrorType.UNKNOWN_ERROR;
    }
    
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return LLMInvokerErrorType.TIMEOUT;
    }
    
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return LLMInvokerErrorType.RATE_LIMITED;
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return LLMInvokerErrorType.NETWORK_ERROR;
    }
    
    if (errorMessage.includes('parse') || errorMessage.includes('json')) {
      return LLMInvokerErrorType.PARSING_ERROR;
    }
    
    if (errorMessage.includes('validation')) {
      return LLMInvokerErrorType.VALIDATION_ERROR;
    }
    
    return LLMInvokerErrorType.UNKNOWN_ERROR;
  };

  /**
   * Main production LLM invoker implementation
   */
  return async function productionLLMInvoker(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: LLMInvocationOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    invokerLogger.debug('Production LLM invocation started', {
      requestId,
      messagesCount: messages.length,
      hasModelProvider: !!modelProvider,
      circuitBreakerState: circuitBreaker?.getState(),
      options: options ? { ...options, apiKey: undefined } : undefined
    });

    // Input validation
    if (!messages || messages.length === 0) {
      const error = 'No messages provided to LLM invoker';
      invokerLogger.error(error, { requestId });
      metrics.recordRequest(false, Date.now() - startTime);
      
      const fallbackResponse = createFallbackRoutingResponse(
        LLMInvokerErrorType.VALIDATION_ERROR, 
        error, 
        !!modelProvider
      );
      
      return {
        content: JSON.stringify(fallbackResponse),
        model: 'fallback',
        metadata: { requestId, error, errorType: 'validation_error' }
      };
    }

    // Validate message structure
    for (const message of messages) {
      if (!message.role || !message.content || typeof message.content !== 'string') {
        const error = 'Invalid message structure';
        invokerLogger.error(error, { requestId, invalidMessage: message });
        metrics.recordRequest(false, Date.now() - startTime);
        
        const fallbackResponse = createFallbackRoutingResponse(
          LLMInvokerErrorType.VALIDATION_ERROR, 
          error, 
          !!modelProvider
        );
        
        return {
          content: JSON.stringify(fallbackResponse),
          model: 'fallback',
          metadata: { requestId, error, errorType: 'validation_error' }
        };
      }
    }

    // Check circuit breaker
    if (circuitBreaker && !circuitBreaker.canExecute()) {
      const error = 'Circuit breaker is open';
      invokerLogger.warn(error, { requestId, circuitBreakerState: circuitBreaker.getState() });
      metrics.recordRequest(false, Date.now() - startTime);
      
      const fallbackResponse = createFallbackRoutingResponse(
        LLMInvokerErrorType.PROVIDER_UNAVAILABLE, 
        error, 
        !!modelProvider
      );
      
      return {
        content: JSON.stringify(fallbackResponse),
        model: 'circuit-breaker',
        metadata: { requestId, error, errorType: 'circuit_breaker_open' }
      };
    }

    // Handle case where no model provider is available
    if (!modelProvider) {
      invokerLogger.warn('No model provider available, using stub response', { requestId });
      
      // Simulate processing time for consistency
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
      
      const fallbackResponse = createFallbackRoutingResponse(
        LLMInvokerErrorType.PROVIDER_UNAVAILABLE,
        'No model provider configured',
        false
      );
      
      metrics.recordRequest(true, Date.now() - startTime);
      
      return {
        content: JSON.stringify(fallbackResponse),
        model: 'stub',
        metadata: { requestId, isStub: true }
      };
    }

    // Retry logic with exponential backoff
    let lastError: unknown = null;
    
    for (let attempt = 0; attempt <= routerConfig.maxRetries; attempt++) {
      try {
        // Calculate timeout for this attempt
        const timeoutMs = Math.min(
          routerConfig.llmTimeoutMs + (attempt * 5000),
          routerConfig.llmTimeoutMs * 2
        );

        invokerLogger.debug(`LLM invocation attempt ${attempt + 1}/${routerConfig.maxRetries + 1}`, {
          requestId,
          timeoutMs,
          provider: modelProvider.getProviderName()
        });

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
        });

        // Prepare chat completion options with production settings
        const chatOptions = {
          temperature: 0.1, // Low temperature for consistent routing decisions
          max_tokens: 500,   // Sufficient for routing response
          top_p: 0.9,
          ...options,
          // Ensure JSON response format if provider supports it
          providerSpecificParams: {
            response_format: { type: 'json_object' },
            ...options?.providerSpecificParams
          }
        };

        // Execute LLM call with timeout
        const response = await Promise.race([
          modelProvider.chatCompletion(messages, chatOptions),
          timeoutPromise
        ]);

        // Check for provider-level errors
        if (response.error) {
          throw new Error(`Provider error: ${response.error.message}`);
        }

        // Validate response structure
        if (!response.choices || response.choices.length === 0) {
          throw new Error('No choices returned from model provider');
        }

        const choice = response.choices[0];
        if (!choice?.message?.content) {
          throw new Error('No content in model response');
        }

        // Parse and validate response content for routing
        let parsedResponse: unknown;
        try {
          parsedResponse = JSON.parse(choice.message.content);
        } catch (parseError) {
          // If JSON parsing fails, create a structured fallback
          invokerLogger.warn('Failed to parse LLM response as JSON, creating structured fallback', {
            requestId,
            content: choice.message.content.slice(0, 200),
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          });
          
          parsedResponse = {
            category: 'general_mental_health',
            confidence: 0.3,
            reasoning: `LLM response was not in JSON format. Raw content: ${choice.message.content.slice(0, 100)}`,
            raw: choice.message.content
          };
        }

        // Validate parsed response for routing requirements
        if (!validateRoutingResponse(parsedResponse)) {
          throw new Error('LLM response failed routing validation');
        }

        // Success - record metrics and return
        const latency = Date.now() - startTime;
        metrics.recordRequest(true, latency);
        circuitBreaker?.onSuccess();
        
        invokerLogger.info('Production LLM invocation successful', {
          requestId,
          category: (parsedResponse as Record<string, unknown>)['category'],
          confidence: (parsedResponse as Record<string, unknown>)['confidence'],
          latencyMs: latency,
          attempt: attempt + 1,
          provider: modelProvider.getProviderName()
        });

        // Return as LLMResponse with JSON content for the router to parse
        const result: LLMResponse = {
          content: JSON.stringify(parsedResponse),
          model: response.model,
          metadata: { 
            requestId, 
            attempt: attempt + 1,
            latencyMs: latency,
            id: response.id,
            created: response.created
          }
        };

        if (choice.finish_reason) {
          result.finishReason = choice.finish_reason as 'stop' | 'length' | 'content_filter' | 'function_call';
        }

        if (response.usage) {
          result.tokenUsage = {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          };
        }

        return result;

      } catch (error) {
        lastError = error;
        const errorType = categorizeError(error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        invokerLogger.warn(`Production LLM invocation attempt ${attempt + 1} failed`, {
          requestId,
          error: errorMessage,
          errorType,
          attempt: attempt + 1,
          isRetryable: isRetryableError(error),
          provider: modelProvider.getProviderName()
        });

        // Record failure in circuit breaker
        circuitBreaker?.onFailure();

        // Check if we should retry
        if (attempt < routerConfig.maxRetries && isRetryableError(error)) {
          const delayMs = calculateRetryDelay(attempt);
          invokerLogger.debug(`Retrying after ${delayMs}ms`, { requestId, nextAttempt: attempt + 2 });
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Final attempt failed or error is not retryable
        break;
      }
    }

    // All attempts failed
    const finalErrorType = categorizeError(lastError);
    const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
    
    invokerLogger.error('All production LLM invocation attempts failed', {
      requestId,
      totalAttempts: routerConfig.maxRetries + 1,
      finalError: finalErrorMessage,
      finalErrorType,
      latencyMs: Date.now() - startTime,
      provider: modelProvider.getProviderName()
    });

    metrics.recordRequest(false, Date.now() - startTime);
    
    const fallbackResponse = createFallbackRoutingResponse(finalErrorType, finalErrorMessage, true);
    
    return {
      content: JSON.stringify(fallbackResponse),
      model: 'fallback',
      metadata: { 
        requestId, 
        error: finalErrorMessage, 
        errorType: finalErrorType,
        totalAttempts: routerConfig.maxRetries + 1
      }
    };
  };
}

// Production configuration schema
const ProductionConfigSchema = z.object({
  // Router configuration
  router: z.object({
    defaultTargetAnalyzer: z.string().default('general_mental_health'),
    defaultConfidence: z.number().min(0).max(1).default(0.1),
    maxRetries: z.number().min(1).max(10).default(3),
    llmTimeoutMs: z.number().min(1000).max(300000).default(45000),
    enableFallbackClassification: z.boolean().default(true),
    enableCircuitBreaker: z.boolean().default(true),
    circuitBreakerFailureThreshold: z.number().min(1).max(20).default(5),
    circuitBreakerResetTimeoutMs: z.number().min(1000).max(300000).default(60000),
  }),
  
  // Model provider configuration  
  modelProvider: z.object({
    maxConcurrentRequests: z.number().min(1).max(100).default(10),
    rateLimitRpm: z.number().min(1).max(10000).default(100),
    healthCheckIntervalMs: z.number().min(5000).max(300000).default(30000),
    connectionTimeoutMs: z.number().min(1000).max(60000).default(30000),
    enableMetrics: z.boolean().default(true),
  }),
  
  // Crisis notification configuration
  crisisNotification: z.object({
    enabled: z.boolean().default(true),
    escalationTimeoutMs: z.number().min(1000).max(300000).default(30000),
    maxRetries: z.number().min(1).max(5).default(3),
    enableAuditTrail: z.boolean().default(true),
  }),
  
  // Security configuration
  security: z.object({
    enableInputValidation: z.boolean().default(true),
    maxInputLength: z.number().min(100).max(50000).default(10000),
    enableRateLimiting: z.boolean().default(true),
    enableAuditLogging: z.boolean().default(true),
    sanitizeInputs: z.boolean().default(true),
  }),

  // Performance configuration
  performance: z.object({
    enableCaching: z.boolean().default(true),
    cacheTimeoutMs: z.number().min(1000).max(3600000).default(300000), // 5 minutes
    enableConnectionPooling: z.boolean().default(true),
    maxCacheSize: z.number().min(10).max(10000).default(1000),
    enableCompression: z.boolean().default(true),
  }),

  // Monitoring configuration
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    enablePerformanceTracking: z.boolean().default(true),
    metricsCollectionIntervalMs: z.number().min(1000).max(300000).default(60000),
    enableDetailedLogging: z.boolean().default(false), // Only enable in staging
  }),
});

type ProductionConfig = z.infer<typeof ProductionConfigSchema>;

// Default production configuration
const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  router: {
    defaultTargetAnalyzer: 'general_mental_health',
    defaultConfidence: 0.1,
    maxRetries: 3,
    llmTimeoutMs: 45000,
    enableFallbackClassification: true,
    enableCircuitBreaker: true,
    circuitBreakerFailureThreshold: 5,
    circuitBreakerResetTimeoutMs: 60000,
  },
  modelProvider: {
    maxConcurrentRequests: 10,
    rateLimitRpm: 100,
    healthCheckIntervalMs: 30000,
    connectionTimeoutMs: 30000,
    enableMetrics: true,
  },
  crisisNotification: {
    enabled: true,
    escalationTimeoutMs: 30000,
    maxRetries: 3,
    enableAuditTrail: true,
  },
  security: {
    enableInputValidation: true,
    maxInputLength: 10000,
    enableRateLimiting: true,
    enableAuditLogging: true,
    sanitizeInputs: true,
  },
  performance: {
    enableCaching: true,
    cacheTimeoutMs: 300000,
    enableConnectionPooling: true,
    maxCacheSize: 1000,
    enableCompression: true,
  },
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    enablePerformanceTracking: true,
    metricsCollectionIntervalMs: 60000,
    enableDetailedLogging: !config.isProduction(),
  },
};

export class MentalLLaMAFactory {
  static async createFromEnv() {
    logger.info('MentalLLaMAFactory.createFromEnv() called');

    // 1. Initialize ModelProvider (OpenAI as default for now)
    let modelProvider: IModelProvider | undefined = undefined;
    const openAIApiKey = config.ai.openAiKey(); // From env.config.ts

    if (openAIApiKey) {
      try {
        const providerOptions: ModelProviderOptions = {
          apiKey: openAIApiKey,
          // modelName: config.ai.openAiDefaultModel() || 'gpt-3.5-turbo', // Example if we add more config
        };
        modelProvider = new OpenAIModelProvider();
        await modelProvider.initialize(providerOptions);
        logger.info('OpenAIModelProvider initialized successfully.');
      } catch (error) {
        logger.error('Failed to initialize OpenAIModelProvider. LLM functionalities will be limited.', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.warn('OpenAI API key not configured. LLM functionalities will be limited to stubs or keyword-based logic.');
    }

    // 2. Initialize Crisis Notifier (SlackNotificationService)
    let crisisNotifier: ICrisisNotificationHandler | undefined = undefined;
    const slackWebhookUrl = config.notifications.slackWebhookUrl();
    if (slackWebhookUrl) {
      try {
        crisisNotifier = new SlackNotificationService(slackWebhookUrl);
        logger.info('SlackNotificationService initialized successfully.');
      } catch (error) {
        logger.error('Failed to initialize SlackNotificationService. Crisis notifications will be disabled.', {
          error: error instanceof Error ? error.message : String(error),
          isWebhookUrlPresent: !!slackWebhookUrl
        });
      }
    } else {
      logger.warn('Slack webhook URL not configured. Crisis notifications via Slack will be disabled.');
    }

    // 3. Create Production-Grade LLMInvoker for TaskRouter
    const llmInvokerForRouter: LLMInvoker = await createProductionLLMInvoker(
      modelProvider,
      DEFAULT_PRODUCTION_CONFIG.router
    );
    logger.info(`LLMInvoker for TaskRouter created (ModelProvider available: ${!!modelProvider}).`);

    // 4. Initialize MentalHealthTaskRouter with production configuration
    const routerOptions = {
      defaultTargetAnalyzer: 'general_mental_health',
      defaultConfidence: 0.1,
      maxRetries: 3, // Production: more retries for reliability
      llmTimeoutMs: 45000, // Production: longer timeout for complex requests
      enableFallbackClassification: true, // Always enable fallback in production
      getDefaultConfidence: (context?: RoutingContext) => {
        // Context-dependent confidence logic for production
        if (context?.sessionType === 'crisis_intervention_follow_up') {
          return 0.4;
        }
        if (context?.explicitTaskHint === 'safety_screen') {
          return 0.6;
        }
        if (context?.previousConversationState?.riskLevel === 'high') {
          return 0.5;
        }
        return 0.2;
      }
    };
    const taskRouter = new MentalHealthTaskRouter(llmInvokerForRouter, routerOptions);
    logger.info('MentalHealthTaskRouter initialized with production configuration.');

    // 5. Initialize PythonBridge (STUBBED)
    const pythonBridgeStub = undefined;
    logger.info('PythonBridge (stubbed as undefined) created.');

    // 6. Initialize MentalLLaMAAdapter
    const adapterOptions: MentalLLaMAAdapterOptions = {
      taskRouter: taskRouter,
    };
    
    if (modelProvider) {
      // Create an adapter to bridge the interface mismatch
      const modelProviderAdapter: MentalLLaMAIModelProvider = {
        async invoke(
          messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
          options?: LLMInvocationOptions
        ): Promise<LLMResponse> {
          // Convert LLMInvocationOptions to ChatCompletionOptions
          const chatOptions = options ? {
            ...(options.model && { model: options.model }),
            ...(options.temperature !== undefined && { temperature: options.temperature }),
            ...(options.max_tokens !== undefined && { max_tokens: options.max_tokens }),
            ...(options.top_p !== undefined && { top_p: options.top_p }),
            ...(options.frequency_penalty !== undefined && { frequency_penalty: options.frequency_penalty }),
            ...(options.presence_penalty !== undefined && { presence_penalty: options.presence_penalty }),
            ...(options.stop && { stop: options.stop }),
          } : undefined;
          
          const response = await modelProvider.chatCompletion(messages, chatOptions);
          if (response.error) {
            throw new Error(response.error.message);
          }
          
          const result: LLMResponse = {
            content: response.choices[0]?.message?.content || '',
            model: response.model,
            metadata: { id: response.id, object: response.object, created: response.created },
          };
          
          if (response.choices[0]?.finish_reason) {
            result.finishReason = response.choices[0].finish_reason as 'stop' | 'length' | 'content_filter' | 'function_call';
          }
          
          if (response.usage) {
            result.tokenUsage = {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            };
          }
          
          return result;
        },
        getModelInfo() {
          return {
            name: modelProvider.getProviderName(),
            version: 'latest',
            capabilities: ['chat_completion', 'text_generation'],
          };
        },
        async isAvailable() {
          try {
            // Test availability by trying a simple completion
            await modelProvider.chatCompletion([
              { role: 'user', content: 'test' }
            ], { max_tokens: 1 });
            return true;
          } catch {
            return false;
          }
        },
      };
      adapterOptions.modelProvider = modelProviderAdapter;
    }
    
    if (crisisNotifier) {
      adapterOptions.crisisNotifier = crisisNotifier;
    }
    
    // Don't include pythonBridge if it's undefined
    // if (pythonBridgeStub) {
    //   adapterOptions.pythonBridge = pythonBridgeStub;
    // }
    
    const adapter = new MentalLLaMAAdapter(adapterOptions);
    logger.info('MentalLLaMAAdapter initialized successfully by factory.');

    return {
      adapter,
      modelProvider,
      pythonBridge: pythonBridgeStub,
      taskRouter,
      crisisNotifier,
    };
  }
}