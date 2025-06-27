import { EvidenceExtractor } from '../EvidenceExtractor';
import type { IModelProvider } from '../../types/mentalLLaMATypes';

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })
}));

describe('EvidenceExtractor Schema Validation', () => {
  let extractor: EvidenceExtractor;
  let mockModelProvider: IModelProvider;

  beforeEach(() => {
    mockModelProvider = {
      invoke: vi.fn(),
    } as unknown as IModelProvider;
    
    extractor = new EvidenceExtractor({}, mockModelProvider);
  });

  describe('parseSemanticEvidenceResponse', () => {
    it('should handle valid JSON with proper schema', async () => {
      const validResponse = JSON.stringify({
        evidence: [
          {
            text: 'I feel hopeless',
            confidence: 0.8,
            clinicalRelevance: 'significant',
            rationale: 'Indicates depressive mood',
            category: 'depression_symptom'
          },
          {
            text: 'Can\'t sleep at night',
            confidence: 0.7,
            clinicalRelevance: 'supportive',
            rationale: 'Sleep disturbance pattern',
            category: 'insomnia'
          }
        ]
      });

      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(validResponse);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        text: 'I feel hopeless',
        type: 'direct_quote',
        confidence: 0.8,
        relevance: 'high',
        category: 'depression_symptom',
        clinicalRelevance: 'significant'
      });
      expect((result[0] as { metadata?: { semanticRationale?: string } }).metadata?.semanticRationale).toBe('Indicates depressive mood');
    });

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = 'this is not valid json';
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(invalidJson);
      
      expect(result).toEqual([]);
    });

    it('should handle missing evidence array', async () => {
      const responseWithoutEvidence = JSON.stringify({
        someOtherField: 'value'
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithoutEvidence);
      
      expect(result).toEqual([]);
    });

    it('should handle evidence array with invalid items', async () => {
      const responseWithInvalidItems = JSON.stringify({
        evidence: [
          {
            // Missing required text field
            confidence: 0.8,
            clinicalRelevance: 'significant'
          },
          {
            text: '',  // Empty text should be filtered out
            confidence: 0.7
          },
          {
            text: 'Valid evidence item',
            confidence: 0.9,
            clinicalRelevance: 'critical'
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithInvalidItems);
      
      // Should only have the valid item
      expect(result).toHaveLength(1);
      expect((result[0] as { text: string }).text).toBe('Valid evidence item');
    });

    it('should apply default values for optional fields', async () => {
      const minimalResponse = JSON.stringify({
        evidence: [
          {
            text: 'Minimal evidence item'
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(minimalResponse);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        text: 'Minimal evidence item',
        confidence: 0.5, // default value
        clinicalRelevance: 'supportive', // default value
        category: 'semantic_analysis', // default value
        relevance: 'medium' // computed from confidence
      });
    });

    it('should clamp confidence values to valid range', async () => {
      const responseWithInvalidConfidence = JSON.stringify({
        evidence: [
          {
            text: 'High confidence item',
            confidence: 2.5 // Invalid: greater than 1
          },
          {
            text: 'Low confidence item',
            confidence: -0.5 // Invalid: less than 0
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithInvalidConfidence);
      
      expect(result).toHaveLength(2);
      expect((result[0] as { confidence: number }).confidence).toBe(1); // Clamped to max
      expect((result[1] as { confidence: number }).confidence).toBe(0); // Clamped to min
    });

    it('should validate clinical relevance enum values', async () => {
      const responseWithInvalidClinicalRelevance = JSON.stringify({
        evidence: [
          {
            text: 'Evidence with invalid clinical relevance',
            clinicalRelevance: 'invalid_value'
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithInvalidClinicalRelevance);
      
      expect(result).toHaveLength(1);
      expect((result[0] as { clinicalRelevance: string }).clinicalRelevance).toBe('supportive'); // Should default to 'supportive'
    });

    it('should trim whitespace from text fields', async () => {
      const responseWithWhitespace = JSON.stringify({
        evidence: [
          {
            text: '   Evidence with whitespace   ',
            confidence: 0.8
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithWhitespace);
      
      expect(result).toHaveLength(1);
      expect((result[0] as { text: string }).text).toBe('Evidence with whitespace');
    });

    it('should handle empty evidence array', async () => {
      const responseWithEmptyEvidence = JSON.stringify({
        evidence: []
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithEmptyEvidence);
      
      expect(result).toEqual([]);
    });

    it('should handle malformed evidence items gracefully', async () => {
      const responseWithMalformedItems = JSON.stringify({
        evidence: [
          null, // null item
          'string item', // wrong type
          123, // wrong type
          {
            text: 'Valid item',
            confidence: 0.8
          }
        ]
      });
      
      const result = (extractor as unknown as { parseSemanticEvidenceResponse: (response: string) => unknown[] }).parseSemanticEvidenceResponse(responseWithMalformedItems);
      
      // Should only process the valid item, others should be filtered out by schema validation
      expect(result).toHaveLength(1);
      expect((result[0] as { text: string }).text).toBe('Valid item');
    });
  });
});
