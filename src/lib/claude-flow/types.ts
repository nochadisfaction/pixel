/**
 * Core types and interfaces for Claude Flow system
 */

export interface LLMProvider {
  generateText(prompt: string, options?: GenerationOptions): Promise<string>
  generateStream(prompt: string, options?: GenerationOptions): AsyncIterableIterator<string>
  getTokenCount(text: string): number
  getModelInfo(): ModelInfo
  health(): Promise<boolean>
}

export interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  stopSequences?: string[]
  systemPrompt?: string
  topP?: number
  presencePenalty?: number
  frequencyPenalty?: number
}

export interface ModelInfo {
  name: string
  provider: string
  contextLength: number
  costPer1kTokens?: number
}

export interface LLMConfig {
  provider: 'ollama' | 'azure-openai'
  model: string
  apiKey?: string
  baseUrl?: string
  deploymentName?: string // Azure OpenAI specific
  apiVersion?: string // Azure OpenAI specific
  temperature?: number
  maxTokens?: number
}

export interface FlowRequest {
  task: string
  context?: string
  requirements?: string[]
  preferences?: {
    style?: 'functional' | 'object-oriented' | 'minimal'
    language?: string
    framework?: string
  }
}

export interface FlowResponse {
  analysis: string
  code: string
  review: string
  tests?: string
  documentation?: string
  metadata: {
    provider: string
    model: string
    tokensUsed: number
    executionTime: number
  }
}

export interface FlowStep {
  name: string
  prompt: string
  systemPrompt?: string
  options?: GenerationOptions
}

export type FlowComplexity = 'simple' | 'complex' | 'code' | 'analysis'

export interface FlowMetrics {
  totalTokens: number
  executionTime: number
  steps: Array<{
    name: string
    tokens: number
    duration: number
  }>
} 