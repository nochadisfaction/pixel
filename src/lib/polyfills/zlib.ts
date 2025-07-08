/**
 * Browser-compatible polyfill for Node.js 'zlib' module
 */

export const gzip = (_input: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('zlib.gzip is not supported in browser environment');
  if (callback) {
    callback(new Error('zlib.gzip not supported in browser'));
  }
  throw new Error('zlib.gzip is not supported in browser environment');
};

export const gunzip = (_input: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('zlib.gunzip is not supported in browser environment');
  if (callback) {
    callback(new Error('zlib.gunzip not supported in browser'));
  }
  throw new Error('zlib.gunzip is not supported in browser environment');
};

export const deflate = (_input: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('zlib.deflate is not supported in browser environment');
  if (callback) {
    callback(new Error('zlib.deflate not supported in browser'));
  }
  throw new Error('zlib.deflate is not supported in browser environment');
};

export const inflate = (_input: unknown, callback?: (...args: unknown[]) => void) => {
  console.warn('zlib.inflate is not supported in browser environment');
  if (callback) {
    callback(new Error('zlib.inflate not supported in browser'));
  }
  throw new Error('zlib.inflate is not supported in browser environment');
};

export default {
  gzip,
  gunzip,
  deflate,
  inflate,
};