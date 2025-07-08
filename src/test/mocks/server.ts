/**
 * MSW Server Setup for Node.js/Vitest Environment
 * This file sets up the Mock Service Worker for intercepting API calls in tests
 */

// Check if we're in a Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node

// Create a mock server that works in all environments
let server: any = null

if (isNode) {
  try {
    // Use require for Node.js compatibility
    const { setupServer } = require('msw/node')
    const { handlers } = require('./handlers')
    server = setupServer(...handlers)
  } catch (error) {
    console.warn('MSW setup failed:', error.message)
    // Provide fallback mock server
    server = {
      listen: () => {},
      close: () => {},
      use: () => {},
      resetHandlers: () => {}
    }
  }
} else {
  // Browser environment fallback
  server = {
    listen: () => {},
    close: () => {},
    use: () => {},
    resetHandlers: () => {}
  }
}

export { server }

// Re-export handlers if available
try {
  if (isNode) {
    const handlersModule = require('./handlers')
    module.exports = { ...module.exports, ...handlersModule }
  }
} catch (error) {
  // Ignore handler export errors
}
