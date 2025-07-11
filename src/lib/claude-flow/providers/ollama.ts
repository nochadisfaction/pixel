/**
 * Ollama LLM Provider for local development
 */

import type { LLMProvider, GenerationOptions, ModelInfo } from '../types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger({ context: 'OllamaProvider' })

interface OllamaResponse {
  response: string
  context?: number[]
  done: boolean
}

interface OllamaStreamResponse {
  response: string
  done: boolean
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string
  private model: string

  constructor(baseUrl = 'http://localhost:11434', model = 'codellama:7b') {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.model = model
    logger.info(`Initialized Ollama provider with model: ${model} at ${baseUrl}`)
  }

  async generateText(prompt: string, options?: GenerationOptions): Promise<string> {
    try {
      const requestBody = {
        model: this.model,
        prompt: this.buildFullPrompt(prompt, options?.systemPrompt),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2000,
          top_p: options?.topP ?? 0.9,
          stop: options?.stopSequences || [],
        }
      }

      logger.debug('Sending request to Ollama', { model: this.model, promptLength: prompt.length })

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data: OllamaResponse = await response.json()
      
      if (!data.response) {
        throw new Error('Empty response from Ollama')
      }

      logger.debug('Received response from Ollama', { responseLength: data.response.length })
      return data.response.trim()
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error))
      logger.error('Error generating text with Ollama', { error, model: this.model })
      throw new Error(`Ollama generation failed: ${error.message}`)
    }
  }

  async *generateStream(prompt: string, options?: GenerationOptions): AsyncIterableIterator<string> {
    try {
      const requestBody = {
        model: this.model,
        prompt: this.buildFullPrompt(prompt, options?.systemPrompt),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2000,
          top_p: options?.topP ?? 0.9,
          stop: options?.stopSequences || [],
        }
      }

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body from Ollama')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data: OllamaStreamResponse = JSON.parse(line)
                if (data.response) {
                  yield data.response
                }
                if (data.done) {
                  return
                }
              } catch (parseError) {
                logger.warn('Failed to parse Ollama stream response', { line, parseError })
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error))
      logger.error('Error streaming from Ollama', { error, model: this.model })
      throw new Error(`Ollama streaming failed: ${error.message}`)
    }
  }

  getTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  getModelInfo(): ModelInfo {
    return {
      name: this.model,
      provider: 'ollama',
      contextLength: this.getContextLength(),
      costPer1kTokens: 0, // Local models are free
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      const modelExists = data.models?.some((m: unknown) => (m as { name: string }).name === this.model)
      
      if (!modelExists) {
        logger.warn(`Model ${this.model} not found in Ollama. Available models:`, data.models?.map((m: unknown) => (m as { name: string }).name))
        return false
      }

      return true
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error))
      logger.error('Ollama health check failed', { error })
      return false
    }
  }

  private buildFullPrompt(prompt: string, systemPrompt?: string): string {
    if (!systemPrompt) {
      return prompt
    }

    // Format for models that support system prompts
    return `System: ${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
  }

  private getContextLength(): number {
    // Common context lengths for popular models
    const contextLengths: Record<string, number> = {
      'llama2:7b': 4096,
      'llama2:13b': 4096,
      'llama2:70b': 4096,
      'codellama:7b': 16384,
      'codellama:13b': 16384,
      'codellama:34b': 16384,
      'mistral:7b': 8192,
      'mixtral:8x7b': 32768,
      'deepseek-coder:6.7b': 16384,
      'qwen:14b': 8192,
    }

    return contextLengths[this.model] || 4096
  }

  // Utility method to check if a model is available
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.models?.map((m: unknown) => (m as { name: string }).name) || []
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error))
      logger.error('Error listing Ollama models', { error })
      return []
    }
  }

  // Utility method to pull a model if it doesn't exist
  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.model
    
    try {
      logger.info(`Pulling model: ${model}`)
      
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: model }),
      })

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`)
      }

      // Stream the pull progress (optional)
      const reader = response.body?.getReader()
      if (reader) {
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line)
                  if (data.status) {
                    logger.info(`Pull progress: ${data.status}`)
                  }
                } catch {
                  // Ignore parsing errors for progress updates
                }
              }
            }
          }
        } finally {
          reader.releaseLock()
        }
      }

      logger.info(`Successfully pulled model: ${model}`)
    } catch (_error) {
      const error = _error instanceof Error ? _error : new Error(String(_error))
      logger.error(`Error pulling model ${model}`, { error })
      throw error
    }
  }
}