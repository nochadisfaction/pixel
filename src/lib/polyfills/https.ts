/**
 * Browser-compatible polyfill for Node.js 'https' module
 */

export const createServer = () => {
  console.warn('https.createServer is not supported in browser environment');
  return {
    listen: () => {},
    on: () => {},
  };
};

export const request = (_options: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('https.request is not supported in browser environment');
  if (callback) {
    callback(new Error('https.request not supported'));
  }
  return {
    on: (_event: string, _cb: (...args: unknown[]) => void) => {
      return {};
    },
    write: (_chunk: unknown) => {},
    end: () => {},
  };
};

export default {
  createServer,
  request,
};