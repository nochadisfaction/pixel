import OpenAI from 'openai'
import { getLogger } from '@/lib/utils/logger'
import type {
  IModelProvider,
  ModelProviderOptions,
  ChatCompletionRequestMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  TextGenerationOptions,
  TextGenerationResponse,
} from './types' // Assuming types.ts is in the same directory

const logger = getLogger('OpenAIModelProvider')

const DEFAULT_MODEL = 'gpt-3.5-turbo'
const DEFAULT_TIMEOUT_MS = 60000 // 60 seconds

export class OpenAIModelProvider implements IModelProvider {
  private openai: OpenAI | null = null
  private providerName = 'OpenAI'
  private defaultModelName: string = DEFAULT_MODEL

  public async initialize(options: ModelProviderOptions): Promise<void> {
    const { OPENAI_API_KEY } = process.env
    const apiKey = options.apiKey || OPENAI_API_KEY // Fallback to env var if not in options
    if (!apiKey) {
      const errorMsg =
        'OpenAI API key is not provided. Cannot initialize OpenAIModelProvider.'
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
        baseURL: options.baseUrl, // Optional: For proxies or alternative OpenAI-compatible endpoints
        timeout: DEFAULT_TIMEOUT_MS,
      })
      this.defaultModelName = options.modelName || DEFAULT_MODEL
      logger.info(
        `OpenAIModelProvider initialized successfully for model: ${this.defaultModelName}.`,
      )
    } catch (_error) {
      logger.error('Failed to initialize OpenAI SDK:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw new Error(
        `Failed to initialize OpenAI SDK: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  public getProviderName(): string {
    return this.providerName
  }

  private ensureInitialized(): void {
    if (!this.openai) {
      throw new Error(
        'OpenAIModelProvider is not initialized. Call initialize() first.',
      )
    }
  }

  async chatCompletion(
    messages: ChatCompletionRequestMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResponse> {
    this.ensureInitialized()
    if (!this.openai) {
      throw new Error('OpenAI client not initialized') // Should be caught by ensureInitialized
    }

    const model = options?.model || this.defaultModelName

    // Build the request payload with proper OpenAI SDK types
    // First, create the base payload with known parameters
    const basePayload: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
      })),
      ...(options?.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options?.max_tokens !== undefined && {
        max_tokens: options.max_tokens,
      }),
      ...(options?.top_p !== undefined && { top_p: options.top_p }),
      ...(options?.stop !== undefined && { stop: options.stop }),
      ...(options?.presence_penalty !== undefined && {
        presence_penalty: options.presence_penalty,
      }),
      ...(options?.frequency_penalty !== undefined && {
        frequency_penalty: options.frequency_penalty,
      }),
      ...(options?.user !== undefined && { user: options.user }),
      // stream: false, // Explicitly not streaming for this method
    }

    // Safely merge with provider-specific parameters if they exist
    // This allows for OpenAI-specific parameters like functions, response_format, etc.
    // Only allow safe parameters that don't override critical security settings
    const safeProviderParams = this.sanitizeProviderParams(
      options?.providerSpecificParams,
    )
    const requestPayload = safeProviderParams
      ? ({
          ...basePayload,
          ...safeProviderParams,
        } as OpenAI.Chat.Completions.ChatCompletionCreateParams)
      : basePayload

    logger.debug('Sending chat completion request to OpenAI:', {
      model: requestPayload.model,
      messagesCount: messages.length,
      options,
    })

    try {
      const completion = (await this.openai.chat.completions.create(
        requestPayload,
      )) as OpenAI.Chat.Completions.ChatCompletion

      logger.debug('Received chat completion response from OpenAI:', {
        model: completion.model,
        choicesCount: completion.choices.length,
      })

      // Basic mapping to our ChatCompletionResponse structure
      return {
        id: completion.id,
        object: completion.object,
        created: completion.created,
        model: completion.model,
        choices: completion.choices.map((choice) => ({
          index: choice.index,
          message: {
            role: choice.message.role,
            content: choice.message.content,
          },
          finish_reason: choice.finish_reason as string, // Cast, as SDK might have more specific types
        })),
        ...(completion.usage && {
          usage: {
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
          },
        }),
      }
    } catch (_error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Safely extract error properties using a helper function
      const getErrorProperty = (obj: unknown, key: string): unknown => {
        if (obj && typeof obj === 'object' && key in obj) {
          return (obj as Record<string, unknown>)[key]
        }
        return undefined
      }

      const errorStatus =
        typeof getErrorProperty(error, 'status') === 'number'
          ? (getErrorProperty(error, 'status') as number)
          : undefined
      const errorHeaders = getErrorProperty(error, 'headers')
      const errorData = getErrorProperty(error, 'error')

      logger.error('Error calling OpenAI chat.completions.create:', {
        errorMessage,
        errorStatus,
        errorHeaders,
        errorData, // This often contains the detailed error from OpenAI
        modelUsed: model,
      })
      // Re-throw a more generic error or include error details in the response
      // For now, let's include it in the response.
      return {
        model: model,
        choices: [],
        error: {
          message: errorMessage,
          ...(errorStatus !== undefined && { status: errorStatus }),
          ...(errorData !== undefined && { data: errorData }),
        },
      }
    }
  }

  async textGeneration(
    prompt: string,
    options?: TextGenerationOptions,
  ): Promise<TextGenerationResponse> {
    this.ensureInitialized()
    if (!this.openai) {
      throw new Error('OpenAI client not initialized')
    }

    // Note: OpenAI recommends using the Chat Completions API even for single-turn tasks.
    // However, if direct text generation (e.g. with older models like text-davinci-003) is needed,
    // this would be the place. For newer models, it's better to adapt this to use chat completions.
    // For this example, let's adapt it to use chat completions with a user prompt.

    logger.warn(
      'textGeneration called; adapting to use chatCompletion with a user prompt for OpenAI.',
    )

    const messages: ChatCompletionRequestMessage[] = [
      { role: 'user', content: prompt },
    ]
    const chatOptions: ChatCompletionOptions = {
      model: options?.model || this.defaultModelName, // Allow specifying model via TextGenerationOptions
      ...(options?.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options?.max_tokens !== undefined && {
        max_tokens: options.max_tokens,
      }),
      ...(options?.top_p !== undefined && { top_p: options.top_p }),
      ...(options?.stop !== undefined && { stop: options.stop }),
      ...(options?.providerSpecificParams && {
        ...options.providerSpecificParams,
      }),
    }

    const chatResponse = await this.chatCompletion(messages, chatOptions)

    if (chatResponse.error) {
      logger.error(
        'Error in textGeneration (via chatCompletion):',
        chatResponse.error,
      )
      // Return error in response object to match chatCompletion pattern
      return {
        text: '',
        finish_reason: undefined,
        error: {
          message: `OpenAI textGeneration failed: ${chatResponse.error.message}`,
          ...(chatResponse.error.status !== undefined && {
            status: chatResponse.error.status,
          }),
          ...(chatResponse.error.data !== undefined && {
            data: chatResponse.error.data,
          }),
        },
      }
    }

    if (
      chatResponse.choices.length > 0 &&
      chatResponse.choices[0]?.message?.content
    ) {
      return {
        text: chatResponse.choices[0].message.content,
        finish_reason: chatResponse.choices[0].finish_reason || undefined,
      }
    }

    logger.error(
      'OpenAI textGeneration (via chatCompletion) returned no content or choices.',
    )
    return {
      text: '',
      finish_reason: undefined,
      error: {
        message:
          'OpenAI textGeneration (via chatCompletion) returned no content.',
      },
    }
  }

  /**
   * Sanitizes provider-specific parameters to prevent security vulnerabilities.
   * Only allows safe parameters that don't override critical security settings.
   */
  private sanitizeProviderParams(
    params?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!params) {
      return undefined
    }

    // Define allowed provider-specific parameters that are safe to override
    const allowedParams = new Set([
      'functions',
      'function_call',
      'tools',
      'tool_choice',
      'response_format',
      'n',
      'logprobs',
      'top_logprobs',
      'echo',
      'suffix',
      'logit_bias',
      'seed',
    ])

    // Critical parameters that should NEVER be overridden for security
    const criticalParams = new Set([
      'model', // Prevents model switching attacks
      'messages', // Prevents message injection
      'api_key', // Prevents API key override
      'baseURL', // Prevents endpoint redirection
      'organization', // Prevents org switching
      'project', // Prevents project switching
    ])

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(params)) {
      if (criticalParams.has(key)) {
        logger.warn(`Blocked attempt to override critical parameter: ${key}`, {
          key,
          value,
        })
        continue
      }

      if (allowedParams.has(key)) {
        sanitized[key] = value
      } else {
        logger.warn(`Unknown provider parameter ignored: ${key}`, {
          key,
          value,
        })
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined
  }
}
