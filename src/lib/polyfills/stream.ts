/**
 * Browser-compatible polyfill for Node.js 'stream' module
 */

export class Readable {
  on(_event: string, _listener: (...args: unknown[]) => void) {
    return this;
  }
  pipe(destination: unknown) {
    return destination;
  }
  read() {
    return null;
  }
}

export class Writable {
  on(_event: string, _listener: (...args: unknown[]) => void) {
    return this;
  }
  write(_chunk: unknown) {
    return true;
  }
  end() {}
}

export class Transform {
  on(_event: string, _listener: (...args: unknown[]) => void) {
    return this;
  }
  write(_chunk: unknown) {
    return true;
  }
  end() {}
  pipe(destination: unknown) {
    return destination;
  }
}

export default {
  Readable,
  Writable,
  Transform,
};