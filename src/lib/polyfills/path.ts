/**
 * Browser-compatible polyfill for Node.js 'path' module
 */

export const join = (...paths: string[]) => paths.join('/').replace(/\/+/g, '/');

export const resolve = (...paths: string[]) => paths.join('/').replace(/\/+/g, '/');

export const basename = (path: string) => path.split('/').pop() || '';

export const dirname = (path: string) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
};

export const extname = (path: string) => {
  const match = /\.[^.]+$/.exec(path);
  return match ? match[0] : '';
};

export const sep = '/';

export const delimiter = ':';

export const parse = (pathString: string) => {
  const basename = pathString.split('/').pop() || '';
  const extname = basename.includes('.')
    ? '.' + basename.split('.').pop()
    : '';
  const name = extname ? basename.slice(0, -extname.length) : basename;

  return {
    root: pathString.startsWith('/') ? '/' : '',
    dir: pathString.split('/').slice(0, -1).join('/'),
    base: basename,
    ext: extname,
    name: name,
  };
};

export const format = (pathObject: Record<string, string | undefined>) => {
  const { dir, root, base, name, ext } = pathObject;
  const rootPath = dir || root || '';
  const fileName = base || name + (ext || '');
  return rootPath ? `${rootPath}/${fileName}` : fileName;
};

export default {
  join,
  resolve,
  basename,
  dirname,
  extname,
  sep,
  delimiter,
  parse,
  format,
};