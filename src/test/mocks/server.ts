/**
 * MSW Server Setup for Node.js/Vitest Environment
 * This file sets up the Mock Service Worker for intercepting API calls in tests
 */

// Conditional import to handle Node.js environment detection issues
let setupServer: any
let handlers: any

try {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const mswNode = await import('msw/node')
    setupServer = mswNode.setupServer
    const handlersModule = await import('./handlers')
    handlers = handlersModule.handlers
  }
} catch (error) {
  console.warn('MSW setup skipped in browser environment:', error.message)
  // Provide fallback for browser environments
  setupServer = () => ({ listen: () => {}, close: () => {}, use: () => {} })
  handlers = []
}

// Setup the server with our handlers
export const server = setupServer ? setupServer(...(handlers || [])) : null

// Export handlers if available
if (handlers) {
  const handlersModule = await import('./handlers')
  Object.assign(exports, handlersModule)
}
