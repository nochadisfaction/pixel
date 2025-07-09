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
  jobId?: string
  status?: JobStatus
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

import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  points: 60, // 60 requests
  duration: 60, // per 60 seconds
});

async function checkRateLimit(
  identifier: string,
): Promise<void> {
  try {
    await rateLimiter.consume(identifier);
  } catch (error) {
    throw new Error('Rate Limit Exceeded');
  }
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

import { performanceMonitor } from '../../../lib/ai/bias-detection/performance-monitor';

import { BiasDetectionEngine } from '../../../lib/ai/bias-detection/BiasDetectionEngine';

const biasDetectionEngine = new BiasDetectionEngine();
biasDetectionEngine.initialize();

import { jobQueue, JobStatus } from '../../../lib/jobs/queue';

export const POST: APIRoute = async ({ request }: { request: Request }) => {
  const startTime = Date.now();
  let user: UserContext | null = null;
  let sessionId: string | undefined;
  let status = 500;
  let jobId: string | undefined;

  try {
    user = await authenticateRequest(request);
    if (!user) {
      status = 401;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          message: 'Valid authorization token required',
        } as AnalyzeSessionResponse),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
          },
        },
      );
    }

    if (!hasPermission(user, 'bias-analysis', 'write')) {
      status = 403;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions for bias analysis',
        } as AnalyzeSessionResponse),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    try {
      await checkRateLimit(user.userId);
    } catch (error) {
      status = 429;
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.',
        } as AnalyzeSessionResponse),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        },
      );
    }

    let requestBody: AnalyzeSessionRequest;
    try {
      const rawBody = await request.json();
      requestBody = AnalyzeSessionRequestSchema.parse(rawBody);
      sessionId = requestBody.session.sessionId;
    } catch (error) {
      status = 400;
      logger.warn('Invalid request body', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Bad Request',
          message: 'Invalid request format or missing required fields',
          processingTime: Date.now() - startTime,
          cacheHit: false,
        } as AnalyzeSessionResponse),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    logger.info('Bias analysis job enqueued', {
      sessionId,
      userId: user.userId,
      session: sanitizeSessionForLogging(requestBody.session),
    });

    // Enqueue the analysis as a background job
    const job = await jobQueue.enqueue(
      'bias-analysis-batch',
      { 
        sessions: [requestBody.session], // Enqueue as a batch of one for now
        user,
        request: {
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      },
      { metadata: { sessionId, userId: user.userId } }
    );
    jobId = job.id;

    const processingTime = Date.now() - startTime;
    status = 202; // Accepted for processing
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Analysis job submitted',
        jobId: job.id,
        status: JobStatus.PENDING,
        processingTime,
      } as AnalyzeSessionResponse),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Bias analysis request failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId,
      userId: user?.userId,
      processingTime,
      jobId,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to submit analysis job',
        processingTime,
        cacheHit: false,
      } as AnalyzeSessionResponse),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } finally {
    performanceMonitor.recordRequestTiming(
      '/api/bias-detection/analyze',
      'POST',
      Date.now() - startTime,
      status,
    );
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
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
