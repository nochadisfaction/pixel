import React, { useState, useEffect } from 'react';

interface QualityMetrics {
  overallScore: number;
  authenticity: number;
  therapeuticAccuracy: number;
  clinicalSafety: number;
  conversationFlow: number;
  techniqueApplication: number;
  ethicalCompliance: number;
}

interface QualityAssessment {
  metrics: QualityMetrics;
  feedback: {
    strengths: string[];
    improvements: string[];
    risks: string[];
  };
  recommendations: string[];
  timestamp: string;
}

interface ConversationTurn {
  speaker: 'therapist' | 'client';
  content: string;
  techniques: string[];
  emotionalState?: string;
  interventionType?: string;
}

interface QualityAssessmentDemoProps {
  conversation?: ConversationTurn[];
  therapeuticApproach?: string;
  onQualityUpdate?: (assessment: QualityAssessment) => void;
}

const QualityAssessmentDemo: React.FC<QualityAssessmentDemoProps> = ({
  conversation = [],
  therapeuticApproach = 'CBT',
  onQualityUpdate
}) => {
  const [isAssessing, setIsAssessing] = useState(false);
  const [currentAssessment, setCurrentAssessment] = useState<QualityAssessment | null>(null);
  const [realTimeMetrics, setRealTimeMetrics] = useState<QualityMetrics | null>(null);
  const [assessmentHistory, setAssessmentHistory] = useState<QualityAssessment[]>([]);

  // Real-time assessment as conversation updates
  useEffect(() => {
    if (conversation.length > 0) {
      const metrics = calculateRealTimeMetrics(conversation, therapeuticApproach);
      setRealTimeMetrics(metrics);
    }
  }, [conversation, therapeuticApproach]);

  const calculateRealTimeMetrics = (conv: ConversationTurn[], approach: string): QualityMetrics => {
    // Simulate real-time quality assessment algorithms
    const therapistTurns = conv.filter(turn => turn.speaker === 'therapist');
    const clientTurns = conv.filter(turn => turn.speaker === 'client');

    // Authenticity scoring based on response patterns
    const authenticity = calculateAuthenticity(therapistTurns, approach);
    
    // Therapeutic accuracy based on technique application
    const therapeuticAccuracy = calculateTherapeuticAccuracy(therapistTurns, approach);
    
    // Clinical safety assessment
    const clinicalSafety = calculateClinicalSafety(conv);
    
    // Conversation flow analysis
    const conversationFlow = calculateConversationFlow(conv);
    
    // Technique application scoring
    const techniqueApplication = calculateTechniqueApplication(therapistTurns, approach);
    
    // Ethical compliance check
    const ethicalCompliance = calculateEthicalCompliance(conv);

    const overallScore = (
      authenticity * 0.2 +
      therapeuticAccuracy * 0.25 +
      clinicalSafety * 0.2 +
      conversationFlow * 0.15 +
      techniqueApplication * 0.15 +
      ethicalCompliance * 0.05
    );

    return {
      overallScore: Math.round(overallScore),
      authenticity: Math.round(authenticity),
      therapeuticAccuracy: Math.round(therapeuticAccuracy),
      clinicalSafety: Math.round(clinicalSafety),
      conversationFlow: Math.round(conversationFlow),
      techniqueApplication: Math.round(techniqueApplication),
      ethicalCompliance: Math.round(ethicalCompliance)
    };
  };

  const calculateAuthenticity = (therapistTurns: ConversationTurn[], approach: string): number => {
    if (therapistTurns.length === 0) return 0;

    let score = 85; // Base score
    
    // Check for approach-consistent language patterns
    const approachKeywords = {
      'CBT': ['thoughts', 'thinking', 'behavior', 'evidence', 'challenge'],
      'Psychodynamic': ['patterns', 'past', 'unconscious', 'relationship', 'explore'],
      'Humanistic': ['feelings', 'experience', 'authentic', 'acceptance', 'growth'],
      'DBT': ['skills', 'distress', 'emotion', 'mindfulness', 'tolerance'],
      'EMDR': ['body', 'sensations', 'bilateral', 'resource', 'processing']
    };

    const keywords = approachKeywords[approach as keyof typeof approachKeywords] || [];
    const keywordUsage = therapistTurns.reduce((count, turn) => {
      return count + keywords.filter(keyword => 
        turn.content.toLowerCase().includes(keyword)
      ).length;
    }, 0);

    score += Math.min(keywordUsage * 2, 10); // Bonus for appropriate language

    // Penalize overly generic responses
    const genericPhrases = ['how does that make you feel', 'tell me more', 'i understand'];
    const genericUsage = therapistTurns.reduce((count, turn) => {
      return count + genericPhrases.filter(phrase => 
        turn.content.toLowerCase().includes(phrase)
      ).length;
    }, 0);

    score -= genericUsage * 3;

    return Math.max(0, Math.min(100, score));
  };

  const calculateTherapeuticAccuracy = (therapistTurns: ConversationTurn[], approach: string): number => {
    if (therapistTurns.length === 0) return 0;

    let score = 80; // Base score

    // Check technique application
    const totalTechniques = therapistTurns.reduce((sum, turn) => sum + turn.techniques.length, 0);
    const techniqueScore = Math.min(totalTechniques * 5, 15);
    score += techniqueScore;

    // Check for appropriate intervention types
    const interventionTypes = therapistTurns.map(turn => turn.interventionType).filter(Boolean);
    const interventionVariety = new Set(interventionTypes).size;
    score += Math.min(interventionVariety * 3, 10);

    return Math.max(0, Math.min(100, score));
  };

  const calculateClinicalSafety = (conv: ConversationTurn[]): number => {
    let score = 95; // High base score for safety

    // Check for potential safety concerns
    const riskKeywords = ['suicide', 'harm', 'kill', 'die', 'hurt'];
    const safetyResponses = ['safety', 'support', 'help', 'crisis', 'emergency'];

    conv.forEach(turn => {
      const hasRiskContent = riskKeywords.some(keyword => 
        turn.content.toLowerCase().includes(keyword)
      );
      
      if (hasRiskContent && turn.speaker === 'client') {
        // Check if therapist responded appropriately to risk
        const nextTurn = conv[conv.indexOf(turn) + 1];
        if (nextTurn && nextTurn.speaker === 'therapist') {
          const hasAppropriateResponse = safetyResponses.some(response => 
            nextTurn.content.toLowerCase().includes(response)
          );
          if (!hasAppropriateResponse) {
            score -= 20; // Significant penalty for not addressing safety
          }
        }
      }
    });

    return Math.max(0, Math.min(100, score));
  };

  const calculateConversationFlow = (conv: ConversationTurn[]): number => {
    if (conv.length < 2) return 50;

    let score = 85; // Base score

    // Check for appropriate turn-taking
    let properTurnTaking = 0;
    for (let i = 1; i < conv.length; i++) {
      if (conv[i].speaker !== conv[i-1].speaker) {
        properTurnTaking++;
      }
    }
    
    const turnTakingRatio = properTurnTaking / (conv.length - 1);
    score += (turnTakingRatio - 0.8) * 20; // Bonus for good turn-taking

    // Check response length appropriateness
    const avgTherapistLength = conv
      .filter(turn => turn.speaker === 'therapist')
      .reduce((sum, turn) => sum + turn.content.length, 0) / 
      conv.filter(turn => turn.speaker === 'therapist').length;

    if (avgTherapistLength > 50 && avgTherapistLength < 300) {
      score += 5; // Bonus for appropriate response length
    }

    return Math.max(0, Math.min(100, score));
  };

  const calculateTechniqueApplication = (therapistTurns: ConversationTurn[], approach: string): number => {
    if (therapistTurns.length === 0) return 0;

    const expectedTechniques = {
      'CBT': ['Cognitive restructuring', 'Thought challenging', 'Behavioral experiments'],
      'Psychodynamic': ['Interpretation', 'Transference analysis', 'Free association'],
      'Humanistic': ['Unconditional positive regard', 'Empathetic reflection', 'Genuineness'],
      'DBT': ['Distress tolerance', 'Emotion regulation', 'Mindfulness'],
      'EMDR': ['Bilateral stimulation', 'Resource installation', 'Desensitization']
    };

    const expected = expectedTechniques[approach as keyof typeof expectedTechniques] || [];
    const usedTechniques = therapistTurns.flatMap(turn => turn.techniques);
    
    const matchingTechniques = expected.filter(technique => 
      usedTechniques.some(used => used.toLowerCase().includes(technique.toLowerCase()))
    );

    const score = (matchingTechniques.length / expected.length) * 100;
    return Math.max(0, Math.min(100, score));
  };

  const calculateEthicalCompliance = (conv: ConversationTurn[]): number => {
    let score = 98; // High base score

    // Check for boundary violations
    const boundaryViolations = ['personal life', 'my experience', 'i think you should'];
    const therapistTurns = conv.filter(turn => turn.speaker === 'therapist');
    
    therapistTurns.forEach(turn => {
      boundaryViolations.forEach(violation => {
        if (turn.content.toLowerCase().includes(violation)) {
          score -= 5;
        }
      });
    });

    return Math.max(0, Math.min(100, score));
  };

  const runComprehensiveAssessment = async () => {
    setIsAssessing(true);
    
    // Simulate comprehensive assessment process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const metrics = realTimeMetrics || calculateRealTimeMetrics(conversation, therapeuticApproach);
    
    const assessment: QualityAssessment = {
      metrics,
      feedback: generateFeedback(metrics, conversation, therapeuticApproach),
      recommendations: generateRecommendations(metrics, therapeuticApproach),
      timestamp: new Date().toISOString()
    };
    
    setCurrentAssessment(assessment);
    setAssessmentHistory(prev => [...prev, assessment]);
    onQualityUpdate?.(assessment);
    setIsAssessing(false);
  };

  const generateFeedback = (metrics: QualityMetrics, conv: ConversationTurn[], approach: string) => {
    const strengths: string[] = [];
    const improvements: string[] = [];
    const risks: string[] = [];

    // Analyze strengths
    if (metrics.authenticity >= 85) {
      strengths.push('Authentic therapeutic voice consistent with chosen approach');
    }
    if (metrics.therapeuticAccuracy >= 80) {
      strengths.push('Strong application of evidence-based techniques');
    }
    if (metrics.clinicalSafety >= 90) {
      strengths.push('Excellent attention to client safety and risk factors');
    }
    if (metrics.conversationFlow >= 80) {
      strengths.push('Natural, engaging conversation flow');
    }

    // Identify improvements
    if (metrics.authenticity < 70) {
      improvements.push('Develop more approach-specific language and interventions');
    }
    if (metrics.therapeuticAccuracy < 75) {
      improvements.push('Increase use of evidence-based techniques for this approach');
    }
    if (metrics.techniqueApplication < 70) {
      improvements.push('Better integration of core therapeutic techniques');
    }
    if (metrics.conversationFlow < 70) {
      improvements.push('Work on more natural conversation pacing and responses');
    }

    // Identify risks
    if (metrics.clinicalSafety < 85) {
      risks.push('Potential safety concerns not adequately addressed');
    }
    if (metrics.ethicalCompliance < 90) {
      risks.push('Possible boundary or ethical issues detected');
    }
    if (metrics.overallScore < 60) {
      risks.push('Overall quality below acceptable training standards');
    }

    return { strengths, improvements, risks };
  };

  const generateRecommendations = (metrics: QualityMetrics, approach: string): string[] => {
    const recommendations: string[] = [];

    if (metrics.authenticity < 80) {
      recommendations.push(`Study more ${approach} case examples and language patterns`);
    }
    if (metrics.therapeuticAccuracy < 80) {
      recommendations.push('Review core techniques and their appropriate applications');
    }
    if (metrics.conversationFlow < 75) {
      recommendations.push('Practice active listening and response timing');
    }
    if (metrics.techniqueApplication < 75) {
      recommendations.push('Focus on technique integration and natural application');
    }

    recommendations.push('Continue practicing with diverse client presentations');
    recommendations.push('Seek supervision for complex cases and ethical dilemmas');

    return recommendations;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number): string => {
    if (score >= 85) return '✓';
    if (score >= 70) return '⚠';
    return '✗';
  };

  return (
    <div className="quality-assessment-demo bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800">
          Real-time Quality & Authenticity Assessment
        </h4>
        <button
          onClick={runComprehensiveAssessment}
          disabled={isAssessing || conversation.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAssessing ? 'Assessing...' : 'Run Full Assessment'}
        </button>
      </div>

      {/* Real-time Metrics Dashboard */}
      {realTimeMetrics && (
        <div className="mb-6">
          <h5 className="font-medium text-gray-700 mb-4">Real-time Quality Metrics</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(realTimeMetrics).map(([key, value]) => (
              <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold mb-1 ${getScoreColor(value)}`}>
                  {value}%
                </div>
                <div className="text-xs text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment Loading */}
      {isAssessing && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span className="text-purple-800 font-medium">Running comprehensive quality assessment...</span>
          </div>
          <div className="mt-3 text-sm text-purple-700">
            Analyzing therapeutic accuracy, authenticity, safety compliance, and conversation flow
          </div>
        </div>
      )}

      {/* Comprehensive Assessment Results */}
      {currentAssessment && !isAssessing && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(currentAssessment.metrics.overallScore)}`}>
              {currentAssessment.metrics.overallScore}%
            </div>
            <div className="text-lg font-medium text-gray-700">Overall Quality Score</div>
            <div className="text-sm text-gray-600 mt-1">
              {currentAssessment.metrics.overallScore >= 85 ? 'Excellent' :
               currentAssessment.metrics.overallScore >= 70 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(currentAssessment.metrics).filter(([key]) => key !== 'overallScore').map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium text-gray-800 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {key === 'authenticity' && 'Approach-consistent language and style'}
                    {key === 'therapeuticAccuracy' && 'Evidence-based technique application'}
                    {key === 'clinicalSafety' && 'Risk assessment and safety protocols'}
                    {key === 'conversationFlow' && 'Natural dialogue and pacing'}
                    {key === 'techniqueApplication' && 'Proper use of therapeutic methods'}
                    {key === 'ethicalCompliance' && 'Professional boundaries and ethics'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${getScoreColor(value)}`}>
                    {getScoreIcon(value)}
                  </span>
                  <span className={`font-bold ${getScoreColor(value)}`}>
                    {value}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Feedback Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strengths */}
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <h6 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Strengths
              </h6>
              <ul className="space-y-2">
                {currentAssessment.feedback.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
              <h6 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
                <span className="text-yellow-600">⚠</span>
                Areas for Improvement
              </h6>
              <ul className="space-y-2">
                {currentAssessment.feedback.improvements.map((improvement, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <h6 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                <span className="text-red-600">⚠</span>
                Risk Factors
              </h6>
              <ul className="space-y-2">
                {currentAssessment.feedback.risks.length > 0 ? (
                  currentAssessment.feedback.risks.map((risk, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{risk}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-600 italic">No significant risks identified</li>
                )}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="border rounded-lg p-4 bg-indigo-50 border-indigo-200">
            <h6 className="font-medium text-indigo-800 mb-3">Recommendations for Improvement</h6>
            <ul className="space-y-2">
              {currentAssessment.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-indigo-700 flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">→</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Empty State */}
      {conversation.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm">Generate a conversation to see real-time quality assessment and authenticity scoring</p>
        </div>
      )}
    </div>
  );
};

export default QualityAssessmentDemo;
