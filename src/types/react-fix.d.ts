/**
 * Type definitions for react/jsx-runtime module
 *
 * This fixes the missing module error for JSX runtime
 */
declare module 'react/jsx-runtime' {
  import type { ReactElement, ReactNode, ComponentType, Key } from 'react'
  
  export function jsx<P = Record<string, unknown>>(
    type: string | ComponentType<P>,
    props: P & { children?: ReactNode },
    key?: Key
  ): ReactElement
  
  export function jsxs<P = Record<string, unknown>>(
    type: string | ComponentType<P>,
    props: P & { children?: ReactNode },
    key?: Key
  ): ReactElement
  
  export const Fragment: ComponentType<{ children?: ReactNode }>
}

/**
 * Type definitions for react/jsx-dev-runtime module
 */
declare module 'react/jsx-dev-runtime' {
  export * from 'react/jsx-runtime'
}
