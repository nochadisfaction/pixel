import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import UnoCSS from '@unocss/astro'
import { defineConfig, passthroughImageService } from 'astro/config'
import flexsearchIntegration from './src/integrations/search.js'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr.js'

import sentry from '@sentry/astro'

import markdoc from '@astrojs/markdoc'
import keystatic from '@keystatic/astro'
import node from '@astrojs/node'

// Validate Azure configuration for production deployments only (skip during builds and CI)
try {
  // Only validate when actually running in production (not during builds)
  if (typeof process !== 'undefined' && process.env) {
    const isProduction = process.env.NODE_ENV === 'production'
    const isAzurePipeline = process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI || process.env.BUILD_BUILDID
    const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
    const isCIEnvironment = process.env.CI === 'true' || isGitHubActions || isAzurePipeline
    const isBuildProcess = process.argv.includes('build') || process.env.npm_lifecycle_event === 'build' || process.env.npm_lifecycle_event === 'typecheck' || process.env.npm_lifecycle_event === 'check'
    
    // Skip Azure config validation entirely during any build or CI process
    if (isProduction && !isCIEnvironment && !isBuildProcess) {
      try {
        const { azureConfig } = await import('./src/config/azure.config.ts')
        azureConfig.validateProductionConfig()
      } catch (importError) {
        console.warn('⚠️ Could not load Azure config during validation:', importError.message)
      }
    }
  }
} catch (error) {
  // Always treat config errors as warnings during build processes
  console.warn('⚠️ Azure Configuration Warning (build-time):', error.message)
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
    // Reduce concurrency for Azure pipeline memory constraints
    concurrency: process.env.CI === 'true' ? 1 : 2,
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
      // Prevent Node.js modules from being processed for client
      commonjsOptions: {
        ignore: ['chokidar', 'fsevents'],
        transformMixedEsModules: true,
      },
      // Set chunk size warning limit - warn at 800KB for better performance
      chunkSizeWarningLimit: 800, // 800KB limit for better performance
      // Memory optimization for CI environments
      ...(process.env.CI === 'true' && {
        minify: 'esbuild', // Faster and uses less memory than terser
        reportCompressedSize: false, // Skip compression reporting to save memory
        write: true, // Ensure files are written to disk to free memory
      }),
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
              id.includes('server-only')) {
            return true;
          }
          
          return false;
        },
        output: {
          manualChunks: (id) => {
            // Third-party vendor chunk splitting
            if (id.includes('node_modules')) {
              // React ecosystem - split more granularly
              if (id.includes('react-dom/client')) {
                return 'vendor-react-dom-client'
              }
              if (id.includes('react-dom')) {
                return 'vendor-react-dom'
              }
              if (id.includes('react/jsx-runtime')) {
                return 'vendor-react-jsx'
              }
              if (id.includes('react')) {
                return 'vendor-react'
              }
              
              // Radix UI - split each major component
              if (id.includes('@radix-ui/react-dialog')) {
                return 'vendor-radix-dialog'
              }
              if (id.includes('@radix-ui/react-tabs')) {
                return 'vendor-radix-tabs'
              }
              if (id.includes('@radix-ui/react-select')) {
                return 'vendor-radix-select'
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-radix'
              }
              
              // Component libraries  
              if (id.includes('@headlessui') || id.includes('@heroicons')) {
                return 'vendor-ui'
              }
              
              // AI/ML libraries (typically large) - split more
              if (id.includes('@tensorflow/tfjs-layers')) {
                return 'vendor-tf-layers'
              }
              if (id.includes('@tensorflow/tfjs')) {
                return 'vendor-tensorflow'
              }
              if (id.includes('@transformers')) {
                return 'vendor-transformers'
              }
              if (id.includes('onnx')) {
                return 'vendor-onnx'
              }
              
              // Chart libraries - split by library
              if (id.includes('recharts')) {
                return 'vendor-recharts'
              }
              if (id.includes('chart.js')) {
                return 'vendor-chartjs'
              }
              if (id.includes('d3')) {
                return 'vendor-d3'
              }
              if (id.includes('@react-three/fiber')) {
                return 'vendor-r3f'
              }
              if (id.includes('three')) {
                return 'vendor-three'
              }
              
              // Sentry - can be large
              if (id.includes('@sentry')) {
                return 'vendor-sentry'
              }
              
              // Supabase/Auth
              if (id.includes('@supabase')) {
                return 'vendor-supabase'
              }
              if (id.includes('@clerk')) {
                return 'vendor-clerk'
              }
              
              // Utility libraries
              if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-utils'
              }
              
              // Markdown/content processing
              if (id.includes('marked') || id.includes('remark') || id.includes('rehype')) {
                return 'vendor-markdown'
              }
              
              // Large utility libraries
              if (id.includes('lodash') || id.includes('ramda') || id.includes('rxjs')) {
                return 'vendor-large-utils'
              }
              
              return 'vendor'
            }
            
            // Application code chunk splitting
            if (id.includes('src/')) {
              // Split large demo components
              if (id.includes('src/components/demo/')) {
                return 'demo-components'
              }
              // Split AI/ML related components
              if (id.includes('src/lib/ai/') || id.includes('src/components/ai/')) {
                return 'ai-components'
              }
              // Split chat/therapy components  
              if (id.includes('src/components/chat/') || id.includes('src/components/therapy/')) {
                return 'chat-components'
              }
              // Split admin/dashboard components
              if (id.includes('src/components/admin/') || id.includes('src/pages/admin/')) {
                return 'admin-components'
              }
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
        release: {
          name: process.env.SENTRY_RELEASE || `${process.env.BUILD_BUILDNUMBER || 'dev'}-${process.env.BUILD_SOURCEVERSION?.substring(0, 7) || 'local'}`,
        },
        // Only upload source maps in production with auth token
        skipUpload: !process.env.SENTRY_AUTH_TOKEN || process.env.NODE_ENV !== 'production',
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
    port: parseInt(process.env.PORT) || 8080, // Use PORT environment variable for Azure, parse to number
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