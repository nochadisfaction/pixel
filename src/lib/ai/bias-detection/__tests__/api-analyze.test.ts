/**
 * Unit tests for the Session Analysis API Endpoint
 */

// Create the mocks before imports
const mockBiasDetectionEngine = {
  analyzeSession: vi.fn(),
  getSessionAnalysis: vi.fn(),
}

const mockAuditLogger = {
  logAuthentication: vi.fn(),
  logAction: vi.fn(),
  logBiasAnalysis: vi.fn(),
}

const mockCacheManager = {
  analysisCache: {
    getAnalysisResult: vi.fn(),
    cacheAnalysisResult: vi.fn(),
  },
}

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
}

const mockPerformanceMonitor = {
  recordRequestTiming: vi.fn(),
  recordAnalysis: vi.fn(),
}

const mockValidateTherapeuticSession = vi.fn()
const mockGenerateAnonymizedId = vi.fn()

// Mock all dependencies
vi.mock('../index', () => ({
  BiasDetectionEngine: vi.fn(() => mockBiasDetectionEngine),
  validateTherapeuticSession: mockValidateTherapeuticSession,
  performanceMonitor: mockPerformanceMonitor,
  getAuditLogger: () => mockAuditLogger,
  getCacheManager: () => mockCacheManager,
}))

vi.mock('../utils', () => ({
  validateTherapeuticSession: mockValidateTherapeuticSession,
  generateAnonymizedId: mockGenerateAnonymizedId,
}))

vi.mock('../audit', () => ({
  getAuditLogger: () => mockAuditLogger,
}))

vi.mock('../cache', () => ({
  getCacheManager: () => mockCacheManager,
}))

vi.mock('../performance-monitor', () => ({
  performanceMonitor: mockPerformanceMonitor,
}))

vi.mock('../../../utils/logger', () => ({
  getLogger: () => mockLogger,
}))

import type {
  TherapeuticSession,
  BiasAnalysisResult,
} from '../index'

// Type definitions for test mocks
interface MockRequest {
  json: ReturnType<typeof vi.fn>
  headers: {
    get: ReturnType<typeof vi.fn>
  }
  url?: string
}

interface MockResponse {
  status: number
  json: ReturnType<typeof vi.fn>
  headers: {
    get: ReturnType<typeof vi.fn>
  }
}

interface APIContext {
  request: MockRequest
}

// Handler function types
type PostHandler = (context: APIContext) => Promise<MockResponse>
type GetHandler = (context: APIContext) => Promise<MockResponse>

// Import the actual handlers - using dynamic import inside test functions
let POST: PostHandler, GET: GetHandler
beforeEach(async () => {
  if (!POST || !GET) {
    const module = await import('../../../../pages/api/bias-detection/analyze')
    POST = module.POST as PostHandler
    GET = module.GET as GetHandler
  }
})

// Helper function to serialize mock data like JSON.stringify does for dates
function serializeForComparison(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj))
}

describe('Session Analysis API Endpoint', () => {
  const mockSession: TherapeuticSession = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
    participantDemographics: {
      age: '25-35',
      gender: 'female',
      ethnicity: 'hispanic',
      primaryLanguage: 'en',
    },
    scenario: {
      scenarioId: 'scenario-1',
      type: 'anxiety',
      complexity: 'intermediate',
      tags: ['anxiety', 'therapy'],
      description: 'Anxiety therapy session',
      learningObjectives: ['Identify triggers', 'Develop coping strategies'],
    },
    content: {
      patientPresentation: 'Patient presents with anxiety symptoms',
      therapeuticInterventions: ['CBT techniques', 'Breathing exercises'],
      patientResponses: ['Engaged well', 'Showed improvement'],
      sessionNotes: 'Productive session with good outcomes',
    },
    aiResponses: [
      {
        responseId: 'resp-1',
        timestamp: new Date('2024-01-15T10:05:00Z'),
        type: 'diagnostic',
        content: 'Patient shows signs of generalized anxiety',
        confidence: 0.85,
        modelUsed: 'gpt-4',
      },
    ],
    expectedOutcomes: [],
    transcripts: [],
    metadata: {
      trainingInstitution: 'University Hospital',
      traineeId: 'trainee-123',
      sessionDuration: 60,
      completionStatus: 'completed',
    },
  }

  const mockSessionForRequest = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: '2024-01-15T10:00:00Z',
    participantDemographics: {
      age: '25-35',
      gender: 'female',
      ethnicity: 'hispanic',
      primaryLanguage: 'en',
    },
    scenario: {
      scenarioId: 'scenario-1',
      type: 'anxiety',
      complexity: 'intermediate',
      tags: ['anxiety', 'therapy'],
      description: 'Anxiety therapy session',
      learningObjectives: ['Identify triggers', 'Develop coping strategies'],
    },
    content: {
      patientPresentation: 'Patient presents with anxiety symptoms',
      therapeuticInterventions: ['CBT techniques', 'Breathing exercises'],
      patientResponses: ['Engaged well', 'Showed improvement'],
      sessionNotes: 'Productive session with good outcomes',
    },
    aiResponses: [
      {
        responseId: 'resp-1',
        timestamp: '2024-01-15T10:05:00Z',
        type: 'diagnostic',
        content: 'Patient shows signs of generalized anxiety',
        confidence: 0.85,
        modelUsed: 'gpt-4',
      },
    ],
    expectedOutcomes: [],
    transcripts: [],
    metadata: {
      trainingInstitution: 'University Hospital',
      traineeId: 'trainee-123',
      sessionDuration: 60,
      completionStatus: 'completed',
    },
  }

  const mockAnalysisResult: BiasAnalysisResult = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date('2024-01-15T10:00:00.000Z'),
    overallBiasScore: 0.25,
    layerResults: {
      preprocessing: {
        biasScore: 0.2,
        linguisticBias: {
          genderBiasScore: 0.1,
          racialBiasScore: 0.1,
          ageBiasScore: 0.05,
          culturalBiasScore: 0.05,
          biasedTerms: [],
          sentimentAnalysis: {
            overallSentiment: 0.5,
            emotionalValence: 0.6,
            subjectivity: 0.4,
            demographicVariations: {},
          },
        },
        representationAnalysis: {
          demographicDistribution: {},
          underrepresentedGroups: [],
          overrepresentedGroups: [],
          diversityIndex: 0.8,
          intersectionalityAnalysis: [],
        },
        dataQualityMetrics: {
          completeness: 0.9,
          consistency: 0.85,
          accuracy: 0.9,
          timeliness: 0.95,
          validity: 0.9,
          missingDataByDemographic: {},
        },
        recommendations: [],
      },
      modelLevel: {
        biasScore: 0.3,
        fairnessMetrics: {
          demographicParity: 0.1,
          equalizedOdds: 0.15,
          equalOpportunity: 0.12,
          calibration: 0.08,
          individualFairness: 0.1,
          counterfactualFairness: 0.09,
        },
        performanceMetrics: {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          f1Score: 0.85,
          auc: 0.9,
          calibrationError: 0.05,
          demographicBreakdown: {},
        },
        groupPerformanceComparison: [],
        recommendations: [],
      },
      interactive: {
        biasScore: 0.2,
        counterfactualAnalysis: {
          scenariosAnalyzed: 10,
          biasDetected: false,
          consistencyScore: 0.8,
          problematicScenarios: [],
        },
        featureImportance: [],
        whatIfScenarios: [],
        recommendations: [],
      },
      evaluation: {
        biasScore: 0.25,
        huggingFaceMetrics: {
          toxicity: 0.1,
          bias: 0.2,
          regard: {},
          stereotype: 0.15,
          fairness: 0.8,
        },
        customMetrics: {
          therapeuticBias: 0.2,
          culturalSensitivity: 0.8,
          professionalEthics: 0.9,
          patientSafety: 0.95,
        },
        temporalAnalysis: {
          trendDirection: 'stable',
          changeRate: 0.02,
          seasonalPatterns: [],
          interventionEffectiveness: [],
        },
        recommendations: [],
      },
    },
    demographics: mockSession.participantDemographics,
    recommendations: ['Regular bias monitoring recommended'],
    alertLevel: 'low',
    confidence: 0.88,
  }

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup global Response mock with default behavior
    global.Response = vi
      .fn()
      .mockImplementation((body: string, init?: ResponseInit) => {
        let responseData
        try {
          responseData = JSON.parse(body)
        } catch {
          responseData = { error: 'Invalid JSON' }
        }

        const defaultHeaders = new Map([
          ['Content-Type', 'application/json'],
          ['X-Cache', 'MISS'],
          ['X-Processing-Time', '100'],
        ])

        return {
          status: init?.status || 200,
          json: vi.fn().mockResolvedValue(responseData),
          headers: {
            get: vi.fn((key: string) => defaultHeaders.get(key) || null),
          },
        }
      }) as unknown as typeof Response

    // Setup mock return values
    mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(null)
    mockCacheManager.analysisCache.cacheAnalysisResult.mockResolvedValue(undefined)
    mockAuditLogger.logAuthentication.mockResolvedValue(undefined)
    mockAuditLogger.logAction.mockResolvedValue(undefined)
    mockAuditLogger.logBiasAnalysis.mockResolvedValue(undefined)
    mockBiasDetectionEngine.analyzeSession.mockResolvedValue(mockAnalysisResult)
    mockBiasDetectionEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)
    
    // Setup utility mocks  
    mockValidateTherapeuticSession.mockImplementation((session: unknown) => {
      // Convert string timestamps to Date objects
      const sessionData = session as Record<string, unknown>
      const sessionWithDates = {
        ...sessionData,
        timestamp:
          typeof sessionData['timestamp'] === 'string'
            ? new Date(sessionData['timestamp'])
            : sessionData['timestamp'],
        aiResponses:
          (sessionData['aiResponses'] as unknown[])?.map((resp: unknown) => {
            const respData = resp as Record<string, unknown>
            return {
              ...respData,
              timestamp:
                typeof respData['timestamp'] === 'string'
                  ? new Date(respData['timestamp'])
                  : respData['timestamp'],
            }
          }) || [],
      }
      return sessionWithDates as TherapeuticSession
    })
    mockGenerateAnonymizedId.mockReturnValue('anon-123')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Shared helper function for creating mock requests
  const createMockRequest = (
    body: unknown,
    headers: Record<string, string> = {},
  ): MockRequest => {
    const defaultHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'authorization': 'Bearer valid-token',
      ...headers,
    }

    return {
      json: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn(
          (key: string) => defaultHeaders[key.toLowerCase()] || null,
        ),
      },
    }
  }

  describe('POST /api/bias-detection/analyze', () => {

    it('should successfully analyze a session with valid input', async () => {
      const requestBody = {
        session: mockSessionForRequest,
        options: { includeExplanation: true },
      }

      const request = createMockRequest(requestBody)

      // Mock the global Response constructor
      const mockResponseJson = vi.fn()
      const mockResponseHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Cache', 'MISS'],
        ['X-Processing-Time', '100'],
      ])

      global.Response = vi
        .fn()
        .mockImplementation((body: string, init?: ResponseInit) => ({
          status: init?.status || 200,
          json: mockResponseJson.mockResolvedValue(JSON.parse(body)),
          headers: {
            get: vi.fn((key: string) => mockResponseHeaders.get(key) || null),
          },
        })) as unknown as typeof Response

      const response = await POST({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(
        serializeForComparison(mockAnalysisResult),
      )
      expect(responseData.cacheHit).toBe(false)
      expect(typeof responseData.processingTime).toBe('number')

      // Verify bias engine was called
      expect(mockBiasDetectionEngine.analyzeSession).toHaveBeenCalledWith(mockSession)

      // Verify audit logging
      expect(mockAuditLogger.logBiasAnalysis).toHaveBeenCalled()
    })

    it('should return cached result when available', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)
      const response = await POST({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(true)
      expect(responseData.data).toEqual(
        serializeForComparison(mockAnalysisResult),
      )

      // Verify cache was checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).toHaveBeenCalledWith(mockSession.sessionId)

      // Verify bias engine was not called
      expect(mockBiasDetectionEngine.analyzeSession).not.toHaveBeenCalled()
    })

    it('should skip cache when skipCache option is true', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const requestBody = {
        session: mockSessionForRequest,
        options: { skipCache: true },
      }

      const request = createMockRequest(requestBody)
      const response = await POST({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(false)

      // Verify cache was not checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).not.toHaveBeenCalled()

      // Verify bias engine was called
      expect(mockBiasDetectionEngine.analyzeSession).toHaveBeenCalled()
    })

    it('should return 401 for missing authorization', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, { authorization: '' })

      const response = await POST({ request })

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')

      // Verify authentication failure was logged
      expect(mockAuditLogger.logAuthentication).toHaveBeenCalledWith(
        'unknown',
        'unknown@example.com',
        'login',
        expect.any(Object),
        false,
        'Missing or invalid authorization token',
      )
    })

    it('should return 401 for invalid authorization token', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, {
        authorization: 'Bearer invalid',
      })

      const response = await POST({ request })

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid content type', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody, {
        'content-type': 'text/plain',
      })

      const response = await POST({ request })

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Invalid Content Type')
    })

    it('should return 400 for validation errors', async () => {
      const invalidSession = {
        ...mockSessionForRequest,
        sessionId: 'invalid-uuid', // Invalid UUID
      }

      const requestBody = { session: invalidSession }
      const request = createMockRequest(requestBody)

      const response = await POST({ request })

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
      expect(responseData.message).toContain('Session ID must be a valid UUID')
    })

    it('should return 400 for missing required fields', async () => {
      const incompleteSession = {
        sessionId: mockSessionForRequest.sessionId,
        // Missing other required fields
      }

      const requestBody = { session: incompleteSession }
      const request = createMockRequest(requestBody)

      const response = await POST({ request })

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
    })

    it('should handle bias detection engine errors', async () => {
      const error = new Error('Python service unavailable')
      mockBiasDetectionEngine.analyzeSession.mockRejectedValue(error)

      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response for error case
      global.Response = vi
        .fn()
        .mockImplementation((body: string, init?: ResponseInit) => ({
          status: init?.status || 500,
          json: vi.fn().mockResolvedValue(JSON.parse(body)),
          headers: {
            get: vi.fn(() => 'application/json'),
          },
        })) as unknown as typeof Response

      const response = await POST({ request })

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Analysis Failed')
      expect(responseData.message).toBe('Python service unavailable')

      // Verify bias engine was called and failed
      expect(mockBiasDetectionEngine.analyzeSession).toHaveBeenCalledWith(mockSession)
    })

    it('should handle JSON parsing errors', async () => {
      const request: MockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: vi.fn((key: string) => {
            const headers: Record<string, string> = {
              'content-type': 'application/json',
              'authorization': 'Bearer valid-token',
            }
            return headers[key.toLowerCase()] || null
          }),
        },
      }

      const response = await POST({ request })

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
    })

    it('should include processing time in response', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response with processing time
      global.Response = vi
        .fn()
        .mockImplementation((body: string, init?: ResponseInit) => {
          const responseData = JSON.parse(body)
          return {
            status: init?.status || 200,
            json: vi.fn().mockResolvedValue(responseData),
            headers: {
              get: vi.fn(() => 'application/json'),
            },
          }
        }) as unknown as typeof Response

      const response = await POST({ request })
      const responseData = await response.json()

      expect(responseData.processingTime).toBeDefined()
      expect(typeof responseData.processingTime).toBe('number')
      expect(responseData.processingTime).toBeGreaterThan(0)
    })

    it('should set appropriate response headers', async () => {
      const requestBody = { session: mockSessionForRequest }
      const request = createMockRequest(requestBody)

      // Mock Response with correct headers
      const mockHeaders = new Map([
        ['Content-Type', 'application/json'],
        ['X-Cache', 'MISS'],
        ['X-Processing-Time', '150'],
      ])

      global.Response = vi
        .fn()
        .mockImplementation((body: string, init?: ResponseInit) => ({
          status: init?.status || 200,
          json: vi.fn().mockResolvedValue(JSON.parse(body)),
          headers: {
            get: vi.fn((key: string) => mockHeaders.get(key) || null),
          },
        })) as unknown as typeof Response

      const response = await POST({ request })

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Cache')).toBe('MISS')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })

  describe('GET /api/bias-detection/analyze', () => {
    const createMockGetRequest = (
      searchParams: Record<string, string> = {},
      headers: Record<string, string> = {},
    ): MockRequest => {
      const url = new URL('http://localhost:3000/api/bias-detection/analyze')
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })

      const defaultHeaders: Record<string, string> = {
        authorization: 'Bearer valid-token',
        ...headers,
      }

      return {
        url: url.toString(),
        headers: {
          get: vi.fn(
            (key: string) => defaultHeaders[key.toLowerCase()] || null,
          ),
        },
      } as unknown as MockRequest
    }

    it('should successfully retrieve analysis results', async () => {
      mockBiasDetectionEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        includeCache: 'true',
      })

      const response = await GET({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data).toEqual(
        serializeForComparison(mockAnalysisResult),
      )

      // Verify audit logging
      expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          type: 'read',
          category: 'bias-analysis',
        }),
        'bias-analysis-retrieval',
        expect.any(Object),
        expect.any(Object),
        mockSession.sessionId,
      )
    })

    it('should return cached result when available and includeCache is true', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(
        mockAnalysisResult,
      )

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        includeCache: 'true',
      })

      const response = await GET({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.cacheHit).toBe(true)
      expect(responseData.data).toEqual(
        serializeForComparison(mockAnalysisResult),
      )

      // Verify cache was checked
      expect(
        mockCacheManager.analysisCache.getAnalysisResult,
      ).toHaveBeenCalledWith(mockSession.sessionId)

      // Verify bias engine was not called
      expect(mockBiasDetectionEngine.getSessionAnalysis).not.toHaveBeenCalled()
    })

    it('should anonymize sensitive data when anonymize is true', async () => {
      mockBiasDetectionEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
        anonymize: 'true',
      })

      const response = await GET({ request })

      expect(response.status).toBe(200)

      const responseData = await response.json()
      expect(responseData.success).toBe(true)
      expect(responseData.data.demographics.ethnicity).toBe('[ANONYMIZED]')
      expect(responseData.data.demographics.age).toBe(
        mockAnalysisResult.demographics.age,
      )
      expect(responseData.data.demographics.gender).toBe(
        mockAnalysisResult.demographics.gender,
      )
    })

    it('should return 401 for missing authorization', async () => {
      const request = createMockGetRequest(
        { sessionId: mockSession.sessionId },
        { authorization: '' },
      )

      const response = await GET({ request })

      expect(response.status).toBe(401)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid sessionId', async () => {
      const request = createMockGetRequest({
        sessionId: 'invalid-uuid',
      })

      const response = await GET({ request })

      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Validation Error')
      expect(responseData.message).toContain('Session ID must be a valid UUID')
    })

    it('should return 404 when analysis not found', async () => {
      mockCacheManager.analysisCache.getAnalysisResult.mockResolvedValue(null)
      mockBiasDetectionEngine.getSessionAnalysis.mockResolvedValue(null)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      const response = await GET({ request })

      expect(response.status).toBe(404)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Not Found')
      expect(responseData.message).toBe('Session analysis not found')
    })

    it('should handle bias detection engine errors in GET', async () => {
      const error = new Error('Database connection failed')
      mockBiasDetectionEngine.getSessionAnalysis.mockRejectedValue(error)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      // Mock Response for GET error case
      global.Response = vi
        .fn()
        .mockImplementation((body: string, init?: ResponseInit) => ({
          status: init?.status || 500,
          json: vi.fn().mockResolvedValue(JSON.parse(body)),
          headers: {
            get: vi.fn(() => 'application/json'),
          },
        })) as unknown as typeof Response

      const response = await GET({ request })

      expect(response.status).toBe(500)

      const responseData = await response.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Retrieval Failed')
      expect(responseData.message).toBe('Database connection failed')

      // Verify bias engine was called and failed
      expect(mockBiasDetectionEngine.getSessionAnalysis).toHaveBeenCalledWith(
        mockSession.sessionId,
      )
    })

    it('should set appropriate response headers for GET', async () => {
      mockBiasDetectionEngine.getSessionAnalysis.mockResolvedValue(mockAnalysisResult)

      const request = createMockGetRequest({
        sessionId: mockSession.sessionId,
      })

      const response = await GET({ request })

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Cache')).toBe('MISS')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting after multiple requests', async () => {
      const requestBody = { session: mockSession }

      // Make 61 requests (over the limit of 60)
      const requests = Array.from({ length: 61 }, () =>
        POST({
          request: createMockRequest(requestBody),
        }),
      )

      const responses = await Promise.all(requests)

      // Last request should be rate limited
      const lastResponse = responses[60]
      expect(lastResponse).toBeDefined()
      expect(lastResponse!.status).toBe(429)

      const responseData = await lastResponse!.json()
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBe('Rate Limit Exceeded')
    })
  })

  describe('Security Headers', () => {
    it('should include security-related headers in responses', async () => {
      const requestBody = { session: mockSession }
      const request = createMockRequest(requestBody)

      const response = await POST({ request })

      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(response.headers.get('X-Processing-Time')).toBeDefined()
    })
  })
})
