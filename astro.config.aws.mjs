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

// AWS deployment configuration
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://pixelatedempathy.com',

  // Use server output for AWS App Service
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),

  // Build configuration optimized for AWS
  build: {
    format: 'directory',
    assets: '_astro',
    assetsPrefix: process.env.AWS_CDN_ENDPOINT || undefined,
    inlineStylesheets: 'auto',
    concurrency: process.env.CI === 'true' ? 1 : 2,
  },

  // Vite configuration for AWS deployment
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
          if (id.includes('fsevents') || id.includes('chokidar')) {
            return { id: 'virtual:empty', external: false };
          }
          
          const nodeModules = [
            'fs', 'path', 'crypto', 'os', 'child_process',
            'worker_threads', 'stream', 'zlib', 'http', 'https', 'net', 'tls',
            'util', 'events', 'string_decoder', 'readline', 'inspector',
            'diagnostics_channel', 'async_hooks', 'url', 'module', 'constants', 'assert'
          ];
          
          if (nodeModules.includes(id) || id.startsWith('node:')) {
            return { id, external: true };
          }
          
          if (nodeModules.some(mod => id.includes(mod))) {
            return { id, external: true };
          }
          
          return null;
        },
        load(id) {
          if (id === 'virtual:empty') {
            return 'export default {};';
          }
          return null;
        }
      },
    ],

    assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],
    logLevel: 'warn',

    customLogger: {
      warn(msg) {
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
      'process.env.BUILDING_FOR_AWS': JSON.stringify('true'),
      'process.env.AWS_OPENAI_API_KEY': JSON.stringify(process.env.AWS_OPENAI_API_KEY),
      'process.env.AWS_OPENAI_ENDPOINT': JSON.stringify(process.env.AWS_OPENAI_ENDPOINT),
      'process.env.AWS_AD_CLIENT_ID': JSON.stringify(process.env.AWS_AD_CLIENT_ID),
      'process.env.AWS_AD_TENANT_ID': JSON.stringify(process.env.AWS_AD_TENANT_ID),
    },

    build: {
      target: 'es2022',
      minify: 'terser',
      sourcemap: 'hidden',
      chunkSizeWarningLimit: 800,
      ...(process.env.CI === 'true' && {
        minify: 'esbuild',
        reportCompressedSize: false,
        write: true,
      }),
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.source?.includes('fonts/KaTeX_')) {
            return
          }
          if (warning.code === 'SOURCEMAP_ERROR' || 
              warning.code === 'UNRESOLVED_IMPORT' ||
              warning.message?.includes('Can\'t resolve original location of error') ||
              warning.message?.includes('sourcemap')) {
            return
          }
          warn(warning)
        },
        external: [
          'crypto',
          'fs',
          'path',
          'stream',
          'util',
          'buffer',
          'events',
          'http',
          'https',
          'url',
          'zlib',
          'querystring',
          'os',
          'net',
          'tls',
          'worker_threads',
          'child_process',
          'constants',
        ],
      },
    },
  },

  // Image service configuration
  image: {
    service: passthroughImageService(),
  },

  // AWS-specific security headers
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  },

  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    expressiveCode({
      themes: ['github-dark', 'github-light'],
      styleOverrides: {
        borderRadius: '0.5rem',
      },
    }),
    mdx(),
    react(),
    icon({
      include: {
        lucide: ['*'],
        mdi: ['*'],
      },
    }),
    flexsearchIntegration(),
    markdoc(),
    keystatic(),
    sentry({
      dsn: process.env.SENTRY_DSN,
      sourceMapsUploadOptions: {
        project: 'pixelated-empathy',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },

  experimental: {
    serverIslands: true,
  },
}) 