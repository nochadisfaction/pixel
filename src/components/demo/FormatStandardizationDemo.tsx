import React, { useState, useEffect } from 'react';

interface ConversationTurn {
  speaker: 'therapist' | 'client';
  content: string;
  techniques: string[];
  emotionalState?: string;
  interventionType?: string;
}

interface TrainingDataFormat {
  format: string;
  description: string;
  structure: any;
  example: any;
  useCase: string;
}

interface FormatStandardizationDemoProps {
  conversation?: ConversationTurn[];
  therapeuticApproach?: string;
  qualityScore?: number;
}

const FormatStandardizationDemo: React.FC<FormatStandardizationDemoProps> = ({
  conversation = [],
  therapeuticApproach = 'CBT',
  qualityScore = 85
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>('huggingface');
  const [standardizedData, setStandardizedData] = useState<any>(null);
  const [isConverting, setIsConverting] = useState(false);

  const trainingFormats: TrainingDataFormat[] = [
    {
      format: 'huggingface',
      description: 'Hugging Face Datasets Format',
      useCase: 'Compatible with Transformers library and Hugging Face Hub',
      structure: {
        conversations: [
          {
            id: 'string',
            messages: [
              { role: 'system', content: 'string' },
              { role: 'user', content: 'string' },
              { role: 'assistant', content: 'string' }
            ],
            metadata: {
              therapeutic_approach: 'string',
              quality_score: 'number',
              techniques: ['array'],
              safety_score: 'number'
            }
          }
        ]
      },
      example: {
        id: 'conv_001',
        messages: [
          { role: 'system', content: 'You are a CBT therapist helping a client with anxiety.' },
          { role: 'user', content: 'I keep worrying about work presentations.' },
          { role: 'assistant', content: 'What specific thoughts go through your mind before presentations?' }
        ],
        metadata: {
          therapeutic_approach: 'CBT',
          quality_score: 87,
          techniques: ['cognitive_restructuring', 'thought_challenging'],
          safety_score: 95
        }
      }
    },
    {
      format: 'openai',
      description: 'OpenAI Fine-tuning Format',
      useCase: 'Fine-tuning GPT models with conversation data',
      structure: {
        messages: [
          { role: 'system', content: 'string' },
          { role: 'user', content: 'string' },
          { role: 'assistant', content: 'string' }
        ]
      },
      example: {
        messages: [
          { role: 'system', content: 'You are a skilled CBT therapist. Use cognitive restructuring techniques to help clients challenge negative thought patterns.' },
          { role: 'user', content: 'I always think I\'m going to fail at work presentations. Everyone will see I don\'t know what I\'m doing.' },
          { role: 'assistant', content: 'I hear how distressing these thoughts are. Let\'s examine the evidence for this belief. Can you think of presentations that went well, or feedback you\'ve received that contradicts this thought?' }
        ]
      }
    },
    {
      format: 'jsonl',
      description: 'JSON Lines Format',
      useCase: 'Streaming data processing and large dataset handling',
      structure: {
        input: 'string',
        output: 'string',
        metadata: {
          approach: 'string',
          techniques: ['array'],
          quality: 'number'
        }
      },
      example: {
        input: 'I keep having panic attacks when I think about my presentation tomorrow.',
        output: 'Panic attacks can be very frightening. Let\'s work on some grounding techniques you can use. Can you name 5 things you can see right now?',
        metadata: {
          approach: 'CBT',
          techniques: ['grounding', 'present_moment_awareness'],
          quality: 92
        }
      }
    },
    {
      format: 'alpaca',
      description: 'Alpaca Instruction Format',
      useCase: 'Instruction-following model training',
      structure: {
        instruction: 'string',
        input: 'string',
        output: 'string'
      },
      example: {
        instruction: 'Respond as a CBT therapist helping a client with work-related anxiety. Use cognitive restructuring techniques.',
        input: 'I\'m convinced I\'ll mess up my presentation and everyone will think I\'m incompetent.',
        output: 'Let\'s examine this thought together. What evidence do you have that supports this belief? And what evidence might contradict it? Sometimes our minds predict the worst-case scenario, but reality is often different.'
      }
    },
    {
      format: 'clinical',
      description: 'Clinical Training Format',
      useCase: 'Specialized therapeutic training with detailed annotations',
      structure: {
        session_id: 'string',
        therapeutic_approach: 'string',
        client_presentation: 'object',
        dialogue: ['array'],
        clinical_notes: 'object',
        supervision_feedback: 'object'
      },
      example: {
        session_id: 'session_001',
        therapeutic_approach: 'CBT',
        client_presentation: {
          presenting_problem: 'work anxiety',
          severity: 'moderate',
          risk_factors: 'none identified'
        },
        dialogue: [
          {
            speaker: 'client',
            content: 'I can\'t stop worrying about my presentation.',
            emotional_state: 'anxious',
            timestamp: '00:02:15'
          },
          {
            speaker: 'therapist',
            content: 'What specific thoughts are contributing to this worry?',
            techniques: ['cognitive_restructuring'],
            intervention_type: 'assessment',
            timestamp: '00:02:18'
          }
        ],
        clinical_notes: {
          formulation: 'Client exhibits catastrophic thinking patterns',
          interventions_used: ['thought_challenging', 'evidence_examination'],
          homework_assigned: 'thought_record_worksheet'
        }
      }
    },
    {
      format: 'research',
      description: 'Research Dataset Format',
      useCase: 'Academic research and analysis',
      structure: {
        study_id: 'string',
        participant_demographics: 'object',
        conversation_data: 'array',
        outcome_measures: 'object',
        annotations: 'object'
      },
      example: {
        study_id: 'study_cbt_001',
        participant_demographics: {
          age_range: '25-35',
          gender: 'anonymized',
          diagnosis: 'GAD'
        },
        conversation_data: [
          {
            turn: 1,
            speaker: 'therapist',
            utterance: 'What brings you here today?',
            speech_acts: ['question', 'rapport_building']
          }
        ],
        outcome_measures: {
          pre_session_anxiety: 7,
          post_session_anxiety: 5,
          therapeutic_alliance: 8.2
        }
      }
    }
  ];

  const convertToFormat = async (format: string) => {
    setIsConverting(true);
    
    // Simulate conversion process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const formatConfig = trainingFormats.find(f => f.format === format);
    if (!formatConfig || conversation.length === 0) {
      setIsConverting(false);
      return;
    }

    let converted: any;

    switch (format) {
      case 'huggingface':
        converted = convertToHuggingFace();
        break;
      case 'openai':
        converted = convertToOpenAI();
        break;
      case 'jsonl':
        converted = convertToJSONL();
        break;
      case 'alpaca':
        converted = convertToAlpaca();
        break;
      case 'clinical':
        converted = convertToClinical();
        break;
      case 'research':
        converted = convertToResearch();
        break;
      default:
        converted = conversation;
    }

    setStandardizedData(converted);
    setIsConverting(false);
  };

  const convertToHuggingFace = () => {
    const messages = [
      {
        role: 'system',
        content: `You are a ${therapeuticApproach} therapist. Provide evidence-based therapeutic responses.`
      }
    ];

    conversation.forEach(turn => {
      messages.push({
        role: turn.speaker === 'client' ? 'user' : 'assistant',
        content: turn.content
      });
    });

    return {
      id: `conv_${Date.now()}`,
      messages,
      metadata: {
        therapeutic_approach: therapeuticApproach,
        quality_score: qualityScore,
        techniques: [...new Set(conversation.flatMap(turn => turn.techniques))],
        safety_score: 95,
        conversation_length: conversation.length,
        generated_at: new Date().toISOString()
      }
    };
  };

  const convertToOpenAI = () => {
    const messages = [
      {
        role: 'system',
        content: `You are a skilled ${therapeuticApproach} therapist. Use evidence-based techniques to help clients with their concerns while maintaining professional boundaries and ensuring safety.`
      }
    ];

    conversation.forEach(turn => {
      messages.push({
        role: turn.speaker === 'client' ? 'user' : 'assistant',
        content: turn.content
      });
    });

    return { messages };
  };

  const convertToJSONL = () => {
    const jsonlData = [];
    
    for (let i = 0; i < conversation.length - 1; i += 2) {
      const clientTurn = conversation[i];
      const therapistTurn = conversation[i + 1];
      
      if (clientTurn?.speaker === 'client' && therapistTurn?.speaker === 'therapist') {
        jsonlData.push({
          input: clientTurn.content,
          output: therapistTurn.content,
          metadata: {
            approach: therapeuticApproach,
            techniques: therapistTurn.techniques,
            quality: qualityScore,
            intervention_type: therapistTurn.interventionType
          }
        });
      }
    }
    
    return jsonlData;
  };

  const convertToAlpaca = () => {
    const alpacaData = [];
    
    for (let i = 0; i < conversation.length - 1; i += 2) {
      const clientTurn = conversation[i];
      const therapistTurn = conversation[i + 1];
      
      if (clientTurn?.speaker === 'client' && therapistTurn?.speaker === 'therapist') {
        alpacaData.push({
          instruction: `Respond as a ${therapeuticApproach} therapist. Use appropriate therapeutic techniques and maintain professional boundaries.`,
          input: clientTurn.content,
          output: therapistTurn.content
        });
      }
    }
    
    return alpacaData;
  };

  const convertToClinical = () => {
    return {
      session_id: `session_${Date.now()}`,
      therapeutic_approach: therapeuticApproach,
      client_presentation: {
        presenting_problem: 'extracted from conversation',
        severity: qualityScore > 80 ? 'well-managed' : 'moderate',
        risk_factors: 'assessed during session'
      },
      dialogue: conversation.map((turn, index) => ({
        turn_number: index + 1,
        speaker: turn.speaker,
        content: turn.content,
        techniques: turn.techniques,
        emotional_state: turn.emotionalState,
        intervention_type: turn.interventionType,
        timestamp: `00:${String(Math.floor(index * 2)).padStart(2, '0')}:${String((index * 2) % 60).padStart(2, '0')}`
      })),
      clinical_notes: {
        formulation: 'Generated from conversation analysis',
        interventions_used: [...new Set(conversation.flatMap(turn => turn.techniques))],
        session_quality: qualityScore,
        supervision_notes: 'Automated assessment completed'
      }
    };
  };

  const convertToResearch = () => {
    return {
      study_id: `research_${Date.now()}`,
      participant_demographics: {
        age_range: 'anonymized',
        gender: 'anonymized',
        diagnosis: 'anonymized'
      },
      conversation_data: conversation.map((turn, index) => ({
        turn: index + 1,
        speaker: turn.speaker,
        utterance: turn.content,
        speech_acts: turn.techniques,
        emotional_markers: turn.emotionalState ? [turn.emotionalState] : [],
        intervention_category: turn.interventionType
      })),
      outcome_measures: {
        conversation_quality: qualityScore,
        therapeutic_alliance: Math.min(qualityScore + 5, 100),
        technique_adherence: Math.max(qualityScore - 10, 0)
      },
      annotations: {
        therapeutic_approach: therapeuticApproach,
        quality_verified: true,
        ethical_review: 'approved'
      }
    };
  };

  useEffect(() => {
    if (conversation.length > 0) {
      convertToFormat(selectedFormat);
    }
  }, [selectedFormat, conversation, therapeuticApproach, qualityScore]);

  const downloadData = (format: string) => {
    if (!standardizedData) return;

    const filename = `training_data_${format}_${Date.now()}`;
    let content: string;
    let mimeType: string;

    if (format === 'jsonl') {
      content = Array.isArray(standardizedData) 
        ? standardizedData.map(item => JSON.stringify(item)).join('\n')
        : JSON.stringify(standardizedData);
      mimeType = 'application/jsonl';
    } else {
      content = JSON.stringify(standardizedData, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format === 'jsonl' ? 'jsonl' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="format-standardization-demo bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800">
          Training Data Format Standardization
        </h4>
        <button
          onClick={() => downloadData(selectedFormat)}
          disabled={!standardizedData}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Download {selectedFormat.toUpperCase()}
        </button>
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <h5 className="font-medium text-gray-700 mb-3">Select Training Data Format</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {trainingFormats.map(format => (
            <button
              key={format.format}
              onClick={() => setSelectedFormat(format.format)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedFormat === format.format
                  ? 'bg-teal-100 border-teal-300 text-teal-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium text-sm mb-1">{format.description}</div>
              <div className="text-xs text-gray-600">{format.useCase}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Details */}
      {trainingFormats.find(f => f.format === selectedFormat) && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Structure Schema */}
          <div className="border rounded-lg p-4">
            <h6 className="font-medium text-gray-700 mb-3">Data Structure Schema</h6>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(trainingFormats.find(f => f.format === selectedFormat)?.structure, null, 2)}
            </pre>
          </div>

          {/* Example Data */}
          <div className="border rounded-lg p-4">
            <h6 className="font-medium text-gray-700 mb-3">Example Format</h6>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {JSON.stringify(trainingFormats.find(f => f.format === selectedFormat)?.example, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Conversion Status */}
      {isConverting && (
        <div className="mb-6 p-4 bg-teal-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            <span className="text-teal-800 font-medium">Converting to {selectedFormat.toUpperCase()} format...</span>
          </div>
        </div>
      )}

      {/* Standardized Output */}
      {standardizedData && !isConverting && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h5 className="font-medium text-gray-700">Standardized Training Data</h5>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs font-medium">
                {selectedFormat.toUpperCase()}
              </span>
              <span>
                {Array.isArray(standardizedData) ? standardizedData.length : 1} record(s)
              </span>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Formatted Output</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(standardizedData, null, 2));
                }}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Copy to Clipboard
              </button>
            </div>
            <div className="p-4">
              <pre className="text-xs bg-white border rounded p-3 overflow-x-auto max-h-96">
                {JSON.stringify(standardizedData, null, 2)}
              </pre>
            </div>
          </div>

          {/* Format Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">
                {Array.isArray(standardizedData) ? standardizedData.length : 1}
              </div>
              <div className="text-xs text-gray-600">Records</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">
                {JSON.stringify(standardizedData).length}
              </div>
              <div className="text-xs text-gray-600">Characters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-800">
                {Math.round(JSON.stringify(standardizedData).length / 1024)}KB
              </div>
              <div className="text-xs text-gray-600">File Size</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-teal-600">
                {qualityScore}%
              </div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {conversation.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-teal-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm">Generate a conversation to see format standardization options for training data</p>
        </div>
      )}
    </div>
  );
};

export default FormatStandardizationDemo;
