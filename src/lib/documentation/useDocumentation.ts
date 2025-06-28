import { useState, useEffect, useCallback } from 'react'
import type { DocumentationSystem } from './DocumentationSystem.js'
import { createDocumentationSystem } from './DocumentationSystem.js'
import { AIRepository } from '../db/ai/repository.js'
import type {
  AIService,
  AIMessage,
  AIServiceOptions,
  AICompletion,
} from '../ai/AIService.js'
import { appLogger as logger } from '../logging.js'
import { toast } from 'react-hot-toast'
import type { EHRExportOptions, EHRExportResult } from './ehrIntegration.js'
import { EHRServiceImpl } from '../ehr/services/ehr.service.js'
// Inline types for SessionDocumentation and TherapyAIOptions (since interfaces/therapy.js does not exist)
type SessionDocumentation = {
  sessionId: string
  clientId: string
  therapistId: string
  startTime: Date
  endTime?: Date
  summary: string
  keyInsights: string[]
  recommendations: string[]
  emotionSummary: string
  interventions: string[]
  notes: string
  metadata: Record<string, unknown>
}
type TherapyAIOptions = {
  temperature?: number
  maxTokens?: number
  model?: string
  includeEmotions?: boolean
  includeInterventions?: boolean
}

// Singleton instance cache
let documentationSystemInstance: DocumentationSystem | null = null
let ehrServiceInstance: EHRServiceImpl | null = null

/**
 * Custom hook for interacting with the documentation system
 * Provides real-time updates for session documentation
 */
export function useDocumentation(sessionId: string) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [documentation, setDocumentation] =
    useState<SessionDocumentation | null>(null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [exportResult, setExportResult] = useState<EHRExportResult | null>(null)

  // Initialize or get the documentation system
  const getDocumentationSystem =
    useCallback(async (): Promise<DocumentationSystem> => {
      if (documentationSystemInstance) {
        return documentationSystemInstance
      }

      try {
        // Create repository and a mock AIService implementation
        const repository = new AIRepository()
        // Minimal mock AIService implementation
        const aiService: AIService = {
          async createChatCompletion(
            _messages: AIMessage[],
            _options?: AIServiceOptions,
          ): Promise<AICompletion> {
            return {
              id: 'mock',
              created: Date.now(),
              model: 'mock',
              choices: [],
              usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
              provider: 'mock',
              content: '',
            }
          },
          async createStreamingChatCompletion(
            _messages: AIMessage[],
            _options?: AIServiceOptions,
          ) {
            return (async function* () {})()
          },
          getModelInfo(_model: string) {
            return {
              id: 'mock',
              name: 'mock',
              provider: 'mock',
              capabilities: [],
              contextWindow: 0,
              maxTokens: 0,
            }
          },
          dispose() {},
        }
        documentationSystemInstance = createDocumentationSystem(
          repository,
          aiService,
        )
        return documentationSystemInstance
      } catch (error) {
        logger.error('Failed to initialize documentation system', { error })
        throw new Error('Failed to initialize documentation system')
      }
    }, [])

  // Load documentation for the session
  const loadDocumentation = useCallback(
    async (forceRefresh = false): Promise<void> => {
      if (!sessionId) {
        setError(new Error('Session ID is required'))
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const documentationSystem = await getDocumentationSystem()
        const sessionDocumentation = await documentationSystem.getDocumentation(
          sessionId,
          forceRefresh,
        )

        setDocumentation(sessionDocumentation)
      } catch (error) {
        logger.error('Error loading documentation', { sessionId, error })
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to load documentation'),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, getDocumentationSystem],
  )

  // Generate documentation for the session
  const generateDocumentation = useCallback(
    async (options?: TherapyAIOptions): Promise<void> => {
      if (!sessionId) {
        setError(new Error('Session ID is required'))
        return
      }

      try {
        setIsGenerating(true)
        setError(null)

        const documentationSystem = await getDocumentationSystem()
        const sessionDocumentation =
          await documentationSystem.generateDocumentation(sessionId, options)

        setDocumentation(sessionDocumentation)
      } catch (error) {
        logger.error('Error generating documentation', { sessionId, error })
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to generate documentation'),
        )
      } finally {
        setIsGenerating(false)
      }
    },
    [sessionId, getDocumentationSystem],
  )

  // Save documentation changes
  const saveDocumentation = useCallback(
    async (updatedDocumentation: SessionDocumentation): Promise<boolean> => {
      if (!sessionId) {
        setError(new Error('Session ID is required'))
        return false
      }

      try {
        setIsLoading(true)
        setError(null)

        const documentationSystem = await getDocumentationSystem()
        const success = await documentationSystem.saveDocumentation(
          sessionId,
          updatedDocumentation,
        )

        if (success) {
          setDocumentation(updatedDocumentation)
        }

        return success
      } catch (error) {
        logger.error('Error saving documentation', { sessionId, error })
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to save documentation'),
        )
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, getDocumentationSystem],
  )

  // Set up EHR integration if needed
  const setupEHRIntegration = useCallback(
    async (providerId: string) => {
      try {
        // Get or initialize EHR service
        if (!ehrServiceInstance) {
          ehrServiceInstance = new EHRServiceImpl(console)
        }

        // Connect to the specified provider
        await ehrServiceInstance.connect(providerId)

        // Get FHIR client for the provider
        const fhirClient = ehrServiceInstance.getFHIRClient(providerId)

        // Set up EHR integration in the documentation system
        const documentationSystem = await getDocumentationSystem()
        documentationSystem.setupEHRIntegration(fhirClient)

        return true
      } catch (error) {
        logger.error('Error setting up EHR integration', { error, providerId })
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to set up EHR integration'),
        )
        return false
      }
    },
    [getDocumentationSystem],
  )

  // Export documentation to EHR
  const exportToEHR = useCallback(
    async (options: EHRExportOptions): Promise<EHRExportResult> => {
      if (!sessionId) {
        const error = new Error('Session ID is required')
        setError(error)
        return {
          success: false,
          status: 'failed',
          error: error.message,
        }
      }

      try {
        setIsExporting(true)
        setError(null)
        setExportResult(null)

        // Make sure EHR integration is set up
        if (ehrServiceInstance === null) {
          const setupSuccess = await setupEHRIntegration(options.providerId)
          if (!setupSuccess) {
            throw new Error('Failed to set up EHR integration')
          }
        }

        const documentationSystem = await getDocumentationSystem()
        const result = await documentationSystem.exportToEHR(sessionId, options)

        setExportResult(result)

        if (result.success) {
          toast.success(
            `Documentation exported successfully to ${options.format.toUpperCase()}`,
          )
        } else {
          toast.error(`Failed to export documentation: ${result.error}`)
        }

        return result
      } catch (error) {
        logger.error('Error exporting documentation to EHR', {
          sessionId,
          error,
          format: options.format,
        })

        const exportError = {
          success: false,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : String(error),
        }

        setExportResult(exportError)
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to export documentation'),
        )

        toast.error(`Failed to export documentation: ${exportError.error}`)
        return exportError
      } finally {
        setIsExporting(false)
      }
    },
    [sessionId, getDocumentationSystem, setupEHRIntegration],
  )

  // Set up real-time updates
  useEffect(() => {
    if (!sessionId) {
      return
    }

    let cleanup: (() => void) | null = null
    let isActive = false

    const setupRealTimeUpdates = async () => {
      try {
        const documentationSystem = await getDocumentationSystem()

        // Check if session is active
        isActive = documentationSystem.isSessionActive(sessionId)

        // Set initial loading state based on session activity
        if (isActive) {
          setIsLoading(true)
        }

        // Subscribe to documentation updates
        cleanup = documentationSystem.onDocumentationUpdate(
          sessionId,
          (updatedDocumentation: SessionDocumentation) => {
            setDocumentation(updatedDocumentation)
            if (isLoading) {
              setIsLoading(false)
            }
          },
        )

        // Set up additional listeners for active sessions
        if (isActive) {
          // Subscribe to session completion events
          const completionListener = ({
            sessionId: completedSessionId,
          }: {
            sessionId: string
          }) => {
            if (completedSessionId === sessionId) {
              isActive = false
              // Reload documentation after completion
              loadDocumentation()
            }
          }
          documentationSystem.on('session:completed', completionListener)

          // Add cleanup for completion listener
          const originalCleanup = cleanup
          cleanup = () => {
            if (originalCleanup) {
              originalCleanup()
            }
            documentationSystem.off('session:completed', completionListener)
          }
        }

        // Initial load of documentation
        await loadDocumentation()
      } catch (error) {
        logger.error('Error setting up real-time updates', { sessionId, error })
        setError(
          error instanceof Error
            ? error
            : new Error('Failed to set up real-time updates'),
        )
        setIsLoading(false)
      }
    }

    setupRealTimeUpdates()

    return () => {
      if (cleanup) {
        cleanup()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, getDocumentationSystem, loadDocumentation, isLoading])

  // Refresh documentation data
  const refreshDocumentation = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      await loadDocumentation()

      // Additionally, check if session is active and add a refresh indicator if needed
      const documentationSystem = await getDocumentationSystem()
      const isActive = documentationSystem.isSessionActive(sessionId)

      if (isActive) {
        toast(
          'Documentation refreshed. Session is still active. Updates may continue to arrive.',
          {
            duration: 3000,
          },
        )
      }
    } catch (error) {
      logger.error('Error refreshing documentation', { sessionId, error })
      setError(
        error instanceof Error
          ? error
          : new Error('Failed to refresh documentation'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, loadDocumentation, getDocumentationSystem])

  return {
    documentation,
    isLoading,
    isGenerating,
    isExporting,
    error,
    exportResult,
    loadDocumentation,
    generateDocumentation,
    saveDocumentation,
    exportToEHR,
    refreshDocumentation,
  }
}
