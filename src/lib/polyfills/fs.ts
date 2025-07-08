/**
 * Browser-compatible polyfill for Node.js 'fs' module
 */

export const promises = {
  readFile: async (path: string, _options?: unknown) => {
    console.warn(
      `fs.promises.readFile called with path: ${path} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.readFile is not supported in browser environment',
    );
  },
  writeFile: async (path: string, _data: unknown, _options?: unknown) => {
    console.warn(
      `fs.promises.writeFile called with path: ${path} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.writeFile is not supported in browser environment',
    );
  },
  mkdir: async (path: string, _options?: unknown) => {
mkdir: async (path: string, _options?: unknown) => {
    // Import the 'he' package for HTML entity encoding
    // he.encode() is used to sanitize the path before logging
    console.warn(
      `fs.promises.mkdir called with path: ${he.encode(path)} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.mkdir is not supported in browser environment',
      `fs.promises.mkdir called with path: ${path} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.mkdir is not supported in browser environment',
    );
  },
  stat: async (path: string) => {
    console.warn(
      `fs.promises.stat called with path: ${path} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.stat is not supported in browser environment',
    );
  },
  access: async (path: string, _mode?: number) => {
    console.warn(
      `fs.promises.access called with path: ${path} - not supported in browser`,
    );
    throw new Error(
      'fs.promises.access is not supported in browser environment',
    );
  },
};

export const readFileSync = (path: string, _options?: unknown) => {
  console.warn(
    `fs.readFileSync called with path: ${path} - not supported in browser`,
  );
  throw new Error('fs.readFileSync is not supported in browser environment');
};

export const existsSync = (path: string) => {
  console.warn(
    `fs.existsSync called with path: ${path} - not supported in browser`,
  );
  return false;
};

export default {
  promises,
  readFileSync,
  existsSync,
};