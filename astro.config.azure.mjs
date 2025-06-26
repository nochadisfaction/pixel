import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import tailwind from '@astrojs/tailwind'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'

// Azure Static Web Apps configuration
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://pixelatedempathy.com',
  
  // Use server output for Azure App Service, static for Azure Static Web Apps
  output: process.env.AZURE_DEPLOYMENT_TYPE === 'static' ? 'static' : 'server',
  
  // Azure Static Web Apps handles routing
  trailingSlash: 'ignore',
  
  // Build configuration optimized for Azure
  build: {
    format: 'directory',
    assets: '_astro',
    assetsPrefix: process.env.AZURE_CDN_ENDPOINT || undefined,
  },
  
  // Vite configuration for Azure deployment
  vite: {
    define: {
      // Ensure environment variables are available at build time
      'process.env.AZURE_OPENAI_API_KEY': JSON.stringify(process.env.AZURE_OPENAI_API_KEY),
      'process.env.AZURE_OPENAI_ENDPOINT': JSON.stringify(process.env.AZURE_OPENAI_ENDPOINT),
      'process.env.AZURE_AD_CLIENT_ID': JSON.stringify(process.env.AZURE_AD_CLIENT_ID),
      'process.env.AZURE_AD_TENANT_ID': JSON.stringify(process.env.AZURE_AD_TENANT_ID),
    },
    build: {
      // Optimize for Azure Static Web Apps
      target: 'es2020',
      minify: 'terser',
      sourcemap: false,
      rollupOptions: {
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
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
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
  
  // Experimental features for Azure optimization
  experimental: {
    assets: true,
    viewTransitions: true,
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
  
  // Adapter configuration (not used for static builds but kept for reference)
  adapter: node({
    mode: 'standalone',
  }),
  
  // Image optimization
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
    domains: [
      'pixelatedempathy.com',
      'cdn.pixelatedempathy.com',
      process.env.AZURE_CDN_ENDPOINT?.replace('https://', '') || '',
    ].filter(Boolean),
  },
  
  // Prefetch configuration
  prefetch: {
    prefetchAll: true,
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
