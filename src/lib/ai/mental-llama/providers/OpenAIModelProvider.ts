import OpenAI from 'openai';
import { getLogger } from '@/lib/utils/logger';
import type {
  IModelProvider,
  ModelProviderOptions,
  ChatCompletionRequestMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  TextGenerationOptions,
  TextGenerationResponse,
} from './types'; // Assuming types.ts is in the same directory

const logger = getLogger('OpenAIModelProvider');

const DEFAULT_MODEL = 'gpt-3.5-turbo';
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds

export class OpenAIModelProvider implements IModelProvider {
  private openai: OpenAI | null = null;
  private providerName = 'OpenAI';
  private defaultModelName: string = DEFAULT_MODEL;

  constructor() {
    // Initialization will be done in the async `initialize` method
  }

  public async initialize(options: ModelProviderOptions): Promise<void> {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY; // Fallback to env var if not in options
    if (!apiKey) {
      const errorMsg = 'OpenAI API key is not provided. Cannot initialize OpenAIModelProvider.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: options.baseUrl, // Optional: For proxies or alternative OpenAI-compatible endpoints
        timeout: DEFAULT_TIMEOUT_MS,
      });
      this.defaultModelName = options.modelName || DEFAULT_MODEL;
      logger.info(`OpenAIModelProvider initialized successfully for model: ${this.defaultModelName}.`);
    } catch (error) {
      logger.error('Failed to initialize OpenAI SDK:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
       });
      throw new Error(`Failed to initialize OpenAI SDK: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getProviderName(): string {
    return this.providerName;
  }

  private ensureInitialized(): void {
    if (!this.openai) {
      throw new Error('OpenAIModelProvider is not initialized. Call initialize() first.');
    }
  }

  async chatCompletion(
    messages: ChatCompletionRequestMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    this.ensureInitialized();
    if (!this.openai) throw new Error("OpenAI client not initialized"); // Should be caught by ensureInitialized

    const model = options?.model || this.defaultModelName;
    const requestPayload = {
      model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
      top_p: options?.top_p,
      stop: options?.stop,
      presence_penalty: options?.presence_penalty,
      frequency_penalty: options?.frequency_penalty,
      user: options?.user,
      // stream: false, // Explicitly not streaming for this method
      ...options?.providerSpecificParams, // Allow passing other OpenAI specific params
    };

    logger.debug('Sending chat completion request to OpenAI:', { model: requestPayload.model, messagesCount: messages.length, options });

    try {
      // @ts-ignore // OpenAI SDK types might be slightly different or more complex; this simplifies for now
      const completion: OpenAI.Chat.Completions.ChatCompletion = await this.openai.chat.completions.create(requestPayload as any);

      logger.debug('Received chat completion response from OpenAI:', { model: completion.model, choicesCount: completion.choices.length });

      // Basic mapping to our ChatCompletionResponse structure
      return {
        id: completion.id,
        object: completion.object,
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map(choice => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: choice.finish_reason as string, // Cast, as SDK might have more specific types
        })),
        usage: completion.usage ? {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      logger.error('Error calling OpenAI chat.completions.create:', {
        errorMessage: error.message,
        errorStatus: error.status,
        errorHeaders: error.headers,
        errorData: error.error, // This often contains the detailed error from OpenAI
        modelUsed: model,
      });
      // Re-throw a more generic error or include error details in the response
      // For now, let's include it in the response.
       return {
        model: model,
        choices: [],
        error: {
          message: error.message,
          status: error.status,
          data: error.error,
        }
      };
    }
  }

  async textGeneration(
    prompt: string,
    options?: TextGenerationOptions
  ): Promise<TextGenerationResponse> {
    this.ensureInitialized();
     if (!this.openai) throw new Error("OpenAI client not initialized");

    // Note: OpenAI recommends using the Chat Completions API even for single-turn tasks.
    // However, if direct text generation (e.g. with older models like text-davinci-003) is needed,
    // this would be the place. For newer models, it's better to adapt this to use chat completions.
    // For this example, let's adapt it to use chat completions with a user prompt.

    logger.warn('textGeneration called; adapting to use chatCompletion with a user prompt for OpenAI.');

    const messages: ChatCompletionRequestMessage[] = [{ role: 'user', content: prompt }];
    const chatOptions: ChatCompletionOptions = {
      model: options?.model || this.defaultModelName, // Allow specifying model via TextGenerationOptions
      temperature: options?.temperature,
      max_tokens: options?.max_tokens,
      top_p: options?.top_p,
      stop: options?.stop,
      ...options?.providerSpecificParams,
    };

    const chatResponse = await this.chatCompletion(messages, chatOptions);

    if (chatResponse.error) {
        logger.error('Error in textGeneration (via chatCompletion):', chatResponse.error);
        // Decide how to propagate this. Throw or return an error structure.
        throw new Error(`OpenAI textGeneration failed: ${chatResponse.error.message}`);
    }

    if (chatResponse.choices.length > 0 && chatResponse.choices[0].message.content) {
      return {
        text: chatResponse.choices[0].message.content,
        finish_reason: chatResponse.choices[0].finish_reason,
      };
    } else {
      logger.error('OpenAI textGeneration (via chatCompletion) returned no content or choices.');
      throw new Error('OpenAI textGeneration (via chatCompletion) returned no content.');
    }
  }
}
