import type { AIService } from '../models/ai-types'
import type {
  CrisisDetectionResult,
  CrisisDetectionOptions,
  RiskAssessment,
} from '../crisis/types'
import { appLogger } from '../../logging'

export interface CrisisDetectionConfig {
  aiService: AIService
  sensitivityLevel: 'low' | 'medium' | 'high'
}

export class CrisisDetectionService {
  private aiService: AIService
  private sensitivityLevel: 'low' | 'medium' | 'high'

  // Crisis detection keywords by category
  private static readonly CRISIS_KEYWORDS = {
    self_harm: [
      'self-harm',
      'hurt myself',
      'cutting',
      'self-injury',
      'self-mutilation',
      'harming myself',
      'want to hurt myself',
    ],
    suicide: [
      'suicide',
      'kill myself',
      'end my life',
      'want to die',
      'suicidal',
      'not worth living',
      'better off dead',
      'suicide plan',
      'take my own life',
    ],
    emergency: [
      'immediate danger',
      'going to hurt',
      'right now',
      'tonight',
      'overdose',
      'pills',
      'weapon',
      'bridge',
      'plan to',
    ],
    severe_depression: [
      'hopeless',
      'worthless',
      'no point',
      'give up',
      "can't go on",
      'unbearable pain',
      'too much pain',
      "can't take it",
    ],
    moderate_concern: [
      'depressed',
      'anxious',
      'panic',
      'overwhelmed',
      'struggling',
      'difficult time',
      'very sad',
      "can't cope",
    ],
  }

  private static readonly SENSITIVITY_THRESHOLDS = {
    low: { crisis: 0.8, concern: 0.6 },
    medium: { crisis: 0.6, concern: 0.4 },
    high: { crisis: 0.4, concern: 0.2 },
  }

  constructor(config: CrisisDetectionConfig) {
    this.aiService = config.aiService
    this.sensitivityLevel = config.sensitivityLevel
  }

  async detectCrisis(
    text: string,
    options: CrisisDetectionOptions,
  ): Promise<CrisisDetectionResult> {
    try {
      // Perform keyword-based analysis first (fast check)
      const keywordAnalysis = this.analyzeKeywords(text)

      // If high-risk keywords found, proceed with AI analysis
      let aiAnalysis: RiskAssessment | null = null
      if (keywordAnalysis.score > 0.3) {
        aiAnalysis = await this.performAIAnalysis(text)
      }

      // Combine results
      const finalScore = Math.max(keywordAnalysis.score, aiAnalysis?.score || 0)

      const thresholds =
        CrisisDetectionService.SENSITIVITY_THRESHOLDS[options.sensitivityLevel]
      const isCrisis = finalScore >= thresholds.crisis

      return {
        isCrisis,
        confidence: finalScore,
        category: this.determineCrisisCategory(
          keywordAnalysis.indicators,
          aiAnalysis?.category,
        ),
        content: text,
        riskLevel: this.determineRiskLevel(finalScore),
        urgency: this.determineUrgency(finalScore, keywordAnalysis.indicators),
        detectedTerms: keywordAnalysis.indicators,
        suggestedActions: this.generateSuggestedActions(
          finalScore,
          keywordAnalysis.indicators,
        ),
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      appLogger.error('Error in crisis detection:', error)
      throw new Error('Crisis detection analysis failed')
    }
  }

  async detectBatch(
    texts: string[],
    options: CrisisDetectionOptions,
  ): Promise<CrisisDetectionResult[]> {
    try {
      const results = await Promise.all(
        texts.map((text) => this.detectCrisis(text, options)),
      )
      return results
    } catch (error) {
      appLogger.error('Error in batch crisis detection:', error)
      throw new Error('Batch crisis detection failed')
    }
  }

  private analyzeKeywords(text: string): {
    score: number
    indicators: string[]
  } {
    const lowerText = text.toLowerCase()
    const indicators: string[] = []
    let score = 0

    // Check each category with different weights
    for (const [category, keywords] of Object.entries(
      CrisisDetectionService.CRISIS_KEYWORDS,
    )) {
      const categoryWeight = this.getCategoryWeight(category)

      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          indicators.push(keyword)
          score += categoryWeight
        }
      }
    }

    // Normalize score (0-1 range)
    return {
      score: Math.min(score / 3, 1), // Normalize to 0-1
      indicators: [...new Set(indicators)], // Remove duplicates
    }
  }

  private getCategoryWeight(category: string): number {
    const weights = {
      emergency: 1.0,
      suicide: 0.9,
      self_harm: 0.8,
      severe_depression: 0.6,
      moderate_concern: 0.4,
    }
    return weights[category as keyof typeof weights] || 0.2
  }

  private async performAIAnalysis(text: string): Promise<RiskAssessment> {
    try {
      const prompt = `
        Analyze the following text for mental health crisis indicators.
        Respond with a JSON object containing:
        - score: risk score from 0.0 to 1.0
        - category: primary concern category
        - severity: low, medium, high, or critical
        - indicators: array of specific concerning phrases
        - recommendations: array of suggested actions

        Text to analyze: "${text}"
      `

      const response = await this.aiService.createChatCompletion(
        [
          {
            role: 'system',
            content:
              'You are a mental health crisis detection AI. Provide accurate, helpful analysis.',
          },
          { role: 'user', content: prompt },
        ],
        {
          temperature: 0.1, // Low temperature for consistent results
          maxTokens: 500,
        },
      )

      // Parse AI response
      const content = response.content
      try {
        const analysis = JSON.parse(content)
        return {
          score: Number(analysis.score) || 0,
          category: analysis.category || 'general_concern',
          severity: analysis.severity || 'low',
          indicators: Array.isArray(analysis.indicators)
            ? analysis.indicators
            : [],
          recommendations: Array.isArray(analysis.recommendations)
            ? analysis.recommendations
            : [],
        }
      } catch {
        // Fallback if JSON parsing fails
        return {
          score: 0.3,
          category: 'analysis_error',
          severity: 'medium',
          indicators: [],
          recommendations: ['Manual review recommended'],
        }
      }
    } catch (error) {
      appLogger.error('AI analysis failed:', error)
      return {
        score: 0.3,
        category: 'ai_error',
        severity: 'medium',
        indicators: [],
        recommendations: ['Manual review recommended due to AI analysis error'],
      }
    }
  }

  private determineCrisisCategory(
    keywords: string[],
    aiCategory?: string,
  ): string {
    if (aiCategory) return aiCategory

    // Determine category based on keywords
    if (
      keywords.some((k) =>
        CrisisDetectionService.CRISIS_KEYWORDS.emergency.includes(k),
      )
    ) {
      return 'emergency'
    }
    if (
      keywords.some((k) =>
        CrisisDetectionService.CRISIS_KEYWORDS.suicide.includes(k),
      )
    ) {
      return 'suicide_risk'
    }
    if (
      keywords.some((k) =>
        CrisisDetectionService.CRISIS_KEYWORDS.self_harm.includes(k),
      )
    ) {
      return 'self_harm_risk'
    }
    if (
      keywords.some((k) =>
        CrisisDetectionService.CRISIS_KEYWORDS.severe_depression.includes(k),
      )
    ) {
      return 'severe_depression'
    }
    return 'general_concern'
  }

  private determineRiskLevel(
    score: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.8) return 'critical'
    if (score >= 0.6) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  private determineUrgency(
    score: number,
    indicators: string[],
  ): 'low' | 'medium' | 'high' | 'immediate' {
    const hasEmergencyKeywords = indicators.some((ind) =>
      CrisisDetectionService.CRISIS_KEYWORDS.emergency.includes(ind),
    )

    if (hasEmergencyKeywords || score >= 0.9) return 'immediate'
    if (score >= 0.7) return 'high'
    if (score >= 0.5) return 'medium'
    return 'low'
  }

  private generateSuggestedActions(
    score: number,
    indicators: string[],
  ): string[] {
    const actions: string[] = []

    if (score >= 0.9) {
      actions.push('Immediate intervention required')
      actions.push('Contact emergency services')
      actions.push('Do not leave individual alone')
    } else if (score >= 0.7) {
      actions.push('Urgent mental health evaluation needed')
      actions.push('Contact crisis hotline')
      actions.push('Remove access to means of harm')
    } else if (score >= 0.5) {
      actions.push('Schedule mental health appointment')
      actions.push('Increase monitoring and support')
      actions.push('Provide crisis resources')
    } else {
      actions.push('Continue supportive conversation')
      actions.push('Monitor for changes')
      actions.push('Provide mental health resources')
    }

    return actions
  }
}
