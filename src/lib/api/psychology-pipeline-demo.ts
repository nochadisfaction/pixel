import { z } from 'zod';
import type { ClinicalCase, PatientInfo, PresentingProblemEvent, ClinicalFormulation, TreatmentPlan } from '../types/psychology-pipeline';

const Dsm5Schema = z.object({
  "Major Depressive Disorder": z.array(z.string()),
});

const Pdm2Schema = z.object({
  "Personality Patterns": z.array(z.string()),
});

const BigFiveSchema = z.object({
  "Traits": z.array(z.string()),
});

// Client Scenario Generator Schemas
const ScenarioGenerationRequestSchema = z.object({
  patientInfo: z.object({
    age: z.number(),
    gender: z.string(),
    occupation: z.string(),
    background: z.string()
  }),
  presentingProblem: z.string(),
  presentingProblemDevelopment: z.array(z.object({
    time: z.string(),
    description: z.string()
  })),
  complexity: z.enum(['low', 'medium', 'high']),
  therapeuticApproach: z.array(z.string()),
  culturalFactors: z.array(z.string()).optional()
});

const ScenarioGenerationResponseSchema = z.object({
  caseId: z.string(),
  patientInfo: z.object({
    age: z.number(),
    gender: z.string(),
    occupation: z.string(),
    background: z.string()
  }),
  presentingProblem: z.string(),
  presentingProblemDevelopment: z.array(z.object({
    time: z.string(),
    description: z.string()
  })),
  clinicalFormulation: z.object({
    provisionalDiagnosis: z.array(z.string()),
    contributingFactors: z.object({
      biological: z.array(z.string()),
      psychological: z.array(z.string()),
      social: z.array(z.string())
    }),
    summary: z.string()
  }),
  treatmentPlan: z.object({
    goals: z.object({
      shortTerm: z.array(z.string()),
      longTerm: z.array(z.string())
    }),
    interventions: z.array(z.string()),
    modalities: z.array(z.string()),
    outcomeMeasures: z.array(z.string())
  }),
  generationMetadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    qualityScore: z.number(),
    balanceScore: z.number()
  })
});

export const fetchKnowledgeData = async () => {
  // In a real application, this would fetch from an API endpoint.
  // For this demo, we'll return the static data.
  const dsm5Data = {
    "Major Depressive Disorder": [
      "Depressed mood most of the day, nearly every day.",
      "Markedly diminished interest or pleasure in all, or almost all, activities.",
      "Significant weight loss when not dieting or weight gain.",
      "Insomnia or hypersomnia nearly every day.",
      "Psychomotor agitation or retardation nearly every day.",
      "Fatigue or loss of energy nearly every day.",
      "Feelings of worthlessness or excessive or inappropriate guilt.",
      "Diminished ability to think or concentrate, or indecisiveness.",
      "Recurrent thoughts of death, recurrent suicidal ideation without a specific plan."
    ]
  };

  const pdm2Data = {
    "Personality Patterns": [
      "Depressive",
      "Anxious",
      "Obsessive-Compulsive",
      "Hysterical (Histrionic)",
      "Narcissistic",
      "Paranoid",
      "Schizoid"
    ]
  };

  const bigFiveData = {
    "Traits": [
      "Openness",
      "Conscientiousness",
      "Extraversion",
      "Agreeableness",
      "Neuroticism"
    ]
  };

  return {
    dsm5: Dsm5Schema.parse(dsm5Data),
    pdm2: Pdm2Schema.parse(pdm2Data),
    bigFive: BigFiveSchema.parse(bigFiveData),
  };
};

// Client Scenario Generator API Connection
export const generateClientScenario = async (
  requestData: z.infer<typeof ScenarioGenerationRequestSchema>
): Promise<z.infer<typeof ScenarioGenerationResponseSchema>> => {
  // Validate input
  const validatedRequest = ScenarioGenerationRequestSchema.parse(requestData);
  
  // Simulate API call to client scenario generator service
  const startTime = Date.now();
  
  // In production, this would be:
  // const response = await fetch('/api/psychology-pipeline/generate-scenario', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(validatedRequest)
  // });
  // const data = await response.json();
  
  // For demo purposes, simulate processing time and generate response
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  const processingTime = Date.now() - startTime;
  
  // Generate comprehensive clinical case based on input
  const generatedCase: z.infer<typeof ScenarioGenerationResponseSchema> = {
    caseId: `CASE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientInfo: validatedRequest.patientInfo,
    presentingProblem: validatedRequest.presentingProblem,
    presentingProblemDevelopment: validatedRequest.presentingProblemDevelopment,
    clinicalFormulation: generateClinicalFormulation(validatedRequest),
    treatmentPlan: generateTreatmentPlan(validatedRequest),
    generationMetadata: {
      timestamp: new Date().toISOString(),
      processingTime,
      qualityScore: 85 + Math.random() * 10, // Simulate quality score 85-95%
      balanceScore: 78 + Math.random() * 15   // Simulate balance score 78-93%
    }
  };
  
  return ScenarioGenerationResponseSchema.parse(generatedCase);
};

// Helper function to generate clinical formulation
function generateClinicalFormulation(request: z.infer<typeof ScenarioGenerationRequestSchema>) {
  const { patientInfo, presentingProblem, complexity } = request;
  const problemLower = presentingProblem.toLowerCase();
  
  // Generate provisional diagnoses
  const diagnoses: string[] = [];
  if (problemLower.includes('anxiety')) {
    diagnoses.push('Generalized Anxiety Disorder (300.02)');
    if (problemLower.includes('work') || problemLower.includes('stress')) {
      diagnoses.push('Adjustment Disorder with Anxiety (309.24)');
    }
  } else if (problemLower.includes('depression')) {
    diagnoses.push('Major Depressive Disorder (296.23)');
  } else if (problemLower.includes('trauma')) {
    diagnoses.push('Post-Traumatic Stress Disorder (309.81)');
  } else {
    diagnoses.push('Adjustment Disorder with Mixed Anxiety and Depressed Mood (309.28)');
  }
  
  if (complexity === 'high') {
    diagnoses.push('Personality Disorder NOS (301.9)');
  }
  
  // Generate contributing factors
  const contributingFactors = {
    biological: [
      'Possible genetic predisposition',
      ...(patientInfo.age > 50 ? ['Age-related hormonal changes'] : []),
      ...(problemLower.includes('sleep') ? ['Sleep disruption affecting neurotransmitter balance'] : [])
    ],
    psychological: [
      ...(problemLower.includes('anxiety') ? ['Catastrophic thinking patterns', 'Low distress tolerance'] : []),
      ...(problemLower.includes('work') ? ['Perfectionist tendencies', 'Fear of failure'] : []),
      ...(complexity !== 'low' ? ['Maladaptive coping strategies'] : [])
    ],
    social: [
      ...(patientInfo.occupation.toLowerCase().includes('manager') ? ['High-pressure work environment'] : []),
      ...(patientInfo.background.toLowerCase().includes('urban') ? ['Urban stressors'] : []),
      ...(complexity === 'high' ? ['Limited social support'] : ['Generally supportive social network'])
    ]
  };
  
  // Generate clinical summary
  const summary = `${patientInfo.age}-year-old ${patientInfo.gender} ${patientInfo.occupation.toLowerCase()} presenting with ${presentingProblem.toLowerCase()}. ${
    complexity === 'low' ? 'Symptoms appear situational with good functioning. Favorable prognosis.' :
    complexity === 'medium' ? 'Moderate impact on functioning with multiple contributing factors.' :
    'Complex presentation with significant functional impairment requiring intensive treatment.'
  }`;
  
  return {
    provisionalDiagnosis: diagnoses,
    contributingFactors,
    summary
  };
}

// Helper function to generate treatment plan
function generateTreatmentPlan(request: z.infer<typeof ScenarioGenerationRequestSchema>) {
  const { presentingProblem, complexity, therapeuticApproach } = request;
  const problemLower = presentingProblem.toLowerCase();
  
  // Generate goals
  const shortTermGoals: string[] = [];
  const longTermGoals: string[] = [];
  
  if (problemLower.includes('anxiety')) {
    shortTermGoals.push('Reduce anxiety symptoms by 40% within 8 weeks');
    shortTermGoals.push('Develop coping strategies for anxiety triggers');
  } else if (problemLower.includes('depression')) {
    shortTermGoals.push('Improve mood stability within 6-8 weeks');
    shortTermGoals.push('Increase daily activity engagement');
  }
  
  shortTermGoals.push('Establish therapeutic rapport and treatment engagement');
  
  longTermGoals.push('Maintain stable mood and symptom management');
  longTermGoals.push('Develop resilience for future stressors');
  longTermGoals.push('Improve overall quality of life and functioning');
  
  // Generate interventions based on therapeutic approaches
  const interventions: string[] = [];
  therapeuticApproach.forEach(approach => {
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
      default:
        interventions.push(`${approach}-based therapeutic interventions`);
    }
  });
  
  if (complexity === 'high') {
    interventions.push('Crisis intervention and safety planning');
  }
  
  // Generate outcome measures
  const outcomeMeasures: string[] = [];
  if (problemLower.includes('anxiety')) {
    outcomeMeasures.push('GAD-7 (Generalized Anxiety Disorder Scale)');
    outcomeMeasures.push('Beck Anxiety Inventory');
  } else if (problemLower.includes('depression')) {
    outcomeMeasures.push('PHQ-9 (Patient Health Questionnaire)');
    outcomeMeasures.push('Beck Depression Inventory');
  }
  
  outcomeMeasures.push('Work and Social Adjustment Scale');
  outcomeMeasures.push('Quality of Life Scale');
  
  return {
    goals: {
      shortTerm: shortTermGoals,
      longTerm: longTermGoals
    },
    interventions,
    modalities: therapeuticApproach,
    outcomeMeasures
  };
}

// Batch scenario generation for training datasets
export const generateScenarioBatch = async (
  requests: z.infer<typeof ScenarioGenerationRequestSchema>[],
  options?: {
    balanceTargets?: Record<string, number>;
    qualityThreshold?: number;
    maxRetries?: number;
  }
): Promise<{
  scenarios: z.infer<typeof ScenarioGenerationResponseSchema>[];
  batchMetadata: {
    totalGenerated: number;
    averageQualityScore: number;
    averageBalanceScore: number;
    processingTime: number;
    balanceAchieved: boolean;
  };
}> => {
  const startTime = Date.now();
  const scenarios: z.infer<typeof ScenarioGenerationResponseSchema>[] = [];
  
  // Process each request
  for (const request of requests) {
    const scenario = await generateClientScenario(request);
    scenarios.push(scenario);
  }
  
  const processingTime = Date.now() - startTime;
  const averageQualityScore = scenarios.reduce((sum, s) => sum + s.generationMetadata.qualityScore, 0) / scenarios.length;
  const averageBalanceScore = scenarios.reduce((sum, s) => sum + s.generationMetadata.balanceScore, 0) / scenarios.length;
  
  return {
    scenarios,
    batchMetadata: {
      totalGenerated: scenarios.length,
      averageQualityScore,
      averageBalanceScore,
      processingTime,
      balanceAchieved: averageBalanceScore >= (options?.qualityThreshold || 80)
    }
  };
};

// Export types for use in components
export type ScenarioGenerationRequest = z.infer<typeof ScenarioGenerationRequestSchema>;
export type ScenarioGenerationResponse = z.infer<typeof ScenarioGenerationResponseSchema>;