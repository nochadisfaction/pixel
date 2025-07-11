import type {
  AIMessage,
  AICompletion,
  AIServiceOptions,
  AIUsage,
} from '../types'
import { azureConfig } from '../../../config/azure.config'
import { getLogger } from '../../logging'

const logger = getLogger({ prefix: 'azure-openai' })

/**
 * Azure OpenAI Service Implementation
 * Provides AI completions using Azure OpenAI Service
 */
export function createAzureOpenAIService() {
  const config = azureConfig.openai

  if (!config.isConfigured()) {
    logger.warn('Azure OpenAI is not properly configured')
    throw new Error('Azure OpenAI API key and endpoint are required')
  }

  return {
    async generateCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion | { content: string; usage?: AIUsage }> {
      try {
        const url = config.getApiUrl('chat/completions')
        const headers = config.getHeaders()

        const requestBody = {
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1024,
          top_p: options?.topP || 1,
          frequency_penalty: options?.frequencyPenalty || 0,
          presence_penalty: options?.presencePenalty || 0,
          stream: false,
        }

        logger.debug('Making Azure OpenAI API request', {
          url,
          messageCount: messages.length,
          model: config.deploymentName,
          temperature: requestBody.temperature,
          maxTokens: requestBody.max_tokens,
        })

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          logger.error('Azure OpenAI API error', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
          })
          throw new Error(
            `Azure OpenAI API error: ${response.status} ${response.statusText}`,
          )
        }

        const data = await response.json()

        if (!data.choices || data.choices.length === 0) {
          throw new Error('No choices returned from Azure OpenAI API')
        }

        const choice = data.choices[0]
        const content = choice.message?.content || choice.text || ''

        const usage: AIUsage | undefined = data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined

        logger.debug('Azure OpenAI API response received', {
          contentLength: content.length,
          usage,
          finishReason: choice.finish_reason,
        })

        return {
          content,
          usage,
          model: config.deploymentName,
          finishReason: choice.finish_reason,
        }
      } catch (_error) {
        logger.error('Error in Azure OpenAI service', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        throw error
      }
    },

    async createChatCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AICompletion> {
      const result = await this.generateCompletion(messages, options)

      // Ensure we return the expected AICompletion format
      if ('content' in result) {
        return {
          content: result.content,
          usage: result.usage,
          model: config.deploymentName,
          finishReason: 'stop',
        }
      }

      return result
    },

    /**
     * Stream completion (not implemented yet for Azure OpenAI)
     */
    async streamCompletion(
      messages: AIMessage[],
      options?: AIServiceOptions,
    ): Promise<AsyncIterable<string>> {
      // For now, fall back to regular completion
      // TODO: Implement streaming for Azure OpenAI
      const result = await this.generateCompletion(messages, options)
      const content = 'content' in result ? result.content : result.content

      return (async function* () {
        yield content
      })()
    },

    /**
     * Get available models (Azure OpenAI uses deployments)
     */
    async getAvailableModels(): Promise<string[]> {
      // In Azure OpenAI, models are deployed as deployments
      // This would require additional API calls to list deployments
      return [config.deploymentName]
    },

    /**
     * Test the connection to Azure OpenAI
     */
    async testConnection(): Promise<boolean> {
      try {
        const testMessages: AIMessage[] = [
          { role: 'user', content: 'Hello, this is a connection test.' },
        ]

        await this.generateCompletion(testMessages, { maxTokens: 10 })
        return true
      } catch (_error) {
        logger.error('Azure OpenAI connection test failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        return false
      }
    },

    /**
     * Get service information
     */
    getServiceInfo() {
      return {
        provider: 'azure-openai',
        endpoint: config.endpoint,
        deploymentName: config.deploymentName,
        apiVersion: config.apiVersion,
        configured: config.isConfigured(),
      }
    },

    /**
     * Dispose of resources (cleanup)
     */
    dispose(): void {
      // No persistent connections to clean up for HTTP-based service
      logger.debug('Azure OpenAI service disposed')
    },
  }
}

/**
 * Factory function to create Azure OpenAI service with custom configuration
 */
export function createAzureOpenAIServiceWithConfig(customConfig: {
  apiKey: string
  endpoint: string
  deploymentName?: string
  apiVersion?: string
}) {
  const originalConfig = azureConfig.openai

  // Temporarily override configuration
  const tempConfig = {
    ...originalConfig,
    apiKey: customConfig.apiKey,
    endpoint: customConfig.endpoint,
    deploymentName:
      customConfig.deploymentName || originalConfig.deploymentName,
    apiVersion: customConfig.apiVersion || originalConfig.apiVersion,
    isConfigured: () => !!(customConfig.apiKey && customConfig.endpoint),
    getApiUrl: (endpoint: string = 'chat/completions') => {
      const baseUrl = customConfig.endpoint.endsWith('/')
        ? customConfig.endpoint.slice(0, -1)
        : customConfig.endpoint

      return `${baseUrl}/openai/deployments/${customConfig.deploymentName || 'gpt-4'}/${endpoint}?api-version=${customConfig.apiVersion || '2024-02-01'}`
    },
    getHeaders: () => ({
      'Content-Type': 'application/json',
      'api-key': customConfig.apiKey,
    }),
  }

  // Replace the config temporarily
  Object.assign(azureConfig.openai, tempConfig)

  const service = createAzureOpenAIService()

  // Restore original config
  Object.assign(azureConfig.openai, originalConfig)

  return service
}

export default createAzureOpenAIService
