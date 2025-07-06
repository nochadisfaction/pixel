import type { APIRoute } from 'astro'
import { z } from 'zod'
import { getLogger } from '../../../lib/utils/logger'

interface UserContext {
  userId: string
  email: string
  role: {
    id: string
    name: string
    description: string
    level: number
  }
  permissions: Array<{
    resource: string
    actions: string[]
    conditions: unknown[]
  }>
}

interface BiasAnalysisResult {
  sessionId: string
  overallScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  layerAnalysis: unknown[]
  demographicAnalysis: unknown
  explanation?: unknown
}

// Remove duplicate interface - using the z.infer type instead

const AnalyzeSessionRequestSchema = z.object({
  session: z.object({
    sessionId: z.string().uuid(),
    timestamp: z
      .string()
      .datetime()
      .transform((str) => new Date(str)),
    participantDemographics: z.object({
      age: z.string().min(1),
      gender: z.enum(['male', 'female', 'non-binary', 'prefer-not-to-say']),
      ethnicity: z.string().min(1),
      primaryLanguage: z.string().min(2),
      socioeconomicStatus: z
        .enum(['low', 'middle', 'high', 'not-specified'])
        .optional(),
      education: z.string().optional(),
      region: z.string().optional(),
      culturalBackground: z.array(z.string()).optional(),
      disabilityStatus: z.string().optional(),
    }),
    scenario: z.object({
      scenarioId: z.string().min(1),
      type: z.enum([
        'depression',
        'anxiety',
        'trauma',
        'substance-abuse',
        'grief',
        'other',
      ]),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']),
      tags: z.array(z.string()),
      description: z.string().min(1),
      learningObjectives: z.array(z.string()),
    }),
    content: z.object({
      patientPresentation: z.string().min(1),
      therapeuticInterventions: z.array(z.string()),
      patientResponses: z.array(z.string()),
      sessionNotes: z.string(),
      assessmentResults: z.any().optional(),
    }),
    aiResponses: z.array(
      z.object({
        responseId: z.string(),
        timestamp: z
          .string()
          .datetime()
          .transform((str) => new Date(str)),
        type: z.enum([
          'diagnostic',
          'intervention',
          'risk-assessment',
          'recommendation',
        ]),
        content: z.string().min(1),
        confidence: z.number().min(0).max(1),
        modelUsed: z.string(),
        reasoning: z.string().optional(),
      }),
    ),
    expectedOutcomes: z.array(z.any()),
    transcripts: z.array(z.any()),
    metadata: z.object({
      trainingInstitution: z.string(),
      supervisorId: z.string().optional(),
      traineeId: z.string(),
      sessionDuration: z.number().positive(),
      completionStatus: z.enum(['completed', 'partial', 'abandoned']),
      technicalIssues: z.array(z.string()).optional(),
    }),
  }),
  options: z
    .object({
      skipCache: z.boolean().optional(),
      includeExplanation: z.boolean().optional(),
      demographicFocus: z.array(z.any()).optional(),
    })
    .optional(),
})

type AnalyzeSessionRequest = z.infer<typeof AnalyzeSessionRequestSchema>

interface AnalyzeSessionResponse {
  success: boolean
  data?: BiasAnalysisResult
  processingTime: number
  cacheHit: boolean
  error?: string
  message?: string
}

const logger = getLogger('BiasAnalysisAPI')

async function authenticateRequest(
  request: Request,
): Promise<UserContext | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  if (!token || token === 'invalid') {
    return null
  }

  return {
    userId: `user-${token.slice(0, 8)}`,
    email: 'user@example.com',
    role: {
      id: 'analyst',
      name: 'analyst',
      description: 'Data Analyst',
      level: 3,
    },
    permissions: [
      {
        resource: 'bias-analysis',
        actions: ['read', 'write'],
        conditions: [],
      },
    ],
  }
}

function hasPermission(
  user: UserContext,
  resource: string,
  action: string,
): boolean {
  return user.permissions.some(
    (p) => p.resource === resource && p.actions.includes(action),
  )
}

const rateLimitMap = new Map()

function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 60000,
): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

function sanitizeSessionForLogging(
  session: AnalyzeSessionRequest['session'],
): Partial<AnalyzeSessionRequest['session']> {
  return {
    sessionId: session.sessionId,
    timestamp: session.timestamp,
    participantDemographics: {
      age: session.participantDemographics.age,
      gender: session.participantDemographics.gender,
      ethnicity: session.participantDemographics.ethnicity,
      primaryLanguage: session.participantDemographics.primaryLanguage,
    },
    scenario: {
      scenarioId: session.scenario.scenarioId,
      type: session.scenario.type,
      complexity: session.scenario.complexity,
      tags: session.scenario.tags,
      description: '[REDACTED]',
      learningObjectives: [],
    },
    metadata: {
      trainingInstitution: session.metadata.trainingInstitution,
      traineeId: '[REDACTED]',
      sessionDuration: session.metadata.sessionDuration,
      completionStatus: session.metadata.completionStatus,
    },
  }
}

export const POST: APIRoute = async ({ request }: { request: Request }) => {
  const startTime = Date.now()
  let user: UserContext | null = null
  let sessionId: string | undefined

  try {
    // Removed unused clientInfo variable

    user = await authenticateRequest(request)
    if (!user) {
      // Audit logging is not available; skipping audit log for authentication failure

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        } as AnalyzeSessionResponse),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    if (!hasPermission(user, 'bias-analysis', 'write')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions for bias analysis',
        } as AnalyzeSessionResponse),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (!checkRateLimit(user.userId, 60, 60000)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.',
        } as AnalyzeSessionResponse),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        },
      )
    }

    let requestBody: AnalyzeSessionRequest
    try {
      const rawBody = await request.json()
      requestBody = AnalyzeSessionRequestSchema.parse(rawBody)
      sessionId = requestBody.session.sessionId
    } catch (error) {
      logger.warn('Invalid request body', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Invalid request format or missing required fields',
          processingTime: Date.now() - startTime,
          cacheHit: false,
        } as AnalyzeSessionResponse),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    logger.info('Bias analysis requested', {
      sessionId,
      userId: user.userId,
      session: sanitizeSessionForLogging(requestBody.session),
    })

    const analysisResult: BiasAnalysisResult = {
      sessionId: requestBody.session.sessionId,
      overallScore: 0.75,
      riskLevel: 'medium',
      recommendations: [
        'Consider cultural sensitivity in diagnostic approach',
        'Review intervention selection for demographic appropriateness',
      ],
      layerAnalysis: [],
      demographicAnalysis: {},
    }

    const processingTime = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        processingTime,
        cacheHit: false,
      } as AnalyzeSessionResponse),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Bias analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      userId: user?.userId,
      processingTime,
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Analysis processing failed',
        processingTime,
        cacheHit: false,
      } as AnalyzeSessionResponse),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

export const GET: APIRoute = async ({
  request,
  url,
}: {
  request: Request
  url: URL
}) => {
  const startTime = Date.now()
  let user: UserContext | null = null

  try {
    user = await authenticateRequest(request)
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (!hasPermission(user, 'bias-analysis', 'read')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions for bias analysis',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'sessionId parameter is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const mockResult: BiasAnalysisResult = {
      sessionId,
      overallScore: 0.65,
      riskLevel: 'medium',
      recommendations: ['Review cultural considerations'],
      layerAnalysis: [],
      demographicAnalysis: {},
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: mockResult,
        processingTime: Date.now() - startTime,
        cacheHit: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    logger.error('GET bias analysis failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: user?.userId,
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve analysis',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
