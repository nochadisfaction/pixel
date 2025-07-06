import type {
  ClinicalCase,
  PatientInfo,
  ClinicalFormulation,
  TreatmentPlan,
  PresentingProblemEvent,
} from '../types/psychology-pipeline'

const randomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

const generateRandomPatientInfo = (): PatientInfo => {
  const genders = ['Male', 'Female', 'Non-binary']
  const occupations = [
    'Software Engineer',
    'Teacher',
    'Artist',
    'Doctor',
    'Retail Worker',
  ]
  return {
    age: Math.floor(Math.random() * 50) + 20,
    gender: randomElement(genders),
    occupation: randomElement(occupations),
    background:
      'Patient has a history of mild depression and recently moved to a new city.',
  }
}

const generatePresentingProblemDevelopment = (): PresentingProblemEvent[] => {
  return [
    {
      time: '6 months ago',
      description: 'Patient started feeling down and lost interest in hobbies.',
    },
    {
      time: '3 months ago',
      description:
        'Symptoms worsened, with patient experiencing low energy and difficulty concentrating.',
    },
    {
      time: '1 month ago',
      description:
        'Patient began to withdraw from social activities and friends.',
    },
    {
      time: 'Present',
      description:
        'Patient reports feeling hopeless and is seeking help for the first time.',
    },
  ]
}

const generateRandomClinicalFormulation = (): ClinicalFormulation => {
  const diagnoses = [
    'Major Depressive Disorder',
    'Generalized Anxiety Disorder',
    'Adjustment Disorder',
  ]
  const biologicalFactors = [
    'Family history of depression',
    'Neurotransmitter imbalance',
  ]
  const psychologicalFactors = ['Low self-esteem', 'Pessimistic outlook']
  const socialFactors = ['Lack of social support', 'Financial stress']
  return {
    provisionalDiagnosis: [randomElement(diagnoses)],
    contributingFactors: {
      biological: [randomElement(biologicalFactors)],
      psychological: [randomElement(psychologicalFactors)],
      social: [randomElement(socialFactors)],
    },
    summary:
      "The patient's symptoms are likely a result of a combination of genetic vulnerability, psychological factors, and recent life stressors.",
  }
}

const generateRandomTreatmentPlan = (): TreatmentPlan => {
  const shortTermGoals = [
    'Complete a daily mood log',
    'Engage in one social activity per week',
  ]
  const longTermGoals = [
    'Improve overall mood and functioning',
    'Develop a strong support system',
  ]
  const interventions = ['Supportive Psychotherapy', 'Behavioral Activation']
  const modalities = ['Individual therapy (bi-weekly)', 'Online support group']
  const outcomeMeasures = [
    'Patient Health Questionnaire-9 (PHQ-9)',
    'Beck Depression Inventory (BDI)',
  ]
  return {
    goals: {
      shortTerm: [randomElement(shortTermGoals)],
      longTerm: [randomElement(longTermGoals)],
    },
    interventions: [randomElement(interventions)],
    modalities: [randomElement(modalities)],
    outcomeMeasures: [randomElement(outcomeMeasures)],
  }
}

const generateClinicalCase = (
  patientInfo?: Partial<PatientInfo>,
): ClinicalCase => {
  const basePatientInfo = generateRandomPatientInfo()
  return {
    caseId: `case-${Math.random().toString(36).substr(2, 9)}`,
    patientInfo: { ...basePatientInfo, ...patientInfo },
    presentingProblem:
      'Patient reports feelings of sadness, hopelessness, and a loss of interest in activities they once enjoyed.',
    presentingProblemDevelopment: generatePresentingProblemDevelopment(),
    clinicalFormulation: generateRandomClinicalFormulation(),
    treatmentPlan: generateRandomTreatmentPlan(),
  }
}

export const fetchClinicalCase = async (
  patientInfo?: Partial<PatientInfo>,
): Promise<ClinicalCase> => {
  // In a real application, this would be an API call.
  // For now, we'll return a randomly generated case after a short delay.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateClinicalCase(patientInfo))
    }, 500)
  })
}
