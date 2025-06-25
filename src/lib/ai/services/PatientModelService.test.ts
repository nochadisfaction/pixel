import { PatientModelService, type ResponseContext, type PatientResponseStyleConfig } from './PatientModelService';
import type { PatientProfile, ConversationMessage } from '../models/patient';
import type { CognitiveModel, CoreBelief, DemographicInfo, DiagnosisInfo, TherapeuticProgress, ConversationalStyle } from '../types/CognitiveModel';
import { KVStore } from '../../db/KVStore'; // Assuming KVStore might have an interface or can be mocked
import { vi } from 'vitest'; // Import vi for mocking

// Mock KVStore
vi.mock('../../db/KVStore');

const MockKVStore = KVStore as vi.MockedClass<typeof KVStore>; // Use vi.MockedClass if available, or adapt

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


describe('PatientModelService', () => {
  let mockKvStoreInstance: jest.Mocked<KVStore>;
  let service: PatientModelService;

  beforeEach(() => {
    // Clears the mock usage history between tests
    MockKVStore.mockClear();
    // Clears all instances and calls to constructor and all methods:
    mockKvStoreInstance = new MockKVStore() as jest.Mocked<KVStore>;
    service = new PatientModelService(mockKvStoreInstance);
  });

  // Test basic CRUD operations
  describe('Profile CRUD', () => {
    it('should save a patient profile', async () => {
      const profile = createTestPatientProfile('test1', 'Jane Doe');
      mockKvStoreInstance.set.mockResolvedValue(undefined); // KVStore.set usually doesn't return a value
      const result = await service.saveProfile(profile);
      expect(result).toBe(true);
      expect(mockKvStoreInstance.set).toHaveBeenCalledWith(`profile_${profile.id}`, expect.objectContaining({ id: 'test1' }));
    });

    it('should get a patient profile by ID', async () => {
      const profile = createTestPatientProfile('test2', 'John Smith');
      mockKvStoreInstance.get.mockResolvedValue(profile);
      const result = await service.getProfileById('test2');
      expect(result).toEqual(profile);
      expect(mockKvStoreInstance.get).toHaveBeenCalledWith('profile_test2');
    });

    it('should return null if profile not found', async () => {
      mockKvStoreInstance.get.mockResolvedValue(null);
      const result = await service.getProfileById('nonexistent');
      expect(result).toBeNull();
    });

    it('should get available profiles', async () => {
      const profile1 = createTestPatientProfile('p1', 'Alice');
      const profile2 = createTestPatientProfile('p2', 'Bob');
      mockKvStoreInstance.keys.mockResolvedValue(['profile_p1', 'profile_p2', 'some_other_key']);
      mockKvStoreInstance.get.mockImplementation(async (key: string) => {
        if (key === 'profile_p1') return profile1;
        if (key === 'profile_p2') return profile2;
        return null;
      });

      const result = await service.getAvailableProfiles();
      expect(result).toEqual([
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
      ]);
      expect(mockKvStoreInstance.keys).toHaveBeenCalled();
      expect(mockKvStoreInstance.get).toHaveBeenCalledWith('profile_p1');
      expect(mockKvStoreInstance.get).toHaveBeenCalledWith('profile_p2');
    });

    it('should delete a profile', async () => {
      mockKvStoreInstance.delete.mockResolvedValue(undefined);
      const result = await service.deleteProfile('testDelete');
      expect(result).toBe(true);
      expect(mockKvStoreInstance.delete).toHaveBeenCalledWith('profile_testDelete');
    });
  });

  describe('addMessageToPatientHistory', () => {
    it('should add a message and save the profile', async () => {
      const initialProfile = createTestPatientProfile('hist1', 'History User');
      mockKvStoreInstance.get.mockResolvedValue(initialProfile);
      mockKvStoreInstance.set.mockResolvedValue(undefined);

      const updatedProfile = await service.addMessageToPatientHistory('hist1', 'Hello there', 'patient');

      expect(updatedProfile).not.toBeNull();
      expect(updatedProfile?.conversationHistory).toHaveLength(1);
      expect(updatedProfile?.conversationHistory[0].content).toBe('Hello there');
      expect(updatedProfile?.conversationHistory[0].role).toBe('patient');
      expect(mockKvStoreInstance.set).toHaveBeenCalledWith(`profile_hist1`, expect.objectContaining({
        conversationHistory: expect.arrayContaining([
          expect.objectContaining({ content: 'Hello there' })
        ])
      }));
    });

    it('should return null if profile not found when adding message', async () => {
       mockKvStoreInstance.get.mockResolvedValue(null);
       const result = await service.addMessageToPatientHistory('nonexistent', 'test msg', 'patient');
       expect(result).toBeNull();
    });
  });

  describe('checkBeliefConsistency', () => {
    const belief1: CoreBelief = { belief: "I am worthless", strength: 0.8, evidence: [], formationContext: '', relatedDomains: [] };
    const belief2: CoreBelief = { belief: "The world is dangerous", strength: 0.7, evidence: [], formationContext: '', relatedDomains: [] };

    it('should be consistent if new statement does not contradict core beliefs or recent history', async () => {
      const profile = createTestPatientProfile('consist1', 'Consistent Connie', [belief1], [
        { role: 'patient', content: 'I had a good day', timestamp: new Date().toISOString() }
      ]);
      const result = await service.checkBeliefConsistency(profile, 'I feel okay today');
      expect(result.isConsistent).toBe(true);
      expect(result.contradictionsFound).toHaveLength(0);
    });

    it('should detect inconsistency with a core belief (simple negation)', async () => {
      const profile = createTestPatientProfile('consist2', 'Contradictory Chris', [belief1]);
      // "I am not worthless" contradicts "I am worthless"
      const result = await service.checkBeliefConsistency(profile, 'I am not worthless');
      expect(result.isConsistent).toBe(false);
      expect(result.contradictionsFound).toHaveLength(1);
      expect(result.contradictionsFound[0].type).toBe('belief');
      expect(result.contradictionsFound[0].conflictingText).toBe(belief1.belief);
    });

    it('should detect inconsistency with a core belief (simple negation, "never" case)', async () => {
      const profile = createTestPatientProfile('consistNever', 'Never Nancy', [{belief: "I am always failing", strength: 0.9, evidence: [], formationContext: '', relatedDomains: []}]);
      const result = await service.checkBeliefConsistency(profile, 'I am never failing');
      expect(result.isConsistent).toBe(false);
      expect(result.contradictionsFound).toHaveLength(1);
      expect(result.contradictionsFound[0].type).toBe('belief');
    });

    it('should detect inconsistency with recent patient statement (simple negation)', async () => {
      const profile = createTestPatientProfile('consist3', 'Forgetful Fred', [], [
        { role: 'patient', content: 'I hate pizza', timestamp: new Date().toISOString() }
      ]);
      // "I do not hate pizza" contradicts "I hate pizza"
      const result = await service.checkBeliefConsistency(profile, 'I do not hate pizza');
      expect(result.isConsistent).toBe(false);
      expect(result.contradictionsFound).toHaveLength(1);
      expect(result.contradictionsFound[0].type).toBe('statement');
      expect(result.contradictionsFound[0].conflictingText).toBe('I hate pizza'); // Should be original case
    });

    it('should only check against N recent patient statements', async () => {
      const oldStatement = 'I love Mondays';
      const newStatementContradictingOld = 'I do not love Mondays'; // Fixed variable name
      const history: ConversationMessage[] = [
        { role: 'patient', content: oldStatement, timestamp: new Date(Date.now() - 100000).toISOString() }, // Older
        { role: 'patient', content: 'Today is Tuesday', timestamp: new Date(Date.now() - 50000).toISOString() },
        { role: 'patient', content: 'I need coffee', timestamp: new Date().toISOString() },
      ];
      const profile = createTestPatientProfile('consist4', 'Recent Rachel', [], history);

      // Check against last 2 statements, should be consistent as "I love Mondays" is too old
      let result = await service.checkBeliefConsistency(profile, newStatementContradictingOld, 2); // Fixed variable name
      expect(result.isConsistent).toBe(true);

      // Check against last 3 statements, should be inconsistent
      result = await service.checkBeliefConsistency(profile, newStatementContradictingOld, 3); // Fixed variable name
      expect(result.isConsistent).toBe(false);
      expect(result.contradictionsFound[0].conflictingText).toBe(oldStatement); // Should be original case
    });
  });

  describe('generateConsistentResponse', () => {
    const testStyleConfig: PatientResponseStyleConfig = {
      openness: 5, coherence: 5, defenseLevel: 3, disclosureStyle: 'open', challengeResponses: 'curious'
    };

    it('should return candidate response if it is consistent', async () => {
      const profile = createTestPatientProfile('gen1', 'Consistent Gen', [
        { belief: "I am capable", strength: 0.7, evidence: [], formationContext: '', relatedDomains: [] }
      ]);
      const context: ResponseContext = { profile, styleConfig: testStyleConfig, sessionNumber: 1 };
      const candidateResponse = "I think I can do this.";

      // Mock checkBeliefConsistency to ensure it's called and returns consistent
      // We are not re-testing checkBeliefConsistency's internal logic here, just its integration.
      vi.spyOn(service, 'checkBeliefConsistency').mockResolvedValueOnce({ // Changed to vi.spyOn
        isConsistent: true,
        contradictionsFound: [],
        confidence: 1.0
      });

      const response = await service.generateConsistentResponse(context, () => candidateResponse);

      expect(service.checkBeliefConsistency).toHaveBeenCalledWith(profile, candidateResponse);
      expect(response).toBe(candidateResponse);
    });

    it('should return a therapeutic response if candidate is inconsistent', async () => {
      const coreBeliefText = "I am a failure";
      const profile = createTestPatientProfile('gen2', 'Inconsistent Gen', [
        { belief: coreBeliefText, strength: 0.9, evidence: [], formationContext: '', relatedDomains: [] }
      ]);
      const context: ResponseContext = { profile, styleConfig: testStyleConfig, sessionNumber: 1 };
      const candidateResponse = "I am a great success!"; // This contradicts "I am a failure"

      // Mock checkBeliefConsistency to return inconsistent
      vi.spyOn(service, 'checkBeliefConsistency').mockResolvedValueOnce({ // Changed to vi.spyOn
        isConsistent: false,
        contradictionsFound: [{ type: 'belief', conflictingText: coreBeliefText, explanation: 'Direct negation' }],
        confidence: 0.4
      });

      const response = await service.generateConsistentResponse(context, () => candidateResponse);

      expect(service.checkBeliefConsistency).toHaveBeenCalledWith(profile, candidateResponse);
      expect(response).toContain("I find myself wanting to say");
      expect(response).toContain(candidateResponse);
      expect(response).toContain(coreBeliefText);
      expect(response).toContain("It feels a bit conflicting");
    });

     it('should handle missing profile in context gracefully', async () => {
        const candidateResponse = "This should just return."
        // Intentionally create a bad context
        const context = { styleConfig: testStyleConfig, sessionNumber: 1 } as ResponseContext;

        const response = await service.generateConsistentResponse(context, () => candidateResponse);
        expect(response).toBe(candidateResponse); // Falls back to candidate response
        // Optionally, check console.error was called if you mock it
    });
  });

  describe('createResponseContext', () => {
    it('should create a response context successfully', async () => {
      const profile = createTestPatientProfile('ctx1', 'Context User');
      mockKvStoreInstance.get.mockResolvedValue(profile);
      const styleConfig: PatientResponseStyleConfig = { openness: 5, coherence: 5, defenseLevel: 3, disclosureStyle: 'open', challengeResponses: 'curious' };

      const context = await service.createResponseContext('ctx1', styleConfig, ['anxiety'], 2);

      expect(context).not.toBeNull();
      expect(context?.profile).toEqual(profile);
      expect(context?.styleConfig).toEqual(styleConfig);
      expect(context?.therapeuticFocus).toEqual(['anxiety']);
      expect(context?.sessionNumber).toBe(2);
    });

    it('should return null if profile not found for response context', async () => {
      mockKvStoreInstance.get.mockResolvedValue(null);
      const styleConfig: PatientResponseStyleConfig = { openness: 5, coherence: 5, defenseLevel: 3, disclosureStyle: 'open', challengeResponses: 'curious' };
      const context = await service.createResponseContext('nonexistent', styleConfig);
      expect(context).toBeNull();
    });

    it('should derive session number if not provided in createResponseContext', async () => {
        const profileData = createTestPatientProfile('ctx2', 'Session Deriver');
        profileData.cognitiveModel.therapeuticProgress.sessionProgressLog = [
            { sessionNumber: 1, keyInsights: [], resistanceShift: 0},
            { sessionNumber: 2, keyInsights: [], resistanceShift: 0},
        ];
         mockKvStoreInstance.get.mockResolvedValue(profileData);
        const styleConfig: PatientResponseStyleConfig = { openness: 5, coherence: 5, defenseLevel: 3, disclosureStyle: 'open', challengeResponses: 'curious' };

        const context = await service.createResponseContext('ctx2', styleConfig);
        expect(context?.sessionNumber).toBe(2); // Based on sessionProgressLog length

        profileData.conversationHistory.push({role: 'patient', content: 'hi', timestamp: ''}); // Add to history
         mockKvStoreInstance.get.mockResolvedValue(profileData); // re-mock
         const context2 = await service.createResponseContext('ctx2', styleConfig);
        // Still 2 because sessionProgressLog is used if populated
        expect(context2?.sessionNumber).toBe(2);


        const profileDataNoLog = createTestPatientProfile('ctx3', 'Session Deriver No Log');
        profileDataNoLog.conversationHistory.push({role: 'patient', content: 'hi', timestamp: ''});
        mockKvStoreInstance.get.mockResolvedValue(profileDataNoLog);
        const context3 = await service.createResponseContext('ctx3', styleConfig);
        expect(context3?.sessionNumber).toBe(1); // Defaults to 1 if history present but no log

    });
  });

});
