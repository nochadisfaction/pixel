/**
 * Unit tests for Context Detection System
 */

import {
  ContextDetector,
  type ContextDetectorConfig,
  type ContextDetectionResu        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          riskLevel: 'low',
          urgency: 'low',
          detectedTerms: [],
          suggestedActions: [],
          timestamp: new Date().toISOString(),
          content: 'Test message',
        }'./context-detector'
import { ContextType } from '../core/objectives'
import type { AIService } from '../../ai/models/types'
import type { CrisisDetectionResult } from '../../ai/crisis/types'

// Mock dependencies
const mockAIService: AIService = {
  getModelInfo: vi.fn(),
  createChatCompletion: vi.fn(),
  createStreamingChatCompletion: vi.fn(),
  dispose: vi.fn(),
}

const mockCrisisDetectionService = {
  detectCrisis: vi.fn(),
  detectBatch: vi.fn(),
  analyzeKeywords: vi.fn(),
  getCategoryWeight: vi.fn(),
  performAIAnalysis: vi.fn(),
  determineCrisisCategory: vi.fn(),
  determineRiskLevel: vi.fn(),
  determineUrgency: vi.fn(),
  generateSuggestedActions: vi.fn(),
}

describe('ContextDetector', () => {
  let contextDetector: ContextDetector
  let config: ContextDetectorConfig

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      aiService: mockAIService,
      crisisDetectionService: mockCrisisDetectionService,
      model: 'gpt-4',
      enableCrisisIntegration: true,
    }

    contextDetector = new ContextDetector(config)
  })

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(contextDetector).toBeDefined()
    })

    it('should use default model when not specified', () => {
      const configWithoutModel = { ...config }
      delete configWithoutModel.model

      const detector = new ContextDetector(configWithoutModel)
      expect(detector).toBeDefined()
    })

    it('should disable crisis integration when specified', async () => {
      const configWithoutCrisis = {
        ...config,
        enableCrisisIntegration: false,
      }

      const detector = new ContextDetector(configWithoutCrisis)
      expect(detector).toBeDefined()

      // Mock AI response for general context detection
      const aiResponse = {
        content: JSON.stringify({
          detectedContext: 'general',
          confidence: 0.5,
          contextualIndicators: [],
          needsSpecialHandling: false,
          urgency: 'low',
          metadata: {},
        }),
      }

      vi.mocked(mockAIService.createChatCompletion).mockResolvedValue(
        aiResponse,
      )

      // Test that crisis detection service is not called when integration is disabled
      const result = await detector.detectContext('I need help with something')

      expect(result.detectedContext).toBe(ContextType.GENERAL)
      expect(mockCrisisDetectionService.detectCrisis).not.toHaveBeenCalled()
      expect(result.metadata['crisisAnalysis']).toBeUndefined()
    })
  })

  describe('detectContext', () => {
    describe('crisis detection integration', () => {
      it('should return crisis context when crisis is detected', async () => {
        const crisisResult: CrisisDetectionResult = {
          isCrisis: true,
          confidence: 0.9,
          category: 'self-harm',
          riskLevel: 'high',
          urgency: 'immediate',
          detectedTerms: ['hurt myself'],
          suggestedActions: ['immediate-intervention'],
          timestamp: new Date().toISOString(),
          content: 'I want to hurt myself',
        }

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult)

        const result = await contextDetector.detectContext(
          'I want to hurt myself',
          [],
          'user123',
        )

        expect(result.detectedContext).toBe(ContextType.CRISIS)
        expect(result.confidence).toBe(0.9)
        expect(result.needsSpecialHandling).toBe(true)
        expect(result.urgency).toBe('critical')
        expect(result.contextualIndicators).toHaveLength(1)
        expect(result.contextualIndicators[0]?.type).toBe('crisis_detection')
        expect(mockCrisisDetectionService.detectCrisis).toHaveBeenCalledWith(
          'I want to hurt myself',
          {
            sensitivityLevel: 'medium',
            userId: 'user123',
            source: 'context-detection',
          },
        )
      })

      it('should proceed with general detection when no crisis is detected', async () => {
        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.2,
          category: undefined,
          riskLevel: 'low',
          urgency: 'low',
          detectedTerms: [],
          suggestedActions: [],
          timestamp: new Date().toISOString(),
          content: 'What is anxiety?',
        }

        const aiResponse = {
          content: JSON.stringify({
            detectedContext: 'educational',
            confidence: 0.8,
            contextualIndicators: [
              {
                type: 'question_pattern',
                description: 'Educational question detected',
                confidence: 0.8,
              },
            ],
            needsSpecialHandling: false,
            urgency: 'low',
            metadata: {},
          }),
        }

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult)
        ;(mockAIService.createChatCompletion as any).mockResolvedValue(
          aiResponse,
        )

        const result = await contextDetector.detectContext('What is anxiety?')

        expect(result.detectedContext).toBe(ContextType.EDUCATIONAL)
        expect(result.confidence).toBe(0.8)
        expect(result.metadata['crisisAnalysis']).toBeDefined()
        expect((result.metadata['crisisAnalysis'] as any)?.confidence).toBe(0.2)
      })
    })

    describe('context classification', () => {
      it('should detect educational context', async () => {
        const aiResponse = {
          content: JSON.stringify({
            detectedContext: 'educational',
            confidence: 0.85,
            contextualIndicators: [
              {
                type: 'question_pattern',
                description: 'Educational question about mental health',
                confidence: 0.8,
              },
            ],
            needsSpecialHandling: false,
            urgency: 'low',
            metadata: { topic: 'anxiety' },
          }),
        }

        const crisisResult: CrisisDetectionResult = {
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          riskLevel: 'low',
          urgency: 'low',
          detectedTerms: [],
          suggestedActions: [],
          timestamp: new Date().toISOString(),
          content: 'What are the symptoms of anxiety?',
        }

        mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult)
        ;(mockAIService.createChatCompletion as any).mockResolvedValue(
          aiResponse,
        )

        const result = await contextDetector.detectContext(
          'What are the symptoms of anxiety?',
        )

        expect(result.detectedContext).toBe(ContextType.EDUCATIONAL)
        expect(result.confidence).toBe(0.85)
        expect(result.urgency).toBe('low')
      })
    })

    describe('error handling', () => {
      it('should handle AI service errors gracefully', async () => {
        mockCrisisDetectionService.detectCrisis.mockResolvedValue({
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          riskLevel: 'low',
          urgency: 'low',
          detectedTerms: [],
          suggestedActions: [],
          timestamp: new Date().toISOString(),
          content: 'Test message',
        })
        ;(mockAIService.createChatCompletion as any).mockRejectedValue(
          new Error('AI service error'),
        )

        const result = await contextDetector.detectContext('Test message')

        expect(result.detectedContext).toBe(ContextType.GENERAL)
        expect(result.confidence).toBe(0.1)
        expect(result.urgency).toBe('low')
        expect(result.metadata['error']).toBe('AI service error')
      })

      it('should handle malformed AI responses', async () => {
        const malformedResponse = {
          content: 'This is not valid JSON',
        }

        mockCrisisDetectionService.detectCrisis.mockResolvedValue({
          isCrisis: false,
          confidence: 0.1,
          category: undefined,
          riskLevel: 'low',
          urgency: 'low',
          detectedTerms: [],
          suggestedActions: [],
          timestamp: new Date().toISOString(),
          content: 'Test message',
        })
        ;(mockAIService.createChatCompletion as any).mockResolvedValue(
          malformedResponse,
        )

        const result = await contextDetector.detectContext('Test message')

        expect(result.detectedContext).toBe(ContextType.GENERAL)
        expect(result.confidence).toBe(0.3)
      })
    })
  })

  describe('detectContextBatch', () => {
    it('should process multiple inputs', async () => {
      const inputs = [
        { text: 'What is anxiety?', userId: 'user1' },
        { text: 'I need help coping', userId: 'user2' },
      ]

      const crisisResult: CrisisDetectionResult = {
        isCrisis: false,
        confidence: 0.1,
        category: undefined,
        riskLevel: 'low',
        urgency: 'low',
        detectedTerms: [],
        suggestedActions: [],
        timestamp: new Date().toISOString(),
        content: 'batch processing',
      }

      mockCrisisDetectionService.detectCrisis.mockResolvedValue(crisisResult)

      const aiResponses = [
        { detectedContext: 'educational', confidence: 0.8 },
        { detectedContext: 'support', confidence: 0.7 },
      ].map((ctx) => ({
        content: JSON.stringify({
          ...ctx,
          contextualIndicators: [],
          needsSpecialHandling: false,
          urgency: 'low',
          metadata: {},
        }),
      }))

      ;(mockAIService.createChatCompletion as any)
        .mockResolvedValueOnce(aiResponses[0])
        .mockResolvedValueOnce(aiResponses[1])

      const results = await contextDetector.detectContextBatch(inputs)

      expect(results).toHaveLength(2)
      expect(results[0]?.detectedContext).toBe(ContextType.EDUCATIONAL)
      expect(results[1]?.detectedContext).toBe(ContextType.SUPPORT)
    })
  })

  describe('createAlignmentContext', () => {
    it('should create properly structured alignment context', () => {
      const userQuery = 'I need help with anxiety'
      const detectionResult: ContextDetectionResult = {
        detectedContext: ContextType.SUPPORT,
        confidence: 0.8,
        contextualIndicators: [],
        needsSpecialHandling: false,
        urgency: 'medium',
        metadata: {},
      }

      const alignmentContext = contextDetector.createAlignmentContext(
        userQuery,
        detectionResult,
      )

      expect(alignmentContext.userQuery).toBe(userQuery)
      expect(alignmentContext.detectedContext).toBe(ContextType.SUPPORT)
      expect(alignmentContext.sessionMetadata?.confidence).toBe(0.8)
      expect(alignmentContext.sessionMetadata?.urgency).toBe('medium')
      expect(alignmentContext.sessionMetadata?.needsSpecialHandling).toBe(false)
    })
  })
})