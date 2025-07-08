/**
 * Browser-compatible polyfill for Node.js 'events' module
 * Provides EventEmitter as a direct named export
 */

export class EventEmitter {
  private listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  on(event: string, listener: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    if (!this.listeners[event]) {
      return false;
    }
    this.listeners[event].forEach((listener) => listener(...args));
    return true;
  }

  removeListener(event: string, listener: (...args: unknown[]) => void) {
    if (!this.listeners[event]) {
      return this;
    }
    this.listeners[event] = this.listeners[event].filter(
      (l) => l !== listener
    );
    return this;
  }

  once(event: string, listener: (...args: unknown[]) => void) {
    const onceWrapper = (...args: unknown[]) => {
      listener(...args);
      this.removeListener(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }
}

export default EventEmitter;