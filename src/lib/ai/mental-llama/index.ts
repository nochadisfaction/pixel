import { getLogger } from '@/lib/utils/logger';
import { config } from '@/config/env.config'; // For Slack webhook URL

import { MentalLLaMAAdapter } from './MentalLLaMAAdapter';
import { MentalHealthTaskRouter } from './routing/MentalHealthTaskRouter';
import { SlackNotificationService } from '../../services/notification/SlackNotificationService'; // Adjusted path
import type { LLMInvoker, ICrisisNotificationHandler, ChatCompletionRequestMessage } from './types/mentalLLaMATypes';
import { OpenAIModelProvider } from './providers/OpenAIModelProvider';
import type { IModelProvider, ModelProviderOptions } from './providers/types';

const logger = getLogger('MentalLLaMAFactory');

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

    // 3. Create LLMInvoker for TaskRouter
    // This invoker will use the initialized modelProvider if available, otherwise it's a stub.
    const llmInvokerForRouter: LLMInvoker = async (
      messages: ChatCompletionRequestMessage[],
      options?: any // ChatCompletionOptions from IModelProvider
    ) => {
      if (modelProvider) {
        logger.debug('llmInvokerForRouter using actual ModelProvider:', { provider: modelProvider.getProviderName(), messagesCount: messages.length });
        const response = await modelProvider.chatCompletion(messages, options);
        // Assuming the response from chatCompletion needs to be adapted/parsed if router expects a specific simple format
        // For now, let's assume the router can handle the ChatCompletionResponse or the LLM is prompted for JSON
        if (response.error) {
            logger.error('Error from ModelProvider in llmInvokerForRouter:', response.error);
            // Fallback to a stub-like response or throw, depending on router's error handling
            return { category: 'unknown', confidence: 0, reasoning: 'LLM call failed via ModelProvider' };
        }
        if (response.choices.length > 0 && response.choices[0].message.content) {
            try {
                // Attempt to parse if LLM is prompted for JSON string
                return JSON.parse(response.choices[0].message.content);
            } catch (e) {
                // If not JSON, return the raw content or a structured error/default
                logger.warn('LLM response for router was not valid JSON. Returning raw content or default.', { content: response.choices[0].message.content });
                return { category: 'general_mental_health', confidence: 0.2, reasoning: 'LLM response not in expected JSON format', raw: response.choices[0].message.content };
            }
        }
        return { category: 'unknown', confidence: 0, reasoning: 'No content from LLM via ModelProvider' };
      } else {
        // Fallback stub if no modelProvider
        logger.warn('llmInvokerForRouter (STUB - no ModelProvider) called with messages:', { messagesCount: messages.length });
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          category: 'general_mental_health',
          confidence: 0.1,
          reasoning: 'LLM response from stubbed llmInvokerForRouter (No ModelProvider).',
          is_critical_intent: false,
        };
      }
    };
    logger.info(`LLMInvoker for TaskRouter created (ModelProvider available: ${!!modelProvider}).`);

    // 4. Initialize MentalHealthTaskRouter
    const taskRouter = new MentalHealthTaskRouter(llmInvokerForRouter);
    logger.info('MentalHealthTaskRouter initialized.');

    // 5. Initialize PythonBridge (STUBBED)
    const pythonBridgeStub = undefined;
    logger.info('PythonBridge (stubbed as undefined) created.');

    // 6. Initialize MentalLLaMAAdapter
    const adapter = new MentalLLaMAAdapter({
      modelProvider: modelProvider, // Pass the actual or undefined modelProvider
      pythonBridge: pythonBridgeStub,
      crisisNotifier: crisisNotifier,
      taskRouter: taskRouter,
    });
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