/**
 * Mental Arena - Production-grade synthetic therapeutic conversation generation
 * 
 * This module provides comprehensive tools for generating and managing synthetic
 * therapeutic conversations for training and evaluation of mental health AI systems.
 */

// Core components
export { MentalArenaAdapter } from './MentalArenaAdapter'
export { MentalArenaPythonBridge } from './MentalArenaPythonBridge'

// Type definitions from existing types file
export {
  DisorderCategory
} from './types'

export type {
  MentalArenaConfig,
  SyntheticConversation,
  SymptomEncodingResult,
  TherapistDecodingResult
} from './types'

// Import types for internal use
import { DisorderCategory } from './types'
import type { MentalArenaConfig, SyntheticConversation } from './types'

// Version information
export const VERSION = '1.0.0'

/**
 * Utility function to create basic mental arena configuration
 */
export function createBasicConfig(
  numSessions: number = 10,
  disorders: DisorderCategory[] = [DisorderCategory.Anxiety, DisorderCategory.Depression]
): MentalArenaConfig {
  return {
    numSessions,
    maxTurns: 8,
    disorders,
    usePythonBridge: true,
    model: 'gpt-4'
  }
}

/**
 * Utility function to validate conversation data
 */
export function validateConversation(conversation: SyntheticConversation): boolean {
  return (
    conversation.patientText.length > 0 &&
    conversation.therapistText.length > 0 &&
    conversation.encodedSymptoms.length > 0
  )
}
