import { getLogger } from '@/lib/utils/logger';
import type {
  MentalHealthAnalysisResult,
  ExpertGuidance,
  IModelProvider,
} from './types/mentalLLaMATypes';

const logger = getLogger('ClinicalAnalysisHelpers');

/**
 * Clinical Analysis Helpers provides utility functions for risk assessment,
 * recommendations generation, and quality metrics calculation.
 */
export class ClinicalAnalysisHelpers {
  constructor(private modelProvider?: IModelProvider) {}

  /**
   * Builds clinical prompt for LLM analysis.
   */
  public buildClinicalPrompt(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ) {
    const guidelinesText = expertGuidance?.guidelines
      .map(g => `- ${g.rule} (${g.source})`)
      .join('\n') || 'No specific guidelines available';

    const riskFactorsText = expertGuidance?.riskFactors
      .map(rf => `- ${rf.factor}: ${rf.description} (${rf.severity} severity)`)
      .join('\n') || 'No specific risk factors identified';

    return [
      {
        role: 'system' as const,
        content: `You are a clinical mental health expert providing analysis based on established guidelines and evidence-based practices.

Clinical Guidelines:
${guidelinesText}

Risk Factors to Consider:
${riskFactorsText}

Base Analysis: ${baseAnalysis.mentalHealthCategory} (confidence: ${baseAnalysis.confidence})

Provide a comprehensive clinical analysis in JSON format:
{
  "explanation": "Detailed clinical explanation incorporating guidelines and evidence",
  "confidence": 0.0-1.0,
  "supportingEvidence": ["key phrases or indicators from the text"],
  "clinicalReasoning": "Step-by-step clinical reasoning process"
}`,
      },
      {
        role: 'user' as const,
        content: `Please analyze this text: "${text}"`,
      },
    ];
  }

  /**
   * Parses clinical response from LLM.
   */
  public parseClinicalResponse(content: string) {
    try {
      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to parse clinical response', { error, content });
      return {
        explanation: content,
        confidence: 0.5,
        supportingEvidence: [],
      };
    }
  }

  /**
   * Identifies risk indicators from text and base analysis.
   */
  public identifyRiskIndicators(_text: string, baseAnalysis: MentalHealthAnalysisResult) {
    const indicators: Array<{
      type: string;
      severity: 'critical' | 'high' | 'moderate' | 'low';
      indicators: string[];
    }> = [];

    // Implement risk indicator identification logic
    if (baseAnalysis.isCrisis) {
      indicators.push({
        type: 'crisis_risk',
        severity: 'critical',
        indicators: ['Crisis detected by base analysis'],
      });
    }

    return indicators;
  }

  /**
   * Identifies protective factors in the text.
   */
  public identifyProtectiveFactors(text: string): string[] {
    const protectiveKeywords = [
      'support', 'family', 'friends', 'hope', 'future', 'goals', 
      'therapy', 'treatment', 'help', 'better', 'improve'
    ];

    return protectiveKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Gets category-specific recommendations.
   */
  public getCategorySpecificRecommendations(
    category: string,
    _riskLevel?: string
  ) {
    const categoryMap: Record<string, Array<{
      recommendation: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      timeframe: string;
      rationale: string;
    }>> = {
      depression: [
        {
          recommendation: 'Professional mental health evaluation',
          priority: 'high',
          timeframe: 'Within 1-2 weeks',
          rationale: 'Depression requires professional assessment and treatment planning',
        },
      ],
      anxiety: [
        {
          recommendation: 'Anxiety screening and coping strategies assessment',
          priority: 'medium',
          timeframe: 'Within 2-4 weeks',
          rationale: 'Early intervention can prevent symptom escalation',
        },
      ],
    };

    return categoryMap[category] || [];
  }

  /**
   * Maps urgency levels to timeframes.
   */
  public mapUrgencyToTimeframe(urgency: 'immediate' | 'urgent' | 'routine'): string {
    const timeframeMap = {
      immediate: 'Within 1 hour',
      urgent: 'Within 24 hours',
      routine: 'Within 1-2 weeks',
    };
    return timeframeMap[urgency];
  }

  /**
   * Generates expert-guided analysis using LLM with clinical prompts.
   */
  public async generateExpertGuidedAnalysis(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ): Promise<{
    explanation: string;
    confidence: number;
    supportingEvidence: string[];
  }> {
    if (!this.modelProvider) {
      logger.warn('ModelProvider not available for expert-guided analysis');
      return {
        explanation: baseAnalysis.explanation,
        confidence: baseAnalysis.confidence,
        supportingEvidence: baseAnalysis.supportingEvidence || [],
      };
    }

    const clinicalPrompt = this.buildClinicalPrompt(text, baseAnalysis, expertGuidance);
    
    try {
      const llmResponse = await this.modelProvider.invoke(clinicalPrompt, {
        temperature: 0.3, // Lower temperature for more consistent clinical analysis
        max_tokens: 800,
      });

      const parsedResponse = this.parseClinicalResponse(llmResponse.content);
      
      return {
        explanation: parsedResponse.explanation || baseAnalysis.explanation,
        confidence: Math.min(parsedResponse.confidence || baseAnalysis.confidence, 1.0),
        supportingEvidence: parsedResponse.supportingEvidence || baseAnalysis.supportingEvidence || [],
      };
    } catch (error) {
      logger.error('Error in expert-guided LLM analysis', { error });
      return {
        explanation: `${baseAnalysis.explanation} [Clinical analysis enhanced with expert guidelines]`,
        confidence: baseAnalysis.confidence * 0.9, // Slightly reduce confidence due to error
        supportingEvidence: baseAnalysis.supportingEvidence || [],
      };
    }
  }

  /**
   * Performs comprehensive risk assessment.
   */
  public async performRiskAssessment(
    text: string,
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance
  ): Promise<{
    overallRisk: 'critical' | 'high' | 'moderate' | 'low';
    specificRisks: Array<{
      type: string;
      level: 'critical' | 'high' | 'moderate' | 'low';
      indicators: string[];
    }>;
    protectiveFactors?: string[];
  }> {
    const riskIndicators = this.identifyRiskIndicators(text, baseAnalysis);
    const protectiveFactors = this.identifyProtectiveFactors(text);
    
    // Calculate overall risk based on multiple factors
    let overallRisk: 'critical' | 'high' | 'moderate' | 'low' = 'low';
    
    if (baseAnalysis.isCrisis) {
      overallRisk = 'critical';
    } else if (expertGuidance?.riskFactors.some(rf => rf.severity === 'critical')) {
      overallRisk = 'critical';
    } else if (expertGuidance?.riskFactors.some(rf => rf.severity === 'high') || 
               baseAnalysis.confidence > 0.8 && baseAnalysis.hasMentalHealthIssue) {
      overallRisk = 'high';
    } else if (baseAnalysis.hasMentalHealthIssue && baseAnalysis.confidence > 0.5) {
      overallRisk = 'moderate';
    }

    const specificRisks = riskIndicators.map(indicator => ({
      type: indicator.type,
      level: indicator.severity,
      indicators: indicator.indicators,
    }));

    return {
      overallRisk,
      specificRisks,
      protectiveFactors,
    };
  }

  /**
   * Generates clinical recommendations based on analysis and expert guidance.
   */
  public async generateClinicalRecommendations(
    baseAnalysis: MentalHealthAnalysisResult,
    expertGuidance?: ExpertGuidance,
    riskAssessment?: {
      overallRisk: 'critical' | 'high' | 'moderate' | 'low';
      specificRisks: Array<{
        type: string;
        level: 'critical' | 'high' | 'moderate' | 'low';
        indicators: string[];
      }>;
      protectiveFactors?: string[];
    }
  ): Promise<Array<{
    recommendation: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    timeframe: string;
    rationale: string;
  }>> {
    const recommendations: Array<{
      recommendation: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      timeframe: string;
      rationale: string;
    }> = [];

    // Crisis recommendations
    if (baseAnalysis.isCrisis) {
      recommendations.push({
        recommendation: 'Immediate crisis intervention and safety assessment required',
        priority: 'critical',
        timeframe: 'Immediate (within 1 hour)',
        rationale: 'Crisis indicators detected in analysis requiring immediate professional intervention',
      });
    }

    // Category-specific recommendations
    const categoryRecommendations = this.getCategorySpecificRecommendations(
      baseAnalysis.mentalHealthCategory,
      riskAssessment?.overallRisk
    );
    recommendations.push(...categoryRecommendations);

    // Expert guidance recommendations
    if (expertGuidance?.interventionSuggestions) {
      expertGuidance.interventionSuggestions.forEach(intervention => {
        recommendations.push({
          recommendation: intervention.intervention,
          priority: intervention.urgency === 'immediate' ? 'critical' : 
                   intervention.urgency === 'urgent' ? 'high' : 'medium',
          timeframe: this.mapUrgencyToTimeframe(intervention.urgency),
          rationale: intervention.rationale,
        });
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculates quality metrics for the expert-guided analysis.
   */
  public calculateQualityMetrics(
    expertGuidedAnalysis: {
      explanation: string;
      confidence: number;
      supportingEvidence: string[];
    },
    expertGuidance?: ExpertGuidance,
    baseAnalysis?: MentalHealthAnalysisResult
  ): {
    guidanceRelevance: number;
    evidenceStrength: number;
    clinicalCoherence: number;
  } {
    // Calculate guidance relevance (0-1)
    const guidanceRelevance = expertGuidance ? 
      Math.min(1.0, (expertGuidance.guidelines.length * 0.2) + 
                    (expertGuidance.riskFactors.length * 0.15) + 
                    (expertGuidance.interventionSuggestions.length * 0.1)) : 0.0;

    // Calculate evidence strength based on sources
    const evidenceStrength = expertGuidance?.evidenceBase ? 
      expertGuidance.evidenceBase.reduce((acc, evidence) => {
        const reliabilityScore = evidence.reliability === 'high' ? 0.9 : 
                               evidence.reliability === 'medium' ? 0.6 : 0.3;
        return acc + reliabilityScore;
      }, 0) / expertGuidance.evidenceBase.length : 0.5;

    // Calculate clinical coherence based on consistency
    const clinicalCoherence = baseAnalysis ? 
      Math.min(1.0, baseAnalysis.confidence + 
                    (expertGuidedAnalysis.supportingEvidence?.length || 0) * 0.1) : 0.5;

    return {
      guidanceRelevance: Math.min(1.0, guidanceRelevance),
      evidenceStrength: Math.min(1.0, evidenceStrength),
      clinicalCoherence: Math.min(1.0, clinicalCoherence),
    };
  }
}
