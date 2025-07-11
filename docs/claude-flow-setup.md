# Claude Flow Setup Guide

Claude Flow is a flexible code generation system that can work with both **Ollama** (local development) and **Azure OpenAI** (production) backends. This guide will help you set up both configurations.

## Quick Start

### Option 1: Ollama (Local Development)

```bash
# 1. Install and start Ollama
ollama pull codellama:7b
ollama serve

# 2. Use in your code
import { ClaudeFlow } from './src/lib/claude-flow'

const flow = ClaudeFlow.withOllama('codellama:7b')
const code = await flow.generateCode('Create a REST API endpoint', 'TypeScript')
```

### Option 2: Azure OpenAI (Production)

```bash
# 1. Set environment variables
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_API_KEY="your-api-key"
export AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4-deployment"

# 2. Use in your code
import { ClaudeFlow } from './src/lib/claude-flow'

const flow = ClaudeFlow.fromEnvironment() // Auto-detects Azure config
const code = await flow.generateCode('Create a REST API endpoint', 'TypeScript')
```

## Detailed Setup Instructions

### Ollama Setup (Recommended for Development)

#### 1. Install Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download the installer from https://ollama.ai

#### 2. Start Ollama Service

```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

#### 3. Pull Recommended Models

```bash
# Best for code generation (recommended)
ollama pull codellama:7b

# Good general purpose model
ollama pull mistral:7b

# High-quality but resource intensive
ollama pull mixtral:8x7b

# Specialized coding model
ollama pull deepseek-coder:6.7b
```

#### 4. Verify Installation

```bash
ollama list
```

Should show your installed models.

#### 5. Test with Claude Flow

```typescript
import { ClaudeFlow, ClaudeFlowUtils } from './src/lib/claude-flow'

// Validate setup
const validation = await ClaudeFlowUtils.validateOllamaSetup()
console.log('Ollama available:', validation.isAvailable)
console.log('Available models:', validation.availableModels)

// Use Claude Flow
const flow = ClaudeFlow.withOllama('codellama:7b')

const response = await flow.execute({
  task: 'Create a TypeScript function that validates email addresses',
  preferences: {
    language: 'TypeScript',
    style: 'functional'
  }
})

console.log('Generated code:', response.code)
console.log('Code review:', response.review)
```

### Azure OpenAI Setup (Recommended for Production)

#### 1. Create Azure OpenAI Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Azure OpenAI"
4. Click "Create"
5. Fill in:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: Create new or use existing
   - **Region**: Choose supported region (e.g., East US, West Europe)
   - **Name**: Unique name for your resource
   - **Pricing Tier**: Standard S0

#### 2. Deploy a Model

1. Go to [Azure OpenAI Studio](https://oai.azure.com)
2. Select your resource
3. Navigate to "Deployments" → "Create new deployment"
4. Choose a model:
   - **GPT-4**: Best quality, higher cost
   - **GPT-4 Turbo**: Fast and high quality
   - **GPT-3.5-turbo**: Fast and cost-effective
5. Give your deployment a name (e.g., "gpt-4-deployment")

#### 3. Get Configuration Values

In the Azure Portal, go to your OpenAI resource:

1. **Endpoint**: Found in "Keys and Endpoint" section
   - Example: `https://your-resource.openai.azure.com/`
2. **API Key**: Found in "Keys and Endpoint" section
   - Copy either Key 1 or Key 2
3. **Deployment Name**: The name you gave your model deployment

#### 4. Set Environment Variables

Create a `.env` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-deployment
AZURE_OPENAI_MODEL=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

#### 5. Test with Claude Flow

```typescript
import { ClaudeFlow, ClaudeFlowUtils } from './src/lib/claude-flow'

// Validate setup
const validation = await ClaudeFlowUtils.validateAzureOpenAISetup(
  process.env.AZURE_OPENAI_ENDPOINT!,
  process.env.AZURE_OPENAI_API_KEY!,
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME!
)
console.log('Azure OpenAI available:', validation.isAvailable)

// Use Claude Flow
const flow = ClaudeFlow.withAzureOpenAI(
  process.env.AZURE_OPENAI_ENDPOINT!,
  process.env.AZURE_OPENAI_API_KEY!,
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
  'gpt-4'
)

const response = await flow.execute({
  task: 'Create a secure authentication system',
  requirements: [
    'Use JWT tokens',
    'Include password hashing',
    'Add rate limiting'
  ],
  preferences: {
    language: 'TypeScript',
    framework: 'Express.js'
  }
})

console.log('Analysis:', response.analysis)
console.log('Code:', response.code)
console.log('Review:', response.review)
console.log('Tests:', response.tests)
```

## Configuration Options

### Environment-Based Configuration

Create a `.env` file with both providers:

```bash
# Ollama (local development)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=codellama:7b

# Azure OpenAI (production)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4-deployment
AZURE_OPENAI_MODEL=gpt-4

# Auto-detection will prefer Azure OpenAI if configured
const flow = ClaudeFlow.fromEnvironment()
```

### Manual Configuration

```typescript
import { ClaudeFlow, LLMProviderFactory } from './src/lib/claude-flow'

// Multiple providers
const providers = LLMProviderFactory.createMultiple([
  {
    provider: 'ollama',
    model: 'codellama:7b',
    baseUrl: 'http://localhost:11434'
  },
  {
    provider: 'azure-openai',
    model: 'gpt-4',
    baseUrl: process.env.AZURE_OPENAI_ENDPOINT!,
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!
  }
])

// Health check all providers
const healthResults = await LLMProviderFactory.healthCheckAll(providers)
console.log('Provider health:', healthResults)
```

## Usage Examples

### Simple Code Generation

```typescript
const flow = ClaudeFlow.withOllama()

// Quick code generation
const code = await flow.generateCode(
  'Create a TypeScript class for user management',
  'TypeScript'
)

// Just analysis
const analysis = await flow.analyzeTask(
  'Build a real-time chat application',
  'Using WebSockets and Redis'
)

// Code review
const review = await flow.reviewCode(
  'function add(a, b) { return a + b }',
  'Simple addition function'
)
```

### Complete Flow Execution

```typescript
const response = await flow.execute({
  task: 'Create a REST API for a blog system',
  context: 'The API should handle posts, comments, and user authentication',
  requirements: [
    'CRUD operations for posts',
    'Nested comments',
    'JWT authentication',
    'Input validation',
    'Error handling'
  ],
  preferences: {
    language: 'TypeScript',
    framework: 'Express.js',
    style: 'object-oriented'
  }
})

// Access different parts of the response
console.log('Analysis:', response.analysis)
console.log('Generated Code:', response.code)
console.log('Code Review:', response.review)
console.log('Tests:', response.tests)
console.log('Documentation:', response.documentation)

// Metadata
console.log('Provider used:', response.metadata.provider)
console.log('Tokens used:', response.metadata.tokensUsed)
console.log('Execution time:', response.metadata.executionTime, 'ms')
```

### Streaming Responses

```typescript
const stream = flow.executeStream({
  task: 'Create a web scraper',
  preferences: { language: 'Python' }
})

for await (const chunk of stream) {
  console.log(`Step: ${chunk.step}`)
  console.log(`Content: ${chunk.content}`)
  console.log(`Complete: ${chunk.isComplete}`)
}
```

## Model Recommendations

### Ollama Models

| Model | Size | Use Case | Context Length |
|-------|------|----------|----------------|
| `codellama:7b` | 4.1 GB | Code generation (recommended) | 16K |
| `codellama:13b` | 7.4 GB | Better code quality | 16K |
| `mistral:7b` | 4.1 GB | General purpose | 8K |
| `mixtral:8x7b` | 26 GB | High quality (needs 32GB+ RAM) | 32K |
| `deepseek-coder:6.7b` | 3.8 GB | Specialized coding | 16K |

### Azure OpenAI Models

| Model | Context Length | Cost (per 1K tokens) | Use Case |
|-------|----------------|---------------------|----------|
| `gpt-4` | 8K | ~$0.03 | Highest quality |
| `gpt-4-32k` | 32K | ~$0.06 | Large context |
| `gpt-4-turbo` | 128K | ~$0.01 | Fast + large context |
| `gpt-35-turbo` | 16K | ~$0.002 | Fast + cost-effective |

## Troubleshooting

### Ollama Issues

**"Connection refused" error:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

**Model not found:**
```bash
# List available models
ollama list

# Pull the required model
ollama pull codellama:7b
```

**Performance issues:**
- Use smaller models (7B instead of 70B)
- Ensure sufficient RAM (8GB+ for 7B models)
- Close other applications

### Azure OpenAI Issues

**Authentication errors:**
- Verify endpoint URL ends with `/`
- Check API key is correct
- Ensure deployment name matches exactly

**Rate limiting:**
- Azure OpenAI has rate limits per subscription
- Consider upgrading to higher tier
- Implement retry logic with exponential backoff

**Model not available:**
- Check if your region supports the model
- Try different deployment name
- Verify model is properly deployed

### General Issues

**Build/Import errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or with pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**TypeScript errors:**
- Ensure all dependencies are installed
- Check that your `tsconfig.json` includes the claude-flow directory
- Verify environment variables are properly typed

## Next Steps

1. **Start with Ollama** for local development and testing
2. **Set up Azure OpenAI** for production deployment
3. **Experiment with different models** to find the best fit
4. **Customize the flow engine** for your specific use cases
5. **Add custom prompts** for domain-specific code generation

For advanced usage and customization, see the [Claude Flow API Documentation](./claude-flow-api.md). 