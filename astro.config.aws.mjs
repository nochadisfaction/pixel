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
import sentry from '@sentry/astro'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'

// AWS Amplify configuration
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://pixelatedempathy.com',
  
  // Use server output for AWS Amplify
  output: 'server',
  
  
  // AWS Amplify handles routing
  trailingSlash: 'ignore',
  
  // Build configuration optimized for AWS Amplify
  build: {
    format: 'directory',
    assets: '_astro',
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
    },
    
    plugins: [flexsearchSSRPlugin()],
    
    build: {
      // Optimize for AWS Amplify
      target: 'es2022',
      minify: 'terser',
      sourcemap: false,
      rollupOptions: {
        external: [
          'pdfkit',
          'sharp',
          'canvas',
          'puppeteer',
          'playwright',
          'swiper/element/bundle',
          'swiper/css',
          'swiper',
        ],
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['@headlessui/react', '@heroicons/react'],
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
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
        lucide: ['calendar', 'user', 'settings', 'heart', 'brain', 'shield-check', 'info', 'arrow-left', 'shield', 'user-plus'],
      },
      svgdir: './src/icons',
    }),
    flexsearchIntegration(),
    sentry(),
  ],
  
  // Markdown configuration
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  
  // Security headers
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
  
  // Adapter configuration for AWS Amplify
  adapter: node({
    mode: 'standalone',
  }),
  
  // Image optimization
  image: {
    service: passthroughImageService(),
    domains: [
      'pixelatedempathy.com',
      'cdn.pixelatedempathy.com',
    ].filter(Boolean),
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  
  // Redirects
  redirects: {
    '/admin': '/admin/dashboard',
    '/docs': '/docs/getting-started',
  },
  
  // Compressor configuration
  compressHTML: true,
  
  // Base configuration for subdirectory deployment
  base: '/',
  
  // Environment-specific configuration
  ...(process.env.NODE_ENV === 'production' && {
    // Production-specific settings
    devToolbar: {
      enabled: false,
    },
  }),
})