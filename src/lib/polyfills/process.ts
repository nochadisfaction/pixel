/**
 * Browser-compatible polyfill for Node.js 'process' global
 */

export const env = {
  NODE_ENV: import.meta.env.MODE || 'development',
  // Add any other environment variables needed in browser context
  BROWSER: 'true',
};

export const nextTick = (callback: (...args: unknown[]) => void, ...args: unknown[]) => {
  setTimeout(() => callback(...args), 0);
};

// Add platform info for compatibility checks
export const platform = 'browser';

export const version = '16.0.0'; // Mock version

export const versions = {
  node: '16.0.0',
};

export default {
  env,
  nextTick,
  platform,
  version,
  versions,
};