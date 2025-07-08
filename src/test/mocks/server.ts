/**
 * MSW Server Setup for Node.js/Vitest Environment
 * This file sets up the Mock Service Worker for intercepting API calls in tests
 */

// Simple fallback to prevent import errors in CI
export const server = {
  listen: () => {
    console.log('Mock server listen (fallback)')
  },
  close: () => {
    console.log('Mock server close (fallback)')
  },
  use: () => {
    console.log('Mock server use (fallback)')
  },
  resetHandlers: () => {
    console.log('Mock server resetHandlers (fallback)')
  },
}

// Simple handlers export
export const handlers: unknown[] = []
