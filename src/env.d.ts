/// <reference types="astro/client" />

// Re-export types from astro to fix module resolution
declare module 'astro' {
  export * from 'astro/dist/types/public/index.js'
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace App {
  interface Locals {
    requestId: string
    timestamp: string
    user?: {
      id: string
      email: string
      name?: string
    }
    vercelEdge?: {
      country: string
      region: string
      ip: string
      isAuthPage: boolean
      userAgent: string
    }
    cspNonce?: string
  }
}
