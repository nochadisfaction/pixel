/**
 * Simple Mock Server Setup for Testing
 * This file provides basic mocking functionality for tests
 */

// Simple mock server implementation
export const server = {
  listen: vi.fn(),
  close: vi.fn(),
  resetHandlers: vi.fn(),
  use: vi.fn(),
};

// Mock fetch globally for tests
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as any;

// Export server for use in individual tests if needed
export * from './handlers'
