/**
 * MSW Server Setup for Node.js/Vitest Environment
 * This file sets up the Mock Service Worker for intercepting API calls in tests
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers.js'

// Create mock server with handlers
export const server = setupServer(...handlers)

// Re-export handlers for convenience
export { handlers } from './handlers.js'
