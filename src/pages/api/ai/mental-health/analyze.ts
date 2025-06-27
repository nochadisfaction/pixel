import type { APIRoute } from 'astro'
import { createMentalLLaMAFromEnv } from '../../../../lib/ai/mental-llama'
import { createLogger } from '@utils/logger'

const logger = createLogger({ context: 'MentalHealthAnalysisAPI' })

// Cache for the MentalLLaMA instance
let mentalLLaMAInstanceCache: Awaited<
  ReturnType<typeof createMentalLLaMAFromEnv>
> | null = null

async function getInitializedMentalLLaMA() {
  if (!mentalLLaMAInstanceCache) {
    logger.info('MentalLLaMA instance not cached, creating and caching...')
    try {
      mentalLLaMAInstanceCache = await createMentalLLaMAFromEnv()
      logger.info('MentalLLaMA instance created and cached successfully.')
    } catch (error) {
      logger.error('Failed to create MentalLLaMA instance for cache', { error })
      // Throw the error so the request fails, or handle by returning null/throwing specific error
      // For now, rethrow to make it explicit that initialization failed.
      throw error
    }
  } else {
    logger.info('Using cached MentalLLaMA instance.')
  }
  return mentalLLaMAInstanceCache
}

/**
 * Mental Health Analysis API
 *
 * This endpoint analyzes text for mental health indicators using MentalLLaMA.
 * It supports both the 7B and 13B models, prioritizing the latter when available.
 *
 * Request body:
 * {
 *   "text": "Text to analyze for mental health indicators",
 *   "useExpertGuidance": true  // Optional, defaults to true
 * }
 *
 * Response:
 * {
 *   "hasMentalHealthIssue": boolean,
 *   "mentalHealthCategory": string,
 *   "explanation": string,
 *   "confidence": number,
 *   "supportingEvidence": string[],
 *   "expertGuided": boolean,   // If expert guidance was used
 *   "modelInfo": {
 *     "directModelAvailable": boolean,
 *     "modelTier": "7B" | "13B"
 *   }
 * }
 */
export const POST: APIRoute = async ({ request }) => {
  const overallStartTime = Date.now()
  let timing = {
    requestParsingMs: -1,
    factoryCreationMs: -1,
    analysisMs: -1,
    totalMs: -1,
  }
  
  let requestBody: unknown = null
  let text = ''

  try {
    let startTime = Date.now()
    // Parse request body
    requestBody = await request.json()
    timing.requestParsingMs = Date.now() - startTime

    // Type assertion and validation
    if (
      !requestBody ||
      typeof requestBody !== 'object' ||
      !('text' in requestBody) ||
      typeof (requestBody as { text: unknown }).text !== 'string'
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid request. Please provide a "text" field with the content to analyze.',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Now we can safely cast since we've validated the structure
    const validatedBody = requestBody as { text: string; useExpertGuidance?: boolean }

    // Sanitize text (basic sanitization)
    text = validatedBody.text.trim().substring(0, 2000) // Limit to 2000 chars

    // Get useExpertGuidance parameter
    const useExpertGuidance = validatedBody.useExpertGuidance !== false // Default to true

    logger.info('Analyzing text for mental health indicators', {
      textLength: text.length,
      useExpertGuidance,
    })

    startTime = Date.now()
    // Create the MentalLLaMA adapter
    const { adapter, modelProvider } = await getInitializedMentalLLaMA()
    timing.factoryCreationMs = Date.now() - startTime

    // Check if direct model integration is available
    const directModelAvailable = !!modelProvider

    logger.info('MentalLLaMA configuration', {
      directModelAvailable,
    })

    startTime = Date.now()
    // Analyze the text with or without expert guidance based on the parameter
    const analysis = useExpertGuidance
      ? await adapter.analyzeMentalHealthWithExpertGuidance(text)
      : await adapter.analyzeMentalHealth(text)
    timing.analysisMs = Date.now() - startTime

    // Build response
    const response = {
      ...analysis,
      modelInfo: {
        directModelAvailable,
        modelTier: 'unknown',
      },
    }

    timing.totalMs = Date.now() - overallStartTime
    logger.info('Mental health analysis complete', {
      timing,
      textLength: text.length,
      modelTier: response.modelInfo.modelTier,
      useExpertGuidance,
    })

    // Return the analysis results
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    timing.totalMs = Date.now() - overallStartTime
    logger.error('Error analyzing mental health', {
      error,
      timing,
      textLength: text.length,
    })

    return new Response(
      JSON.stringify({
        error: 'An error occurred while analyzing the text',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  }
}

/**
 * Provide proper response for OPTIONS requests (CORS preflight)
 */
export const options: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
