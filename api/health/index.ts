import { AzureFunction, Context, HttpRequest } from '@azure/functions'

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  services: {
    [key: string]: {
      status: 'healthy' | 'unhealthy' | 'degraded'
      responseTime?: number
      error?: string
    }
  }
}

const httpTrigger: AzureFunction = async function (
  context: Context,
  _req: HttpRequest,
): Promise<void> {
  const startTime = Date.now()

  try {
    const healthCheck: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] || '1.0.0',
      services: {},
    }

    // Check Azure OpenAI service
    if (process.env['AZURE_OPENAI_API_KEY'] && process.env['AZURE_OPENAI_ENDPOINT']) {
      try {
        const azureOpenAIStart = Date.now()
        const response = await fetch(
          `${process.env['AZURE_OPENAI_ENDPOINT']}/openai/models?api-version=${process.env['AZURE_OPENAI_API_VERSION'] || '2024-02-01'}`,
          {
            method: 'GET',
            headers: {
              'api-key': process.env['AZURE_OPENAI_API_KEY'],
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          },
        )

        healthCheck.services['azureOpenAI'] = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - azureOpenAIStart,
        }

        if (!response.ok) {
          healthCheck.status = 'degraded'
        }
      } catch (error) {
        healthCheck.services['azureOpenAI'] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        healthCheck.status = 'degraded'
      }
    } else {
      healthCheck.services['azureOpenAI'] = {
        status: 'degraded',
        error: 'Azure OpenAI not configured',
      }
    }

    // Check Supabase connection
    if (process.env['SUPABASE_URL'] && process.env['SUPABASE_ANON_KEY']) {
      try {
        const supabaseStart = Date.now()
        const response = await fetch(`${process.env['SUPABASE_URL']}/rest/v1/`, {
          method: 'GET',
          headers: {
            apikey: process.env['SUPABASE_ANON_KEY'],
            Authorization: `Bearer ${process.env['SUPABASE_ANON_KEY']}`,
          },
          signal: AbortSignal.timeout(5000),
        })

        healthCheck.services['supabase'] = {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - supabaseStart,
        }

        if (!response.ok) {
          healthCheck.status = 'degraded'
        }
      } catch (error) {
        healthCheck.services['supabase'] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        healthCheck.status = 'degraded'
      }
    } else {
      healthCheck.services['supabase'] = {
        status: 'degraded',
        error: 'Supabase not configured',
      }
    }

    // Check Azure Storage
    if (process.env['AZURE_STORAGE_CONNECTION_STRING']) {
      try {
        const { BlobServiceClient } = await import('@azure/storage-blob')
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          process.env['AZURE_STORAGE_CONNECTION_STRING'],
        )

        const storageStart = Date.now()
        const _properties = await blobServiceClient.getProperties()

        healthCheck.services['azureStorage'] = {
          status: 'healthy',
          responseTime: Date.now() - storageStart,
        }
      } catch (error) {
        healthCheck.services['azureStorage'] = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
        healthCheck.status = 'degraded'
      }
    } else {
      healthCheck.services['azureStorage'] = {
        status: 'degraded',
        error: 'Azure Storage not configured',
      }
    }

    // Add overall response time
    const totalResponseTime = Date.now() - startTime

    context.res = {
      status:
        healthCheck.status === 'healthy'
          ? 200
          : healthCheck.status === 'degraded'
            ? 207
            : 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${totalResponseTime}ms`,
      },
      body: {
        ...healthCheck,
        responseTime: totalResponseTime,
      },
    }
  } catch (error) {
    context.log.error('Health check failed:', error)

    context.res = {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      },
    }
  }
}

export default httpTrigger
