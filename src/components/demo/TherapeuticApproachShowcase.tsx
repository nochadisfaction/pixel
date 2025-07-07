import React, { useState, useEffect } from 'react';
import type { ClinicalCase } from '../../lib/types/psychology-pipeline';

interface TherapeuticResponse {
  approach: string;
  response: string;
  techniques: string[];
  rationale: string;
  expectedOutcome: string;
  timeframe: string;
  color: string;
}

interface ApproachComparison {
  scenario: string;
  clientStatement: string;
  responses: TherapeuticResponse[];
}

interface TherapeuticApproachShowcaseProps {
  clinicalCase?: Partial<ClinicalCase>;
}

const TherapeuticApproachShowcase: React.FC<TherapeuticApproachShowcaseProps> = ({
  clinicalCase
}) => {
  const [selectedScenario, setSelectedScenario] = useState<string>('anxiety-work');
  const [isGenerating, setIsGenerating] = useState(false);
  const [comparison, setComparison] = useState<ApproachComparison | null>(null);
  const [selectedApproaches, setSelectedApproaches] = useState<string[]>(['CBT', 'Psychodynamic', 'Humanistic']);

  const availableApproaches = [
    { value: 'CBT', label: 'Cognitive Behavioral Therapy', color: 'blue' },
    { value: 'DBT', label: 'Dialectical Behavior Therapy', color: 'green' },
    { value: 'Psychodynamic', label: 'Psychodynamic Therapy', color: 'purple' },
    { value: 'Humanistic', label: 'Humanistic/Person-Centered', color: 'orange' },
    { value: 'EMDR', label: 'EMDR Therapy', color: 'red' },
    { value: 'Solution-Focused', label: 'Solution-Focused Brief Therapy', color: 'teal' },
    { value: 'Gestalt', label: 'Gestalt Therapy', color: 'pink' },
    { value: 'Narrative', label: 'Narrative Therapy', color: 'indigo' }
  ];

  const scenarioOptions = [
    {
      value: 'anxiety-work',
      label: 'Work-Related Anxiety',
      description: 'Client experiencing performance anxiety and work stress',
      clientStatement: "I keep worrying that I'm going to mess up at work. Every time I have a presentation, I can't sleep the night before and I feel like everyone will see that I don't know what I'm doing."
    },
    {
      value: 'depression-loss',
      label: 'Depression After Loss',
      description: 'Client dealing with grief and depressive symptoms',
      clientStatement: "Since my mom passed away six months ago, I just can't seem to find joy in anything. I go through the motions, but everything feels empty and meaningless."
    },
    {
      value: 'relationship-conflict',
      label: 'Relationship Difficulties',
      description: 'Client struggling with interpersonal relationships',
      clientStatement: "I keep having the same fights with my partner. It feels like we're stuck in this cycle where nothing I do is right, and I end up feeling angry and then guilty about being angry."
    },
    {
      value: 'trauma-recovery',
      label: 'Trauma Recovery',
      description: 'Client working through traumatic experiences',
      clientStatement: "I have these flashbacks that come out of nowhere. Sometimes I'm just sitting there and suddenly I'm back in that moment, and I can't breathe. I feel like I'm losing control."
    },
    {
      value: 'identity-crisis',
      label: 'Identity and Life Transitions',
      description: 'Client questioning life direction and identity',
      clientStatement: "I'm 35 and I feel like I don't know who I am anymore. I've been doing what everyone expected of me, but I wake up every day wondering if this is really my life."
    }
  ];

  const generateApproachComparison = async () => {
    setIsGenerating(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const scenario = scenarioOptions.find(s => s.value === selectedScenario);
    if (!scenario) return;

    const responses: TherapeuticResponse[] = selectedApproaches.map(approach => 
      generateApproachResponse(approach, scenario)
    );

    setComparison({
      scenario: scenario.label,
      clientStatement: scenario.clientStatement,
      responses
    });
    
    setIsGenerating(false);
  };

  const generateApproachResponse = (approach: string, scenario: any): TherapeuticResponse => {
    const approachData = availableApproaches.find(a => a.value === approach);
    
    const responses = {
      'CBT': {
        response: getCBTResponse(scenario.value),
        techniques: ['Cognitive restructuring', 'Thought challenging', 'Behavioral experiments', 'Homework assignments'],
        rationale: 'CBT focuses on identifying and changing negative thought patterns and behaviors that contribute to emotional distress.',
        expectedOutcome: 'Reduced symptoms through changed thinking patterns and increased coping skills',
        timeframe: '12-16 sessions'
      },
      'Psychodynamic': {
        response: getPsychodynamicResponse(scenario.value),
        techniques: ['Interpretation', 'Transference analysis', 'Free association', 'Dream work'],
        rationale: 'Psychodynamic therapy explores unconscious patterns and past experiences that influence current difficulties.',
        expectedOutcome: 'Increased self-awareness and resolution of underlying conflicts',
        timeframe: '6 months to 2+ years'
      },
      'Humanistic': {
        response: getHumanisticResponse(scenario.value),
        techniques: ['Unconditional positive regard', 'Empathetic reflection', 'Genuineness', 'Active listening'],
        rationale: 'Humanistic therapy provides a supportive environment for self-exploration and personal growth.',
        expectedOutcome: 'Enhanced self-acceptance and personal empowerment',
        timeframe: '3-6 months'
      },
      'DBT': {
        response: getDBTResponse(scenario.value),
        techniques: ['Distress tolerance', 'Emotion regulation', 'Interpersonal effectiveness', 'Mindfulness'],
        rationale: 'DBT teaches specific skills for managing intense emotions and improving relationships.',
        expectedOutcome: 'Better emotional regulation and interpersonal functioning',
        timeframe: '6 months to 1 year'
      },
      'EMDR': {
        response: getEMDRResponse(scenario.value),
        techniques: ['Bilateral stimulation', 'Resource installation', 'Desensitization', 'Reprocessing'],
        rationale: 'EMDR helps process traumatic memories and reduce their emotional impact.',
        expectedOutcome: 'Reduced trauma symptoms and improved emotional stability',
        timeframe: '6-12 sessions'
      },
      'Solution-Focused': {
        response: getSolutionFocusedResponse(scenario.value),
        techniques: ['Scaling questions', 'Exception finding', 'Miracle question', 'Goal setting'],
        rationale: 'Solution-focused therapy emphasizes client strengths and solutions rather than problems.',
        expectedOutcome: 'Rapid identification and implementation of effective solutions',
        timeframe: '3-8 sessions'
      },
      'Gestalt': {
        response: getGestaltResponse(scenario.value),
        techniques: ['Empty chair', 'Here and now focus', 'Body awareness', 'Experiential exercises'],
        rationale: 'Gestalt therapy focuses on present-moment awareness and integration of fragmented experiences.',
        expectedOutcome: 'Increased self-awareness and emotional integration',
        timeframe: '3-12 months'
      },
      'Narrative': {
        response: getNarrativeResponse(scenario.value),
        techniques: ['Externalization', 'Re-authoring', 'Unique outcomes', 'Definitional ceremony'],
        rationale: 'Narrative therapy helps clients re-author their life stories in more empowering ways.',
        expectedOutcome: 'New, preferred identity and life narrative',
        timeframe: '2-6 months'
      }
    };

    const responseData = responses[approach as keyof typeof responses] || responses['CBT'];
    
    return {
      approach,
      ...responseData,
      color: approachData?.color || 'blue'
    };
  };

  // Response generators for different approaches and scenarios
  const getCBTResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "I can hear how much distress these work presentations are causing you. Let's examine the thoughts that go through your mind before these presentations. What specific thoughts contribute to your anxiety? We can work together to evaluate the evidence for these thoughts and develop more balanced, realistic thinking patterns.",
      'depression-loss': "Losing your mother is an incredibly significant loss, and it's understandable that you're struggling. Let's look at how your thoughts about the loss might be affecting your mood and daily activities. We can work on identifying activities that might bring small moments of meaning back into your life.",
      'relationship-conflict': "These recurring patterns in your relationship sound frustrating. Let's examine the thoughts and assumptions you have during these conflicts. What goes through your mind right before the arguments escalate? We can work on developing new communication strategies and challenging unhelpful thinking patterns.",
      'trauma-recovery': "Flashbacks can be incredibly distressing and disorienting. Let's work on developing coping strategies for when they occur, and examine any thoughts or beliefs about safety and control that might be contributing to your distress. We'll also practice grounding techniques to help you stay present.",
      'identity-crisis': "It sounds like you're questioning whether your current life aligns with your authentic self. Let's explore the thoughts and beliefs you have about who you 'should' be versus who you want to be. We can work on identifying your core values and making decisions that align with them."
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getPsychodynamicResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "Your fear of being 'found out' at work is quite powerful. I'm curious about when you first remember feeling this way - like you didn't belong or weren't good enough. These feelings often have roots in our early experiences. What comes to mind when you think about times in your past when you felt exposed or vulnerable?",
      'depression-loss': "The loss of your mother represents not just the end of her life, but perhaps the end of a part of yourself - the part that was her child. Grief can bring up complex feelings about our own mortality and identity. I wonder what your relationship with your mother meant to you, and how her absence is affecting your sense of self.",
      'relationship-conflict': "These repetitive conflicts with your partner may be recreating familiar patterns from your past relationships. I'm wondering about the anger and guilt cycle you described - does this remind you of dynamics you experienced growing up? Sometimes we unconsciously recreate what feels familiar, even when it's painful.",
      'trauma-recovery': "Trauma can fragment our sense of self and safety in the world. These flashbacks may be your psyche's attempt to process and integrate what happened. I'm curious about what the trauma meant to you - not just what happened, but how it affected your view of yourself and the world around you.",
      'identity-crisis': "At 35, you're questioning the life you've built based on others' expectations. This suggests a conflict between your authentic self and the self you've presented to the world. I wonder about the early messages you received about who you should be, and how those have shaped the choices you've made."
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getHumanisticResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "I can really hear the fear and vulnerability in what you're sharing. It takes courage to admit these feelings about work. You mentioned feeling like people will see that you don't know what you're doing - I'm wondering what it's like for you to carry that fear. How does it feel to acknowledge these worries out loud?",
      'depression-loss': "The pain of losing your mother comes through so clearly in your words. Six months isn't very long when you're grieving someone so important. I'm struck by how you describe going through the motions - it sounds like you're doing what you need to survive right now. What would it mean to honor both your grief and your mother's memory?",
      'relationship-conflict': "I can feel the frustration and exhaustion in your voice about these relationship patterns. It sounds like you're caught between anger and guilt, and that must be really difficult to navigate. I'm curious about what you need most right now in your relationship - what would feel most supportive or healing?",
      'trauma-recovery': "Those flashbacks sound terrifying and overwhelming. I want you to know that your reactions are completely understandable given what you've been through. You mentioned feeling like you're losing control - I wonder what control means to you, and what it might look like to be gentle with yourself during these difficult moments.",
      'identity-crisis': "There's something really profound about questioning who you are at this stage of life. It sounds like you're recognizing a disconnect between your external life and your internal truth. I'm curious about what feels most authentic to you right now - what parts of yourself are asking to be heard and honored?"
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getDBTResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "I can see how overwhelming these work situations are for you. Let's work on some skills that can help you manage this intense anxiety. First, let's practice some distress tolerance techniques for the night before presentations - like the TIPP skill to calm your nervous system. We'll also work on mindfulness skills to help you stay present rather than getting caught up in 'what if' thoughts.",
      'depression-loss': "Grief is one of the most intense emotional experiences we can have. Right now, it sounds like you're in survival mode, which makes complete sense. Let's work on some skills to help you ride out these waves of pain. We can practice opposite action - doing small things that might bring tiny moments of connection or meaning, even when you don't feel like it.",
      'relationship-conflict': "These relationship patterns sound really distressing. Let's work on some interpersonal effectiveness skills - ways to communicate your needs without the conversation escalating into conflict. We'll also practice emotion regulation skills to help you manage the anger and guilt cycle you described.",
      'trauma-recovery': "Flashbacks are your nervous system's way of trying to process what happened, but they're incredibly overwhelming. Let's work on some grounding skills you can use when they occur - like the 5-4-3-2-1 technique. We'll also practice distress tolerance skills to help you ride out these intense moments without making them worse.",
      'identity-crisis': "This identity questioning can bring up a lot of intense emotions. Let's work on some skills to help you navigate this transition. We can practice mindfulness to help you tune into your authentic self, and distress tolerance skills to manage the anxiety that comes with making big life changes."
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getEMDRResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "These work-related fears seem to trigger a strong fight-or-flight response in your body. Before we process the specific memories that might be contributing to this anxiety, let's establish some resources and coping skills. I'd like to help you identify a calm, safe place you can visualize, and we'll practice some bilateral stimulation to strengthen your sense of stability and confidence.",
      'depression-loss': "Grief can create traumatic memories and overwhelming emotions that get stuck in our nervous system. While we won't rush into processing the most painful memories of your loss, we can start by strengthening your emotional resources. Let's work on installing positive memories of your mother and building your capacity to hold both the love and the loss.",
      'relationship-conflict': "These relationship conflicts might be triggering memories or beliefs from your past that are intensifying your current reactions. Before we process any specific memories, let's work on building your emotional resources and identifying what a healthy, calm relationship interaction would look like for you.",
      'trauma-recovery': "These flashbacks indicate that your traumatic memories haven't been fully processed and integrated. We'll work together to help your brain process these memories so they become less intrusive and overwhelming. First, let's establish safety and resources, then we'll use bilateral stimulation to help reprocess the traumatic material.",
      'identity-crisis': "Sometimes our sense of identity can be impacted by past experiences that told us who we should be rather than who we are. We can use EMDR to process any negative beliefs about yourself and install more positive, authentic self-concepts. Let's start by identifying what you'd like to believe about yourself moving forward."
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getSolutionFocusedResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "I'm curious about times when you've felt more confident at work, even if just slightly. Can you think of a presentation or work situation that went better than expected? What was different about that time? On a scale of 1-10, where 10 is feeling completely confident at work, where would you say you are now, and what would need to happen to move you up just one point?",
      'depression-loss': "Even in the midst of this profound grief, I'm wondering about small moments when the emptiness feels slightly less overwhelming. Have there been any brief moments - even seconds - when you felt a tiny spark of something other than sadness? What was happening during those moments? What would be the smallest sign that you're beginning to heal?",
      'relationship-conflict': "I'm curious about times in your relationship when you and your partner have handled disagreements differently - maybe when you were able to resolve something without it escalating. What was different about those times? If I could wave a magic wand and your relationship conflicts were resolved, what would you notice first that would tell you things had changed?",
      'trauma-recovery': "Despite these overwhelming flashbacks, you're here seeking help, which shows incredible strength. I'm wondering about times when you've felt even slightly more in control or safe. What helps, even a little bit? On days when the flashbacks are less frequent or intense, what's different about those days?",
      'identity-crisis': "It sounds like you're recognizing that your current life doesn't fully reflect who you are. I'm curious about moments when you do feel authentic and true to yourself. When do you feel most like 'you'? If you woke up tomorrow and were living a life that felt genuinely yours, what would be the first thing you'd notice that was different?"
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getGestaltResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "As you're talking about these work presentations, I notice your shoulders tensing up and your breathing becoming shallow. What are you experiencing in your body right now? Let's stay with these sensations for a moment. If your anxiety could speak, what would it say to you? I'm curious about the part of you that feels like an imposter - can you give that part a voice?",
      'depression-loss': "I can see the heaviness in your posture as you talk about your mother. What are you aware of in your body right now? Sometimes grief lives in our bodies as much as our minds. If you could have a conversation with your grief, what would you want to say to it? And what might it say back to you?",
      'relationship-conflict': "I notice as you describe these fights with your partner, your jaw tightens and your hands clench. What are you experiencing right now as we talk about this? I'm curious - if you could speak directly to your anger, what would you say? And if your guilt could respond, what might it tell you?",
      'trauma-recovery': "Right now, as you describe the flashbacks, I can see you're becoming more tense and your breathing is changing. Let's pause and notice what's happening in your body in this moment. Can you feel your feet on the floor? Let's practice staying present together. What do you need right now to feel more grounded in this room with me?",
      'identity-crisis': "As you talk about living others' expectations, I notice you seem to shrink a bit, like you're making yourself smaller. What are you aware of in your body right now? I'm curious about the part of you that knows who you really are - can you sense that part? What would it feel like to let that authentic part of you take up more space?"
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const getNarrativeResponse = (scenario: string): string => {
    const responses = {
      'anxiety-work': "It sounds like Anxiety has been telling you a very convincing story about your competence at work. I'm curious about times when you've been able to resist Anxiety's influence - moments when you've acted with confidence despite its voice. What would your colleagues say about your abilities? How might we begin to separate you from this Anxiety story and author a new narrative about your professional identity?",
      'depression-loss': "Grief has become a dominant story in your life since your mother's passing, which makes complete sense. But I'm wondering about the other stories that exist alongside grief - stories of love, connection, and the ways your mother continues to influence your life. What would your mother say about the person you are? How might we honor both your grief and the ongoing story of your mother's impact on your life?",
      'relationship-conflict': "It sounds like Conflict has taken over the story of your relationship, making it seem like fighting is all there is. I'm curious about times when Love or Understanding have been stronger voices in your relationship story. What drew you and your partner together originally? How might we invite those preferred stories back into prominence?",
      'trauma-recovery': "Trauma has authored a story about danger and loss of control in your life. But I'm wondering about the survival story - the story of your strength and resilience. What does it say about you that you're here, seeking help and working toward healing? How might we begin to author a story where you're not just a trauma survivor, but someone who is actively reclaiming their life?",
      'identity-crisis': "It sounds like you've been living in a story written by others' expectations rather than your own authorship. I'm curious about glimpses of your preferred identity - times when you've felt most authentically yourself. What values and dreams have persisted despite external pressures? How might we begin to re-author your life story with you as the primary author?"
    };
    return responses[scenario as keyof typeof responses] || responses['anxiety-work'];
  };

  const toggleApproach = (approach: string) => {
    setSelectedApproaches(prev => 
      prev.includes(approach) 
        ? prev.filter(a => a !== approach)
        : [...prev, approach]
    );
  };

  return (
    <div className="therapeutic-approach-showcase bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800">
          Multiple Therapeutic Approaches Showcase
        </h4>
        <button
          onClick={generateApproachComparison}
          disabled={isGenerating || selectedApproaches.length === 0}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Compare Approaches'}
        </button>
      </div>

      {/* Scenario Selection */}
      <div className="mb-6">
        <h5 className="font-medium text-gray-700 mb-3">Select Clinical Scenario</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarioOptions.map(scenario => (
            <button
              key={scenario.value}
              onClick={() => setSelectedScenario(scenario.value)}
              className={`p-4 rounded-lg border text-left transition-colors ${
                selectedScenario === scenario.value
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium text-sm mb-1">{scenario.label}</div>
              <div className="text-xs text-gray-600">{scenario.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Approach Selection */}
      <div className="mb-6">
        <h5 className="font-medium text-gray-700 mb-3">
          Select Therapeutic Approaches to Compare ({selectedApproaches.length} selected)
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {availableApproaches.map(approach => (
            <button
              key={approach.value}
              onClick={() => toggleApproach(approach.value)}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                selectedApproaches.includes(approach.value)
                  ? `bg-${approach.color}-100 border-${approach.color}-300 text-${approach.color}-800`
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {approach.label}
            </button>
          ))}
        </div>
        {selectedApproaches.length === 0 && (
          <p className="text-sm text-red-600 mt-2">Please select at least one therapeutic approach to compare.</p>
        )}
      </div>

      {/* Loading State */}
      {isGenerating && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            <span className="text-emerald-800 font-medium">Generating therapeutic responses for {selectedApproaches.length} approaches...</span>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && !isGenerating && (
        <div className="space-y-6">
          {/* Client Statement */}
          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
            <h5 className="font-medium text-gray-800 mb-2">Client Statement - {comparison.scenario}</h5>
            <p className="text-gray-700 italic">"{comparison.clientStatement}"</p>
          </div>

          {/* Therapeutic Responses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparison.responses.map((response, index) => (
              <div key={index} className={`border rounded-lg p-5 bg-${response.color}-50 border-${response.color}-200`}>
                <div className="flex justify-between items-start mb-4">
                  <h6 className={`font-semibold text-lg text-${response.color}-800`}>
                    {availableApproaches.find(a => a.value === response.approach)?.label}
                  </h6>
                  <span className={`px-2 py-1 rounded text-xs font-medium bg-${response.color}-100 text-${response.color}-700`}>
                    {response.timeframe}
                  </span>
                </div>

                {/* Therapist Response */}
                <div className="mb-4">
                  <h7 className={`font-medium text-${response.color}-700 text-sm`}>Therapeutic Response:</h7>
                  <p className="text-gray-700 mt-1 text-sm leading-relaxed">"{response.response}"</p>
                </div>

                {/* Techniques */}
                <div className="mb-4">
                  <h7 className={`font-medium text-${response.color}-700 text-sm`}>Key Techniques:</h7>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {response.techniques.map((technique, techIndex) => (
                      <span key={techIndex} className={`text-xs px-2 py-1 rounded-full bg-${response.color}-100 text-${response.color}-700`}>
                        {technique}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Rationale */}
                <div className="mb-4">
                  <h7 className={`font-medium text-${response.color}-700 text-sm`}>Theoretical Rationale:</h7>
                  <p className="text-gray-600 text-xs mt-1">{response.rationale}</p>
                </div>

                {/* Expected Outcome */}
                <div>
                  <h7 className={`font-medium text-${response.color}-700 text-sm`}>Expected Outcome:</h7>
                  <p className="text-gray-600 text-xs mt-1">{response.expectedOutcome}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Summary */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h5 className="font-medium text-indigo-800 mb-3">Approach Comparison Summary</h5>
            <div className="text-sm text-indigo-700 space-y-2">
              <p><strong>Key Differences:</strong> Each approach offers a unique lens for understanding and addressing the client's concerns.</p>
              <p><strong>CBT</strong> focuses on thoughts and behaviors, <strong>Psychodynamic</strong> explores unconscious patterns, <strong>Humanistic</strong> emphasizes the therapeutic relationship and self-acceptance.</p>
              <p><strong>Integration Potential:</strong> Many therapists combine elements from multiple approaches based on client needs and preferences.</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!comparison && !isGenerating && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm">Select a scenario and therapeutic approaches, then click "Compare Approaches" to see side-by-side therapeutic responses</p>
        </div>
      )}
    </div>
  );
};

export default TherapeuticApproachShowcase;
