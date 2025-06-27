import { getLogger } from '@/lib/utils/logger';
import { envConfig } from '@/config';

import { MentalLLaMAModelProvider } from './models/MentalLLaMAModelProvider';
import { MentalHealthTaskRouter } from './routing/MentalHealthTaskRouter';
import { MentalLLaMAAdapter } from './adapter/MentalLLaMAAdapter';
import { MentalLLaMAPythonBridge } from './bridge/MentalLLaMAPythonBridge';
import { SlackNotificationService } from '@/lib/services/notification/SlackNotificationService';
import type { ICrisisNotificationHandler } from '@/lib/services/notification/NotificationService';

const logger = getLogger('MentalLLaMAFactory');

export { MentalLLaMAAdapter } from './adapter/MentalLLaMAAdapter';
export { MentalLLaMAModelProvider } from './models/MentalLLaMAModelProvider';
export { MentalHealthTaskRouter } from './routing/MentalHealthTaskRouter';
export { MentalLLaMAPythonBridge } from './bridge/MentalLLaMAPythonBridge';
export * from './types'; // Export all types

/**
 * Configuration for the MentalLLaMAFactory.
 */
export interface MentalLLaMAFactoryConfig {
  defaultModelTier?: '7B' | '13B' | string;
  enablePythonBridge?: boolean;
  pythonBridgeScriptPath?: string;
  // Potentially add overrides for keyword rules, LLM category maps, etc.
}

export class MentalLLaMAFactory {
  /**
   * Creates and configures the MentalLLaMA components.
   * This factory initializes the model provider, task router, crisis notification service (if configured),
   * Python bridge (if enabled), and finally the adapter that ties them all together.
   */
  static async create(config: MentalLLaMAFactoryConfig = {}): Promise<{
    adapter: MentalLLaMAAdapter;
    modelProvider: MentalLLaMAModelProvider;
    taskRouter: MentalHealthTaskRouter;
    pythonBridge?: MentalLLaMAPythonBridge;
    crisisNotifier?: ICrisisNotificationHandler;
  }> {
    logger.info('Creating MentalLLaMA components via factory...', { config });

    const modelTier = config.defaultModelTier || envConfig.mentalLLaMA.defaultModelTier() || '7B';
    const modelProvider = new MentalLLaMAModelProvider(modelTier);

    // The LLMInvoker for the router will be the chat method of the model provider.
    const llmInvokerForRouter = modelProvider.chat.bind(modelProvider);
    const taskRouter = new MentalHealthTaskRouter(llmInvokerForRouter);

    let crisisNotifier: ICrisisNotificationHandler | undefined = undefined;
    const slackWebhookUrl = envConfig.notifications.slackWebhookUrl();
    if (slackWebhookUrl) {
      try {
        crisisNotifier = new SlackNotificationService(slackWebhookUrl);
        logger.info('SlackNotificationService initialized for MentalLLaMAAdapter.');
      } catch (error) {
        logger.error('Failed to initialize SlackNotificationService for MentalLLaMAAdapter:', error);
        // Continue without crisis notifications if Slack setup fails
      }
    } else {
      logger.warn('Slack webhook URL not configured. MentalLLaMAAdapter will operate without Slack crisis notifications.');
    }

    let pythonBridge: MentalLLaMAPythonBridge | undefined = undefined;
    if (config.enablePythonBridge || envConfig.mentalLLaMA.enablePythonBridge()) {
      try {
        pythonBridge = new MentalLLaMAPythonBridge(config.pythonBridgeScriptPath);
        // Initialize the bridge. In a real scenario, you might want to ensure this completes
        // successfully before proceeding or handle failures gracefully.
        await pythonBridge.initialize();
        if (pythonBridge.isReady()) {
            logger.info('MentalLLaMAPythonBridge initialized and ready.');
        } else {
            logger.warn('MentalLLaMAPythonBridge initialization failed or did not complete. Features requiring it may not work.');
            // Optionally set pythonBridge back to undefined if it's not usable
        }
      } catch (error) {
        logger.error('Failed to initialize MentalLLaMAPythonBridge:', error);
      }
    }

    const adapter = new MentalLLaMAAdapter(modelProvider, taskRouter, crisisNotifier);
    // If the Python bridge is available, one might pass it to the adapter too,
    // or the adapter might use it via the modelProvider if certain models are python-bridge-only.
    // For now, the adapter doesn't directly take the bridge in its constructor.

    logger.info('MentalLLaMA components created successfully.');
    return {
      adapter,
      modelProvider,
      taskRouter,
      pythonBridge,
      crisisNotifier,
    };
  }

  /**
   * Convenience method to create MentalLLaMA components using environment configurations.
   */
  static async createFromEnv(): Promise<{
    adapter: MentalLLaMAAdapter;
    modelProvider: MentalLLaMAModelProvider;
    taskRouter: MentalHealthTaskRouter;
    pythonBridge?: MentalLLaMAPythonBridge;
    crisisNotifier?: ICrisisNotificationHandler;
  }> {
    return MentalLLaMAFactory.create({
      defaultModelTier: envConfig.mentalLLaMA.defaultModelTier(),
      enablePythonBridge: envConfig.mentalLLaMA.enablePythonBridge(),
      pythonBridgeScriptPath: envConfig.mentalLLaMA.pythonBridgeScriptPath(),
    });
  }
}

export default MentalLLaMAFactory;
