/**
 * LLM Provider Factory for Claude Flow
 */

import type { LLMProvider, LLMConfig } from './types'
import { OllamaProvider } from './providers/ollama'
import { AzureOpenAIProvider } from './providers/azure-openai'
import { createLogger } from '../../utils/logger'

const logger = createLogger({ context: 'LLMProviderFactory' })

export class LLMProviderFactory {
  /**
   * Create an LLM provider based on configuration
   */
  static create(config: LLMConfig): LLMProvider {
    logger.info('Creating LLM provider', { provider: config.provider, model: config.model })

    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider(config.baseUrl, config.model)

      case 'azure-openai':
        if (!config.apiKey) {
          throw new Error('API key is required for Azure OpenAI provider')
        }
        if (!config.baseUrl) {
          throw new Error('Base URL (endpoint) is required for Azure OpenAI provider')
        }
        if (!config.deploymentName) {
          throw new Error('Deployment name is required for Azure OpenAI provider')
        }

        return new AzureOpenAIProvider(
          config.baseUrl,
          config.apiKey,
          config.deploymentName,
          config.apiVersion,
          config.model
        )

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`)
    }
  }

  /**
   * Create multiple providers for different use cases
   */
  static createMultiple(configs: LLMConfig[]): Record<string, LLMProvider> {
    const providers: Record<string, LLMProvider> = {}

    for (const config of configs) {
      const key = `${config.provider}-${config.model}`
      providers[key] = LLMProviderFactory.create(config)
    }

    return providers
  }

  /**
   * Validate configuration before creating provider
   */
  static validateConfig(config: LLMConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.provider) {
      errors.push('Provider is required')
    }

    if (!config.model) {
      errors.push('Model is required')
    }

    switch (config.provider) {
      case 'ollama':
        if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
          errors.push('Invalid base URL for Ollama provider')
        }
        break

      case 'azure-openai':
        if (!config.apiKey) {
          errors.push('API key is required for Azure OpenAI provider')
        }
        if (!config.baseUrl) {
          errors.push('Base URL (endpoint) is required for Azure OpenAI provider')
        }
        if (!config.deploymentName) {
          errors.push('Deployment name is required for Azure OpenAI provider')
        }
        if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
          errors.push('Invalid base URL for Azure OpenAI provider')
        }
        break

      default:
        errors.push(`Unsupported provider: ${config.provider}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get recommended models for each provider
   */
  static getRecommendedModels(provider: 'ollama' | 'azure-openai'): string[] {
    switch (provider) {
      case 'ollama':
        return [
          'codellama:7b',     // Best for code generation
          'codellama:13b',    // Better quality, more resources
          'codellama:34b',    // Highest quality
          'mistral:7b',       // Good general purpose
          'mixtral:8x7b',     // High quality, large context
          'deepseek-coder:6.7b', // Specialized for code
          'qwen:14b',         // Good balance
        ]

      case 'azure-openai':
        return [
          'gpt-4',                  // Best overall quality
          'gpt-4-turbo',           // Faster, larger context
          'gpt-4-32k',             // Large context window
          'gpt-35-turbo',          // Fast and cost-effective
          'gpt-35-turbo-16k',      // Larger context
        ]

      default:
        return []
    }
  }

  /**
   * Get default configuration for each provider
   */
  static getDefaultConfig(provider: 'ollama' | 'azure-openai'): Partial<LLMConfig> {
    switch (provider) {
      case 'ollama':
        return {
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'codellama:7b',
          temperature: 0.7,
          maxTokens: 2000,
        }

      case 'azure-openai':
        return {
          provider: 'azure-openai',
          apiVersion: '2024-02-15-preview',
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        }

      default:
        return {}
    }
  }

  /**
   * Health check all providers
   */
  static async healthCheckAll(providers: Record<string, LLMProvider>): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}

    const healthChecks = Object.entries(providers).map(async ([key, provider]) => {
      try {
        const isHealthy = await provider.health()
        results[key] = isHealthy
        logger.info(`Health check for ${key}:`, isHealthy ? 'HEALTHY' : 'UNHEALTHY')
      } catch (error) {
        results[key] = false
        logger.error(`Health check failed for ${key}`, { error })
      }
    })

    await Promise.all(healthChecks)
    return results
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Environment-based configuration loader
 */
export class ConfigLoader {
  /**
   * Load configuration from environment variables
   */
  static fromEnvironment(): LLMConfig[] {
    const configs: LLMConfig[] = []

    // Load Ollama config if available
    const ollamaUrl = process.env["OLLAMA_BASE_URL"]
    const ollamaModel = process.env["OLLAMA_MODEL"]
    
    if (ollamaUrl || ollamaModel) {
      configs.push({
        provider: 'ollama',
        baseUrl: ollamaUrl || 'http://localhost:11434',
        model: ollamaModel || 'codellama:7b',
        temperature: parseFloat(process.env["OLLAMA_TEMPERATURE"] || '0.7'),
        maxTokens: parseInt(process.env["OLLAMA_MAX_TOKENS"] || '2000'),
      })
    }

    // Load Azure OpenAI config if available
    const azureEndpoint = process.env["AZURE_OPENAI_ENDPOINT"]
    const azureApiKey = process.env["AZURE_OPENAI_API_KEY"]
    const azureDeployment = process.env["AZURE_OPENAI_DEPLOYMENT_NAME"]
    
    if (azureEndpoint && azureApiKey && azureDeployment) {
      configs.push({
        provider: 'azure-openai',
        baseUrl: azureEndpoint,
        apiKey: azureApiKey,
        deploymentName: azureDeployment,
        apiVersion: process.env["AZURE_OPENAI_API_VERSION"] || '2024-02-15-preview',
        model: process.env["AZURE_OPENAI_MODEL"] || 'gpt-4',
        temperature: parseFloat(process.env["AZURE_OPENAI_TEMPERATURE"] || '0.7'),
        maxTokens: parseInt(process.env["AZURE_OPENAI_MAX_TOKENS"] || '2000'),
      })
    }

    return configs
  }

  /**
   * Load primary provider configuration
   */
  static getPrimaryConfig(): LLMConfig {
    const configs = ConfigLoader.fromEnvironment()
    
    if (configs.length === 0) {
      // Default to Ollama for development
      return {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'codellama:7b',
        temperature: 0.7,
        maxTokens: 2000,
      }
    }

    // Prefer Azure OpenAI for production, Ollama for development
    const azureConfig = configs.find(c => c.provider === 'azure-openai')
    const ollamaConfig = configs.find(c => c.provider === 'ollama')
    
    return azureConfig || ollamaConfig || configs[0]
  }
} 