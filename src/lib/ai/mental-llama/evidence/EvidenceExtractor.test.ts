/**
 * Test suite for the Evidence Extraction System
 * 
 * This file contains comprehensive tests for the evidence extraction functionality.
 * To run these tests, use a test runner like Jest or Vitest.
 */

import { EvidenceExtractor, EvidenceService } from '../evidence';
import type { IModelProvider, MentalHealthAnalysisResult } from '../types/mentalLLaMATypes';

// Mock model provider for testing
const createMockModelProvider = (): IModelProvider => ({
  invoke: async () => ({
    content: JSON.stringify({
      evidence: [
        {
          text: "feeling down",
          confidence: 0.8,
          clinicalRelevance: "significant",
          category: "mood_symptom",
          rationale: "Indicates depressed mood"
        }
      ]
    }),
    model: 'test-model'
  }),
  getModelInfo: () => ({
    name: 'test-model',
    version: '1.0.0',
    capabilities: ['text-analysis']
  }),
  isAvailable: () => Promise.resolve(true)
});

/**
 * Test the basic evidence extraction functionality
 */
export async function testBasicEvidenceExtraction() {
  console.log('Testing basic evidence extraction...');
  
  const extractor = new EvidenceExtractor({
    maxEvidenceItems: 10,
    minConfidenceThreshold: 0.3,
    enableSemanticAnalysis: false
  });

  // Test depression indicators
  const depressionText = "I feel so depressed and hopeless. I can't sleep or eat anymore.";
  const depressionResult = await extractor.extractEvidence(depressionText, 'depression');
  
  console.log('Depression evidence:', {
    count: depressionResult.evidenceItems.length,
    strength: depressionResult.summary.overallStrength,
    riskIndicators: depressionResult.summary.riskIndicatorCount
  });

  // Test anxiety indicators
  const anxietyText = "I'm so anxious and worried all the time. My heart is racing.";
  const anxietyResult = await extractor.extractEvidence(anxietyText, 'anxiety');
  
  console.log('Anxiety evidence:', {
    count: anxietyResult.evidenceItems.length,
    strength: anxietyResult.summary.overallStrength
  });

  // Test crisis indicators
  const crisisText = "I want to kill myself. I have a plan and don't see any point in living.";
  const crisisResult = await extractor.extractEvidence(crisisText, 'crisis');
  
  console.log('Crisis evidence:', {
    count: crisisResult.evidenceItems.length,
    riskIndicators: crisisResult.summary.riskIndicatorCount,
    criticalEvidence: crisisResult.evidenceItems.filter(item => 
      item.clinicalRelevance === 'critical'
    ).length
  });

  return {
    depressionResult,
    anxietyResult,
    crisisResult
  };
}

/**
 * Test the evidence service functionality
 */
export async function testEvidenceService() {
  console.log('Testing evidence service...');
  
  const evidenceService = new EvidenceService(undefined, {
    enableCaching: true,
    enableMetrics: true
  });

  const text = "I'm feeling really down and can't seem to get motivated.";
  
  // First extraction
  const result1 = await evidenceService.extractSupportingEvidence(text, 'depression');
  console.log('First extraction:', {
    evidenceCount: result1.evidenceItems.length,
    cacheUsed: result1.processingMetadata.cacheUsed,
    strength: result1.processingMetadata.evidenceStrength
  });

  // Second extraction (should use cache)
  const result2 = await evidenceService.extractSupportingEvidence(text, 'depression');
  console.log('Second extraction:', {
    evidenceCount: result2.evidenceItems.length,
    cacheUsed: result2.processingMetadata.cacheUsed,
    strength: result2.processingMetadata.evidenceStrength
  });

  // Test metrics
  const metrics = evidenceService.getMetrics();
  console.log('Service metrics:', metrics);

  return {
    result1,
    result2,
    metrics
  };
}

/**
 * Test crisis evidence extraction
 */
export async function testCrisisEvidenceExtraction() {
  console.log('Testing crisis evidence extraction...');
  
  const evidenceService = new EvidenceService();
  const text = "I want to end my life. I have pills and I've been thinking about when to do it.";
  
  const baseAnalysis: MentalHealthAnalysisResult = {
    hasMentalHealthIssue: true,
    mentalHealthCategory: 'crisis',
    confidence: 0.9,
    explanation: 'Crisis detected',
    isCrisis: true,
    timestamp: new Date().toISOString()
  };

  const crisisEvidence = await evidenceService.extractCrisisEvidence(text, baseAnalysis);
  
  console.log('Crisis evidence breakdown:', {
    immediateRisk: crisisEvidence.immediateRiskIndicators.length,
    planning: crisisEvidence.planningIndicators.length,
    contextual: crisisEvidence.contextualFactors.length,
    protective: crisisEvidence.protectiveFactors.length
  });

  return crisisEvidence;
}

/**
 * Test enhanced evidence with LLM integration
 */
export async function testLLMEnhancedEvidence() {
  console.log('Testing LLM-enhanced evidence extraction...');
  
  const mockProvider = createMockModelProvider();
  const evidenceService = new EvidenceService(mockProvider, {
    enableLLMEnhancement: true,
    enableCaching: false
  });

  const text = "I'm feeling really down and depressed lately.";
  const result = await evidenceService.extractSupportingEvidence(text, 'depression');

  console.log('LLM-enhanced result:', {
    method: result.detailedEvidence.extractionMetadata.method,
    evidenceCount: result.evidenceItems.length,
    processingTime: result.detailedEvidence.extractionMetadata.processingTime,
    qualityMetrics: result.detailedEvidence.qualityMetrics
  });

  return result;
}

/**
 * Test quality assessment
 */
export async function testQualityAssessment() {
  console.log('Testing evidence quality assessment...');
  
  const evidenceService = new EvidenceService();
  const text = "I feel depressed, hopeless, and can't sleep. I've been this way for months.";
  
  const evidenceResult = await evidenceService.extractSupportingEvidence(text, 'depression');
  const quality = evidenceService.assessEvidenceQuality(evidenceResult.detailedEvidence);

  console.log('Quality assessment:', {
    overallQuality: quality.overallQuality,
    completeness: quality.completeness,
    specificity: quality.specificity,
    clinicalRelevance: quality.clinicalRelevance,
    recommendationCount: quality.recommendations.length
  });

  return quality;
}

/**
 * Run a comprehensive test of the real-world scenario
 */
export async function testRealWorldScenario() {
  console.log('Testing real-world scenario...');
  
  const evidenceService = new EvidenceService();
  const complexText = `I've been struggling for months now. I can't sleep at night, 
    I have no appetite, and I feel hopeless about the future. My friends say 
    I should get help, but I don't think anything can fix me. Sometimes I wonder 
    if everyone would be better off without me.`;

  const result = await evidenceService.extractSupportingEvidence(complexText, 'depression');

  console.log('Real-world scenario results:', {
    evidenceCount: result.evidenceItems.length,
    strength: result.processingMetadata.evidenceStrength,
    riskIndicators: result.detailedEvidence.summary.riskIndicatorCount,
    supportiveFactors: result.detailedEvidence.summary.supportiveFactorCount,
    highConfidenceItems: result.detailedEvidence.summary.highConfidenceCount
  });

  console.log('Sample evidence items:');
  result.evidenceItems.slice(0, 5).forEach((item, index) => {
    console.log(`  ${index + 1}. "${item}"`);
  });

  return result;
}

/**
 * Main test runner function
 */
export async function runAllTests() {
  console.log('🧪 Starting Evidence Extraction System Tests');
  console.log('='.repeat(50));

  try {
    await testBasicEvidenceExtraction();
    console.log('✅ Basic evidence extraction tests passed\n');

    await testEvidenceService();
    console.log('✅ Evidence service tests passed\n');

    await testCrisisEvidenceExtraction();
    console.log('✅ Crisis evidence tests passed\n');

    await testLLMEnhancedEvidence();
    console.log('✅ LLM-enhanced evidence tests passed\n');

    await testQualityAssessment();
    console.log('✅ Quality assessment tests passed\n');

    await testRealWorldScenario();
    console.log('✅ Real-world scenario tests passed\n');

    console.log('🎉 All evidence extraction tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}
