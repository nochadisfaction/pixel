import { getEnv } from '@/config/env.config';
import { getLogger } from '@/lib/utils/logger';
import type { LLMInvoker, MentalLLaMAModelConfig } from '../types';

const logger = getLogger('MentalLLaMAModelProvider');

export class MentalLLaMAModelProvider {
  private modelConfig: MentalLLaMAModelConfig;
  private modelTier: string;

  /**
   * Creates an instance of MentalLLaMAModelProvider.
   * Initializes configuration based on the specified model tier and environment variables.
   * @param {('7B' | '13B' | string)} [modelTier='7B'] - The model tier to use (e.g., '7B', '13B').
   * @throws Error if essential configuration (API key, endpoint URL for the tier) is missing.
   */
  constructor(modelTier: '7B' | '13B' | string = '7B') {
    this.modelTier = modelTier;
    // This configuration should ideally come from a more dynamic source
    // or be passed in, perhaps by the factory.
    // For now, we'll use a simplified setup.
    const env = getEnv();
    const apiKey = env.MENTALLAMA_API_KEY;
    const endpointUrl = modelTier === '13B'
      ? env.MENTALLAMA_ENDPOINT_URL_13B
      : env.MENTALLAMA_ENDPOINT_URL_7B;

    if (!apiKey || !endpointUrl) {
      logger.warn(`API key or endpoint URL is not configured for MentalLLaMA model tier ${modelTier}. Using mock provider.`);
      this.modelConfig = {
        modelId: `mock-mentalllama-${modelTier}`,
        providerType: 'custom_api', // Actually mock, but need a type
      };
    } else {
      this.modelConfig = {
        modelId: `mentalllama-chat-${modelTier}`,
        endpointUrl: endpointUrl,
        apiKey: apiKey,
        providerType: 'custom_api', // Assuming a custom API for MentalLLaMA models
      };
    }
    logger.info(`MentalLLaMAModelProvider initialized for tier ${this.modelTier}`, { config: this.modelConfig.modelId });
  }

  /**
   * Gets the current model tier (e.g., '7B', '13B').
   * @returns {string} The model tier.
   */
  public getModelTier(): string {
    return this.modelTier;
  }

  /**
   * Gets the model configuration object.
   * @returns {MentalLLaMAModelConfig} The model configuration.
   */
  public getModelConfig(): MentalLLaMAModelConfig {
    return this.modelConfig;
  }

  /**
   * Invokes the configured MentalLLaMA model to get chat completions.
   * Makes an HTTP POST request to the model's endpoint.
   * @param {Message[]} messages - An array of message objects for the chat completion.
   * @param {LLMInvocationOptions} [options] - Optional parameters for the LLM invocation (e.g., temperature, max_tokens).
   * @returns {Promise<string>} A promise that resolves to the string content of the model's response.
   * @throws Error if the provider is not configured, the API request fails, or the response structure is invalid.
   */
  public chat: LLMInvoker = async (messages, options) => {
    // TODO (Performance): Optimize data pre-processing before sending to LLM (e.g., trimming, specific formatting).
    // TODO (Performance): Optimize data post-processing after receiving from LLM (e.g., efficient parsing, validation).
    // TODO (Performance): Implement asynchronous processing for the actual API call if it's not already non-blocking,
    // to prevent holding up the main thread, especially if multiple calls are made.
    if (!this.modelConfig.endpointUrl || !this.modelConfig.apiKey || this.modelConfig.modelId?.startsWith('mock-')) {
      const errorMsg = `MentalLLaMA model ${this.modelConfig.modelId} is not properly configured for actual API calls. Missing endpointUrl, apiKey, or using a mock modelId.`;
      logger.error(errorMsg);
      // In a production system, relying on a mock call here is not ideal.
      // Throw an error to indicate misconfiguration.
      throw new Error(errorMsg);
    }

    logger.info(`Calling MentalLLaMA model ${this.modelConfig.modelId}`, {
      messageCount: messages.length,
      options,
    });

    // Actual API call logic
    try {
      const response = await fetch(this.modelConfig.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.modelConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelConfig.modelId, // Pass the model ID
          messages,
          ...options, // Spread LLM options like temperature, max_tokens
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Could not retrieve error body');
        logger.error('MentalLLaMA API request failed', {
          status: response.status,
          body: errorBody,
          endpoint: this.modelConfig.endpointUrl,
          modelId: this.modelConfig.modelId,
        });
        throw new Error(`API request to ${this.modelConfig.modelId} failed with status ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      // Assuming OpenAI-like response structure. Adjust if MentalLLaMA API differs.
      if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
        return data.choices[0].message.content;
      } else {
        logger.error('Invalid response structure from MentalLLaMA API', { responseData: data });
        throw new Error('Invalid response structure from MentalLLaMA API.');
      }
    } catch (error) {
      logger.error('Error calling MentalLLaMA model or processing its response:', {
        modelId: this.modelConfig.modelId,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw for the adapter to handle
    }
  };
}

// Export the class and potentially instances or a factory function
export default MentalLLaMAModelProvider;
