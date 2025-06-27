import { getLogger } from '@/lib/utils/logger'
import { config } from '@/config/env.config'
import { MentalLLaMAAdapter } from './MentalLLaMAAdapter'
import { MentalHealthTaskRouter } from './routing/MentalHealthTaskRouter'
import { SlackNotificationService } from '../../services/notification/SlackNotificationService'
import type {
  LLMInvoker,
  ICrisisNotificationHandler,
  RoutingContext,
  MentalLLaMAAdapterOptions,
  IModelProvider as MentalLLaMAIModelProvider,
  LLMInvocationOptions,
  LLMResponse,
} from './types/mentalLLaMATypes'
import { OpenAIModelProvider } from './providers/OpenAIModelProvider'
import type { IModelProvider, ModelProviderOptions } from './providers/types'
import { createProductionLLMInvoker } from './createProductionLLMInvoker'
import { DEFAULT_PRODUCTION_CONFIG } from './config'

const logger = getLogger('createMentalLLaMAFromEnv')

export async function createMentalLLaMAFromEnv() {
  logger.info('createMentalLLaMAFromEnv() called')

  // 1. Initialize ModelProvider (OpenAI as default for now)
  let modelProvider: IModelProvider | undefined = undefined
  const openAIApiKey = config.ai.openAiKey() // From env.config.ts

  if (openAIApiKey) {
    try {
      const providerOptions: ModelProviderOptions = {
        apiKey: openAIApiKey,
        // modelName: config.ai.openAiDefaultModel() || 'gpt-3.5-turbo', // Example if we add more config
      }
      modelProvider = new OpenAIModelProvider()
      await modelProvider.initialize(providerOptions)
      logger.info('OpenAIModelProvider initialized successfully.')
    } catch (error) {
      logger.error(
        'Failed to initialize OpenAIModelProvider. LLM functionalities will be limited.',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      )
    }
  } else {
    logger.warn(
      'OpenAI API key not configured. LLM functionalities will be limited to stubs or keyword-based logic.',
    )
  }

  // 2. Initialize Crisis Notifier (SlackNotificationService)
  let crisisNotifier: ICrisisNotificationHandler | undefined = undefined
  const slackWebhookUrl = config.notifications.slackWebhookUrl()
  if (slackWebhookUrl) {
    try {
      crisisNotifier = new SlackNotificationService(slackWebhookUrl)
      logger.info('SlackNotificationService initialized successfully.')
    } catch (error) {
      logger.error(
        'Failed to initialize SlackNotificationService. Crisis notifications will be disabled.',
        {
          error: error instanceof Error ? error.message : String(error),
          isWebhookUrlPresent: !!slackWebhookUrl,
        },
      )
    }
  } else {
    logger.warn(
      'Slack webhook URL not configured. Crisis notifications via Slack will be disabled.',
    )
  }

  // 3. Create Production-Grade LLMInvoker for TaskRouter
  const llmInvokerForRouter: LLMInvoker = await createProductionLLMInvoker(
    modelProvider,
    DEFAULT_PRODUCTION_CONFIG.router,
  )
  logger.info(
    `LLMInvoker for TaskRouter created (ModelProvider available: ${!!modelProvider}).`,
  )

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
        return 0.4
      }
      if (context?.explicitTaskHint === 'safety_screen') {
        return 0.6
      }
      if (context?.previousConversationState?.riskLevel === 'high') {
        return 0.5
      }
      return 0.2
    },
  }
  const taskRouter = new MentalHealthTaskRouter(
    llmInvokerForRouter,
    routerOptions,
  )
  logger.info(
    'MentalHealthTaskRouter initialized with production configuration.',
  )

  // 5. Initialize PythonBridge (STUBBED)
  const pythonBridgeStub = undefined
  logger.info('PythonBridge (stubbed as undefined) created.')

  // 6. Initialize MentalLLaMAAdapter
  const adapterOptions: MentalLLaMAAdapterOptions = {
    taskRouter: taskRouter,
  }

  if (modelProvider) {
    // Create an adapter to bridge the interface mismatch
    const modelProviderAdapter: MentalLLaMAIModelProvider = {
      async invoke(
        messages: Array<{
          role: 'system' | 'user' | 'assistant'
          content: string
        }>,
        options?: LLMInvocationOptions,
      ): Promise<LLMResponse> {
        // Convert LLMInvocationOptions to ChatCompletionOptions
        const chatOptions = options
          ? {
              ...(options.model && { model: options.model }),
              ...(options.temperature !== undefined && {
                temperature: options.temperature,
              }),
              ...(options.max_tokens !== undefined && {
                max_tokens: options.max_tokens,
              }),
              ...(options.top_p !== undefined && { top_p: options.top_p }),
              ...(options.frequency_penalty !== undefined && {
                frequency_penalty: options.frequency_penalty,
              }),
              ...(options.presence_penalty !== undefined && {
                presence_penalty: options.presence_penalty,
              }),
              ...(options.stop && { stop: options.stop }),
            }
          : undefined

        const response = await modelProvider.chatCompletion(
          messages,
          chatOptions,
        )
        if (response.error) {
          throw new Error(response.error.message)
        }

        const result: LLMResponse = {
          content: response.choices[0]?.message?.content || '',
          model: response.model,
          metadata: {
            id: response.id,
            object: response.object,
            created: response.created,
          },
        }

        if (response.choices[0]?.finish_reason) {
          result.finishReason = response.choices[0].finish_reason as
            | 'stop'
            | 'length'
            | 'content_filter'
            | 'function_call'
        }

        if (response.usage) {
          result.tokenUsage = {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        }

        return result
      },
      getModelInfo() {
        return {
          name: modelProvider.getProviderName(),
          version: 'latest',
          capabilities: ['chat_completion', 'text_generation'],
        }
      },
      async isAvailable() {
        try {
          // Test availability by trying a simple completion
          await modelProvider.chatCompletion(
            [{ role: 'user', content: 'test' }],
            { max_tokens: 1 },
          )
          return true
        } catch {
          return false
        }
      },
    }
    adapterOptions.modelProvider = modelProviderAdapter
  }

  if (crisisNotifier) {
    adapterOptions.crisisNotifier = crisisNotifier
  }

  // Don't include pythonBridge if it's undefined
  // if (pythonBridgeStub) {
  //   adapterOptions.pythonBridge = pythonBridgeStub;
  // }

  const adapter = new MentalLLaMAAdapter(adapterOptions)
  logger.info('MentalLLaMAAdapter initialized successfully by factory.')

  return {
    adapter,
    modelProvider,
    pythonBridge: pythonBridgeStub,
    taskRouter,
    crisisNotifier,
  }
}
