import { BiasDetectionEngine } from '@/lib/ai/bias-detection'
import { getLogger } from '@/lib/utils/logger'
import type { BiasDashboardData } from '@/lib/ai/bias-detection'

const logger = getLogger('BiasDashboardAPI')

// Define proper types based on Astro 5 API structure
type AstroAPIContext = {
  request: Request
  cookies: unknown
  url: URL
  params: Record<string, string | undefined>
  site?: URL
  generator: string
}

type APIRoute = (context: AstroAPIContext) => Response | Promise<Response>

// Singleton instance for production use
let biasEngineInstance: BiasDetectionEngine | null = null

async function getBiasEngine(): Promise<BiasDetectionEngine> {
  if (!biasEngineInstance) {
    biasEngineInstance = new BiasDetectionEngine({
      thresholds: {
        warningLevel: 0.3,
        highLevel: 0.6,
        criticalLevel: 0.8,
      },
      hipaaCompliant: true,
      auditLogging: true,
    })
    await biasEngineInstance.initialize()
  }
  return biasEngineInstance
}

export const GET: APIRoute = async (context: AstroAPIContext) => {
  const startTime = Date.now()
  
  try {
    const { request } = context
    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '24h'
    const demographicFilter = url.searchParams.get('demographic') || 'all'
    const includeDetails = url.searchParams.get('includeDetails') === 'true'

    logger.info('Fetching bias detection dashboard data', {
      timeRange,
      demographicFilter,
      includeDetails,
    })

    // Get initialized bias detection engine
    const biasEngine = await getBiasEngine()

    // Fetch real dashboard data from the engine
    const dashboardData: BiasDashboardData = await biasEngine.getDashboardData({
      timeRange,
      includeDetails,
    })

    const processingTime = Date.now() - startTime
    
    logger.info('Dashboard data retrieved successfully', {
      timeRange,
      processingTimeMs: processingTime,
      totalSessions: dashboardData.summary.totalSessions,
      alertCount: dashboardData.alerts.length,
    })

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        'X-Processing-Time': processingTime.toString(),
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    
    logger.error('Failed to fetch bias detection dashboard data', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      processingTimeMs: processingTime,
    })

    // Return appropriate error response based on error type
    const statusCode = error instanceof Error && error.message.includes('not initialized') ? 503 : 500
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch dashboard data',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        processingTime,
      }),
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Processing-Time': processingTime.toString(),
        },
      },
    )
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  if (biasEngineInstance) {
    logger.info('Shutting down bias detection engine...')
    await biasEngineInstance.dispose()
    biasEngineInstance = null
  }
})

process.on('SIGINT', async () => {
  if (biasEngineInstance) {
    logger.info('Shutting down bias detection engine...')
    await biasEngineInstance.dispose()
    biasEngineInstance = null
  }
})
