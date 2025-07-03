import path from 'node:path'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import node from '@astrojs/node'
import UnoCSS from '@unocss/astro'
import { defineConfig, passthroughImageService } from 'astro/config'
import flexsearchIntegration from './src/integrations/search.js'
import expressiveCode from 'astro-expressive-code'
import icon from 'astro-icon'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

import markdoc from '@astrojs/markdoc'
import keystatic from '@keystatic/astro'

// Validate Azure configuration for production environments
try {
  // Only validate in Node.js environments (not during browser bundling)
  if (typeof process !== 'undefined' && process.env) {
    const { azureConfig } = await import('./src/config/azure.config.ts')
    azureConfig.validateProductionConfig()
    console.log('✅ Azure configuration validation passed')
  }
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
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
    concurrency: 4,
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
    },

    plugins: [flexsearchSSRPlugin()],

    // Handle KaTeX font assets
    assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf'],

    // Suppress KaTeX font warnings during build
    logLevel: 'warn',

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
      'process.env.AZURE_RESOURCE_GROUP': JSON.stringify(
        process.env.AZURE_RESOURCE_GROUP,
      ),
      'process.env.AZURE_LOCATION': JSON.stringify(
        process.env.AZURE_LOCATION,
      ),
    },
    build: {
      // Optimize for Azure App Service
      target: 'es2022',
      minify: 'terser',
      sourcemap: false,
      // Suppress KaTeX font warnings
      rollupOptions: {
        onwarn(warning, warn) {
          // Suppress KaTeX font warnings
          if (warning.code === 'UNRESOLVED_IMPORT' && warning.source?.includes('fonts/KaTeX_')) {
            return
          }
          warn(warning)
        },
        external: [
          'pdfkit',
          'sharp',
          '@azure/storage-blob',
          '@azure/identity',
          '@azure/keyvault-secrets',
          'canvas',
          'puppeteer',
          'playwright',
          'swiper/element/bundle',
          'swiper/css',
          'swiper',
          // KaTeX font files that should be handled at runtime
          /^fonts\/KaTeX_.*\.(woff2?|ttf)$/,
        ],
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
            'vendor-azure': ['@azure/storage-blob', '@azure/identity'],
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
    },
    ssr: {
      // External dependencies for Azure Functions
      external: [
        '@azure/storage-blob',
        '@azure/identity',
        '@azure/keyvault-secrets',
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
    keystatic(),
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
    port: 4321,
    host: true,
  },

  // Preview configuration
  preview: {
    port: 4322,
    host: true,
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

  // Redirects (handled by staticwebapp.config.json or App Service)
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
