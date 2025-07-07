import React, { useState, useEffect } from 'react';
import type { ClinicalFormulation, TreatmentPlan, PatientInfo } from '../../lib/types/psychology-pipeline';

interface ClinicalFormulationDemoProps {
  patientInfo: PatientInfo;
  presentingProblem: string;
  complexity: 'low' | 'medium' | 'high';
  therapeuticApproaches: string[];
  onFormulationGenerated?: (formulation: ClinicalFormulation, treatmentPlan: TreatmentPlan) => void;
}

const ClinicalFormulationDemo: React.FC<ClinicalFormulationDemoProps> = ({
  patientInfo,
  presentingProblem,
  complexity,
  therapeuticApproaches,
  onFormulationGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formulation, setFormulation] = useState<ClinicalFormulation | null>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);

  const formulationSteps = [
    'Analyzing presenting problem',
    'Identifying contributing factors',
    'Generating provisional diagnoses',
    'Creating clinical summary',
    'Developing treatment goals',
    'Selecting interventions',
    'Determining outcome measures'
  ];

  const generateFormulation = async () => {
    setIsGenerating(true);
    setCurrentStep(0);
    
    // Simulate step-by-step formulation process
    for (let i = 0; i < formulationSteps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Generate formulation based on inputs
    const generatedFormulation: ClinicalFormulation = {
      provisionalDiagnosis: generateDiagnoses(presentingProblem, complexity),
      contributingFactors: generateContributingFactors(patientInfo, presentingProblem, complexity),
      summary: generateClinicalSummary(patientInfo, presentingProblem, complexity)
    };

    const generatedTreatmentPlan: TreatmentPlan = {
      goals: generateTreatmentGoals(presentingProblem, complexity),
      interventions: generateInterventions(therapeuticApproaches, complexity),
      modalities: therapeuticApproaches,
      outcomeMeasures: generateOutcomeMeasures(presentingProblem, complexity)
    };

    setFormulation(generatedFormulation);
    setTreatmentPlan(generatedTreatmentPlan);
    setIsGenerating(false);
    
    onFormulationGenerated?.(generatedFormulation, generatedTreatmentPlan);
  };

  const generateDiagnoses = (problem: string, complexity: 'low' | 'medium' | 'high'): string[] => {
    const problemLower = problem.toLowerCase();
    const diagnoses: string[] = [];

    // Primary diagnosis based on presenting problem
    if (problemLower.includes('anxiety')) {
      diagnoses.push('Generalized Anxiety Disorder (300.02)');
      if (problemLower.includes('work') || problemLower.includes('stress')) {
        diagnoses.push('Adjustment Disorder with Anxiety (309.24)');
      }
    } else if (problemLower.includes('depression')) {
      diagnoses.push('Major Depressive Disorder (296.23)');
    } else if (problemLower.includes('trauma')) {
      diagnoses.push('Post-Traumatic Stress Disorder (309.81)');
    } else if (problemLower.includes('relationship')) {
      diagnoses.push('Adjustment Disorder with Mixed Anxiety and Depressed Mood (309.28)');
    } else {
      diagnoses.push('Adjustment Disorder with Mixed Disturbance of Emotions and Conduct (309.4)');
    }

    // Add complexity-based additional diagnoses
    if (complexity === 'medium') {
      if (problemLower.includes('sleep')) {
        diagnoses.push('Insomnia Disorder (780.52)');
      }
    } else if (complexity === 'high') {
      diagnoses.push('Personality Disorder NOS (301.9)');
      if (problemLower.includes('substance') || problemLower.includes('alcohol')) {
        diagnoses.push('Substance Use Disorder (304.90)');
      }
    }

    return diagnoses;
  };

  const generateContributingFactors = (patient: PatientInfo, problem: string, complexity: 'low' | 'medium' | 'high') => {
    const factors = {
      biological: [] as string[],
      psychological: [] as string[],
      social: [] as string[]
    };

    // Biological factors
    if (patient.age > 50) {
      factors.biological.push('Age-related hormonal changes');
    }
    if (problem.toLowerCase().includes('sleep')) {
      factors.biological.push('Sleep disruption affecting neurotransmitter balance');
    }
    factors.biological.push('Possible genetic predisposition');
    if (complexity === 'high') {
      factors.biological.push('Chronic stress affecting HPA axis');
    }

    // Psychological factors
    if (problem.toLowerCase().includes('anxiety')) {
      factors.psychological.push('Catastrophic thinking patterns');
      factors.psychological.push('Low distress tolerance');
    }
    if (problem.toLowerCase().includes('work')) {
      factors.psychological.push('Perfectionist tendencies');
      factors.psychological.push('Fear of failure');
    }
    if (complexity === 'medium' || complexity === 'high') {
      factors.psychological.push('Maladaptive coping strategies');
      factors.psychological.push('Negative core beliefs about self');
    }

    // Social factors
    if (patient.occupation.toLowerCase().includes('manager') || patient.occupation.toLowerCase().includes('professional')) {
      factors.social.push('High-pressure work environment');
      factors.social.push('Work-life balance challenges');
    }
    if (patient.background.toLowerCase().includes('urban')) {
      factors.social.push('Urban stressors and social isolation');
    }
    if (complexity === 'high') {
      factors.social.push('Limited social support network');
      factors.social.push('Financial stressors');
    } else {
      factors.social.push('Generally supportive social network');
    }

    return factors;
  };

  const generateClinicalSummary = (patient: PatientInfo, problem: string, complexity: 'low' | 'medium' | 'high'): string => {
    const age = patient.age;
    const gender = patient.gender;
    const occupation = patient.occupation;
    
    let summary = `${age}-year-old ${gender} ${occupation.toLowerCase()} presenting with ${problem.toLowerCase()}. `;
    
    if (complexity === 'low') {
      summary += 'Symptoms appear to be situational with good overall functioning and strong support systems. ';
      summary += 'Prognosis is favorable with brief intervention.';
    } else if (complexity === 'medium') {
      summary += 'Symptoms have been present for several months with moderate impact on functioning. ';
      summary += 'Multiple contributing factors identified. Moderate treatment intensity recommended.';
    } else {
      summary += 'Complex presentation with multiple comorbidities and significant functional impairment. ';
      summary += 'Long-term treatment approach with intensive interventions recommended.';
    }

    return summary;
  };

  const generateTreatmentGoals = (problem: string, complexity: 'low' | 'medium' | 'high') => {
    const goals = {
      shortTerm: [] as string[],
      longTerm: [] as string[]
    };

    // Short-term goals
    if (problem.toLowerCase().includes('anxiety')) {
      goals.shortTerm.push('Reduce anxiety symptoms by 40% within 8 weeks');
      goals.shortTerm.push('Develop coping strategies for anxiety triggers');
    } else if (problem.toLowerCase().includes('depression')) {
      goals.shortTerm.push('Improve mood stability within 6-8 weeks');
      goals.shortTerm.push('Increase daily activity engagement');
    }
    
    goals.shortTerm.push('Establish therapeutic rapport and treatment engagement');
    
    if (complexity === 'medium' || complexity === 'high') {
      goals.shortTerm.push('Develop crisis management skills');
      goals.shortTerm.push('Improve sleep hygiene and routine');
    }

    // Long-term goals
    goals.longTerm.push('Maintain stable mood and symptom management');
    goals.longTerm.push('Develop resilience for future stressors');
    goals.longTerm.push('Improve overall quality of life and functioning');
    
    if (complexity === 'high') {
      goals.longTerm.push('Address underlying personality patterns');
      goals.longTerm.push('Establish sustainable support systems');
    }

    return goals;
  };

  const generateInterventions = (approaches: string[], complexity: 'low' | 'medium' | 'high'): string[] => {
    const interventions: string[] = [];

    approaches.forEach(approach => {
      switch (approach) {
        case 'CBT':
          interventions.push('Cognitive restructuring for negative thought patterns');
          interventions.push('Behavioral activation and exposure exercises');
          break;
        case 'DBT':
          interventions.push('Distress tolerance skills training');
          interventions.push('Emotion regulation techniques');
          break;
        case 'Mindfulness':
          interventions.push('Mindfulness-based stress reduction');
          interventions.push('Present-moment awareness exercises');
          break;
        case 'EMDR':
          interventions.push('Trauma processing through bilateral stimulation');
          break;
        case 'Psychodynamic':
          interventions.push('Exploration of unconscious patterns');
          interventions.push('Transference and countertransference work');
          break;
        default:
          interventions.push(`${approach}-based therapeutic interventions`);
      }
    });

    // Add complexity-based interventions
    if (complexity === 'medium') {
      interventions.push('Psychoeducation about symptoms and treatment');
      interventions.push('Relapse prevention planning');
    } else if (complexity === 'high') {
      interventions.push('Crisis intervention and safety planning');
      interventions.push('Intensive case management coordination');
    }

    return interventions;
  };

  const generateOutcomeMeasures = (problem: string, complexity: 'low' | 'medium' | 'high'): string[] => {
    const measures: string[] = [];

    if (problem.toLowerCase().includes('anxiety')) {
      measures.push('GAD-7 (Generalized Anxiety Disorder Scale)');
      measures.push('Beck Anxiety Inventory');
    } else if (problem.toLowerCase().includes('depression')) {
      measures.push('PHQ-9 (Patient Health Questionnaire)');
      measures.push('Beck Depression Inventory');
    }

    measures.push('Work and Social Adjustment Scale');
    measures.push('Quality of Life Scale');

    if (complexity === 'high') {
      measures.push('Personality Assessment Inventory');
      measures.push('Symptom Checklist-90-Revised');
    }

    return measures;
  };

  return (
    <div className="clinical-formulation-demo bg-white rounded-lg p-6 border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-lg font-semibold text-gray-800">
          Clinical Formulation & Treatment Planning
        </h4>
        <button
          onClick={generateFormulation}
          disabled={isGenerating}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Formulation'}
        </button>
      </div>

      {/* Generation Progress */}
      {isGenerating && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h5 className="font-medium text-purple-800 mb-3">Formulation in Progress</h5>
          <div className="space-y-2">
            {formulationSteps.map((step, index) => (
              <div key={index} className={`flex items-center gap-3 text-sm ${
                index <= currentStep ? 'text-purple-700' : 'text-gray-400'
              }`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                  index < currentStep ? 'bg-purple-600 text-white' :
                  index === currentStep ? 'bg-purple-400 text-white animate-pulse' :
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

      {/* Clinical Formulation Results */}
      {formulation && !isGenerating && (
        <div className="space-y-6">
          {/* Provisional Diagnoses */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-3">Provisional Diagnoses</h5>
            <div className="space-y-2">
              {formulation.provisionalDiagnosis.map((diagnosis, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <span className="text-blue-600 font-medium">#{index + 1}</span>
                  <span className="text-blue-800">{diagnosis}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contributing Factors */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-3">Contributing Factors (Biopsychosocial Model)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <h6 className="font-medium text-green-800 mb-2">Biological</h6>
                <ul className="text-sm text-green-700 space-y-1">
                  {formulation.contributingFactors.biological.map((factor, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-green-500 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h6 className="font-medium text-yellow-800 mb-2">Psychological</h6>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {formulation.contributingFactors.psychological.map((factor, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-3 bg-purple-50 rounded-lg">
                <h6 className="font-medium text-purple-800 mb-2">Social</h6>
                <ul className="text-sm text-purple-700 space-y-1">
                  {formulation.contributingFactors.social.map((factor, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-purple-500 mt-1">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Clinical Summary */}
          <div className="border rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-3">Clinical Summary</h5>
            <p className="text-gray-600 leading-relaxed">{formulation.summary}</p>
          </div>
        </div>
      )}

      {/* Treatment Plan */}
      {treatmentPlan && !isGenerating && (
        <div className="mt-6 space-y-6">
          <div className="border-t pt-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Treatment Plan</h4>
            
            {/* Treatment Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-gray-700 mb-3">Short-term Goals (0-3 months)</h5>
                <ul className="space-y-2">
                  {treatmentPlan.goals.shortTerm.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-gray-700 mb-3">Long-term Goals (3+ months)</h5>
                <ul className="space-y-2">
                  {treatmentPlan.goals.longTerm.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-1">◆</span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Interventions */}
            <div className="border rounded-lg p-4 mb-4">
              <h5 className="font-medium text-gray-700 mb-3">Therapeutic Interventions</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {treatmentPlan.interventions.map((intervention, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm">
                    <span className="text-indigo-500 mt-1">→</span>
                    <span>{intervention}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modalities and Outcome Measures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-gray-700 mb-3">Treatment Modalities</h5>
                <div className="flex flex-wrap gap-2">
                  {treatmentPlan.modalities.map((modality, index) => (
                    <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                      {modality}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-gray-700 mb-3">Outcome Measures</h5>
                <ul className="space-y-1">
                  {treatmentPlan.outcomeMeasures.map((measure, index) => (
                    <li key={index} className="text-sm text-gray-600">
                      • {measure}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!formulation && !isGenerating && (
        <div className="text-center py-8 text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-sm">Click "Generate Formulation" to create a comprehensive clinical assessment</p>
        </div>
      )}
    </div>
  );
};

export default ClinicalFormulationDemo;
