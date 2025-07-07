/**
 * MSW Server Setup for Node.js/Vitest Environment
 * This file sets up the Mock Service Worker for intercepting API calls in tests
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Setup the server with our handlers
export const server = setupServer(...handlers)

// Export server for use in individual tests if needed
export * from './handlers'
