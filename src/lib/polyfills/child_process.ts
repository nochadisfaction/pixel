/**
 * Browser-compatible polyfill for Node.js 'child_process' module
 */

export const spawn = (command: string, _args?: string[], _options?: unknown) => {
  console.warn(
    `child_process.spawn called with command: ${command} - not supported in browser`,
  );
  return {
    on: (_event: string, _callback: (...args: unknown[]) => void) => {},
    stdout: {
      on: (_event: string, _callback: (...args: unknown[]) => void) => {},
      pipe: (destination: unknown) => destination,
    },
    stderr: {
      on: (_event: string, _callback: (...args: unknown[]) => void) => {},
      pipe: (destination: unknown) => destination,
    },
    kill: () => {},
  };
};

export const exec = (
  command: string,
  _options?: unknown,
  callback?: (...args: unknown[]) => void,
) => {
  console.warn(
    `child_process.exec called with command: ${command} - not supported in browser`,
  );
  if (callback) {
    callback(
      new Error('child_process.exec is not supported in browser environment'),
      '',
      '',
    );
  }
  throw new Error(
    'child_process.exec is not supported in browser environment',
  );
};

export const execSync = (command: string, _options?: unknown) => {
  console.warn(
    `child_process.execSync called with command: ${command} - not supported in browser`,
  );
  throw new Error(
    'child_process.execSync is not supported in browser environment',
  );
};

export default {
  spawn,
  exec,
  execSync,
};