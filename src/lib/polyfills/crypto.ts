/**
 * Browser-compatible polyfill for Node.js 'crypto' module
 */

export const randomUUID = () => {
  // Use the Web Crypto API if available
  if (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.randomUUID
  ) {
    return window.crypto.randomUUID();
  }

  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const createHash = (_algorithm: string) => {
  console.warn(
    'crypto.createHash is not fully supported in browser environment',
  );
  return {
    update: (data: string) => ({
      digest: (_encoding: string) =>
        `browser-polyfill-hash-${data.substring(0, 8)}`,
    }),
  };
};

export const subtle =
  typeof window !== 'undefined' && window.crypto
    ? window.crypto.subtle
    : {
        digest: async (_algorithm: string, _data: BufferSource) => {
          console.warn(
            'crypto.subtle.digest fallback used - limited functionality',
          );
          return new Uint8Array(32); // Return dummy hash
        },
      };

export const randomBytes = (size: number) => {
  if (typeof window !== 'undefined' && window.crypto) {
    const bytes = new Uint8Array(size);
    window.crypto.getRandomValues(bytes);
    return {
      toString: (encoding?: string) => {
        if (encoding === 'hex') {
          return Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        }
        return String.fromCharCode.apply(null, Array.from(bytes));
      },
    };
  }

  // Fallback
  const result = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    result[i] = Math.floor(Math.random() * 256);
  }
  return {
    toString: (encoding?: string) => {
      if (encoding === 'hex') {
        return Array.from(result)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      return String.fromCharCode.apply(null, Array.from(result));
    },
  };
};

export default {
  randomUUID,
  createHash,
  subtle,
  randomBytes,
};