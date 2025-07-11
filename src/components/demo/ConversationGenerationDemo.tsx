import React, { useState, useEffect } from 'react';
import type { ClinicalCase } from '../../lib/types/psychology-pipeline';
import TherapeuticApproachShowcase from './TherapeuticApproachShowcase';
import QualityAssessmentDemo from './QualityAssessmentDemo';
import FormatStandardizationDemo from './FormatStandardizationDemo';

interface ConversationTurn {
  speaker: 'therapist' | 'client';
  content: string;
  timestamp: string;
  techniques: string[];
  emotionalState?: string;
  interventionType?: string;
}

interface KnowledgeSource {
  type: 'dsm5' | 'pdm2' | 'bigfive' | 'clinical-guidelines';
  content: string;
  relevanceScore: number;
  applicationContext: string;
}

interface ConversationGenerationDemoProps {
  clinicalCase?: Partial<ClinicalCase>;
}

const ConversationGenerationDemo: React.FC<ConversationGenerationDemoProps> = ({
  clinicalCase
}) => {
  const [selectedApproach, setSelectedApproach] = useState<string>('CBT');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [generatedConversation, setGeneratedConversation] = useState<ConversationTurn[]>([]);
  const [transformationSteps, setTransformationSteps] = useState<string[]>([]);
  const [currentQualityScore, setCurrentQualityScore] = useState<number>(85);

  const therapeuticApproaches = [
    { value: 'CBT', label: 'Cognitive Behavioral Therapy', color: 'blue' },
    { value: 'DBT', label: 'Dialectical Behavior Therapy', color: 'green' },
    { value: 'Psychodynamic', label: 'Psychodynamic Therapy', color: 'purple' },
    { value: 'Humanistic', label: 'Humanistic/Person-Centered', color: 'orange' },
    { value: 'EMDR', label: 'EMDR Therapy', color: 'red' },
    { value: 'Solution-Focused', label: 'Solution-Focused Brief Therapy', color: 'teal' }
  ];

  const generationSteps = [
    'Analyzing clinical knowledge base',
    'Identifying relevant therapeutic techniques',
    'Mapping knowledge to dialogue patterns',
    'Generating client responses based on case profile',
    'Applying therapeutic approach methodology',
    'Ensuring clinical authenticity and safety',
    'Formatting for training data standards'
  ];

  const generateConversation = async () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setTransformationSteps([]);
    
    try {
      // Use the conversation converter API from task 5.4
      const { convertKnowledgeToConversation } = await import('../../lib/api/psychology-pipeline-demo');
      
      // Prepare knowledge base and client profile for conversion
      const conversionRequest = {
        knowledgeBase: {
          dsm5Criteria: [
            'Persistent depressed mood or loss of interest',
            'Significant weight loss or gain',
            'Insomnia or hypersomnia',
            'Psychomotor agitation or retardation',
            'Fatigue or loss of energy'
          ],
          therapeuticTechniques: getApproachTechniques(selectedApproach),
          clinicalGuidelines: [
            'Establish therapeutic rapport',
            'Assess for safety and risk factors',
            'Apply evidence-based interventions',
            'Monitor treatment progress'
          ]
        },
        clientProfile: {
          demographics: {
            age: clinicalCase?.patientInfo?.age || 35,
            gender: clinicalCase?.patientInfo?.gender || 'female',
            background: clinicalCase?.patientInfo?.background || 'Professional seeking support'
          },
          presentingProblem: clinicalCase?.presentingProblem || 'anxiety and stress',
          severity: 'medium' as const,
          riskFactors: ['work stress', 'sleep difficulties']
        },
        conversationParameters: {
          therapeuticApproach: selectedApproach,
          sessionLength: 5,
          targetTechniques: getApproachTechniques(selectedApproach),
          qualityThreshold: 80
        }
      };
      
      // Step-by-step generation process with API integration
      for (let i = 0; i < generationSteps.length; i++) {
        setCurrentStep(i);
        setTransformationSteps(prev => [...prev, generationSteps[i]]);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // Call the conversation converter API
      const conversionResponse = await convertKnowledgeToConversation(conversionRequest);
      
      // Convert API response to local format
      const conversation: ConversationTurn[] = conversionResponse.generatedDialogue.map(turn => ({
        speaker: turn.speaker,
        content: turn.content,
        timestamp: turn.timestamp,
        techniques: turn.techniques,
        emotionalState: turn.emotionalState,
        interventionType: turn.interventionType
      }));
      
      // Generate knowledge sources from API response
      const sources: KnowledgeSource[] = conversionResponse.knowledgeMapping.map((mapping, index) => ({
        type: mapping.appliedKnowledge[0]?.source.includes('dsm5') ? 'dsm5' : 
              mapping.appliedKnowledge[0]?.source.includes('clinical') ? 'clinical-guidelines' :
              mapping.appliedKnowledge[0]?.source.includes('therapeutic') ? 'clinical-guidelines' : 'bigfive',
        content: mapping.appliedKnowledge[0]?.content || 'Knowledge applied',
        relevanceScore: Math.round((mapping.appliedKnowledge[0]?.confidence || 0.8) * 100),
        applicationContext: mapping.appliedKnowledge[0]?.application || 'Therapeutic intervention'
      }));
      
      setKnowledgeSources(sources);
      setGeneratedConversation(conversation);
      setCurrentQualityScore(conversionResponse.qualityMetrics.overallScore);
      
      console.log('Conversation Converter Response:', conversionResponse);
      
    } catch (_error) {
      console.error('Error with conversation converter:', error);
      
      // Fallback to original generation method
      for (let i = 0; i < generationSteps.length; i++) {
        setCurrentStep(i);
        setTransformationSteps(prev => [...prev, generationSteps[i]]);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Generate knowledge sources
      const sources = generateKnowledgeSources(selectedApproach, clinicalCase);
      setKnowledgeSources(sources);

      // Generate conversation based on knowledge and approach
      const conversation = await generateDialogue(selectedApproach, clinicalCase, sources);
      setGeneratedConversation(conversation);
    }
    
    setIsGenerating(false);
  };

  const generateKnowledgeSources = (approach: string, caseData?: Partial<ClinicalCase>): KnowledgeSource[] => {
    const sources: KnowledgeSource[] = [];

    // DSM-5 Knowledge
    if (caseData?.clinicalFormulation?.provisionalDiagnosis) {
      sources.push({
        type: 'dsm5',
        content: `Diagnostic criteria for ${caseData.clinicalFormulation.provisionalDiagnosis[0]}`,
        relevanceScore: 95,
        applicationContext: 'Assessment and symptom identification'
      });
    }

    // Approach-specific knowledge
    switch (approach) {
      case 'CBT':
        sources.push({
          type: 'clinical-guidelines',
          content: 'Cognitive restructuring techniques for negative thought patterns',
          relevanceScore: 90,
          applicationContext: 'Challenging cognitive distortions'
        });
        sources.push({
          type: 'clinical-guidelines',
          content: 'Behavioral activation strategies for mood improvement',
          relevanceScore: 85,
          applicationContext: 'Increasing positive activities'
        });
        break;
      case 'DBT':
        sources.push({
          type: 'clinical-guidelines',
          content: 'Distress tolerance skills: TIPP, ACCEPTS, distraction techniques',
          relevanceScore: 92,
          applicationContext: 'Crisis management and emotional regulation'
        });
        break;
      case 'Psychodynamic':
        sources.push({
          type: 'pdm2',
          content: 'Unconscious patterns and defense mechanisms',
          relevanceScore: 88,
          applicationContext: 'Exploring underlying psychological dynamics'
        });
        break;
      case 'Humanistic':
        sources.push({
          type: 'clinical-guidelines',
          content: 'Unconditional positive regard and empathetic responding',
          relevanceScore: 87,
          applicationContext: 'Building therapeutic rapport and self-acceptance'
        });
        break;
    }

    // Personality factors
    sources.push({
      type: 'bigfive',
      content: 'Personality trait considerations for therapeutic engagement',
      relevanceScore: 75,
      applicationContext: 'Tailoring intervention style to client personality'
    });

    return sources;
  };

  const generateDialogue = async (approach: string, caseData?: Partial<ClinicalCase>, sources?: KnowledgeSource[]): Promise<ConversationTurn[]> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const conversation: ConversationTurn[] = [];
    const presentingProblem = caseData?.presentingProblem || 'anxiety and stress';

    // Opening exchange
    conversation.push({
      speaker: 'therapist',
      content: getTherapistOpening(approach),
      timestamp: new Date().toISOString(),
      techniques: ['Rapport building', 'Open-ended questioning'],
      interventionType: 'Assessment'
    });

    conversation.push({
      speaker: 'client',
      content: `I've been struggling with ${presentingProblem.toLowerCase()}. It's been really difficult lately, and I'm not sure how to cope.`,
      timestamp: new Date().toISOString(),
      techniques: [],
      emotionalState: 'Anxious, seeking help'
    });

    // Approach-specific therapeutic response
    conversation.push({
      speaker: 'therapist',
      content: getApproachSpecificResponse(approach, presentingProblem),
      timestamp: new Date().toISOString(),
      techniques: getApproachTechniques(approach),
      interventionType: 'Therapeutic intervention'
    });

    // Client processing response
    conversation.push({
      speaker: 'client',
      content: getClientProcessingResponse(approach),
      timestamp: new Date().toISOString(),
      techniques: [],
      emotionalState: 'Reflective, engaged'
    });

    // Follow-up therapeutic work
    conversation.push({
      speaker: 'therapist',
      content: getFollowUpResponse(approach),
      timestamp: new Date().toISOString(),
      techniques: getAdvancedTechniques(approach),
      interventionType: 'Skill building'
    });

    return conversation;
  };

  const getTherapistOpening = (approach: string): string => {
    const openings = {
      'CBT': "I'd like to understand what's been bringing you distress lately. Can you tell me about what's been on your mind?",
      'DBT': "Thank you for being here today. I want to create a space where you can share what's been challenging for you. What would be most helpful to talk about?",
      'Psychodynamic': "I'm interested in hearing about what's been troubling you. Sometimes our current struggles connect to deeper patterns - what comes to mind for you?",
      'Humanistic': "I want you to know this is your space to share whatever feels important to you right now. What's been weighing on your heart?",
      'EMDR': "I appreciate you taking this step to seek support. Can you help me understand what's been most distressing for you recently?",
      'Solution-Focused': "I'm curious about what positive changes you're hoping to see in your life. What would need to be different for you to feel things are moving in the right direction?"
    };
    return openings[approach as keyof typeof openings] || openings['CBT'];
  };

  const getApproachSpecificResponse = (approach: string, problem: string): string => {
    const responses = {
      'CBT': `I hear that ${problem.toLowerCase()} has been really challenging. Let's explore what thoughts tend to go through your mind when you're feeling this way. Sometimes our thoughts can intensify our emotional experiences.`,
      'DBT': `It sounds like you're experiencing a lot of distress around ${problem.toLowerCase()}. That takes courage to share. Let's work on some skills that can help you manage these intense feelings when they arise.`,
      'Psychodynamic': `Your struggle with ${problem.toLowerCase()} may be connected to deeper patterns in how you relate to yourself and others. I'm wondering what this reminds you of from your past experiences.`,
      'Humanistic': `I can hear the pain in your voice about ${problem.toLowerCase()}. Your feelings are completely valid. What does it feel like to acknowledge this struggle out loud?`,
      'EMDR': `Thank you for sharing about ${problem.toLowerCase()}. When you think about this issue, what images, thoughts, or body sensations come up for you?`,
      'Solution-Focused': `Even though ${problem.toLowerCase()} has been difficult, I'm curious about times when it's been slightly better or more manageable. What was different during those moments?`
    };
    return responses[approach as keyof typeof responses] || responses['CBT'];
  };

  const getApproachTechniques = (approach: string): string[] => {
    const techniques = {
      'CBT': ['Cognitive restructuring', 'Thought challenging', 'Psychoeducation'],
      'DBT': ['Validation', 'Distress tolerance', 'Mindfulness'],
      'Psychodynamic': ['Interpretation', 'Exploration of patterns', 'Transference work'],
      'Humanistic': ['Unconditional positive regard', 'Empathetic reflection', 'Genuineness'],
      'EMDR': ['Bilateral stimulation preparation', 'Resource installation', 'Safe place visualization'],
      'Solution-Focused': ['Exception finding', 'Scaling questions', 'Goal setting']
    };
    return techniques[approach as keyof typeof techniques] || techniques['CBT'];
  };

  const getClientProcessingResponse = (approach: string): string => {
    const responses = {
      'CBT': "I never really thought about it that way... I guess I do have a lot of negative thoughts that just spiral. Maybe there's a pattern there.",
      'DBT': "That makes sense. I do feel overwhelmed a lot, and I don't really know how to handle it when it gets intense. I'd like to learn some skills.",
      'Psychodynamic': "Hmm, that's interesting. This does remind me of how I felt when... I never connected those things before.",
      'Humanistic': "It feels scary but also relieving to say it out loud. I've been holding this in for so long.",
      'EMDR': "When I think about it, I get this tight feeling in my chest and I see myself just... stuck. It's hard to describe.",
      'Solution-Focused': "Actually, now that you mention it, there was last week when I felt a bit better. I think I was more active that day."
    };
    return responses[approach as keyof typeof responses] || responses['CBT'];
  };

  const getFollowUpResponse = (approach: string): string => {
    const responses = {
      'CBT': "That's a great insight. Let's practice identifying these thought patterns together. When you notice a negative thought, we can examine the evidence for and against it.",
      'DBT': "I'm glad you're open to learning skills. Let's start with a grounding technique you can use when you feel overwhelmed. Try the 5-4-3-2-1 method...",
      'Psychodynamic': "These connections you're making are important. Our early experiences often shape how we respond to current situations. Let's explore this pattern more.",
      'Humanistic': "Your willingness to be vulnerable here shows real strength. How does it feel to give yourself permission to acknowledge your struggles?",
      'EMDR': "That body awareness is important information. Let's work on creating a sense of safety and calm before we process these difficult experiences.",
      'Solution-Focused': "That's valuable information about what works for you. Let's explore what specifically about being more active helped, and how we can build on that."
    };
    return responses[approach as keyof typeof responses] || responses['CBT'];
  };

  const getAdvancedTechniques = (approach: string): string[] => {
    const techniques = {
      'CBT': ['Behavioral experiments', 'Homework assignments', 'Relapse prevention'],
      'DBT': ['TIPP skills', 'Opposite action', 'Interpersonal effectiveness'],
      'Psychodynamic': ['Dream analysis', 'Free association', 'Working through'],
      'Humanistic': ['Process reflection', 'Emotional experiencing', 'Self-actualization'],
      'EMDR': ['Dual attention', 'Resource strengthening', 'Future template'],
      'Solution-Focused': ['Miracle question', 'Preferred future', 'Compliments']
    };
    return techniques[approach as keyof typeof techniques] || techniques['CBT'];
  };

  const getApproachColor = (approach: string) => {
    const approachData = therapeuticApproaches.find(a => a.value === approach);
    return approachData?.color || 'blue';
  };

  return (
    <div className="conversation-generation-demo space-y-8">
      {/* Knowledge-to-Dialogue Transformation */}
      <div className="bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800">
          Knowledge-to-Dialogue Transformation
        </h4>
        <button
          onClick={generateConversation}
          disabled={isGenerating}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Conversation'}
        </button>
      </div>

      {/* Therapeutic Approach Selection */}
      <div className="mb-6">
        <h5 className="font-medium text-gray-700 mb-3">Select Therapeutic Approach</h5>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {therapeuticApproaches.map(approach => (
            <button
              key={approach.value}
              onClick={() => setSelectedApproach(approach.value)}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                selectedApproach === approach.value
                  ? `bg-${approach.color}-100 border-${approach.color}-300 text-${approach.color}-800`
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {approach.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
          <h5 className="font-medium text-indigo-800 mb-3">Transformation in Progress</h5>
          <div className="space-y-2">
            {generationSteps.map((step, index) => (
              <div key={index} className={`flex items-center gap-3 text-sm ${
                index <= currentStep ? 'text-indigo-700' : 'text-gray-400'
              }`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  index < currentStep ? 'bg-indigo-600 text-white' :
                  index === currentStep ? 'bg-indigo-400 text-white animate-pulse' :
                  'bg-gray-200'
                }`}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Sources */}
      {knowledgeSources.length > 0 && !isGenerating && (
        <div className="mb-6 border rounded-lg p-4">
          <h5 className="font-medium text-gray-700 mb-3">Knowledge Sources Applied</h5>
          <div className="space-y-3">
            {knowledgeSources.map((source, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  source.type === 'dsm5' ? 'bg-blue-100 text-blue-800' :
                  source.type === 'pdm2' ? 'bg-purple-100 text-purple-800' :
                  source.type === 'bigfive' ? 'bg-green-100 text-green-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {source.type.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{source.content}</p>
                  <p className="text-xs text-gray-600 mt-1">{source.applicationContext}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {source.relevanceScore}% relevance
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Conversation */}
      {generatedConversation.length > 0 && !isGenerating && (
        <div className="border rounded-lg p-4">
          <h5 className="font-medium text-gray-700 mb-4">Generated Therapeutic Dialogue</h5>
          <div className="space-y-4">
            {generatedConversation.map((turn, index) => (
              <div key={index} className={`flex gap-4 ${
                turn.speaker === 'therapist' ? 'justify-start' : 'justify-end'
              }`}>
                <div className={`max-w-3xl p-4 rounded-lg ${
                  turn.speaker === 'therapist' 
                    ? `bg-${getApproachColor(selectedApproach)}-50 border-l-4 border-${getApproachColor(selectedApproach)}-400`
                    : 'bg-gray-100 border-l-4 border-gray-400'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-medium text-sm ${
                      turn.speaker === 'therapist' 
                        ? `text-${getApproachColor(selectedApproach)}-800`
                        : 'text-gray-800'
                    }`}>
                      {turn.speaker === 'therapist' ? 'Therapist' : 'Client'}
                    </span>
                    {turn.interventionType && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        {turn.interventionType}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{turn.content}</p>
                  
                  {turn.techniques.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {turn.techniques.map((technique, techIndex) => (
                        <span key={techIndex} className={`text-xs px-2 py-1 rounded-full ${
                          turn.speaker === 'therapist'
                            ? `bg-${getApproachColor(selectedApproach)}-100 text-${getApproachColor(selectedApproach)}-700`
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {technique}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {turn.emotionalState && (
                    <div className="text-xs text-gray-600 italic">
                      Emotional state: {turn.emotionalState}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {generatedConversation.length === 0 && !isGenerating && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm">Select a therapeutic approach and click "Generate Conversation" to see knowledge-to-dialogue transformation</p>
        </div>
      )}
      </div>

      {/* Therapeutic Approach Showcase */}
      <TherapeuticApproachShowcase clinicalCase={clinicalCase} />

      {/* Quality Assessment Demo */}
      <QualityAssessmentDemo 
        conversation={generatedConversation}
        therapeuticApproach={selectedApproach}
        onQualityUpdate={(assessment) => setCurrentQualityScore(assessment.metrics.overallScore)}
      />

      {/* Format Standardization Demo */}
      <FormatStandardizationDemo
        conversation={generatedConversation}
        therapeuticApproach={selectedApproach}
        qualityScore={currentQualityScore}
      />
    </div>
  );
};

export default ConversationGenerationDemo;
