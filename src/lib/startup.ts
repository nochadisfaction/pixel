import { getLogger } from './logging'
import { LogRotationService } from './logging/rotation'
import { initializeSecurity } from './security'

const logger = getLogger()

/**
 * Initialize the application
 * This should be called when the application starts
 */
export async function initializeApplication(): Promise<void> {
  try {
    logger.info('Starting application initialization...')

    // Initialize log rotation
    const logRotation = new LogRotationService()
    await logRotation.ensureLogDir()

    // Initialize security module
    await initializeSecurity()

    logger.info('Application initialization complete')
  } catch (_error) {
    logger.error(
      'Failed to initialize application',
      error as Record<string, unknown>,
    )
    throw error
  }
}

/**
 * Shutdown the application gracefully
 * This should be called when the application is shutting down
 */
export async function shutdownApplication(): Promise<void> {
  try {
    logger.info('Starting application shutdown...')

    // Add shutdown tasks here

    logger.info('Application shutdown complete')
  } catch (_error) {
    logger.error(
      'Error during application shutdown',
      error as Record<string, unknown>,
    )
    throw error
  }
}
