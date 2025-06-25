import type { PatientProfile } from '../models/patient';
import { PatientProfileService } from './PatientProfileService';
import { BeliefConsistencyService } from './BeliefConsistencyService';

/**
 * Constants for emotional intensity scaling
 */
const EMOTIONAL_INTENSITY_SCALE_FACTOR = 10 as const; // Converts 0-1 scale to 0-10 for prompt clarity

/**
 * Defines the nuance of emotional expression.
 * - 'subtle': Emotions are hinted at, not overtly stated.
 * - 'overt': Emotions are clearly expressed.
 * - 'suppressed': Patient attempts to hide or downplay emotions.
 */
export type EmotionalNuance = 'subtle' | 'overt' | 'suppressed';

/**
 * Defines how non-verbal cues are expressed in text.
 * - 'none': No explicit description of non-verbal cues.
 * - 'minimal': Occasional, brief descriptions (e.g., *sighs*).
 * - 'descriptive': More detailed descriptions of actions, expressions, tone.
 */
export type NonVerbalIndicatorStyle = 'none' | 'minimal' | 'descriptive';

/**
 * Specific defensive mechanisms the patient might employ.
 * - 'none': No specific active defensive mechanism.
 * - 'denial': Refusing to accept reality or a fact.
 * - 'projection': Attributing one's own unacceptable thoughts or feelings to others.
 * - 'deflection': Avoiding a topic or question by changing the subject.
 * - 'intellectualization': Focusing on abstract thought to avoid emotions.
 * - 'minimization': Downplaying the significance of a behavior or event.
 */
export type DefensiveMechanism =
  | 'none'
  | 'denial'
  | 'projection'
  | 'deflection'
  | 'intellectualization'
  | 'minimization';

/**
 * Patient response style configuration
 */
export type PatientResponseStyleConfig = {
  openness: number; // Scale of 0-10, how willing to share
  coherence: number; // Scale of 0-10, how logical and easy to follow
  defenseLevel: number; // Scale of 0-10, general guardedness

  disclosureStyle: 'open' | 'selective' | 'guarded'; // How patient filters information
  challengeResponses: 'defensive' | 'curious' | 'dismissive' | 'compliant'; // How patient reacts to therapist challenges

  // New fields for enhanced emotional authenticity
  emotionalNuance: EmotionalNuance; // How explicitly emotions are shown
  emotionalIntensity: number; // Scale of 0-1, how strong the expressed emotion is
  primaryEmotion?: string; // Optional: specify a dominant emotion for the response (e.g., "sadness", "anger")
  nonVerbalIndicatorStyle: NonVerbalIndicatorStyle; // How non-verbal cues are textually represented

  // New fields for resistance and defensive mechanisms
  activeDefensiveMechanism: DefensiveMechanism; // Specific defense mechanism to employ
  resistanceLevel: number; // Scale of 0-10, how much patient resists therapeutic direction
};

/**
 * Response context for generating patient responses
 */
export type ResponseContext = {
  profile: PatientProfile;
  styleConfig: PatientResponseStyleConfig;
  therapeuticFocus?: string[] | undefined;
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
      ...(therapeuticFocus !== undefined && { therapeuticFocus }),
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
    prompt += `You respond to challenges in a ${styleConfig.challengeResponses} way.\n`;

    // Incorporate new emotional authenticity fields
    prompt += `Your emotional expression should be ${styleConfig.emotionalNuance}. `;
    prompt += `The intensity of your expressed emotion should be around ${styleConfig.emotionalIntensity * 10}/10. `;
    if (styleConfig.primaryEmotion) {
      prompt += `Focus on conveying ${styleConfig.primaryEmotion}. `;
    }
    if (styleConfig.nonVerbalIndicatorStyle !== 'none') {
      prompt += `Include textual descriptions of non-verbal cues (e.g., *sighs*, *looks away*, *nods slowly*) in a style that is ${styleConfig.nonVerbalIndicatorStyle}. `;
    }
    prompt += "\n";

    // Incorporate new resistance and defensive mechanism fields
    prompt += `Your resistance to therapeutic suggestions is ${styleConfig.resistanceLevel}/10. `;
    if (styleConfig.activeDefensiveMechanism !== 'none') {
      prompt += `You are currently employing ${styleConfig.activeDefensiveMechanism} as a defensive mechanism. `;
      if (styleConfig.activeDefensiveMechanism === 'deflection') {
        prompt += "Try to subtly change the subject or avoid direct answers if the topic feels uncomfortable. ";
      } else if (styleConfig.activeDefensiveMechanism === 'intellectualization') {
        prompt += "Focus on abstract concepts and avoid expressing direct feelings. ";
      } else if (styleConfig.activeDefensiveMechanism === 'minimization') {
        prompt += "Downplay the importance of concerns raised. ";
      } else if (styleConfig.activeDefensiveMechanism === 'denial') {
        prompt += "Refuse to acknowledge uncomfortable truths or realities. ";
      } else if (styleConfig.activeDefensiveMechanism === 'projection') {
        prompt += "Attribute your own unacceptable feelings or thoughts to others, especially the therapist. ";
      }
    }
    prompt += "\n\n";

    // Instruction for emotional transitions
    prompt += "Consider your previous emotional state and the therapist's last statement when forming your response, allowing for natural emotional shifts or intensifications. ";
    prompt += "Maintain consistency with your established beliefs and history, but allow for emotional evolution within the conversation.\n\n";

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
      if (consistencyResult.contradictionsFound.length === 0) {
        // Fallback if no specific contradictions are found but marked as inconsistent
        return candidateResponse;
      }

      const firstContradiction = consistencyResult.contradictionsFound[0];
      
      // Add null check for firstContradiction
      if (!firstContradiction) {
        console.warn('No contradiction details available, returning candidate response.');
        return candidateResponse;
      }

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
