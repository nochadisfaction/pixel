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

export { baselineScenarios } from './baseline-scenarios';
export { demographicBiasScenarios } from './demographic-bias-scenarios';

// Convenience exports for individual scenarios
export {
  baselineAnxietyScenario,
  baselineDepressionScenario,
  baselinePainManagementScenario
} from './baseline-scenarios';

export {
  ageBiasYoungPatient,
  ageBiasElderlyPatient
} from './demographic-bias-scenarios';

/**
 * Get all test scenarios organized by category
 */
export const getAllTestScenarios = () => ({
  baseline: baselineScenarios,
  demographicBias: demographicBiasScenarios
});

/**
 * Get scenarios specifically designed to test for bias (should trigger alerts)
 */
export const getBiasTestScenarios = () => [
  ageBiasElderlyPatient,
  // Add more biased scenarios as they're created
];

/**
 * Get scenarios that should NOT trigger bias alerts (baseline examples)
 */
export const getNonBiasTestScenarios = () => [
  baselineAnxietyScenario,
  baselineDepressionScenario,
  baselinePainManagementScenario,
  ageBiasYoungPatient // This one shows favorable treatment
];

/**
 * Get paired scenarios for comparative bias testing
 * Returns arrays of [favorable_treatment, unfavorable_treatment] pairs
 */
export const getComparativeBiasScenarios = () => [
  [ageBiasYoungPatient, ageBiasElderlyPatient], // Age bias comparison
  // Add more comparative pairs as they're created
]; 