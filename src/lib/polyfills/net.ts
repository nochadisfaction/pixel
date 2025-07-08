/**
 * Browser-compatible polyfill for Node.js 'net' module
 */

export const createServer = () => {
  console.warn('net.createServer is not supported in browser environment');
  return {
    listen: () => {},
    on: () => {},
  };
};

export const createConnection = (_options?: unknown) => {
  console.warn('net.createConnection is not supported in browser environment');
  return {
    on: (_event: string, _callback: (...args: unknown[]) => void) => {},
    write: (_data: unknown) => {},
    end: () => {},
  };
};

export const connect = createConnection;

export default {
  createServer,
  createConnection,
  connect,
};