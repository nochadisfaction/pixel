/**
 * Claude Flow Demo
 * 
 * This demo shows how to use Claude Flow with both Ollama and Azure OpenAI providers.
 * Make sure to follow the setup instructions in docs/claude-flow-setup.md first.
 */

import { ClaudeFlow, ClaudeFlowUtils, LLMProviderFactory } from '../src/lib/claude-flow'

// Demo configuration
const DEMO_TASK = 'Create a TypeScript function that validates email addresses and returns detailed validation results'

async function demoOllamaSetup() {
  console.log('\n🦙 === Ollama Demo ===')
  
  try {
    // Validate Ollama setup
    console.log('🔍 Validating Ollama setup...')
    const validation = await ClaudeFlowUtils.validateOllamaSetup()
    
    if (!validation.isAvailable) {
      console.log('❌ Ollama is not available. Please follow these steps:')
      console.log(ClaudeFlowUtils.getOllamaSetupInstructions())
      return
    }
    
    console.log('✅ Ollama is available!')
    console.log('📋 Available models:', validation.availableModels)
    console.log('💡 Recommended models:', validation.recommendedModels)
    
    // Choose the best available model
    const recommendedModel = validation.availableModels.find(model => 
      validation.recommendedModels.includes(model)
    ) || validation.availableModels[0] || 'codellama:7b'
    
    console.log(`🎯 Using model: ${recommendedModel}`)
    
    // Create Claude Flow instance
    const flow = ClaudeFlow.withOllama(recommendedModel)
    
    // Quick code generation example
    console.log('\n📝 Quick code generation...')
    const quickCode = await flow.generateCode(
      'Create a simple TypeScript utility function that formats dates',
      'TypeScript'
    )
    console.log('Generated code:')
    console.log('```typescript')
    console.log(quickCode.substring(0, 500) + '...')
    console.log('```')
    
    // Full flow execution
    console.log('\n🔄 Full flow execution...')
    const response = await flow.execute({
      task: DEMO_TASK,
      requirements: [
        'Return detailed validation results',
        'Handle edge cases',
        'Include proper TypeScript types'
      ],
      preferences: {
        language: 'TypeScript',
        style: 'functional',
        framework: 'Node.js'
      }
    })
    
    console.log('\n📊 Flow Results:')
    console.log(`Provider: ${response.metadata.provider}`)
    console.log(`Model: ${response.metadata.model}`)
    console.log(`Tokens used: ${response.metadata.tokensUsed}`)
    console.log(`Execution time: ${response.metadata.executionTime}ms`)
    
    console.log('\n🔍 Analysis:')
    console.log(response.analysis.substring(0, 300) + '...')
    
    console.log('\n💻 Generated Code:')
    console.log('```typescript')
    console.log(response.code.substring(0, 500) + '...')
    console.log('```')
    
    console.log('\n🔎 Code Review:')
    console.log(response.review.substring(0, 300) + '...')
    
  } catch (error) {
    console.error('❌ Error in Ollama demo:', error.message)
  }
}

async function demoAzureOpenAI() {
  console.log('\n☁️ === Azure OpenAI Demo ===')
  
  try {
    // Check for required environment variables
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT
    const apiKey = process.env.AZURE_OPENAI_API_KEY
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    
    if (!endpoint || !apiKey || !deploymentName) {
      console.log('❌ Azure OpenAI environment variables not found. Please set:')
      console.log('- AZURE_OPENAI_ENDPOINT')
      console.log('- AZURE_OPENAI_API_KEY')
      console.log('- AZURE_OPENAI_DEPLOYMENT_NAME')
      console.log('\nSetup instructions:')
      console.log(ClaudeFlowUtils.getAzureOpenAISetupInstructions())
      return
    }
    
    // Validate Azure OpenAI setup
    console.log('🔍 Validating Azure OpenAI setup...')
    const validation = await ClaudeFlowUtils.validateAzureOpenAISetup(
      endpoint,
      apiKey,
      deploymentName
    )
    
    if (!validation.isAvailable) {
      console.log('❌ Azure OpenAI is not available. Check your configuration.')
      return
    }
    
    console.log('✅ Azure OpenAI is available!')
    console.log('📋 Model info:', validation.modelInfo)
    console.log('💡 Recommended models:', validation.recommendedModels)
    
    // Create Claude Flow instance
    const flow = ClaudeFlow.withAzureOpenAI(
      endpoint,
      apiKey,
      deploymentName,
      process.env.AZURE_OPENAI_MODEL || 'gpt-4'
    )
    
    // Quick analysis example
    console.log('\n🧠 Quick task analysis...')
    const analysis = await flow.analyzeTask(
      'Build a real-time notification system',
      'Using WebSockets and Redis for scalability',
      ['Support multiple clients', 'Handle disconnections', 'Persist notifications']
    )
    console.log('Analysis:')
    console.log(analysis.substring(0, 400) + '...')
    
    // Streaming example (commented out to avoid long output)
    console.log('\n🌊 Streaming example (first few chunks):')
    const stream = flow.executeStream({
      task: 'Create a simple authentication middleware',
      preferences: { language: 'TypeScript', framework: 'Express.js' }
    })
    
    let chunkCount = 0
    for await (const chunk of stream) {
      if (chunkCount < 5) {
        console.log(`Step: ${chunk.step}, Content: "${chunk.content.substring(0, 50)}..."`)
        chunkCount++
      } else {
        break
      }
    }
    
    // Full flow execution
    console.log('\n🔄 Full flow execution...')
    const response = await flow.execute({
      task: DEMO_TASK,
      requirements: [
        'Return detailed validation results',
        'Handle international email formats',
        'Include proper error messages'
      ],
      preferences: {
        language: 'TypeScript',
        style: 'object-oriented',
        framework: 'Node.js'
      }
    })
    
    console.log('\n📊 Flow Results:')
    console.log(`Provider: ${response.metadata.provider}`)
    console.log(`Model: ${response.metadata.model}`)
    console.log(`Tokens used: ${response.metadata.tokensUsed}`)
    console.log(`Execution time: ${response.metadata.executionTime}ms`)
    
    if (response.tests) {
      console.log('\n🧪 Generated Tests:')
      console.log(response.tests.substring(0, 300) + '...')
    }
    
    if (response.documentation) {
      console.log('\n📚 Generated Documentation:')
      console.log(response.documentation.substring(0, 300) + '...')
    }
    
  } catch (error) {
    console.error('❌ Error in Azure OpenAI demo:', error.message)
  }
}

async function demoMultiProvider() {
  console.log('\n🔄 === Multi-Provider Demo ===')
  
  try {
    // Create multiple providers
    const configs = [
      {
        provider: 'ollama' as const,
        model: 'codellama:7b',
        baseUrl: 'http://localhost:11434'
      }
    ]
    
    // Add Azure OpenAI if configured
    if (process.env.AZURE_OPENAI_ENDPOINT && 
        process.env.AZURE_OPENAI_API_KEY && 
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
      configs.push({
        provider: 'azure-openai' as const,
        model: process.env.AZURE_OPENAI_MODEL || 'gpt-4',
        baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        apiVersion: process.env.AZURE_OPENAI_API_VERSION
      })
    }
    
    const providers = LLMProviderFactory.createMultiple(configs)
    
    console.log('🏥 Health checking all providers...')
    const healthResults = await LLMProviderFactory.healthCheckAll(providers)
    
    for (const [key, isHealthy] of Object.entries(healthResults)) {
      console.log(`${isHealthy ? '✅' : '❌'} ${key}: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`)
    }
    
    // Test with environment auto-detection
    console.log('\n🎯 Testing environment auto-detection...')
    const autoFlow = ClaudeFlow.fromEnvironment()
    
    const simpleCode = await autoFlow.generateCode(
      'Create a utility function that debounces function calls',
      'TypeScript'
    )
    
    console.log('Auto-detected provider generated code:')
    console.log('```typescript')
    console.log(simpleCode.substring(0, 300) + '...')
    console.log('```')
    
  } catch (error) {
    console.error('❌ Error in multi-provider demo:', error.message)
  }
}

async function runDemo() {
  console.log('🚀 Claude Flow Demo - Multi-LLM Code Generation System')
  console.log('=' * 60)
  
  // Run demos in sequence
  await demoOllamaSetup()
  await demoAzureOpenAI()
  await demoMultiProvider()
  
  console.log('\n✨ Demo completed!')
  console.log('\n📖 Next steps:')
  console.log('1. Review the generated code in detail')
  console.log('2. Try different models and compare results')
  console.log('3. Customize prompts for your specific use cases')
  console.log('4. Integrate Claude Flow into your development workflow')
  console.log('\n📚 For more information, see docs/claude-flow-setup.md')
}

// Simple command-line interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  try {
    switch (command) {
      case 'ollama':
        await demoOllamaSetup()
        break
      case 'azure':
        await demoAzureOpenAI()
        break
      case 'multi':
        await demoMultiProvider()
        break
      case 'all':
      default:
        await runDemo()
        break
    }
  } catch (error) {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  }
}

// Export for use as module
export {
  demoOllamaSetup,
  demoAzureOpenAI,
  demoMultiProvider,
  runDemo
}

// Run if called directly
if (require.main === module) {
  main()
}

// Usage examples for reference:
/*
// Basic usage with Ollama
const flow = ClaudeFlow.withOllama('codellama:7b')
const code = await flow.generateCode('Create a REST API', 'TypeScript')

// Basic usage with Azure OpenAI
const flow = ClaudeFlow.withAzureOpenAI(
  'https://your-resource.openai.azure.com/',
  'your-api-key',
  'gpt-4-deployment'
)
const response = await flow.execute({
  task: 'Create a user management system',
  preferences: { language: 'TypeScript', framework: 'Express.js' }
})

// Environment-based auto-detection
const flow = ClaudeFlow.fromEnvironment()
const analysis = await flow.analyzeTask('Build a chat application')
*/ 