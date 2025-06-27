import type {
  AIMessage,
  AIServiceOptions,
  AICompletion,
  AIUsage,
  AIStreamChunk,
} from '../models/ai-types'
import { appLogger } from '../../logging'

export interface TogetherAIConfig {
  togetherApiKey: string
  togetherBaseUrl?: string
  apiKey: string
  maxRetries?: number
  timeoutMs?: number
  rateLimitRpm?: number
}

export interface TogetherStreamResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    delta: {
      content?: string
      role?: string
    }
    index: number
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterMaxMs: number
}

export interface RateLimitInfo {
  requestsPerMinute: number
  tokensPerMinute: number
  lastRequestTime: number
  requestCount: number
  tokenCount: number
}

export interface TogetherAIService {
  generateCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AICompletion | { content: string; usage?: AIUsage }>
  createChatCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AICompletion>
  createStreamingChatCompletion(
    messages: AIMessage[],
    options?: AIServiceOptions,
  ): Promise<AsyncGenerator<AIStreamChunk, void, void>>
  dispose(): void
}

class TogetherAIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable = false,
  ) {
    super(message)
    this.name = 'TogetherAIError'
  }
}

class RateLimitManager {
  private rateLimitInfo: RateLimitInfo

  constructor(config: { requestsPerMinute: number; tokensPerMinute: number }) {
    this.rateLimitInfo = {
      requestsPerMinute: config.requestsPerMinute,
      tokensPerMinute: config.tokensPerMinute,
      lastRequestTime: 0,
      requestCount: 0,
      tokenCount: 0,
    }
  }

  async checkRateLimit(estimatedTokens: number): Promise<void> {
    const now = Date.now()
    const oneMinute = 60000

    // Reset counters if more than a minute has passed
    if (now - this.rateLimitInfo.lastRequestTime > oneMinute) {
      this.rateLimitInfo.requestCount = 0
      this.rateLimitInfo.tokenCount = 0
    }

    // Check if we would exceed rate limits
    if (
      this.rateLimitInfo.requestCount >= this.rateLimitInfo.requestsPerMinute ||
      this.rateLimitInfo.tokenCount + estimatedTokens >= this.rateLimitInfo.tokensPerMinute
    ) {
      const waitTime = oneMinute - (now - this.rateLimitInfo.lastRequestTime)
      appLogger.warn('Rate limit reached, waiting', { waitTime })
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      // Reset after waiting
      this.rateLimitInfo.requestCount = 0
      this.rateLimitInfo.tokenCount = 0
    }

    // Update counters
    this.rateLimitInfo.requestCount++
    this.rateLimitInfo.tokenCount += estimatedTokens
    this.rateLimitInfo.lastRequestTime = now
  }
}

async function exponentialBackoffRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === config.maxRetries) {
        break
      }

      // Don't retry on non-retryable errors
      if (error instanceof TogetherAIError && !error.retryable) {
        throw error
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs,
      )
      const jitter = Math.random() * config.jitterMaxMs
      const delay = baseDelay + jitter

      appLogger.warn('Request failed, retrying', {
        attempt: attempt + 1,
        maxRetries: config.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      })

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

function estimateTokenCount(messages: AIMessage[]): number {
  // Rough estimation: 1 token ≈ 4 characters
  const totalChars = messages.reduce((acc, msg) => acc + msg.content.length, 0)
  return Math.ceil(totalChars / 4)
}

export function createTogetherAIService(
  config: TogetherAIConfig,
): TogetherAIService {
  const baseUrl = config.togetherBaseUrl || 'https://api.together.xyz'
  const apiKey = config.togetherApiKey
  const timeoutMs = config.timeoutMs || 30000
  const rateLimitRpm = config.rateLimitRpm || 60

  const retryConfig: RetryConfig = {
    maxRetries: config.maxRetries || 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMaxMs: 500,
  }

  const rateLimitManager = new RateLimitManager({
    requestsPerMinute: rateLimitRpm,
    tokensPerMinute: 150000, // Default Together AI limit
  })

  function createAbortController(timeoutMs: number): AbortController {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller
  }

  function handleAPIError(response: Response, data?: unknown): never {
    const isRetryable = response.status >= 500 || response.status === 429
    
    let errorMessage = `Together AI API error: ${response.status} ${response.statusText}`
    let errorCode = response.status.toString()

    if (data && typeof data === 'object' && 'error' in data) {
      const errorData = data as { error: { message?: string; code?: string } }
      errorMessage = `Together AI API error: ${errorData.error.message || errorData.error}`
      errorCode = errorData.error.code || errorCode
    }

    throw new TogetherAIError(errorMessage, response.status, errorCode, isRetryable)
  }

interface TogetherCompletionResponse {
  id: string
  created: number
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

  async function makeRequest<T>(
    url: string,
    body: Record<string, unknown>,
    stream = false,
  ): Promise<T extends Response ? Response : T> {
    const messages = body['messages'] as AIMessage[] | undefined
    const estimatedTokens = estimateTokenCount(messages || [])
    await rateLimitManager.checkRateLimit(estimatedTokens)

    const controller = createAbortController(timeoutMs)

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Together-AI-Client/1.0',
      },
      body: JSON.stringify({ ...body, stream }),
      signal: controller.signal,
    }

    return exponentialBackoffRetry(async () => {
      const response = await fetch(url, requestInit)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          // If JSON parsing fails, handle without error data
        }
        handleAPIError(response, errorData)
      }

      if (stream) {
        return response as T extends Response ? Response : T
      }

      const data = await response.json()
      return data as T extends Response ? Response : T
    }, retryConfig)
  }

  return {
    async generateCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion | { content: string; usage?: AIUsage }> {
      try {
        if (!apiKey) {
          throw new TogetherAIError('Together AI API key is not configured')
        }

        const requestBody = {
          model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1024,
          stop: options?.stop,
        }

        const data = await makeRequest<TogetherCompletionResponse>(`${baseUrl}/v1/chat/completions`, requestBody)

        // Return in expected format
        return {
          id: data.id || `together-${Date.now()}`,
          created: data.created || Date.now(),
          model: data.model || requestBody.model,
          choices: data.choices?.map(choice => ({
            message: {
              role: choice.message.role as 'assistant',
              content: choice.message.content,
            },
            finishReason: (choice.finish_reason === 'stop' ? 'stop' : 
                          choice.finish_reason === 'length' ? 'length' : 'stop') as 'stop' | 'length' | 'content_filter',
          })) || [
            {
              message: {
                role: 'assistant',
                content: '',
                name: 'assistant',
              },
              finishReason: 'stop' as const,
            },
          ],
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
          provider: 'together',
          content: data.choices?.[0]?.message?.content || '',
        }
      } catch (error: unknown) {
        if (error instanceof TogetherAIError) {
          throw error
        }
        
        appLogger.error('Error in Together AI completion:', {
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        })
        throw new TogetherAIError(
          `Together AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },

    async createChatCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion> {
      const result = await this.generateCompletion(messages, options)

      // Ensure we return an AICompletion object
      if ('id' in result) {
        return result as AICompletion
      }

      // Convert basic response to AICompletion format
      return {
        id: `together-${Date.now()}`,
        created: Date.now(),
        model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
        choices: [
          {
            message: {
              role: 'assistant',
              content: result.content,
            },
            finishReason: 'stop',
          },
        ],
        usage: result.usage || {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        provider: 'together',
        content: result.content,
      }
    },

    async createStreamingChatCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AsyncGenerator<AIStreamChunk, void, void>> {
      try {
        if (!apiKey) {
          throw new TogetherAIError('Together AI API key is not configured')
        }

        const requestBody = {
          model: options?.model || 'mistralai/Mixtral-8x7B-Instruct-v0.2',
          messages,
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1024,
          stop: options?.stop,
        }

        const response = await makeRequest<Response>(
          `${baseUrl}/v1/chat/completions`,
          requestBody,
          true,
        )

        if (!response.body) {
          throw new TogetherAIError('No response body received for streaming')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        const streamGenerator = async function* (): AsyncGenerator<AIStreamChunk, void, void> {
          let buffer = ''
          let requestId = `together-stream-${Date.now()}`
          const { model } = requestBody

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                break
              }

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || '' // Keep incomplete line in buffer

              for (const line of lines) {
                const trimmedLine = line.trim()
                
                if (trimmedLine === '') {
                  continue
                }
                if (trimmedLine === 'data: [DONE]') {
                  return
                }
                if (!trimmedLine.startsWith('data: ')) {
                  continue
                }

                try {
                  const jsonData = trimmedLine.slice(6) // Remove 'data: ' prefix
                  const parsed: TogetherStreamResponse = JSON.parse(jsonData)

                  if (parsed.id) {
                    requestId = parsed.id
                  }

                  const choice = parsed.choices?.[0]
                  if (choice?.delta?.content) {
                    const finishReason: 'stop' | 'length' | 'content_filter' | undefined = 
                      choice.finish_reason === 'stop' ? 'stop' : 
                      choice.finish_reason === 'length' ? 'length' : undefined

                    const chunk: AIStreamChunk = {
                      id: requestId,
                      model: parsed.model || model,
                      created: parsed.created || Date.now(),
                      content: choice.delta.content,
                      done: !!choice.finish_reason,
                      ...(finishReason && { finishReason }),
                    }

                    yield chunk
                  }

                  // Handle completion
                  if (choice?.finish_reason) {
                    const finalFinishReason: 'stop' | 'length' | 'content_filter' = 
                      choice.finish_reason === 'stop' ? 'stop' : 
                      choice.finish_reason === 'length' ? 'length' : 'stop'

                    const finalChunk: AIStreamChunk = {
                      id: requestId,
                      model: parsed.model || model,
                      created: parsed.created || Date.now(),
                      content: '',
                      done: true,
                      finishReason: finalFinishReason,
                    }
                    yield finalChunk
                    return
                  }
                } catch (parseError) {
                  appLogger.warn('Failed to parse streaming response line', {
                    line: trimmedLine,
                    error: parseError instanceof Error ? parseError.message : String(parseError),
                  })
                  continue
                }
              }
            }
          } catch (streamError) {
            appLogger.error('Error in streaming response', {
              error: streamError instanceof Error ? streamError.message : String(streamError),
            })
            throw new TogetherAIError(
              `Streaming error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`,
            )
          } finally {
            try {
              reader.releaseLock()
            } catch {
              // Ignore lock release errors
            }
          }
        }

        return streamGenerator()
      } catch (error: unknown) {
        if (error instanceof TogetherAIError) {
          throw error
        }
        
        appLogger.error('Error in Together AI streaming completion:', {
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack }
              : error,
        })
        throw new TogetherAIError(
          `Together AI streaming service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    },

    dispose(): void {
      // Clean up any resources if needed
      appLogger.debug('Together AI service disposed')
    },
  }
}
