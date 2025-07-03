/**
 * Test data fixtures for bias detection scenarios
 *
 * This module provides realistic therapeutic session data for testing
 * bias detection capabilities across various scenarios including:
 * - Baseline scenarios (unbiased examples)
 * - Demographic bias scenarios (age, gender, race, socioeconomic)
 * - Clinical bias scenarios (diagnosis, treatment patterns)
 * - Edge cases and unusual scenarios
 */

export { baselineScenarios } from './baseline-scenarios'
export { demographicBiasScenarios } from './demographic-bias-scenarios'

// Convenience exports for individual scenarios
export {
  baselineAnxietyScenario,
  baselineDepressionScenario,
  baselinePainManagementScenario,
} from './baseline-scenarios'

export {
  ageBiasYoungPatient,
  ageBiasElderlyPatient,
} from './demographic-bias-scenarios'

/**
 * Get all test scenarios organized by category
 */
export const getAllTestScenarios = async () => {
  const { baselineScenarios } = await import('./baseline-scenarios')
  const { demographicBiasScenarios } = await import('./demographic-bias-scenarios')

  return {
    baseline: baselineScenarios,
    demographicBias: demographicBiasScenarios,
  }
}

/**
 * Get scenarios specifically designed to test for bias (should trigger alerts)
 * This includes both favorable and unfavorable bias scenarios since both represent
 * systematic differences in treatment quality based on patient demographics.
 */
export const getBiasTestScenarios = async () => {
  const {
    ageBiasYoungPatient,
    ageBiasElderlyPatient,
  } = await import('./demographic-bias-scenarios')

  return [
    ageBiasYoungPatient, // Favorable bias - still bias
    ageBiasElderlyPatient, // Unfavorable bias
    // Additional bias scenarios can be added as they're implemented and exported
  ]
}

/**
 * Get baseline scenarios that should NOT trigger bias alerts
 * These represent equitable, evidence-based treatment without demographic bias
 */
export const getBaselineTestScenarios = async () => {
  const {
    baselineAnxietyScenario,
    baselineDepressionScenario,
    baselinePainManagementScenario,
  } = await import('./baseline-scenarios')

  return [
    baselineAnxietyScenario,
    baselineDepressionScenario,
    baselinePainManagementScenario,
  ]
}

/**
 * Get paired scenarios for comparative bias testing
 * Returns arrays of [favorable_treatment, unfavorable_treatment] pairs
 * These pairs demonstrate contrasting treatment quality for similar presentations
 * but different demographic characteristics.
 */
export const getComparativeBiasScenarios = async () => {
  const {
    ageBiasYoungPatient,
    ageBiasElderlyPatient,
  } = await import('./demographic-bias-scenarios')

  return [
    [ageBiasYoungPatient, ageBiasElderlyPatient], // Age bias comparison
    // Additional comparative pairs can be added as more scenarios are implemented
  ]
}

/**
 * @deprecated Use getBaselineTestScenarios() instead
 * This function name was misleading as it included favorable bias scenarios
 */
export const getNonBiasTestScenarios = getBaselineTestScenarios
