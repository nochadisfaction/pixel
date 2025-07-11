import { ContextType } from '../core/objectives'

export interface ObjectiveWeights {
  safety: number
  empathy: number
  correctness: number
  professionalism: number
  informativeness: number
  [key: string]: number
}

/**
 * Maps context types to appropriate objective weights
 */
export function getContextualObjectiveWeights(contextType: ContextType): ObjectiveWeights {
  const baseWeights: ObjectiveWeights = {
    safety: 0.2,
    empathy: 0.2,
    correctness: 0.2,
    professionalism: 0.2,
    informativeness: 0.2
  }

  switch (contextType) {
    case ContextType.CRISIS:
      return {
        safety: 0.4,
        empathy: 0.3,
        correctness: 0.15,
        professionalism: 0.1,
        informativeness: 0.05
      }
    
    case ContextType.SUPPORT:
      return {
        safety: 0.25,
        empathy: 0.35,
        correctness: 0.2,
        professionalism: 0.15,
        informativeness: 0.05
      }
    
    case ContextType.INFORMATIONAL:
      return {
        safety: 0.1,
        empathy: 0.15,
        correctness: 0.35,
        professionalism: 0.2,
        informativeness: 0.2
      }
    
    case ContextType.GENERAL:
    default:
      return baseWeights
  }
} 