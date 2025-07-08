/**
 * Browser-compatible polyfill for Node.js 'util' module
 */

export const promisify = (fn: (...args: unknown[]) => unknown) => {
  return (...args: unknown[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err: Error | null, ...results: unknown[]) => {
        if (err) {
          return reject(err);
        }
        if (results.length === 1) {
          return resolve(results[0]);
        }
        resolve(results);
      });
    });
  };
};

export const inspect = (obj: unknown) => JSON.stringify(obj, null, 2);

export const types = {
  isPromise: (value: unknown): value is Promise<unknown> =>
    value instanceof Promise,
  isDate: (value: unknown): value is Date => value instanceof Date,
  isRegExp: (value: unknown): value is RegExp => value instanceof RegExp,
};

export default {
  promisify,
  inspect,
  types,
};