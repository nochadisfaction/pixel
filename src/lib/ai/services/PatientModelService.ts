/**
 * Service for managing patient cognitive models and profiles
 */

import { KVStore } from '../../db/KVStore';
import type { CognitiveModel, CoreBelief } from '../types/CognitiveModel';
import type { PatientProfile, ConversationMessage } from '../models/patient'; // Updated import

/**
 * Profile identifier type (can be same as ModelIdentifier if profiles are 1:1 with models)
 */
export type ProfileIdentifier = {
  id: string; // Profile ID, likely same as CognitiveModel ID
  name: string; // Patient's name from CognitiveModel
};

/**
 * Patient response style configuration (remains the same)
 */
export type PatientResponseStyleConfig = {
  openness: number;
  coherence: number;
  defenseLevel: number;
  disclosureStyle: 'open' | 'selective' | 'guarded';
  challengeResponses: 'defensive' | 'curious' | 'dismissive';
};

/**
 * Response context for generating patient responses
 */
export type ResponseContext = {
  profile: PatientProfile; // Changed from model to profile
  styleConfig: PatientResponseStyleConfig;
  therapeuticFocus?: string[];
  sessionNumber: number; // Can be derived or passed
};

/**
 * Result of a consistency check
 */
export type ConsistencyResult = {
  isConsistent: boolean;
  contradictionsFound: Array<{
    type: 'belief' | 'statement';
    conflictingText: string; // The existing belief or statement text
    similarityScore?: number; // Optional: score from a similarity algorithm
    explanation?: string; // Optional: brief explanation of the conflict
  }>;
  confidence?: number; // Overall confidence in the consistency assessment
};

/**
 * Service for managing patient profiles, including their cognitive models and conversation history.
 */
export class PatientModelService {
  private kvStore: KVStore;
  private readonly PROFILE_PREFIX = 'profile_';

  /**
   * Create a new PatientModelService
   * @param kvStore KVStore instance for storing and retrieving profiles
   */
  constructor(kvStore: KVStore) {
    this.kvStore = kvStore;
  }

  /**
   * Get all available patient profiles
   * @returns Promise<ProfileIdentifier[]> List of available profiles
   */
  async getAvailableProfiles(): Promise<ProfileIdentifier[]> {
    try {
      const keys = await this.kvStore.keys();
      const profileKeys = keys.filter((key) => key.startsWith(this.PROFILE_PREFIX));
      const profiles: ProfileIdentifier[] = [];

      for (const key of profileKeys) {
        const profile = await this.kvStore.get<PatientProfile>(key);
        if (profile) {
          profiles.push({
            id: profile.id,
            name: profile.cognitiveModel.name,
          });
        }
      }
      return profiles;
    } catch (error) {
      console.error('Failed to get available profiles:', error);
      return [];
    }
  }

  /**
   * Get a patient profile by ID
   * @param id Profile ID
   * @returns Promise<PatientProfile | null> The patient profile or null if not found
   */
  async getProfileById(id: string): Promise<PatientProfile | null> {
    try {
      return await this.kvStore.get<PatientProfile>(`${this.PROFILE_PREFIX}${id}`);
    } catch (error) {
      console.error(`Failed to get profile with ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Save a patient profile
   * @param profile The patient profile to save
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async saveProfile(profile: PatientProfile): Promise<boolean> {
    try {
      const profileToSave = {
        ...profile,
        lastUpdatedAt: new Date().toISOString(), // Ensure lastUpdatedAt is current
      };
      await this.kvStore.set(`${this.PROFILE_PREFIX}${profile.id}`, profileToSave);
      return true;
    } catch (error) {
      console.error(`Failed to save profile ${profile.id}:`, error);
      return false;
    }
  }

  /**
   * Delete a patient profile
   * @param id Profile ID
   * @returns Promise<boolean> True if successful, false otherwise
   */
  async deleteProfile(id: string): Promise<boolean> {
    try {
      await this.kvStore.delete(`${this.PROFILE_PREFIX}${id}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete profile ${id}:`, error);
      return false;
    }
  }

  /**
   * Adds a message to a patient's conversation history and saves the profile.
   * @param profileId The ID of the patient profile.
   * @param messageContent The content of the message.
   * @param role The role of the sender ('therapist' or 'patient').
   * @param sessionId Optional session identifier.
   * @returns Promise<PatientProfile | null> The updated profile or null if an error occurs.
   */
  async addMessageToPatientHistory(
    profileId: string,
    messageContent: string,
    role: 'therapist' | 'patient' | 'system',
    sessionId?: string,
    metadata?: Record<string, any>,
  ): Promise<PatientProfile | null> {
    const profile = await this.getProfileById(profileId);
    if (!profile) {
      console.error(`Profile with ID ${profileId} not found.`);
      return null;
    }

    const newMessage: ConversationMessage = {
      role,
      content: messageContent,
      timestamp: new Date().toISOString(),
      sessionId,
      metadata,
    };

    const updatedProfile: PatientProfile = {
      ...profile,
      conversationHistory: [...profile.conversationHistory, newMessage],
      lastUpdatedAt: new Date().toISOString(),
    };

    const success = await this.saveProfile(updatedProfile);
    return success ? updatedProfile : null;
  }


  /**
   * Create a response context for generating patient responses
   * @param profileId Profile ID
   * @param styleConfig Response style configuration
   * @param therapeuticFocus Current therapeutic focus areas
   * @param sessionNumber Current session number (could be derived from history or passed)
   * @returns Promise<ResponseContext | null> Response context or null if profile not found
   */
  async createResponseContext(
    profileId: string,
    styleConfig: PatientResponseStyleConfig,
    therapeuticFocus?: string[],
    currentSessionNumber?: number, // Made optional, can be derived
  ): Promise<ResponseContext | null> {
    const profile = await this.getProfileById(profileId);

    if (!profile) {
      console.warn(`Profile not found for ID: ${profileId} when creating response context.`);
      return null;
    }

    // Determine session number if not provided
    let derivedSessionNumber: number;
    const logLength = profile.cognitiveModel.therapeuticProgress.sessionProgressLog.length;

    if (logLength > 0) {
      derivedSessionNumber = logLength;
    } else if (profile.conversationHistory.length > 0) {
      // If no specific session logs, but there is history, assume it's at least session 1.
      derivedSessionNumber = 1;
    } else {
      // Default for a brand new profile or profile with no history and no logs.
      derivedSessionNumber = 1;
    }

    const sessionNumber = currentSessionNumber ?? derivedSessionNumber;

    return {
      profile,
      styleConfig,
      therapeuticFocus,
      sessionNumber,
    };
  }

  /**
   * Checks a new statement or belief for consistency with the patient's profile.
   * This is a placeholder for a more sophisticated NLP-based approach.
   * For now, it does basic keyword and direct contradiction checking.
   * @param profile The patient's profile.
   * @param newStatement The new statement or belief text to check.
   * @param N The number of recent patient statements to consider from history.
   * @returns Promise<ConsistencyResult>
   */
  async checkBeliefConsistency(
    profile: PatientProfile,
    newStatement: string,
    N: number = 10, // Number of recent statements to check against
  ): Promise<ConsistencyResult> {
    const contradictionsFound: ConsistencyResult['contradictionsFound'] = [];
    const lowerNewStatement = newStatement.toLowerCase();

    // Helper function for more targeted negation checking
    const checkDirectNegation = (s1L: string, s2L: string): boolean => {
      // Case: "i do not <something>" vs "i <something>"
      // Example: s1L="i do not hate pizza", s2L="i hate pizza"
      if (s1L.startsWith("i do not ") && s2L.startsWith("i ") && !s2L.startsWith("i do not ") && s1L.substring(9) === s2L.substring(2)) {
        return true;
      }
      if (s2L.startsWith("i do not ") && s1L.startsWith("i ") && !s1L.startsWith("i do not ") && s2L.substring(9) === s1L.substring(2)) {
        return true;
      }

      // Case: "i am not <something>" vs "i am <something>"
      // Example: s1L="i am not worthless", s2L="i am worthless"
      if (s1L.startsWith("i am not ") && s2L.startsWith("i am ") && !s2L.startsWith("i am not ") && s1L.substring(9) === s2L.substring(5)) {
        return true;
      }
      if (s2L.startsWith("i am not ") && s1L.startsWith("i am ") && !s1L.startsWith("i am not ") && s2L.substring(9) === s1L.substring(5)) {
        return true;
      }

      // Case: "i am never <something>" vs "i am always <something>"
      // Example: s1L="i am never failing", s2L="i am always failing"
      if (s1L.startsWith("i am never ") && s2L.startsWith("i am always ") && s1L.substring(11) === s2L.substring(12)) {
        return true;
      }
      if (s2L.startsWith("i am never ") && s1L.startsWith("i am always ") && s2L.substring(11) === s1L.substring(12)) {
        return true;
      }

      // Case: "i am never <something>" vs "i am <something>" (where <something> is not "always <...>")
      // Example: s1L="i am never happy", s2L="i am happy"
      if (s1L.startsWith("i am never ") && s2L.startsWith("i am ") && !s2L.startsWith("i am always ") && !s2L.startsWith("i am never ") && s1L.substring(11) === s2L.substring(5)) {
          return true;
      }
      if (s2L.startsWith("i am never ") && s1L.startsWith("i am ") && !s1L.startsWith("i am always ") && !s1L.startsWith("i am never ") && s2L.substring(11) === s1L.substring(5)) {
          return true;
      }

      // Fallback for simple "not X" vs "X" if not caught by specific "i am not" etc.
      // This is very basic and might lead to false positives if not careful.
      // Example: s1L = "not good", s2L = "good"
      if (s1L === `not ${s2L}`) return true;
      if (s2L === `not ${s1L}`) return true;

      return false;
    };

    // 1. Check against core beliefs
    for (const coreBelief of profile.cognitiveModel.coreBeliefs) {
      const lowerCoreBelief = coreBelief.belief.toLowerCase();
      if (checkDirectNegation(lowerNewStatement, lowerCoreBelief)) {
        contradictionsFound.push({
          type: 'belief',
          conflictingText: coreBelief.belief,
          explanation: `New statement appears to directly contradict core belief: "${coreBelief.belief}"`,
        });
      }
    }

    // 2. Check against recent conversation history (patient's statements only)
    const recentPatientStatements = profile.conversationHistory
      .filter(msg => msg.role === 'patient')
      .slice(-N) // Get the last N patient statements
      .map(msg => ({ original: msg.content, lower: msg.content.toLowerCase() }));

    for (const stmt of recentPatientStatements) {
      if (checkDirectNegation(lowerNewStatement, stmt.lower)) {
        contradictionsFound.push({
          type: 'statement',
          conflictingText: stmt.original,
          explanation: `New statement appears to directly contradict a recent past statement: "${stmt.original}"`,
        });
      }
    }

    const isConsistent = contradictionsFound.length === 0;
    return {
      isConsistent,
      contradictionsFound,
      confidence: isConsistent ? 1.0 : 0.5, // Placeholder confidence
    };
  }


  /**
   * Generate a prompt for the patient model based on the PatientProfile
   * @param context Response context
   * @returns string The generated prompt
   */
  generatePatientPrompt(context: ResponseContext): string {
    const {
      profile,
      styleConfig,
      therapeuticFocus,
      // sessionNumber is now part of the context directly
    } = context;
    const { cognitiveModel, conversationHistory } = profile;

    let prompt = `You are roleplaying as ${cognitiveModel.name}, a patient with ${cognitiveModel.diagnosisInfo.primaryDiagnosis}.\n\n`;

    prompt += `Your core beliefs include: ${cognitiveModel.coreBeliefs.map((b) => b.belief).join(', ')}.\n`;
    prompt += `Your emotional patterns include: ${cognitiveModel.emotionalPatterns.map((e) => e.emotion).join(', ')}.\n\n`;

    prompt += `Your openness level is ${styleConfig.openness}/10. `;
    prompt += `Your coherence level is ${styleConfig.coherence}/10. `;
    prompt += `Your defense level is ${styleConfig.defenseLevel}/10. `;
    prompt += `Your disclosure style is ${styleConfig.disclosureStyle}. `;
    prompt += `You respond to challenges in a ${styleConfig.challengeResponses} way.\n\n`;

    if (therapeuticFocus && therapeuticFocus.length > 0) {
      prompt += `The current therapeutic focus areas are: ${therapeuticFocus.join(', ')}.\n\n`;
    }

    prompt += `This is session number ${context.sessionNumber}.\n\n`;

    // Use the conversation history from the profile, potentially filtering or summarizing if it's very long
    // For this example, let's take the last 20 messages to keep the prompt manageable.
    const historyForPrompt = conversationHistory.slice(-20);

    prompt += 'Recent conversation history:\n';
    for (const message of historyForPrompt) {
      const speaker = message.role === 'therapist' ? 'Therapist' : (message.role === 'patient' ? cognitiveModel.name : 'System');
      prompt += `${speaker}: ${message.content}\n`;
    }

    prompt += `\nRespond as ${cognitiveModel.name}:`;

    return prompt;
  }

  /**
   * Generates a response for the patient, attempting to maintain consistency.
   * If a direct contradiction is detected in a candidate response, it may
   * reframe the response to acknowledge the inconsistency therapeutically.
   *
   * NOTE: The actual generation of a candidate response (e.g., from an LLM)
   * is simplified here. In a real system, this would involve a call to an
   * external LLM service using the prompt from `generatePatientPrompt`.
   *
   * @param context The response context.
   * @param getCandidateResponse A function that provides a candidate patient response.
   *                             This simulates fetching a response from an LLM.
   * @returns Promise<string> The final patient response, potentially modified for consistency.
   */
  async generateConsistentResponse(
    context: ResponseContext,
    // In a real system, this function would likely be an async call to an LLM service
    // that takes `generatePatientPrompt(context)` as input.
    // For simplicity here, we make it a direct provider of a candidate string.
    getCandidateResponse: () => Promise<string> | string,
  ): Promise<string> {
    const candidateResponse = await getCandidateResponse();

    if (!context || !context.profile) {
      console.error('Invalid context provided to generateConsistentResponse.');
      // Fallback or error handling if context is not usable
      return candidateResponse; // Or throw error
    }

    const consistencyResult = await this.checkBeliefConsistency(
      context.profile,
      candidateResponse,
    );

    if (consistencyResult.isConsistent) {
      return candidateResponse;
    } else {
      // Formulate a therapeutic response acknowledging the inconsistency
      const firstContradiction = consistencyResult.contradictionsFound[0];
      let therapeuticResponse = `I find myself wanting to say, "${candidateResponse}". `;
      therapeuticResponse += `It's interesting, because I also recall `;
      if (firstContradiction.type === 'belief') {
        therapeuticResponse += `holding the belief that "${firstContradiction.conflictingText}". `;
      } else {
        therapeuticResponse += `saying something like "${firstContradiction.conflictingText}" before. `;
      }
      therapeuticResponse += `It feels a bit conflicting, doesn't it?`;

      // Log the detected inconsistency for potential review or analytics
      console.warn(
        `Consistency issue detected for profile ${context.profile.id}:
        Candidate: "${candidateResponse}"
        Conflict: "${firstContradiction.conflictingText}" (type: ${firstContradiction.type})
        Generated therapeutic response: "${therapeuticResponse}"`
      );

      return therapeuticResponse;
    }
  }
}
