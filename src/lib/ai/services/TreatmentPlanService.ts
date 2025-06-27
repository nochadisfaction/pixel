import type { PatientProfile } from '../models/patient'
import type { SkillAcquired } from '../types/CognitiveModel'
import { appLogger } from '../../logging'

/**
 * Service for generating a treatment plan document based on a patient's profile.
 */
export class TreatmentPlanService {
  constructor() {
    appLogger.info('TreatmentPlanService initialized')
  }

  /**
   * Generates a treatment plan in Markdown format.
   * @param profile The patient's profile.
   * @returns A string containing the treatment plan in Markdown format.
   */
  public generateTreatmentPlan(profile: PatientProfile): string {
    if (!profile || !profile.cognitiveModel) {
      appLogger.warn(
        'generateTreatmentPlan: Invalid profile or cognitive model missing.',
        { profileId: profile?.id },
      )
      throw new Error('Invalid patient profile or cognitive model missing.')
    }

    const { cognitiveModel } = profile
    const {
      demographicInfo,
      presentingIssues,
      diagnosisInfo,
      coreBeliefs,
      goalsForTherapy,
      therapeuticProgress,
    } = cognitiveModel

    let plan = `# Treatment Plan for ${cognitiveModel.name || 'Patient ' + profile.id}\n\n`

    // Patient Information
    plan += `## Patient Information\n`
    plan += `- **ID:** ${profile.id}\n`
    if (cognitiveModel.name) {
      plan += `- **Name:** ${cognitiveModel.name}\n`
    }
    plan += `- **Age:** ${demographicInfo.age}\n`
    plan += `- **Gender:** ${demographicInfo.gender}\n`
    if (demographicInfo.occupation) {
      plan += `- **Occupation:** ${demographicInfo.occupation}\n\n`
    }

    // Presenting Issues
    if (presentingIssues && presentingIssues.length > 0) {
      plan += `## Presenting Issues\n`
      presentingIssues.forEach((issue) => {
        plan += `- ${issue}\n`
      })
      plan += `\n`
    }

    // Diagnosis
    plan += `## Diagnosis Information\n`
    plan += `- **Primary Diagnosis:** ${diagnosisInfo.primaryDiagnosis}\n`
    if (
      diagnosisInfo.secondaryDiagnoses &&
      diagnosisInfo.secondaryDiagnoses.length > 0
    ) {
      plan += `- **Secondary Diagnoses:** ${diagnosisInfo.secondaryDiagnoses.join(', ')}\n`
    }
    plan += `- **Severity:** ${diagnosisInfo.severity}\n`
    plan += `- **Duration of Symptoms:** ${diagnosisInfo.durationOfSymptoms}\n\n`

    // Core Beliefs to Address
    if (coreBeliefs && coreBeliefs.length > 0) {
      plan += `## Key Areas of Focus (Core Beliefs)\n`
      coreBeliefs
        .filter((b) => b.strength > 0.5) // Example: Focus on beliefs with strength > 0.5
        .forEach((belief) => {
          plan += `- **${belief.belief}** (Strength: ${belief.strength.toFixed(2)})\n`
        })
      plan += `\n`
    }

    // Therapeutic Goals
    if (goalsForTherapy && goalsForTherapy.length > 0) {
      plan += `## Therapeutic Goals\n`
      goalsForTherapy.forEach((goal) => {
        plan += `- ${goal}\n`
      })
      plan += `\n`
    }

    // Proposed Interventions (Generic for now)
    plan += `## Proposed Interventions\n`
    plan += `- **Cognitive Behavioral Therapy (CBT):** Techniques such as cognitive restructuring, behavioral activation.\n`
    if (
      coreBeliefs.some(
        (b) =>
          b.belief.toLowerCase().includes('worthless') ||
          b.belief.toLowerCase().includes('failure'),
      )
    ) {
      plan += `  - Specific focus on identifying and challenging negative self-talk and core beliefs related to self-worth.\n`
    }
    if (
      presentingIssues.some(
        (p) =>
          p.toLowerCase().includes('anxiety') ||
          p.toLowerCase().includes('worry'),
      )
    ) {
      plan += `- **Relaxation and Mindfulness Techniques:** To manage anxiety symptoms (e.g., deep breathing, grounding exercises).\n`
    }
    if (presentingIssues.some((p) => p.toLowerCase().includes('trauma'))) {
      plan += `- **Trauma-Informed Care:** Approaches tailored to addressing past traumatic experiences (if applicable and patient is ready).\n`
    }
    plan += `- **Psychoeducation:** Understanding symptoms, diagnosis, and treatment rationale.\n`
    plan += `- **Skill-Building:** Focusing on developing coping mechanisms and emotional regulation skills.\n\n`

    // Key Skills to Develop
    plan += `## Key Skills to Develop/Strengthen\n`
    const skillsToDevelop: string[] = []
    if (
      therapeuticProgress &&
      therapeuticProgress.skillsAcquired &&
      therapeuticProgress.skillsAcquired.length > 0
    ) {
      therapeuticProgress.skillsAcquired.forEach((skill: SkillAcquired) => {
        skillsToDevelop.push(
          `${skill.skillName} (Current Proficiency: ${(skill.proficiency * 100).toFixed(0)}%)`,
        )
      })
    }
    // Add potential future skills based on goals/issues
    const hasLowSelfEsteemGoal = goalsForTherapy.some(
      (g) =>
        g.toLowerCase().includes('self-esteem') ||
        g.toLowerCase().includes('self-worth'),
    )
    const hasLowSelfEsteemBelief = coreBeliefs.some(
      (b) =>
        b.strength > 0.5 &&
        (b.belief.toLowerCase().includes('worthless') ||
          b.belief.toLowerCase().includes('failure') ||
          b.belief.toLowerCase().includes('not good enough')),
    )

    if (
      (hasLowSelfEsteemGoal || hasLowSelfEsteemBelief) &&
      !skillsToDevelop.some(
        (s) =>
          s.toLowerCase().includes('positive self-talk') ||
          s.toLowerCase().includes('self-compassion'),
      )
    ) {
      skillsToDevelop.push('Positive Self-Talk and Self-Compassion Exercises')
    }
    if (
      presentingIssues.some(
        (p) =>
          p.toLowerCase().includes('social anxiety') ||
          p.toLowerCase().includes('relationship difficulties'),
      ) &&
      !skillsToDevelop.some(
        (s) =>
          s.toLowerCase().includes('assertiveness') ||
          s.toLowerCase().includes('communication skills'),
      )
    ) {
      skillsToDevelop.push('Assertiveness and Communication Skills')
    }
    if (
      presentingIssues.some(
        (p) =>
          p.toLowerCase().includes('anxiety') ||
          p.toLowerCase().includes('worry'),
      ) &&
      !skillsToDevelop.some(
        (s) =>
          s.toLowerCase().includes('grounding techniques') ||
          s.toLowerCase().includes('progressive muscle relaxation'),
      )
    ) {
      skillsToDevelop.push(
        'Grounding Techniques and Progressive Muscle Relaxation',
      )
    }
    if (skillsToDevelop.length > 0) {
      skillsToDevelop.forEach((skill) => {
        plan += `- ${skill}\n`
      })
    } else {
      plan += `- General coping strategies and emotional regulation.\n`
    }
    plan += `\n`

    // Progress Monitoring
    plan += `## Progress Monitoring\n`
    plan += `- Regular review of therapeutic goals.\n`
    plan += `- Monitoring of symptom changes (e.g., using standardized scales or subjective reports).\n`
    plan += `- Tracking of belief strength modification and skill acquisition.\n`
    plan += `- Patient feedback on therapeutic alliance and session effectiveness.\n\n`

    plan += `## Plan Review\n`
    plan += `- This treatment plan is a dynamic document and will be reviewed and updated collaboratively with the patient on a regular basis (e.g., every 4-6 sessions or as needed).\n`

    appLogger.info(
      `generateTreatmentPlan: Treatment plan generated for profile ${profile.id}`,
    )
    return plan
  }
}
