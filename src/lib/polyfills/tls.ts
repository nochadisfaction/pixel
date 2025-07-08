/**
 * Browser-compatible polyfill for Node.js 'tls' module
 */

export const createServer = () => {
  console.warn('tls.createServer is not supported in browser environment');
  return {
    listen: () => {},
    on: () => {},
  };
};

export const connect = (_options?: unknown) => {
  console.warn('tls.connect is not supported in browser environment');
  return {
    on: (_event: string, _callback: (...args: unknown[]) => void) => {},
    write: (_data: unknown) => {},
    end: () => {},
  };
};

export const createSecureContext = (_options?: unknown) => {
  console.warn('tls.createSecureContext is not supported in browser environment');
  return {};
};

export default {
  createServer,
  connect,
  createSecureContext,
};