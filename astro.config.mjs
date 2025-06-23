import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import awsAmplify from 'astro-aws-amplify'
import UnoCSS from '@unocss/astro'
import compress from 'astro-compress'
import { defineConfig, passthroughImageService } from 'astro/config'
import flexsearchIntegration from './src/integrations/search.js'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import sentry from '@sentry/astro'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const isAWS = process.env.AWS_LAMBDA_RUNTIME_API !== undefined || process.env.AWS_DEPLOYMENT === '1'

// Minimal integrations for AWS Lambda size constraints
const integrations = [
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
      lucide: ['calendar', 'user', 'settings', 'heart', 'brain', 'shield-check'],
    },
    svgdir: './src/icons',
  }),
  flexsearchIntegration(),
  // Conditional integrations for production
  ...(isProduction && process.env.SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN ? [
    sentry({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: true,
      telemetry: false,
      sourceMapsUploadOptions: {
        project: process.env.SENTRY_PROJECT || 'pixel-astro',
        org: process.env.SENTRY_ORG || 'pixelated-empathy-dq',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ] : []),
  // Disable astro-compress for AWS builds to avoid Sharp conflicts
  ...(isProduction && !isAWS ? [
    compress({
      css: true,
      html: true,
      img: false,
      js: true,
      svg: false,
    }),
  ] : []),
]

export default defineConfig({
  site: 'https://pixelatedempathy.com',
  output: 'server', // Server-side rendering with API routes
  adapter: awsAmplify(),
  image: {
    service: passthroughImageService(),
  },
  
  prefetch: {
    defaultStrategy: 'hover',
    throttle: 3,
  },

  // Essential security headers
  headers: [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
    {
      source: '/assets/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/_astro/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],

  integrations,

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
    },
    
    plugins: [flexsearchSSRPlugin()],
    
    // AWS Lambda optimized build configuration
    build: {
      chunkSizeWarningLimit: 2000,
      target: 'node22',
      sourcemap: true,
      rollupOptions: {
        // AWS Lambda externals - keep bundle size minimal
        external: (id) => {
          // Core Node.js modules
          if (id.startsWith('node:') || 
              ['fs', 'path', 'crypto', 'http', 'https', 'util', 'buffer', 'stream', 'events', 'url', 'os'].includes(id)) {
            return true;
          }
          
          // Heavy dependencies that should be installed as Lambda layers
          const heavyDeps = [
            '@tensorflow/tfjs',
            'sharp',
            'puppeteer',
            'playwright',
            '@google-cloud/storage',
            'aws-sdk',
            '@aws-sdk/client-s3',
            'three',
            'canvas',
            'node-seal',
          ];
          
          return heavyDeps.some(dep => id.includes(dep));
        },
        output: {
          // Optimize for AWS Lambda
          format: 'es',
          manualChunks: {
            // Split vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            astro: ['astro/runtime/server/index.js'],
          },
        },
        onwarn: (warning, warn) => {
          // Suppress common warnings for AWS builds
          if (warning.code === 'SOURCEMAP_ERROR' || 
              warning.code === 'UNRESOLVED_IMPORT' ||
              warning.code === 'EXTERNAL_DEPENDENCY') {
            return;
          }
          warn(warning);
        },
      },
    },

    ssr: {
      // AWS Lambda runtime externals
      external: [
        'flexsearch',
        'flexsearch/dist/module/document',
        'sharp',
        '@tensorflow/tfjs',
        'three',
        'canvas',
        'puppeteer',
        'playwright',
        '@google-cloud/storage',
        '@aws-sdk/client-s3',
        '@aws-sdk/client-dynamodb',
        'pg',
        'mysql2',
        'sqlite3',
        'redis',
        'mongodb',
        'nodemailer',
        '@sentry/node',
        'newrelic',
      ],
    },
  },

  // AWS specific configurations
  server: {
    host: '0.0.0.0', // Lambda needs to bind to all interfaces
    port: parseInt(process.env.PORT || '3000'),
  },

  // Remove experimental features for compatibility
}) 