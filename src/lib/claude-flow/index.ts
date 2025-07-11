/**
 * Claude Flow - Multi-LLM Code Generation System
 * 
 * A flexible system that can work with both Ollama (local) and Azure OpenAI (cloud)
 * to generate, review, and document code using a structured workflow.
 */

// Core exports
export { ClaudeFlowEngine } from './core/flow-engine'
export { LLMProviderFactory, ConfigLoader } from './factory'

// Provider exports
export { OllamaProvider } from './providers/ollama'
export { AzureOpenAIProvider } from './providers/azure-openai'

// Type exports
export type {
  LLMProvider,
  LLMConfig,
  FlowRequest,
  FlowResponse,
  GenerationOptions,
  ModelInfo,
  FlowStep,
  FlowMetrics
} from './types'

// Convenience class for easy usage
import { ClaudeFlowEngine } from './core/flow-engine'
import { LLMProviderFactory, ConfigLoader } from './factory'
import type { LLMConfig, FlowRequest, FlowResponse } from './types'
import { createLogger } from '../../utils/logger'

const logger = createLogger({ context: 'ClaudeFlow' })

export class ClaudeFlow {
  private engine: ClaudeFlowEngine

  constructor(config: LLMConfig) {
    const provider = LLMProviderFactory.create(config)
    this.engine = new ClaudeFlowEngine(provider)
  }

  /**
   * Create a Claude Flow instance from environment variables
   */
  static fromEnvironment(): ClaudeFlow {
    const config = ConfigLoader.getPrimaryConfig()
    return new ClaudeFlow(config)
  }

  /**
   * Create a Claude Flow instance with Ollama
   */
  static withOllama(
    model = 'codellama:7b',
    baseUrl = 'http://localhost:11434'
  ): ClaudeFlow {
    return new ClaudeFlow({
      provider: 'ollama',
      model,
      baseUrl,
      temperature: 0.7,
      maxTokens: 2000,
    })
  }

  /**
   * Create a Claude Flow instance with Azure OpenAI
   */
  static withAzureOpenAI(
    endpoint: string,
    apiKey: string,
    deploymentName: string,
    model = 'gpt-4',
    apiVersion = '2024-02-15-preview'
  ): ClaudeFlow {
    return new ClaudeFlow({
      provider: 'azure-openai',
      baseUrl: endpoint,
      apiKey,
      deploymentName,
      model,
      apiVersion,
      temperature: 0.7,
      maxTokens: 2000,
    })
  }

  /**
   * Execute a complete flow
   */
  async execute(request: FlowRequest): Promise<FlowResponse> {
    return this.engine.executeFlow(request)
  }

  /**
   * Execute a streaming flow
   */
  executeStream(request: FlowRequest) {
    return this.engine.executeFlowStream(request)
  }

  /**
   * Quick code generation for simple tasks
   */
  async generateCode(
    task: string,
    language?: string,
    framework?: string
  ): Promise<string> {
    const request: FlowRequest = {
      task,
      preferences: {
        language,
        framework,
        style: 'clean and maintainable'
      }
    }

    const response = await this.execute(request)
    return response.code
  }

  /**
   * Quick analysis for complex tasks
   */
  async analyzeTask(
    task: string,
    context?: string,
    requirements?: string[]
  ): Promise<string> {
    const request: FlowRequest = {
      task,
      context,
      requirements
    }

    const response = await this.execute(request)
    return response.analysis
  }

  /**
   * Code review only
   */
  async reviewCode(code: string, task: string): Promise<string> {
    // For code review, we need to create a mock request and execute just the review step
    // This is a simplified approach - in a real implementation you might want
    // a more direct review-only method
    const request: FlowRequest = {
      task: `Review the following code: ${task}`,
      context: `Code to review:\n${code}`
    }

    const response = await this.execute(request)
    return response.review
  }
}

// Utility functions
export const ClaudeFlowUtils = {
  /**
   * Validate environment setup for Ollama
   */
  async validateOllamaSetup(baseUrl = 'http://localhost:11434'): Promise<{
    isAvailable: boolean
    availableModels: string[]
    recommendedModels: string[]
  }> {
    try {
      const provider = new (await import('./providers/ollama')).OllamaProvider(baseUrl)
      const isHealthy = await provider.health()
      const availableModels = isHealthy ? await provider.listAvailableModels() : []
      const recommendedModels = LLMProviderFactory.getRecommendedModels('ollama')

      return {
        isAvailable: isHealthy,
        availableModels,
        recommendedModels
      }
    } catch (_error) {
      logger.error('Failed to validate Ollama setup', { error })
      return {
        isAvailable: false,
        availableModels: [],
        recommendedModels: LLMProviderFactory.getRecommendedModels('ollama')
      }
    }
  },

  /**
   * Validate environment setup for Azure OpenAI
   */
  async validateAzureOpenAISetup(
    endpoint: string,
    apiKey: string,
    deploymentName: string
  ): Promise<{
    isAvailable: boolean
    modelInfo: any
    recommendedModels: string[]
  }> {
    try {
      const provider = new (await import('./providers/azure-openai')).AzureOpenAIProvider(
        endpoint,
        apiKey,
        deploymentName
      )
      
      const isHealthy = await provider.health()
      const modelInfo = isHealthy ? provider.getModelInfo() : null
      const recommendedModels = LLMProviderFactory.getRecommendedModels('azure-openai')

      return {
        isAvailable: isHealthy,
        modelInfo,
        recommendedModels
      }
    } catch (_error) {
      logger.error('Failed to validate Azure OpenAI setup', { error })
      return {
        isAvailable: false,
        modelInfo: null,
        recommendedModels: LLMProviderFactory.getRecommendedModels('azure-openai')
      }
    }
  },

  /**
   * Get setup instructions for Ollama
   */
  getOllamaSetupInstructions(): string {
    return `
# Ollama Setup Instructions

## 1. Install Ollama
Visit https://ollama.ai and download the installer for your platform.

## 2. Start Ollama service
\`\`\`bash
ollama serve
\`\`\`

## 3. Pull a recommended model
\`\`\`bash
# For code generation (recommended)
ollama pull codellama:7b

# For general tasks
ollama pull mistral:7b

# For high-quality responses (requires more resources)
ollama pull mixtral:8x7b
\`\`\`

## 4. Verify installation
\`\`\`bash
ollama list
\`\`\`

## 5. Test with Claude Flow
\`\`\`typescript
import { ClaudeFlow } from './claude-flow'

const flow = ClaudeFlow.withOllama('codellama:7b')
const code = await flow.generateCode('Create a simple calculator function', 'TypeScript')
\`\`\`
`.trim()
  },

  /**
   * Get setup instructions for Azure OpenAI
   */
  getAzureOpenAISetupInstructions(): string {
    return `
# Azure OpenAI Setup Instructions

## 1. Create Azure OpenAI Resource
1. Go to https://portal.azure.com
2. Create a new Azure OpenAI Service
3. Choose your subscription and resource group
4. Select a region (e.g., East US, West Europe)

## 2. Deploy a Model
1. Go to Azure OpenAI Studio (https://oai.azure.com)
2. Navigate to "Deployments"
3. Create a new deployment with a supported model:
   - GPT-4 (recommended for best quality)
   - GPT-3.5-turbo (faster and cheaper)

## 3. Get Configuration Values
1. **Endpoint**: Found in the "Keys and Endpoint" section
2. **API Key**: Found in the "Keys and Endpoint" section  
3. **Deployment Name**: The name you gave your model deployment

## 4. Set Environment Variables
\`\`\`bash
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_API_KEY="your-api-key"
export AZURE_OPENAI_DEPLOYMENT_NAME="your-deployment-name"
export AZURE_OPENAI_MODEL="gpt-4"
\`\`\`

## 5. Test with Claude Flow
\`\`\`typescript
import { ClaudeFlow } from './claude-flow'

const flow = ClaudeFlow.withAzureOpenAI(
  process.env["AZURE_OPENAI_ENDPOINT"]!,
  process.env["AZURE_OPENAI_API_KEY"]!,
  process.env["AZURE_OPENAI_DEPLOYMENT_NAME"]!,
  'gpt-4'
)

const code = await flow.generateCode('Create a REST API endpoint', 'TypeScript')
\`\`\`
`.trim()
  }
} 