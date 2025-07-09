import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import UnoCSS from '@unocss/astro'
import { defineConfig, passthroughImageService } from 'astro/config'
import flexsearchIntegration from './src/integrations/search.js'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

import sentry from '@sentry/astro'

import markdoc from '@astrojs/markdoc'
import keystatic from '@keystatic/astro'
import node from '@astrojs/node'

// Validate Azure configuration for production deployments only (skip during builds)
try {
  // Only validate when actually running in production (not during builds)
  if (typeof process !== 'undefined' && process.env) {
    const isProduction = process.env.NODE_ENV === 'production'
    const isAzurePipeline = process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI || process.env.BUILD_BUILDID
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
    const isCIEnvironment = process.env.CI === 'true' || isGitHubActions || isAzurePipeline
    const isBuildProcess = process.argv.includes('build') || process.env.npm_lifecycle_event === 'build' || process.env.npm_lifecycle_event === 'typecheck'
    
    // Only validate in production runtime, not during builds or CI
    if (isProduction && !isCIEnvironment && !isBuildProcess) {
      const { azureConfig } = await import('./src/config/azure.config.ts')
      azureConfig.validateProductionConfig()
    }
  }
} catch (error) {
  // Only fail the build in actual production deployment, not during build process
  const isBuildProcess = process.argv.includes('build') || process.env.npm_lifecycle_event === 'build'
  if (process.env.NODE_ENV === 'production' && !isBuildProcess) {
    console.error('❌ Azure Configuration Error:', error.message)
    process.exit(1)
  } else {
    console.warn('⚠️  Azure Configuration Warning:', error.message)
  }
}

// Azure App Service configuration
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://pixelatedempathy.com',

  // Use server output for Azure App Service
  output: 'server',

  // Azure Static Web Apps handles routing
  trailingSlash: 'ignore',

  // Build configuration optimized for Azure
  build: {
    format: 'directory',
    assets: '_astro',
    assetsPrefix: process.env.AZURE_CDN_ENDPOINT || undefined,
    inlineStylesheets: 'auto',
    concurrency: 2,
  },

  // Vite configuration for Azure deployment
  vite: {
    resolve: {
      alias: {
        '~': path.resolve('./src'),
        '@': path.resolve('./src'),
        '@components': path.resolve('./src/components'),
        '@layouts': path.resolve('./src/layouts'),
        '@utils': path.resolve('./src/utils'),
        '@lib': path.resolve('./src/lib'),
      },
      conditions: ['node', 'import', 'module', 'browser', 'default'],
    },

    // Prevent Node.js modules from being bundled for the browser
    // global: 'globalThis' is now included in the main define block below

    plugins: [
      flexsearchSSRPlugin(),
      {
        name: 'disable-sentry-telemetry',
        config() {
          return {
            define: {
              'process.env.SENTRY_DISABLE_TELEMETRY': 'true'
            }
          }
        }
      },
      {
        name: 'module-exclusion',
        resolveId(id) {
          // Completely block fsevents and chokidar by returning a virtual empty module
          if (id.includes('fsevents') || id.includes('chokidar')) {
            return { id: 'virtual:empty', external: false };
          }
          
          // Prevent Node.js modules from being resolved in client builds
          const nodeModules = [
            'fs', 'path', 'crypto', 'os', 'child_process',
            'worker_threads', 'stream', 'zlib', 'http', 'https', 'net', 'tls',
            'util', 'events', 'string_decoder', 'readline', 'inspector',
            'diagnostics_channel', 'async_hooks', 'url', 'module', 'constants', 'assert'
          ];
          
          // Externalize Node.js built-ins
          if (nodeModules.includes(id) || id.startsWith('node:')) {
            return { id, external: true };
          }
          
          // Handle nested imports of Node.js built-ins
          if (nodeModules.some(mod => id.includes(mod))) {
            return { id, external: true };
          }
          
          return null;
        },
        load(id) {
          if (id === 'virtual:empty') {
            return 'export default {};';
          }
          return null; // Important: Return null for unhandled IDs
        }
      },
    ],

    // Handle KaTeX font assets
    assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],

    // Suppress KaTeX font warnings during build
    logLevel: 'warn',

    // Custom logger to filter out specific warnings
    customLogger: {
      warn(msg) {
        // Suppress sourcemap warnings
        if (msg.includes('Can\'t resolve original location of error') ||
            msg.includes('sourcemap for reporting an error') ||
            msg.includes('FriendlyStranger.ttf')) {
          return
        }
        console.warn(msg)
      },
      info: console.info,
      error: console.error,
    },

    define: {
      // Ensure environment variables are available at build time
      'process.env.AZURE_OPENAI_API_KEY': JSON.stringify(
        process.env.AZURE_OPENAI_API_KEY,
      ),
      'process.env.AZURE_OPENAI_ENDPOINT': JSON.stringify(
        process.env.AZURE_OPENAI_ENDPOINT,
      ),
      'process.env.AZURE_AD_CLIENT_ID': JSON.stringify(
        process.env.AZURE_AD_CLIENT_ID,
      ),
      'process.env.AZURE_AD_TENANT_ID': JSON.stringify(
        process.env.AZURE_AD_TENANT_ID,
      ),
    },
    build: {
      // Optimize for Azure App Service
      target: 'es2022',
      minify: 'terser',
      sourcemap: 'hidden', // Enable hidden source maps for Sentry
      chunkSizeWarningLimit: 2000,
      // Prevent Node.js modules from being processed for client
      commonjsOptions: {
        ignore: ['chokidar', 'fsevents'],
        transformMixedEsModules: true,
      },
      // Suppress warnings during build
      onwarn(warning, warn) {
        // Suppress sourcemap and font warnings
        if (warning.code === 'SOURCEMAP_ERROR' || 
            warning.code === 'UNRESOLVED_IMPORT' ||
            warning.message?.includes('Can\'t resolve original location of error') ||
            warning.message?.includes('sourcemap')) {
          return
        }
        warn(warning)
      },
      // Suppress KaTeX font warnings
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress KaTeX font warnings
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.source?.includes('fonts/KaTeX_')) {
            return
          }
          // Suppress sourcemap warnings
          if (warning.message?.includes('sourcemap') || 
              warning.message?.includes('Can\'t resolve original location of error')) {
            return
          }
          warn(warning)
        },
        external: (id) => {
          // Completely block fsevents and chokidar - never bundle them
          if (id.includes('fsevents') || id.includes('chokidar') || 
              id.endsWith('fsevents.node') || id.includes('/fsevents/')) {
            return true;
          }
          
          // Always externalize Node.js built-ins
          if (id.startsWith('node:') || ['fs', 'path', 'crypto', 'os', 'child_process', 'worker_threads', 'stream', 'zlib', 'http', 'https', 'net', 'tls', 'util', 'events', 'string_decoder', 'readline', 'inspector', 'diagnostics_channel', 'async_hooks', 'url', 'module', 'constants', 'assert'].includes(id)) {
            return true;
          }
          
          // Externalize other server-only modules
          const serverOnlyModules = [
            'pdfkit', 'sharp', '@azure/storage-blob', '@azure/identity', '@azure/keyvault-secrets',
            'canvas', 'puppeteer', 'playwright', '@sentry/profiling-node'
          ];
          
          if (serverOnlyModules.some(mod => id.includes(mod))) {
            return true;
          }
          
          // Externalize KaTeX fonts and server-only patterns
          if (id.match(/^fonts\/KaTeX_.*\.(woff2?|ttf)$/) || 
              id.includes('server-only') || 
              id.includes('MentalLLaMAPythonBridge')) {
            return true;
          }
          
          return false;
        },
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react'
              }
              if (id.includes('@headlessui') || id.includes('@heroicons')) {
                return 'vendor-ui'
              }
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-utils'
              }
              return 'vendor'
            }
          },
          // Handle KaTeX font assets
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && /\.(woff2?|ttf)$/.test(assetInfo.name)) {
              return 'fonts/[name][extname]'
            }
            return '_astro/[name]-[hash][extname]'
          },
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@headlessui/react',
        '@heroicons/react/24/outline',
        '@heroicons/react/24/solid',
      ],
      exclude: [
        'msw',
        'virtual:keystatic-config',
        // File watching and native modules
        'chokidar',
        'fsevents',
        // Node.js built-ins
        'fs', 'path', 'crypto', 'os', 'child_process', 'worker_threads',
        'stream', 'zlib', 'http', 'https', 'net', 'tls', 'util', 'events',
        'string_decoder', 'readline', 'inspector', 'diagnostics_channel',
        'async_hooks', 'url', 'module', 'constants', 'assert',
        // Server-only modules
        '@azure/storage-blob', '@azure/identity', '@azure/keyvault-secrets',
        'pdfkit', 'sharp', 'canvas', 'puppeteer', 'playwright',
        '@sentry/profiling-node',
      ],
    },
    ssr: {
      // External dependencies for Azure Functions
      external: [
        '@azure/storage-blob',
        '@azure/identity',
        '@azure/keyvault-secrets',
        'src/lib/security/backup/recovery-testing.ts',
        'src/lib/audit.ts',
        'chokidar',
        'fsevents',
      ],
    },
  },

  // Integrations
  integrations: [
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      styleOverrides: {
        borderRadius: '0.5rem',
      },
    }), 
    react(), 
    mdx({
      components: path.resolve('./mdx-components.js'),
    }), 
    UnoCSS({
      injectReset: true,
      mode: 'global',
      safelist: ['font-sans', 'font-mono', 'font-condensed'],
      configFile: './uno.config.ts',
      content: {
        filesystem: [
          'src/**/*.{astro,js,ts,jsx,tsx,vue,mdx}',
          'components/**/*.{astro,js,ts,jsx,tsx,vue}',
        ],
      },
    }), 
    icon({
      include: {
        lucide: [
          'calendar',
          'user',
          'settings',
          'heart',
          'brain',
          'shield-check',
          'info',
          'arrow-left',
          'shield',
          'user-plus',
        ],
      },
      svgdir: './src/icons',
    }), 
    flexsearchIntegration(), 
    markdoc(), 
    ...(process.env.SKIP_KEYSTATIC !== 'true' ? [keystatic()] : []),
    sentry({
      dsn: process.env.SENTRY_DSN,
      sourceMapsUploadOptions: {
        project: process.env.SENTRY_PROJECT || "pixel-astro",
        org: process.env.SENTRY_ORG || "pixelated-empathy-dq",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
      telemetry: false,
    })
  ],

  // Markdown configuration
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  // Security headers (handled by staticwebapp.config.json)
  security: {
    checkOrigin: true,
  },

  // Server configuration for development
  server: {
    port: process.env.PORT || 8080, // Use PORT environment variable for Azure
    host: true, // Listen on all network interfaces
  },

  // Adapter configuration for Azure App Service
  adapter: node({
    mode: 'standalone',
  }),

  // Image optimization
  image: {
    service: passthroughImageService(),
    domains: [
      'pixelatedempathy.com',
      'cdn.pixelatedempathy.com',
      process.env.AZURE_CDN_ENDPOINT?.replace('https://', '') || '',
    ].filter(Boolean),
    defaultStrategy: 'viewport',
  },

  // Redirects (handled by staticwebapp.config.json)
  redirects: {
    '/admin': '/admin/dashboard',
    '/docs': '/docs/getting-started',
  },

  // Compressor configuration
  compressHTML: true,

  // Base configuration for subdirectory deployment
  base: process.env.AZURE_BASE_PATH || '/',

  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'development' && {
    // Development-specific settings
    devToolbar: {
      enabled: true,
    },
  }),

  ...(process.env.NODE_ENV === 'production' && {
    // Production-specific settings
    devToolbar: {
      enabled: false,
    },
  }),
})