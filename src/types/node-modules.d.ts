declare module 'child_process' {
  export interface ChildProcessWithoutNullStreams {
    stdin: NodeJS.WritableStream
    stdout: NodeJS.ReadableStream
    stderr: NodeJS.ReadableStream
    kill(signal?: NodeJS.Signals | number): boolean
    on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): this
    on(event: 'error', listener: (err: Error) => void): this
  }
  
  export function spawn(command: string, args?: string[], options?: any): ChildProcessWithoutNullStreams
}

declare module 'crypto' {
  export function randomUUID(): string
}