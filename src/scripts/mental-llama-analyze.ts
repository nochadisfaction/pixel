#!/usr/bin/env ts-node
/**
 * MentalLLaMA Analysis Demo
 *
 * This script demonstrates how to use the MentalLLaMA integration
 * to analyze text for mental health indicators and provide
 * interpretable explanations.
 *
 * Usage:
 *   ts-node mental-llama-analyze.ts --text "Sample text to analyze" --output-path ./results.json
 */

import { program } from 'commander'
import { promises as fs } from 'fs'
import path from 'path'
import { createMentalLLaMAFromEnv } from '../lib/ai/mental-llama'

// Define types for CLI options
interface CliOptions {
  text?: string
  file?: string
  crisisText?: boolean
  generalText?: boolean
  outputPath: string
  evaluateExplanation?: boolean
  pythonBridge?: boolean
  expert?: boolean
  imhi?: boolean
  modelPath?: string
  listCategories?: boolean
}

// Define types for IMHI evaluation
interface IMHIEvaluationParams {
  modelPath: string
  outputPath: string
  testDataset: string
  isLlama: boolean
}

interface PythonBridgeWithIMHI {
  runIMHIEvaluation: (params: IMHIEvaluationParams) => Promise<unknown>
}

// Parse command line arguments
program
  .option('-t, --text <text>', 'Text to analyze for mental health indicators')
  .option('-f, --file <path>', 'File containing text to analyze')
  .option(
    '--crisis-text',
    'Use a predefined text sample likely to trigger crisis keyword detection for testing.',
  )
  .option(
    '--general-text',
    'Use a predefined text sample for general mental health assessment testing.',
  )
  .option(
    '-o, --output-path <path>',
    'Output path for results',
    './mental-llama-results.json',
  )
  .option(
    '-e, --evaluate-explanation',
    'Evaluate the quality of the generated explanation',
    false,
  )
  .option(
    '-p, --python-bridge',
    'Use Python bridge for advanced features',
    false,
  )
  .option('--expert', 'Use expert-guided explanations', false)
  .option(
    '--imhi',
    'Run IMHI benchmark evaluation (requires Python bridge)',
    false,
  )
  .option('--model-path <path>', 'Path to model for IMHI evaluation')
  .option(
    '--list-categories',
    'List all supported mental health categories',
    false,
  )
  .parse(process.argv)

const options = program.opts() as CliOptions

async function main() {
  console.log('🧠 MentalLLaMA Analysis')
  console.log('=======================')

  // Create MentalLLaMA adapter for listing categories
  if (options.listCategories) {
    console.log('Supported mental health categories:')
    console.log('- depression: Major depressive disorder')
    console.log('- anxiety: Generalized anxiety disorder')
    console.log('- ptsd: Post-traumatic stress disorder')
    console.log('- suicidality: Suicide risk')
    console.log('- bipolar_disorder: Bipolar disorder')
    console.log('- ocd: Obsessive-compulsive disorder')
    console.log('- eating_disorder: Various eating disorders')
    console.log('- social_anxiety: Social anxiety disorder')
    console.log('- panic_disorder: Panic disorder')
    process.exit(0)
  }

  // Validate arguments
  if (
    !options.text &&
    !options.file &&
    !options.crisisText &&
    !options.generalText
  ) {
    console.error(
      '❌ Error: Either --text, --file, --crisis-text, or --general-text must be provided',
    )
    process.exit(1)
  }

  try {
    // Create MentalLLaMA adapter
    console.log('Creating MentalLLaMA adapter components via factory...')
    // Explicitly get all returned components from the factory for potential use/logging
    const factoryOutput = await createMentalLLaMAFromEnv()
    const { adapter, pythonBridge, modelProvider } = factoryOutput // Get the model provider

    if (!adapter) {
      console.error(
        '❌ Error: Failed to create MentalLLaMA adapter from factory.',
      )
      process.exit(1)
    }
    console.log(`Adapter created.`)
    console.log(
      `  - Crisis Notifier initialized: ${!!factoryOutput.crisisNotifier}`,
    )
    console.log(`  - Task Router initialized: ${!!factoryOutput.taskRouter}`)
    if (modelProvider) {
      console.log(
        `  - ModelProvider initialized: ${modelProvider.getProviderName()}`,
      )
    } else {
      console.log(
        `  - ModelProvider: Not initialized (API key likely missing). LLM features will be stubbed.`,
      )
    }

    // Get text to analyze
    let textToAnalyze: string
    let testType = 'custom'

    if (options.crisisText) {
      textToAnalyze =
        "I feel so hopeless and I just want to kill myself sometimes. It feels like there's no reason to live."
      testType = 'crisis_keyword'
      console.log(
        `Using predefined crisis text for testing: "${textToAnalyze}"`,
      )
    } else if (options.generalText) {
      textToAnalyze =
        "I've been feeling pretty good lately, just a bit tired from work, but overall I'm managing things okay. My sleep has been alright."
      testType = 'general_assessment'
      console.log(
        `Using predefined general text for testing: "${textToAnalyze}"`,
      )
    } else if (options.text) {
      textToAnalyze = options.text
      testType = 'cli_text'
    } else if (options.file) {
      console.log(`Reading text from ${options.file}...`)
      textToAnalyze = await fs.readFile(options.file, 'utf-8')
      testType = 'file_text'
    } else {
      // Should be caught by validation above, but as a safeguard:
      console.error('Error: No text source specified.')
      process.exit(1)
    }

    const routingContextParams = {
      userId: 'cli-test-user-001',
      sessionId: `cli-session-${Date.now()}`,
      sessionType: `test_session_${testType}`,
      ...(options.expert && { explicitTaskHint: 'expert_analysis_request' }),
    }

    console.log('\nUsing Routing Context Parameters:', routingContextParams)

    // Check if we're running IMHI benchmark
    if (options.imhi) {
      if (!pythonBridge) {
        console.error('❌ Error: Python bridge is required for IMHI evaluation')
        process.exit(1)
      }

      if (!options.modelPath) {
        console.error('❌ Error: --model-path is required for IMHI evaluation')
        process.exit(1)
      }

      console.log('Running IMHI benchmark evaluation...')
      const result = await (
        pythonBridge as unknown as PythonBridgeWithIMHI
      ).runIMHIEvaluation({
        modelPath: options.modelPath,
        outputPath: options.outputPath,
        testDataset: 'IMHI',
        isLlama: true,
      })

      console.log('IMHI evaluation complete!')
      console.log(result)
      return
    }

    // Analyze text
    console.log('Analyzing text for mental health indicators...')

    let analysisResult
    const analysisParams = {
      text: textToAnalyze,
      // categories: 'auto_route', // Default in adapter if not specified
      // routingContext: {}, // Add if needed for CLI
      options: {
        modelTier: options.modelTier, // Pass model tier if specified, factory default otherwise
        useExpertGuidance: !!options.expert,
      },
    };

    if (options.expert) {
      console.log('Using expert-guided explanations...');
      // The analyzeMentalHealth method now takes an options object that can include useExpertGuidance
      // However, the dedicated expert guidance method might have different specific parameters in the future.
      // For now, we can call the specific method or rely on the option.
      // Let's keep the specific method call for clarity if it exists with different logic.
      analysisResult = await adapter.analyzeMentalHealthWithExpertGuidance(
        textToAnalyze,
        true, // fetchExpertGuidance - true by default for this path
        routingContextParams,
      )
    } else {
      analysisResult = await adapter.analyzeMentalHealth(
        textToAnalyze,
        routingContextParams,
      )
    }

    console.log('\n--- Full Analysis Result ---')
    console.log(JSON.stringify(analysisResult, null, 2))
    console.log('--- End Full Analysis Result ---')

    // Simplified console output after full JSON
    console.log('\nSummary:')
    console.log(
      `Mental Health Issue Detected: ${analysisResult.hasMentalHealthIssue ? 'Yes' : 'No'}`,
    )
    console.log(
      `Category: ${analysisResult.mentalHealthCategory.replace('_', ' ')}`,
    )
    console.log(`Confidence: ${(analysisResult.confidence * 100).toFixed(2)}%`)
    console.log(`Is Crisis: ${analysisResult.isCrisis}`)

    if (analysisResult._routingDecision) {
      console.log(`Routing Method: ${analysisResult._routingDecision.method}`)
      console.log(
        `Routing Target: ${analysisResult._routingDecision.targetAnalyzer}`,
      )
      if (analysisResult._routingDecision.insights) {
        console.log(
          `Routing Insights: ${JSON.stringify(analysisResult._routingDecision.insights)}`,
        )
      }
    }

    if (
      options.expert &&
      analysisResult._routingDecision?.insights?.expertGuidanceApplied
    ) {
      // Check the modified field
      console.log(`Explanation Type: Expert-guided (STUB)`)
    }
    console.log(`\nExplanation: ${analysisResult.explanation}`)

    // Enhanced supporting evidence display - now fully implemented with production-grade extraction
    if (
      analysisResult.supportingEvidence &&
      analysisResult.supportingEvidence.length > 0
    ) {
      console.log('\n--- Supporting Evidence ---')
      console.log(
        'Enhanced evidence extraction system identified the following supporting indicators:',
      )
      analysisResult.supportingEvidence.forEach((evidence, i) => {
        console.log(`${i + 1}. "${evidence}"`)
      })

      // Display additional evidence metrics if available through the enhanced system
      if (adapter.getEvidenceMetrics) {
        const evidenceMetrics = adapter.getEvidenceMetrics()
        console.log(`\nEvidence Quality Metrics:`)
        console.log(`  Total extractions: ${evidenceMetrics.totalExtractions}`)
        console.log(
          `  Cache efficiency: ${evidenceMetrics.cacheHits}/${evidenceMetrics.totalExtractions} hits`,
        )
        console.log(
          `  Average processing time: ${Math.round(evidenceMetrics.averageProcessingTime)}ms`,
        )
      }
    } else {
      console.log(
        '\nSupporting Evidence: None identified by the enhanced evidence extraction system',
      )
      console.log(
        'This could indicate insufficient detail in the input text or no clear indicators present.',
      )
    }

    // Show detailed evidence extraction if available
    try {
      if (adapter.extractDetailedEvidence) {
        console.log('\n--- Detailed Evidence Analysis ---')
        const detailedEvidence = await adapter.extractDetailedEvidence(
          textToAnalyze,
          analysisResult.mentalHealthCategory,
          analysisResult,
          routingContextParams,
        )

        console.log(
          `Evidence strength: ${detailedEvidence.processingMetadata.evidenceStrength}`,
        )
        console.log(
          `Total evidence items extracted: ${detailedEvidence.detailedEvidence.summary.totalEvidence}`,
        )
        console.log(
          `High-confidence indicators: ${detailedEvidence.detailedEvidence.summary.highConfidenceCount}`,
        )
        console.log(
          `Risk indicators: ${detailedEvidence.detailedEvidence.summary.riskIndicatorCount}`,
        )
        console.log(
          `Protective factors: ${detailedEvidence.detailedEvidence.summary.supportiveFactorCount}`,
        )

        if (detailedEvidence.detailedEvidence.qualityMetrics) {
          console.log(`\nEvidence Quality Scores:`)
          console.log(
            `  Completeness: ${(detailedEvidence.detailedEvidence.qualityMetrics.completeness * 100).toFixed(1)}%`,
          )
          console.log(
            `  Specificity: ${(detailedEvidence.detailedEvidence.qualityMetrics.specificity * 100).toFixed(1)}%`,
          )
          console.log(
            `  Clinical relevance: ${(detailedEvidence.detailedEvidence.qualityMetrics.clinicalRelevance * 100).toFixed(1)}%`,
          )
        }
      }
    } catch (detailedEvidenceError) {
      console.log(
        'Detailed evidence analysis not available:',
        detailedEvidenceError instanceof Error
          ? detailedEvidenceError.message
          : 'Unknown error',
      )
    }

    // Evaluate explanation quality if requested
    let qualityMetricsResults = null
    if (options.evaluateExplanation) {
      console.log('\nEvaluating explanation quality (STUBBED)...')
      qualityMetricsResults = await adapter.evaluateExplanationQuality(
        analysisResult.explanation,
        textToAnalyze,
      )

      console.log('\nQuality Metrics (STUBBED):')
      console.log(JSON.stringify(qualityMetricsResults, null, 2))

      // Add quality metrics to result object that will be saved
      ;(
        analysisResult as unknown as {
          qualityMetrics?: typeof qualityMetricsResults
        }
      ).qualityMetrics = qualityMetricsResults
    }

    // Save results
    console.log(`\nSaving results to ${options.outputPath}...`)
    const outputDir = path.dirname(options.outputPath)
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(
      options.outputPath,
      JSON.stringify(analysisResult, null, 2),
    )

    console.log('✅ Analysis complete!')
  } catch (error) {
    console.error('❌ Error analyzing text:', error)
    process.exit(1)
  }
}

main()
