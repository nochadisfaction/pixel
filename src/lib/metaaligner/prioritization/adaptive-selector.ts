import type { AIService } from '@/lib/ai/models/types'
import { ContextType } from '../core/objectives'
import type { AlignmentContext, UserProfile, Objective } from '../core/objectives'
import { WeightingStrategy } from '../core/objective-weighting'
import { getContextualObjectiveWeights } from './context-objective-mapper'

export interface AdaptiveSelectorConfig {
  aiService: AIService
  contextDetectorConfig: {
    enableCrisisIntegration: boolean
    enableEducationalRecognition: boolean
  }
}

export interface ContextDetectionResult {
  detectedContext: ContextType
  confidence: number
  contextualIndicators: Array<{
    type: string
    description: string
    confidence: number
  }>
  needsSpecialHandling: boolean
  urgency: string
  metadata: {
    transition?: {
      from: ContextType
      to: ContextType
    }
    [key: string]: any
  }
}

export interface WeightedObjective {
  objective: Objective
  weight: number
}

export interface WeightCalculationResult {
  strategy: WeightingStrategy
  weights: Record<string, number>
  adjustments: Record<string, number>
}

export interface ObjectiveSelectionResult {
  contextDetectionResult: ContextDetectionResult
  selectedObjectives: WeightedObjective[]
  weightCalculationResult: WeightCalculationResult
}

export class AdaptiveSelector {
  private aiService: AIService
  private config: AdaptiveSelectorConfig
  private previousContext?: ContextType

  constructor(config: AdaptiveSelectorConfig) {
    this.aiService = config.aiService
    this.config = config
  }

  async selectObjectives(
    userInput: string,
    conversationHistory: any[] = [],
    userId?: string,
    userProfile?: UserProfile
  ): Promise<ObjectiveSelectionResult> {
    // Step 1: Detect context
    const contextResult = await this.detectContext(userInput, conversationHistory)
    
    // Step 2: Get base weights for context
    const baseWeights = getContextualObjectiveWeights(contextResult.detectedContext)
    
    // Step 3: Apply user preferences if available
    const finalWeights = this.applyUserPreferences(baseWeights, userProfile)
    
    // Step 4: Create weighted objectives
    const selectedObjectives: WeightedObjective[] = Object.entries(finalWeights).map(([id, weight]) => ({
      objective: {
        id,
        name: id,
        description: `${id} objective`,
        criteria: {},
        evaluationFunction: () => 0.5
      },
      weight
    }))

    // Step 5: Prepare weight calculation result
    const weightCalculationResult: WeightCalculationResult = {
      strategy: userProfile?.preferences?.objectiveWeightAdjustments 
        ? WeightingStrategy.USER_PREFERENCE_ADJUSTED 
        : WeightingStrategy.CONTEXT_BALANCED,
      weights: finalWeights,
      adjustments: userProfile?.preferences?.objectiveWeightAdjustments || {}
    }

    return {
      contextDetectionResult: contextResult,
      selectedObjectives,
      weightCalculationResult
    }
  }

  private async detectContext(
    userInput: string, 
    conversationHistory: any[] = []
  ): Promise<ContextDetectionResult> {
    // Simple context detection logic
    const lowerInput = userInput.toLowerCase()
    
    let detectedContext: ContextType = ContextType.GENERAL
    let confidence = 0.8
    let needsSpecialHandling = false
    let urgency = 'low'

    // Crisis detection
    if (lowerInput.includes('hurt') || lowerInput.includes('kill') || lowerInput.includes('hopeless')) {
      detectedContext = ContextType.CRISIS
      confidence = 0.95
      needsSpecialHandling = true
      urgency = 'high'
    }
    // Support detection
    else if (lowerInput.includes('feeling') || lowerInput.includes('overwhelmed') || lowerInput.includes('stress')) {
      detectedContext = ContextType.SUPPORT
      confidence = 0.85
      urgency = 'medium'
    }
    // Informational detection
    else if (lowerInput.includes('what is') || lowerInput.includes('how does') || lowerInput.includes('explain')) {
      detectedContext = ContextType.INFORMATIONAL
      confidence = 0.9
    }

    const metadata: any = {}
    if (this.previousContext && this.previousContext !== detectedContext) {
      metadata.transition = {
        from: this.previousContext,
        to: detectedContext
      }
    }
    this.previousContext = detectedContext

    return {
      detectedContext,
      confidence,
      contextualIndicators: [
        {
          type: 'keywords',
          description: `Keywords indicate ${detectedContext} context`,
          confidence
        }
      ],
      needsSpecialHandling,
      urgency,
      metadata
    }
  }

  private applyUserPreferences(
    baseWeights: Record<string, number>,
    userProfile?: UserProfile
  ): Record<string, number> {
    if (!userProfile?.preferences?.objectiveWeightAdjustments) {
      return baseWeights
    }

    const adjustments = userProfile.preferences.objectiveWeightAdjustments
    const adjustedWeights = { ...baseWeights }

    // Apply user preference multipliers
    for (const [objectiveId, multiplier] of Object.entries(adjustments)) {
      if (adjustedWeights[objectiveId]) {
        adjustedWeights[objectiveId] *= multiplier
      }
    }

    // Normalize weights to sum to 1
    const totalWeight = Object.values(adjustedWeights).reduce((sum, weight) => sum + weight, 0)
    if (totalWeight > 0) {
      for (const key in adjustedWeights) {
        adjustedWeights[key] /= totalWeight
      }
    }

    return adjustedWeights
  }
} 