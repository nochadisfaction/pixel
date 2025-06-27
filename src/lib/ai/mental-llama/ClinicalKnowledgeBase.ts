import { getLogger } from '@/lib/utils/logger';
import type {
  MentalHealthAnalysisResult,
  ExpertGuidance,
} from './types/mentalLLaMATypes';

const logger = getLogger('ClinicalKnowledgeBase');

/**
 * Clinical Knowledge Base provides evidence-based clinical guidelines,
 * risk assessment, and intervention suggestions for mental health analysis.
 */
export class ClinicalKnowledgeBase {
  /**
   * Gets clinical guidelines for a specific mental health category.
   */
  public getClinicalGuidelines(category: string) {
    const guidelinesMap: Record<string, Array<{
      category: string;
      rule: string;
      priority: 'high' | 'medium' | 'low';
      source: string;
    }>> = {
      crisis: [
        {
          category: 'crisis',
          rule: 'Immediate safety assessment and intervention required',
          priority: 'high',
          source: 'crisis_intervention_protocols',
        },
        {
          category: 'crisis',
          rule: 'Contact emergency services if imminent danger present',
          priority: 'high',
          source: 'emergency_protocols',
        },
      ],
      depression: [
        {
          category: 'depression',
          rule: 'Assess for suicidal ideation using standardized screening tools',
          priority: 'high',
          source: 'DSM-5',
        },
        {
          category: 'depression',
          rule: 'Consider severity level for treatment planning',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
      anxiety: [
        {
          category: 'anxiety',
          rule: 'Differentiate between anxiety disorders and normal stress responses',
          priority: 'medium',
          source: 'DSM-5',
        },
        {
          category: 'anxiety',
          rule: 'Assess functional impairment and duration of symptoms',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
      general_mental_health: [
        {
          category: 'general',
          rule: 'Conduct comprehensive mental status examination',
          priority: 'medium',
          source: 'clinical_guidelines',
        },
      ],
    };

    return guidelinesMap[category] || guidelinesMap['general_mental_health'];
  }

  /**
   * Assesses risk factors based on text content, category, and base analysis.
   */
  public assessRiskFactors(text: string, _category: string, baseAnalysis: MentalHealthAnalysisResult) {
    const riskFactors: Array<{
      factor: string;
      severity: 'critical' | 'high' | 'moderate' | 'low';
      description: string;
    }> = [];

    // Crisis-specific risk factors
    if (baseAnalysis.isCrisis) {
      riskFactors.push({
        factor: 'Crisis indicators present',
        severity: 'critical',
        description: 'Text contains indicators suggesting immediate risk',
      });
    }

    // Text-based risk assessment
    const riskKeywords = {
      critical: ['suicide', 'kill myself', 'end it all', 'no point living'],
      high: ['hopeless', 'worthless', 'burden', 'trapped'],
      moderate: ['sad', 'anxious', 'worried', 'stressed'],
    };

    Object.entries(riskKeywords).forEach(([severity, keywords]) => {
      const matchedKeywords = keywords.filter(keyword => 
        text.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        riskFactors.push({
          factor: `Language indicators: ${matchedKeywords.join(', ')}`,
          severity: severity as 'critical' | 'high' | 'moderate',
          description: `Text contains ${severity} risk language patterns`,
        });
      }
    });

    return riskFactors;
  }

  /**
   * Gets intervention suggestions based on category and base analysis.
   */
  public getInterventionSuggestions(category: string, baseAnalysis: MentalHealthAnalysisResult) {
    const interventions: Array<{
      intervention: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      rationale: string;
    }> = [];

    if (baseAnalysis.isCrisis) {
      interventions.push({
        intervention: 'Crisis intervention and safety planning',
        urgency: 'immediate',
        rationale: 'Crisis indicators require immediate professional intervention',
      });
    }

    const categoryInterventions: Record<string, Array<{
      intervention: string;
      urgency: 'immediate' | 'urgent' | 'routine';
      rationale: string;
    }>> = {
      depression: [
        {
          intervention: 'Comprehensive depression screening and assessment',
          urgency: 'urgent',
          rationale: 'Early identification and treatment improve outcomes',
        },
        {
          intervention: 'Consider evidence-based psychotherapy (CBT, IPT)',
          urgency: 'routine',
          rationale: 'Psychotherapy is first-line treatment for mild to moderate depression',
        },
      ],
      anxiety: [
        {
          intervention: 'Anxiety disorder screening and differential diagnosis',
          urgency: 'urgent',
          rationale: 'Proper diagnosis guides appropriate treatment selection',
        },
        {
          intervention: 'Relaxation techniques and coping strategies',
          urgency: 'routine',
          rationale: 'Self-management techniques can provide immediate relief',
        },
      ],
    };

    return interventions.concat(categoryInterventions[category] || []);
  }

  /**
   * Gets clinical context for a specific category.
   */
  public getClinicalContext(category: string, _baseAnalysis: MentalHealthAnalysisResult) {
    const contextMap: Record<string, {
      relevantDiagnoses?: string[];
      contraindications?: string[];
      specialConsiderations?: string[];
    }> = {
      crisis: {
        relevantDiagnoses: ['Major Depressive Disorder', 'Bipolar Disorder', 'Substance Use Disorder'],
        contraindications: ['Immediate safety concerns override standard protocols'],
        specialConsiderations: ['Legal and ethical obligations for duty to warn/protect'],
      },
      depression: {
        relevantDiagnoses: ['Major Depressive Disorder', 'Persistent Depressive Disorder', 'Bipolar Disorder'],
        contraindications: ['Active psychosis', 'Severe cognitive impairment'],
        specialConsiderations: ['Assess for bipolar disorder before treatment', 'Monitor for suicidal ideation'],
      },
      anxiety: {
        relevantDiagnoses: ['Generalized Anxiety Disorder', 'Panic Disorder', 'Social Anxiety Disorder'],
        contraindications: ['Substance-induced anxiety', 'Medical conditions causing anxiety'],
        specialConsiderations: ['Rule out medical causes', 'Assess functional impairment'],
      },
    };

    return contextMap[category] || {};
  }

  /**
   * Gets evidence base for recommendations based on category.
   */
  public getEvidenceBase(category: string) {
    const evidenceMap: Record<string, Array<{
      source: string;
      reliability: 'high' | 'medium' | 'low';
      summary: string;
    }>> = {
      crisis: [
        {
          source: 'Crisis Intervention Guidelines (APA)',
          reliability: 'high',
          summary: 'Immediate intervention protocols for crisis situations',
        },
      ],
      depression: [
        {
          source: 'APA Practice Guidelines for Depression',
          reliability: 'high',
          summary: 'Evidence-based treatment recommendations for depression',
        },
        {
          source: 'Cochrane Reviews on Depression Treatment',
          reliability: 'high',
          summary: 'Systematic reviews of depression treatment efficacy',
        },
      ],
      anxiety: [
        {
          source: 'APA Practice Guidelines for Anxiety Disorders',
          reliability: 'high',
          summary: 'Evidence-based treatment recommendations for anxiety disorders',
        },
      ],
    };

    return evidenceMap[category] || [];
  }

  /**
   * Fetches comprehensive expert guidance for a given category and analysis.
   */
  public async fetchExpertGuidance(
    category: string,
    text: string,
    baseAnalysis: MentalHealthAnalysisResult
  ): Promise<ExpertGuidance> {
    logger.info('Fetching expert guidance', { category });

    try {
      // Clinical guidelines database (in production, this would be a real knowledge base)
      const clinicalGuidelines = this.getClinicalGuidelines(category);
      
      // Risk factors assessment
      const riskFactors = this.assessRiskFactors(text, category, baseAnalysis);
      
      // Intervention suggestions based on category and severity
      const interventionSuggestions = this.getInterventionSuggestions(category, baseAnalysis);
      
      // Clinical context and considerations
      const clinicalContext = this.getClinicalContext(category, baseAnalysis);
      
      // Evidence base for recommendations
      const evidenceBase = this.getEvidenceBase(category);

      return {
        guidelines: clinicalGuidelines || [],
        riskFactors,
        interventionSuggestions,
        clinicalContext,
        evidenceBase,
      };
    } catch (error) {
      logger.error('Error fetching expert guidance', { error, category });
      
      // Return minimal guidance on error
      return {
        guidelines: [{
          category: 'general',
          rule: 'Follow standard clinical assessment protocols',
          priority: 'medium',
          source: 'fallback_guidance',
        }],
        riskFactors: [],
        interventionSuggestions: [],
        clinicalContext: {},
        evidenceBase: [],
      };
    }
  }
}
