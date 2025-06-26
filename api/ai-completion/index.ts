import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { z } from "zod"

// Request validation schema
const CompletionRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(4096).optional(),
  provider: z.enum(['azure-openai', 'openai', 'anthropic']).optional()
})

interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface CompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: AIMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  try {
    // Validate request body
    const validationResult = CompletionRequestSchema.safeParse(req.body)
    if (!validationResult.success) {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: 'Invalid request body',
          details: validationResult.error.errors
        }
      }
      return
    }

    const { messages, model, temperature, max_tokens, provider } = validationResult.data
    const selectedProvider = provider || 'azure-openai'

    // Check if Azure OpenAI is configured
    if (selectedProvider === 'azure-openai') {
      if (!process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
        context.res = {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'Azure OpenAI service not configured'
          }
        }
        return
      }

      // Make request to Azure OpenAI
      const azureResponse = await callAzureOpenAI(messages, {
        model: model || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1024
      })

      context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: azureResponse
      }
    } else {
      context.res = {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: {
          error: `Provider ${selectedProvider} not implemented in Azure Functions`
        }
      }
    }

  } catch (error) {
    context.log.error('AI completion error:', error)
    
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

async function callAzureOpenAI(messages: AIMessage[], options: {
  model: string
  temperature: number
  max_tokens: number
}): Promise<CompletionResponse> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!
  const apiKey = process.env.AZURE_OPENAI_API_KEY!
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01'
  const deploymentName = options.model

  const url = `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Azure OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  return await response.json()
}

export default httpTrigger
