/**
 * Browser-compatible polyfill for Node.js 'http' module
 */

export const createServer = () => {
*/

export const createServer = () => {
  throw new Error('http.createServer is not supported in browser environment');
  return {
    listen: () => {},
    on: () => {},
  return {
    listen: () => {},
    on: () => {},
  };
};

export const request = (_options: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('http.request is not supported in browser environment');
  if (callback) {
    callback(new Error('http.request not supported'));
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