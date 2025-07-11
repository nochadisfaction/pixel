/**
 * Core Claude Flow Engine
 */

import type { 
  LLMProvider, 
  FlowRequest, 
  FlowResponse, 
  FlowStep,
  FlowMetrics,
  GenerationOptions 
} from '../types'
import { createLogger } from '../../../utils/logger'

const logger = createLogger({ context: 'ClaudeFlowEngine' })

export class ClaudeFlowEngine {
  private provider: LLMProvider
  private systemPrompts: Record<string, string>

  constructor(provider: LLMProvider) {
    this.provider = provider
    this.systemPrompts = this.initializeSystemPrompts()
    logger.info('Initialized Claude Flow Engine', { 
      provider: provider.getModelInfo().provider,
      model: provider.getModelInfo().name 
    })
  }

  /**
   * Execute the complete Claude Flow workflow
   */
  async executeFlow(request: FlowRequest): Promise<FlowResponse> {
    const startTime = Date.now()
    const metrics: FlowMetrics = {
      totalTokens: 0,
      executionTime: 0,
      steps: []
    }

    try {
      logger.info('Starting Claude Flow execution', { 
        task: request.task,
        language: request.preferences?.language,
        style: request.preferences?.style 
      })

      // Step 1: Analysis
      const analysis = await this.executeStep('analysis', request, metrics)

      // Step 2: Code Generation
      const code = await this.executeStep('code-generation', request, metrics, { analysis })

      // Step 3: Code Review
      const review = await this.executeStep('code-review', request, metrics, { code, analysis })

      // Step 4: Test Generation (optional)
      const tests = await this.executeStep('test-generation', request, metrics, { code, analysis })

      // Step 5: Documentation (optional)
      const documentation = await this.executeStep('documentation', request, metrics, { code, analysis })

      const executionTime = Date.now() - startTime
      metrics.executionTime = executionTime

      const response: FlowResponse = {
        analysis,
        code,
        review,
        tests,
        documentation,
        metadata: {
          provider: this.provider.getModelInfo().provider,
          model: this.provider.getModelInfo().name,
          tokensUsed: metrics.totalTokens,
          executionTime,
        }
      }

      logger.info('Claude Flow execution completed', {
        tokensUsed: metrics.totalTokens,
        executionTime,
        stepsCount: metrics.steps.length
      })

      return response
    } catch (error) {
      logger.error('Claude Flow execution failed', { error, request })
      throw new Error(`Flow execution failed: ${error.message}`)
    }
  }

  /**
   * Execute a streaming version of the flow
   */
  async *executeFlowStream(request: FlowRequest): AsyncIterableIterator<{
    step: string
    content: string
    isComplete: boolean
  }> {
    try {
      const steps = ['analysis', 'code-generation', 'code-review']
      
      for (const stepName of steps) {
        yield { step: stepName, content: '', isComplete: false }
        
        const step = this.buildStep(stepName, request)
        let stepContent = ''

        for await (const chunk of this.provider.generateStream(step.prompt, step.options)) {
          stepContent += chunk
          yield { step: stepName, content: chunk, isComplete: false }
        }

        yield { step: stepName, content: '', isComplete: true }
      }
    } catch (error) {
      logger.error('Streaming flow execution failed', { error })
      throw error
    }
  }

  /**
   * Execute a single step of the flow
   */
  private async executeStep(
    stepName: string, 
    request: FlowRequest, 
    metrics: FlowMetrics,
    context?: Record<string, string>
  ): Promise<string> {
    const stepStart = Date.now()
    
    try {
      const step = this.buildStep(stepName, request, context)
      logger.debug(`Executing step: ${stepName}`, { promptLength: step.prompt.length })

      const result = await this.provider.generateText(step.prompt, step.options)
      const tokens = this.provider.getTokenCount(step.prompt + result)
      const duration = Date.now() - stepStart

      metrics.totalTokens += tokens
      metrics.steps.push({
        name: stepName,
        tokens,
        duration
      })

      logger.debug(`Step ${stepName} completed`, { tokens, duration, resultLength: result.length })
      return result
    } catch (error) {
      logger.error(`Step ${stepName} failed`, { error })
      throw error
    }
  }

  /**
   * Build a flow step with appropriate prompts
   */
  private buildStep(
    stepName: string, 
    request: FlowRequest, 
    context?: Record<string, string>
  ): FlowStep {
    const systemPrompt = this.systemPrompts[stepName]
    const options: GenerationOptions = {
      temperature: this.getTemperatureForStep(stepName),
      maxTokens: this.getMaxTokensForStep(stepName),
    }

    switch (stepName) {
      case 'analysis':
        return {
          name: stepName,
          prompt: this.buildAnalysisPrompt(request),
          systemPrompt,
          options
        }

      case 'code-generation':
        return {
          name: stepName,
          prompt: this.buildCodeGenerationPrompt(request, context?.analysis),
          systemPrompt,
          options
        }

      case 'code-review':
        return {
          name: stepName,
          prompt: this.buildCodeReviewPrompt(request, context?.code, context?.analysis),
          systemPrompt,
          options
        }

      case 'test-generation':
        return {
          name: stepName,
          prompt: this.buildTestGenerationPrompt(request, context?.code),
          systemPrompt,
          options
        }

      case 'documentation':
        return {
          name: stepName,
          prompt: this.buildDocumentationPrompt(request, context?.code),
          systemPrompt,
          options
        }

      default:
        throw new Error(`Unknown step: ${stepName}`)
    }
  }

  /**
   * Initialize system prompts for different steps
   */
  private initializeSystemPrompts(): Record<string, string> {
    return {
      analysis: `You are an expert software architect and analyst. Your role is to analyze requirements and break down complex tasks into clear, actionable components. Focus on:
- Understanding the core requirements
- Identifying technical challenges
- Suggesting optimal approaches
- Considering edge cases and constraints
- Providing clear, structured analysis`,

      'code-generation': `You are an expert software developer. Your role is to write clean, efficient, and maintainable code. Focus on:
- Writing production-ready code
- Following best practices and design patterns
- Including proper error handling
- Adding clear comments where needed
- Ensuring code is secure and performant`,

      'code-review': `You are a senior code reviewer. Your role is to provide constructive feedback on code quality. Focus on:
- Code structure and organization
- Performance and security considerations
- Best practices and design patterns
- Potential bugs or issues
- Suggestions for improvement`,

      'test-generation': `You are a testing expert. Your role is to create comprehensive test suites. Focus on:
- Unit tests with good coverage
- Edge cases and error conditions
- Integration test scenarios
- Clear test descriptions
- Maintainable test code`,

      'documentation': `You are a technical writer. Your role is to create clear, comprehensive documentation. Focus on:
- Clear explanation of functionality
- Usage examples
- API documentation
- Installation and setup instructions
- Troubleshooting guides`
    }
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(request: FlowRequest): string {
    return `
Task: ${request.task}

${request.context ? `Context: ${request.context}` : ''}

${request.requirements?.length ? `Requirements:
${request.requirements.map(req => `- ${req}`).join('\n')}` : ''}

${request.preferences ? `Preferences:
- Style: ${request.preferences.style || 'Not specified'}
- Language: ${request.preferences.language || 'Not specified'}
- Framework: ${request.preferences.framework || 'Not specified'}` : ''}

Please analyze this task and provide:
1. A clear understanding of what needs to be built
2. Key technical considerations and challenges
3. Recommended approach and architecture
4. Potential edge cases or constraints to consider
5. Success criteria for the implementation

Format your response as a structured analysis that will guide the implementation.
`.trim()
  }

  /**
   * Build code generation prompt
   */
  private buildCodeGenerationPrompt(request: FlowRequest, analysis?: string): string {
    return `
Based on the following analysis, generate the code implementation:

${analysis ? `ANALYSIS:
${analysis}

` : ''}TASK: ${request.task}

${request.context ? `CONTEXT: ${request.context}` : ''}

${request.preferences ? `PREFERENCES:
- Programming Language: ${request.preferences.language || 'JavaScript/TypeScript'}
- Style: ${request.preferences.style || 'Clean and maintainable'}
- Framework: ${request.preferences.framework || 'None specified'}` : ''}

Please provide:
1. Complete, working code implementation
2. Proper error handling and edge cases
3. Clear comments explaining complex logic
4. Imports and dependencies needed
5. Usage examples if applicable

Make the code production-ready and following best practices.
`.trim()
  }

  /**
   * Build code review prompt
   */
  private buildCodeReviewPrompt(request: FlowRequest, code?: string, analysis?: string): string {
    return `
Please review the following code implementation:

${analysis ? `ORIGINAL ANALYSIS:
${analysis}

` : ''}TASK: ${request.task}

CODE TO REVIEW:
${code}

Please provide a comprehensive code review covering:
1. Code quality and structure
2. Performance considerations
3. Security aspects
4. Error handling completeness
5. Adherence to best practices
6. Specific suggestions for improvement
7. Overall assessment and recommendations

Be constructive and specific in your feedback.
`.trim()
  }

  /**
   * Build test generation prompt
   */
  private buildTestGenerationPrompt(request: FlowRequest, code?: string): string {
    return `
Generate comprehensive tests for the following code:

TASK: ${request.task}

CODE:
${code}

Please provide:
1. Unit tests covering all major functions
2. Edge case testing
3. Error condition testing
4. Integration tests if applicable
5. Test setup and teardown code
6. Clear test descriptions

Use appropriate testing framework for the language and include assertions that verify correct behavior.
`.trim()
  }

  /**
   * Build documentation prompt
   */
  private buildDocumentationPrompt(request: FlowRequest, code?: string): string {
    return `
Create comprehensive documentation for the following code:

TASK: ${request.task}

CODE:
${code}

Please provide:
1. Overview and purpose
2. Installation/setup instructions
3. Usage examples
4. API documentation (if applicable)
5. Configuration options
6. Troubleshooting guide
7. Contributing guidelines (if applicable)

Make the documentation clear and accessible to both technical and non-technical users.
`.trim()
  }

  /**
   * Get appropriate temperature for each step
   */
  private getTemperatureForStep(stepName: string): number {
    const temperatures: Record<string, number> = {
      'analysis': 0.3,        // More focused analysis
      'code-generation': 0.2, // Precise code generation
      'code-review': 0.4,     // Balanced review
      'test-generation': 0.3, // Systematic test creation
      'documentation': 0.5,   // More creative documentation
    }

    return temperatures[stepName] || 0.3
  }

  /**
   * Get appropriate max tokens for each step
   */
  private getMaxTokensForStep(stepName: string): number {
    const maxTokens: Record<string, number> = {
      'analysis': 1500,
      'code-generation': 3000,
      'code-review': 2000,
      'test-generation': 2500,
      'documentation': 2000,
    }

    return maxTokens[stepName] || 2000
  }
} 