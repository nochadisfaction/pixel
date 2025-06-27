/**
 * Global Vitest Setup
 * This file is loaded before all tests across the entire project
 */
import { vi, beforeEach, afterEach, describe, it, test, expect } from 'vitest'

// Make vitest globals available
globalThis.vi = vi
globalThis.expect = expect
globalThis.beforeEach = beforeEach
globalThis.afterEach = afterEach
globalThis.describe = describe
globalThis.it = it
globalThis.test = test

// Global test environment setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
})

// Mock environment variables for tests
vi.mock('astro:env/server', () => ({
  REDIS_URL: 'redis://localhost:6379',
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
}))

// Mock Astro runtime
vi.mock('astro/runtime/server/index.js', () => ({
  createAstro: () => ({
    props: {},
    request: new Request('http://localhost:3000'),
    params: {},
    url: new URL('http://localhost:3000'),
  }),
}))

// Polyfill for Node.js globals in test environment
globalThis.Request = globalThis.Request || Request
globalThis.Response = globalThis.Response || Response
globalThis.Headers = globalThis.Headers || Headers
globalThis.fetch = globalThis.fetch || fetch

export {}
