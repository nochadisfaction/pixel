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
) => {
  // Import the 'escape' function from a sanitization library
  // escape() is used to sanitize the 'command' input before logging
  console.warn(
    `child_process.exec called with command: ${escape(command)} - not supported in browser`,
  );
  if (callback) {
    callback(
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
// Import the sanitize-log function from a hypothetical logging utility
// This function sanitizes input before logging to prevent log injection
import { sanitizeLog } from './logging-utils';

export const execSync = (command: string, _options?: unknown) => {
  console.warn(
    `child_process.execSync called with command: ${sanitizeLog(command)} - not supported in browser`,
  );
  throw new Error(
    'child_process.execSync is not supported in browser environment',
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