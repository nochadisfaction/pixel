/**
 * Azure OpenAI LLM Provider for production use
 */

import type { LLMProvider, GenerationOptions, ModelInfo } from '../types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger({ context: 'AzureOpenAIProvider' })

interface AzureOpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AzureOpenAIRequest {
  messages: AzureOpenAIMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  presence_penalty?: number
  frequency_penalty?: number
  stop?: string[]
  stream?: boolean
}

interface AzureOpenAIResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface AzureOpenAIStreamChunk {
  choices: Array<{
    delta: {
      content?: string
      role?: string
    }
    finish_reason?: string
  }>
}

export class AzureOpenAIProvider implements LLMProvider {
  private endpoint: string
  private apiKey: string
  private deploymentName: string
  private apiVersion: string
  private model: string

  constructor(
    endpoint: string,
    apiKey: string,
    deploymentName: string,
    apiVersion = '2024-02-15-preview',
    model = 'gpt-4'
  ) {
    this.endpoint = endpoint.replace(/\/$/, '') // Remove trailing slash
    this.apiKey = apiKey
    this.deploymentName = deploymentName
    this.apiVersion = apiVersion
    this.model = model

    logger.info(`Initialized Azure OpenAI provider`, {
      endpoint: this.endpoint,
      deployment: this.deploymentName,
      model: this.model,
      apiVersion: this.apiVersion
    })
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      const messages = this.buildMessages(prompt, options?.systemPrompt)
      
      const requestBody: AzureOpenAIRequest = {
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        top_p: options?.topP ?? 1.0,
        presence_penalty: options?.presencePenalty ?? 0,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        stop: options?.stopSequences || [],
        stream: false,
      }

      logger.debug('Sending request to Azure OpenAI', {
        deployment: this.deploymentName,
        messageCount: messages.length,
        promptLength: prompt.length
      })

      const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Azure OpenAI API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText}`)
      }

      const data: AzureOpenAIResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No choices returned from Azure OpenAI')
      }

      const content = data.choices[0].message.content
      if (!content) {
        throw new Error('Empty content returned from Azure OpenAI')
      }

      logger.debug('Received response from Azure OpenAI', {
        responseLength: content.length,
        tokensUsed: data.usage.total_tokens,
        finishReason: data.choices[0].finish_reason
      })

      return content.trim()
    } catch (error) {
      logger.error('Error generating text with Azure OpenAI', { 
        error, 
        deployment: this.deploymentName,
        model: this.model 
      })
      throw new Error(`Azure OpenAI generation failed: ${error.message}`)
    }
  }

  async *generateStream(prompt: string, options?: GenerationOptions): AsyncIterableIterator<string> {
    try {
      const messages = this.buildMessages(prompt, options?.systemPrompt)
      
      const requestBody: AzureOpenAIRequest = {
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        top_p: options?.topP ?? 1.0,
        presence_penalty: options?.presencePenalty ?? 0,
        frequency_penalty: options?.frequencyPenalty ?? 0,
        stop: options?.stopSequences || [],
        stream: true,
      }

      const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Azure OpenAI API error: ${response.status} ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body from Azure OpenAI')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6) // Remove 'data: ' prefix
              
              if (dataStr === '[DONE]') {
                return
              }

              try {
                const data: AzureOpenAIStreamChunk = JSON.parse(dataStr)
                const content = data.choices[0]?.delta?.content
                
                if (content) {
                  yield content
                }

                if (data.choices[0]?.finish_reason) {
                  return
                }
              } catch (parseError) {
                logger.warn('Failed to parse Azure OpenAI stream response', { 
                  line: trimmedLine, 
                  parseError 
                })
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      logger.error('Error streaming from Azure OpenAI', { 
        error, 
        deployment: this.deploymentName,
        model: this.model 
      })
      throw new Error(`Azure OpenAI streaming failed: ${error.message}`)
    }
  }

  getTokenCount(text: string): number {
    // More accurate approximation for GPT models
    // This is a rough estimate; for precise counting, use tiktoken library
    return Math.ceil(text.length / 3.5)
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      provider: 'azure-openai',
      contextLength: this.getContextLength(),
      costPer1kTokens: this.getCostPer1kTokens(),
    }
  }

  async health(): Promise<boolean> {
    try {
      // Simple health check with minimal request
      const response = await this.generateText('Hello', { maxTokens: 5 })
      return typeof response === 'string' && response.length > 0
    } catch (error) {
      logger.error('Azure OpenAI health check failed', { error })
      return false
    }
  }

  private buildMessages(prompt: string, systemPrompt?: string): AzureOpenAIMessage[] {
    const messages: AzureOpenAIMessage[] = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    messages.push({
      role: 'user',
      content: prompt
    })

    return messages
  }

  private getContextLength(): number {
    // Context lengths for different Azure OpenAI models
    const contextLengths: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4-turbo-preview': 128000,
      'gpt-35-turbo': 4096,
      'gpt-35-turbo-16k': 16384,
      'gpt-35-turbo-instruct': 4096,
    }

    return contextLengths[this.model] || 8192
  }

  private getCostPer1kTokens(): number {
    // Approximate costs per 1k tokens (in USD) - these may vary
    const costs: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-32k': 0.06,
      'gpt-4-turbo': 0.01,
      'gpt-4-turbo-preview': 0.01,
      'gpt-35-turbo': 0.002,
      'gpt-35-turbo-16k': 0.004,
      'gpt-35-turbo-instruct': 0.0015,
    }

    return costs[this.model] || 0.03
  }

  // Utility method to list available deployments (requires management API access)
  async listDeployments(): Promise<string[]> {
    try {
      // This would require the management API endpoint and different authentication
      // For now, return empty array as this requires additional setup
      logger.warn('listDeployments not implemented - requires Azure management API access')
      return []
    } catch (error) {
      logger.error('Error listing Azure OpenAI deployments', { error })
      return []
    }
  }

  // Utility method to get model capabilities
  getCapabilities() {
    return {
      supportsStreaming: true,
      supportsSystemPrompts: true,
      supportsFunctions: this.model.includes('gpt-4') || this.model.includes('gpt-35-turbo'),
      maxTokens: this.getContextLength(),
      supportedFormats: ['text', 'json'],
    }
  }

  // Utility method to estimate costs
  estimateCost(inputTokens: number, outputTokens: number): number {
    const costPer1k = this.getCostPer1kTokens()
    return ((inputTokens + outputTokens) / 1000) * costPer1k
  }
} 