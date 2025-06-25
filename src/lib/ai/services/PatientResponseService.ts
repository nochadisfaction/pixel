import type { PatientProfile } from '../models/patient';
import type { CognitiveModel } from '../types/CognitiveModel';
import { PatientProfileService } from './PatientProfileService';
import { BeliefConsistencyService, ConsistencyResult } from './BeliefConsistencyService';

/**
 * Constants for emotional intensity scaling
 */
const EMOTIONAL_INTENSITY_SCALE_FACTOR = 10 as const; // Converts 0-1 scale to 0-10 for prompt clarity

/**
 * Patient response style configuration
 */
export type PatientResponseStyleConfig = {
  openness: number;
  coherence: number;
  defenseLevel: number;
  disclosureStyle: 'open' | 'selective' | 'guarded';
  challengeResponses: 'defensive' | 'curious' | 'dismissive';
  // New emotional authenticity fields
  emotionalNuance?: string;
  emotionalIntensity?: number; // 0-1 scale representing emotional expression intensity
};

/**
 * Response context for generating patient responses
 */
export type ResponseContext = {
  profile: PatientProfile;
  styleConfig: PatientResponseStyleConfig;
  therapeuticFocus?: string[];
  sessionNumber: number;
};

/**
 * Service for generating patient responses, managing response context,
 * and ensuring response consistency.
 */
export class PatientResponseService {
  private profileService: PatientProfileService;
  private consistencyService: BeliefConsistencyService;

  constructor(
    profileService: PatientProfileService,
    consistencyService: BeliefConsistencyService,
  ) {
    this.profileService = profileService;
    this.consistencyService = consistencyService;
  }

  /**
   * Create a response context for generating patient responses.
   * @param profileId Profile ID of the patient.
   * @param styleConfig Response style configuration for the patient.
   * @param therapeuticFocus Optional array of current therapeutic focus areas.
   * @param currentSessionNumber Optional current session number; if not provided, it's derived.
   * @returns Promise<ResponseContext | null> Response context or null if profile not found.
   */
  async createResponseContext(
    profileId: string,
    styleConfig: PatientResponseStyleConfig,
    therapeuticFocus?: string[],
    currentSessionNumber?: number,
  ): Promise<ResponseContext | null> {
    const profile = await this.profileService.getProfileById(profileId);

    if (!profile) {
      console.warn(`Profile not found for ID: ${profileId} when creating response context.`);
      return null;
    }

    const logLength = profile.cognitiveModel.therapeuticProgress.sessionProgressLog.length;
    const derivedSessionNumber = logLength > 0 ? logLength : 1;

    const sessionNumber = currentSessionNumber ?? derivedSessionNumber;

    return {
      profile,
      styleConfig,
      therapeuticFocus,
      sessionNumber,
    };
  }

  /**
   * Generate a prompt string for an LLM to roleplay as the patient.
   * @param context Response context containing patient profile and style.
   * @returns string The generated prompt.
   */
  generatePatientPrompt(context: ResponseContext): string {
    const {
      profile,
      styleConfig,
      therapeuticFocus,
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

    // Incorporate new emotional authenticity fields
    if (styleConfig.emotionalNuance) {
      prompt += `Your emotional expression should be ${styleConfig.emotionalNuance}. `;
    }
    if (styleConfig.emotionalIntensity !== undefined) {
      const intensityScore = Math.round(styleConfig.emotionalIntensity * EMOTIONAL_INTENSITY_SCALE_FACTOR);
      prompt += `The intensity of your expressed emotion should be around ${intensityScore}/10. `;
    }

    if (therapeuticFocus && therapeuticFocus.length > 0) {
      prompt += `The current therapeutic focus areas are: ${therapeuticFocus.join(', ')}.\n\n`;
    }

    prompt += `This is session number ${context.sessionNumber}.\n\n`;

    // Use a portion of conversation history for the prompt to keep it manageable.
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
   * external LLM service.
   *
   * @param context The response context.
   * @param getCandidateResponse A function that provides a candidate patient response.
   *                             This simulates fetching a response from an LLM.
   * @returns Promise<string> The final patient response, potentially modified for consistency.
   */
  async generateConsistentResponse(
    context: ResponseContext,
    getCandidateResponse: () => Promise<string> | string,
  ): Promise<string> {
    const candidateResponse = await getCandidateResponse();

    if (!context || !context.profile) {
      console.error('Invalid context provided to generateConsistentResponse.');
      return candidateResponse; // Fallback or throw error
    }

    const consistencyResult = await this.consistencyService.checkBeliefConsistency(
      context.profile,
      candidateResponse,
    );

    if (consistencyResult.isConsistent) {
      return candidateResponse;
    } else {
      const firstContradiction = consistencyResult.contradictionsFound[0];
      let therapeuticResponse = `I find myself wanting to say, "${candidateResponse}". `;
      therapeuticResponse += `It's interesting, because I also recall `;
      if (firstContradiction.type === 'belief') {
        therapeuticResponse += `holding the belief that "${firstContradiction.conflictingText}". `;
      } else {
        therapeuticResponse += `saying something like "${firstContradiction.conflictingText}" before. `;
      }
      therapeuticResponse += `It feels a bit conflicting, doesn't it?`;

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
