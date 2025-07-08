/**
 * Browser-compatible polyfill for Node.js 'os' module
 */

export const platform = () => 'browser';

export const arch = () => 'wasm32';

export const cpus = () => [];

export const totalmem = () => 8 * 1024 * 1024 * 1024; // 8GB mock

export const freemem = () => 4 * 1024 * 1024 * 1024; // 4GB mock

export const tmpdir = () => '/tmp';

export const EOL = '\n';

export default {
  platform,
  arch,
  cpus,
  totalmem,
  freemem,
  tmpdir,
  EOL,
};