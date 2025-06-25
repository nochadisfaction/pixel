import { PatientResponseService, type ResponseContext, type PatientResponseStyleConfig } from './PatientResponseService';
import { PatientProfileService } from './PatientProfileService';
import { BeliefConsistencyService, type ConsistencyResult } from './BeliefConsistencyService';
import type { PatientProfile, ConversationMessage } from '../models/patient';
import type { CognitiveModel, CoreBelief, DemographicInfo, DiagnosisInfo, TherapeuticProgress, ConversationalStyle } from '../types/CognitiveModel';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('./PatientProfileService');
vi.mock('./BeliefConsistencyService');

const MockPatientProfileService = PatientProfileService as vi.MockedClass<typeof PatientProfileService>;
const MockBeliefConsistencyService = BeliefConsistencyService as vi.MockedClass<typeof BeliefConsistencyService>;

// Helper to create a basic CognitiveModel for testing
const createTestCognitiveModel = (id: string, name: string, coreBeliefs: CoreBelief[] = []): CognitiveModel => ({
  id,
  name,
  demographicInfo: { age: 30, gender: 'female', occupation: 'artist', familyStatus: 'single', culturalFactors: [] } as DemographicInfo,
  presentingIssues: ['anxiety', 'low self-esteem'],
  diagnosisInfo: { primaryDiagnosis: 'Generalized Anxiety Disorder', secondaryDiagnoses: [], durationOfSymptoms: '2 years', severity: 'moderate' } as DiagnosisInfo,
  coreBeliefs,
  distortionPatterns: [],
  behavioralPatterns: [],
  emotionalPatterns: [],
  relationshipPatterns: [],
  formativeExperiences: [],
  therapyHistory: { previousApproaches:[], helpfulInterventions:[], unhelpfulInterventions:[], insights:[], progressMade: '', remainingChallenges:[]},
  conversationalStyle: { verbosity: 5, emotionalExpressiveness: 5, resistance: 3, insightLevel: 4, preferredCommunicationModes: ['verbal'] } as ConversationalStyle,
  goalsForTherapy: ['reduce anxiety', 'improve self-esteem'],
  therapeuticProgress: { insights: [], resistanceLevel: 3, changeReadiness: 'contemplation', sessionProgressLog: [] } as TherapeuticProgress,
});

// Helper to create a basic PatientProfile
const createTestPatientProfile = (id: string, name: string, coreBeliefs: CoreBelief[] = [], history: ConversationMessage[] = []): PatientProfile => ({
  id,
  cognitiveModel: createTestCognitiveModel(id, name, coreBeliefs),
  conversationHistory: history,
  lastUpdatedAt: new Date().toISOString(),
});

describe('PatientResponseService', () => {
  let mockProfileService: vi.Mocked<PatientProfileService>;
  let mockConsistencyService: vi.Mocked<BeliefConsistencyService>;
  let responseService: PatientResponseService;

  const testStyleConfig: PatientResponseStyleConfig = {
    openness: 5, coherence: 5, defenseLevel: 3, disclosureStyle: 'open', challengeResponses: 'curious'
  };

  beforeEach(() => {
    // Reset mocks for each test
    MockPatientProfileService.mockClear();
    MockBeliefConsistencyService.mockClear();

    // Create new instances of mocks for each test
    // It's important that the constructor of the actual service gets *instances* of the mocked services.
    // Vitest's vi.mock() replaces the original class with a mock constructor.
    // So, new MockPatientProfileService() creates an instance of the mock.
    mockProfileService = new MockPatientProfileService(null as any); // Pass null or valid mock for KVStore if its constructor is called
    mockConsistencyService = new MockBeliefConsistencyService();

    responseService = new PatientResponseService(mockProfileService, mockConsistencyService);
  });

  describe('createResponseContext', () => {
    it('should create a response context successfully', async () => {
      const profile = createTestPatientProfile('ctx1', 'Context User');
      mockProfileService.getProfileById.mockResolvedValue(profile);

      const context = await responseService.createResponseContext('ctx1', testStyleConfig, ['anxiety'], 2);

      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('ctx1');
      expect(context).not.toBeNull();
      expect(context?.profile).toEqual(profile);
      expect(context?.styleConfig).toEqual(testStyleConfig);
      expect(context?.therapeuticFocus).toEqual(['anxiety']);
      expect(context?.sessionNumber).toBe(2);
    });

    it('should return null if profile not found for response context', async () => {
      mockProfileService.getProfileById.mockResolvedValue(null);
      const context = await responseService.createResponseContext('nonexistent', testStyleConfig);
      expect(mockProfileService.getProfileById).toHaveBeenCalledWith('nonexistent');
      expect(context).toBeNull();
    });

    it('should derive session number if not provided in createResponseContext', async () => {
        const profileData = createTestPatientProfile('ctx2', 'Session Deriver');
        profileData.cognitiveModel.therapeuticProgress.sessionProgressLog = [
            { sessionNumber: 1, keyInsights: [], resistanceShift: 0},
            { sessionNumber: 2, keyInsights: [], resistanceShift: 0},
        ];
        mockProfileService.getProfileById.mockResolvedValue(profileData);

        const context = await responseService.createResponseContext('ctx2', testStyleConfig);
        expect(context?.sessionNumber).toBe(2);

        const profileDataNoLog = createTestPatientProfile('ctx3', 'Session Deriver No Log');
        profileDataNoLog.conversationHistory.push({role: 'patient', content: 'hi', timestamp: ''});
        mockProfileService.getProfileById.mockResolvedValue(profileDataNoLog);
        const context3 = await responseService.createResponseContext('ctx3', testStyleConfig);
        expect(context3?.sessionNumber).toBe(1);
    });
  });

  describe('generateConsistentResponse', () => {
    it('should return candidate response if it is consistent', async () => {
      const profile = createTestPatientProfile('gen1', 'Consistent Gen');
      const context: ResponseContext = { profile, styleConfig: testStyleConfig, sessionNumber: 1 };
      const candidateResponse = "I think I can do this.";

      mockConsistencyService.checkBeliefConsistency.mockResolvedValue({
        isConsistent: true,
        contradictionsFound: [],
        confidence: 1.0
      });

      const response = await responseService.generateConsistentResponse(context, () => candidateResponse);

      expect(mockConsistencyService.checkBeliefConsistency).toHaveBeenCalledWith(profile, candidateResponse);
      expect(response).toBe(candidateResponse);
    });

    it('should return a therapeutic response if candidate is inconsistent', async () => {
      const coreBeliefText = "I am a failure";
      const profile = createTestPatientProfile('gen2', 'Inconsistent Gen', [
        { belief: coreBeliefText, strength: 0.9, evidence: [], formationContext: '', relatedDomains: [] }
      ]);
      const context: ResponseContext = { profile, styleConfig: testStyleConfig, sessionNumber: 1 };
      const candidateResponse = "I am a great success!";

      mockConsistencyService.checkBeliefConsistency.mockResolvedValue({
        isConsistent: false,
        contradictionsFound: [{ type: 'belief', conflictingText: coreBeliefText, explanation: 'Direct negation' }],
        confidence: 0.4
      });

      const response = await responseService.generateConsistentResponse(context, () => candidateResponse);

      expect(mockConsistencyService.checkBeliefConsistency).toHaveBeenCalledWith(profile, candidateResponse);
      expect(response).toContain("I find myself wanting to say");
      expect(response).toContain(candidateResponse);
      expect(response).toContain(coreBeliefText);
      expect(response).toContain("It feels a bit conflicting");
    });

     it('should handle missing profile in context gracefully for generateConsistentResponse', async () => {
        const candidateResponse = "This should just return.";
        // Intentionally create a bad context (profile is missing)
        const context = { styleConfig: testStyleConfig, sessionNumber: 1 } as ResponseContext;

        // No need to mock consistencyService here as it shouldn't be called if context.profile is falsy
        const response = await responseService.generateConsistentResponse(context, () => candidateResponse);
        expect(response).toBe(candidateResponse);
        // checkBeliefConsistency should not have been called
        expect(mockConsistencyService.checkBeliefConsistency).not.toHaveBeenCalled();
    });
  });

  // generatePatientPrompt is mostly a string formatting utility.
  // It could be tested for specific output structure if needed, but often covered by integration.
  // For brevity, I'll skip a dedicated test for generatePatientPrompt structure here,
  // assuming its correctness is implicitly verified by its usage in generateConsistentResponse
  // or by higher-level tests. If it had more complex logic, it would warrant its own tests.
});
