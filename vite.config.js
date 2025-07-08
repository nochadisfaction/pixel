import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'
import path from 'path'

import nodePolyfillPlugin from './src/plugins/vite-plugin-node-polyfill'
import nodeExcludePlugin from './src/plugins/vite-plugin-node-exclude'
import externalNodePlugin from './src/plugins/vite-plugin-external-node'
import flexsearchSSRPlugin from './src/plugins/vite-plugin-flexsearch-ssr'
import middlewarePatchPlugin from './src/plugins/vite-plugin-middleware-patch'

export default defineConfig({
  plugins: [
    nodePolyfillPlugin(),
    nodeExcludePlugin(),
    externalNodePlugin(),
    flexsearchSSRPlugin(),
    middlewarePatchPlugin(),
    {
      name: 'exclude-server-only',
      resolveId(id) {
        if (
          id.includes('/server-only/') ||
          id.includes('MentalLLaMAPythonBridge')
        ) {
          return false
        }
      },
    },
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG || 'pixelated-empathy-dq',
            project: process.env.SENTRY_PROJECT || 'pixelated',
            authToken: process.env.SENTRY_AUTH_TOKEN,
          }),
        ]
      : []),
    sentryVitePlugin({
      org: 'pixelated-empathy-dq',
      project: 'pixel-astro',
    }),
  ],
  resolve: {
    alias: {
      'node:process': path.resolve('./src/lib/polyfills/process.ts'),
      'node:crypto': path.resolve('./src/lib/polyfills/crypto.ts'),
      'node:path': path.resolve('./src/lib/polyfills/path.ts'),
      'node:fs': path.resolve('./src/lib/polyfills/fs.ts'),
      'node:child_process': path.resolve('./src/lib/polyfills/child_process.ts'),
      'node:stream': path.resolve('./src/lib/polyfills/stream.ts'),
      'node:util': path.resolve('./src/lib/polyfills/util.ts'),
      'node:events': path.resolve('./src/lib/polyfills/events.ts'),
      'node:os': path.resolve('./src/lib/polyfills/os.ts'),
      'node:http': path.resolve('./src/lib/polyfills/http.ts'),
      'node:https': path.resolve('./src/lib/polyfills/https.ts'),
      'node:zlib': path.resolve('./src/lib/polyfills/zlib.ts'),
      'node:net': path.resolve('./src/lib/polyfills/net.ts'),
      'node:tls': path.resolve('./src/lib/polyfills/tls.ts'),
      'process': path.resolve('./src/lib/polyfills/process.ts'),
      'crypto': path.resolve('./src/lib/polyfills/crypto.ts'),
      'path': path.resolve('./src/lib/polyfills/path.ts'),
      'fs/promises': path.resolve('./src/lib/polyfills/fs.ts'),
      'fs': path.resolve('./src/lib/polyfills/fs.ts'),
      'child_process': path.resolve('./src/lib/polyfills/child_process.ts'),
      'stream': path.resolve('./src/lib/polyfills/stream.ts'),
      'util': path.resolve('./src/lib/polyfills/util.ts'),
      'events': path.resolve('./src/lib/polyfills/events.ts'),
      'os': path.resolve('./src/lib/polyfills/os.ts'),
      'http': path.resolve('./src/lib/polyfills/http.ts'),
      'https': path.resolve('./src/lib/polyfills/https.ts'),
      'zlib': path.resolve('./src/lib/polyfills/zlib.ts'),
      'net': path.resolve('./src/lib/polyfills/net.ts'),
      'tls': path.resolve('./src/lib/polyfills/tls.ts'),
      '@/hooks/useMentalHealthAnalysis': path.resolve(
        './src/hooks/useMentalHealthAnalysis.ts',
      ),
    },
    conditions: ['node', 'import', 'module', 'default'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    target: 'node22',
    minify: false,
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings
        if (warning.code === 'SOURCEMAP_ERROR') {
          return
        }
        // Suppress missing source map warnings
        if (warning.message.includes('Failed to load source map')) {
          return
        }
        warn(warning)
      },
      external: (id) => {
        if (
          id.includes('/server-only/') ||
          id.includes('MentalLLaMAPythonBridge')
        ) {
          return true
        }
        const nodeBuiltins = [
          'node:fs',
          'node:fs/promises',
          'node:path',
          'node:os',
          'node:http',
          'node:https',
          'node:util',
          'node:child_process',
          'node:diagnostics_channel',
          'node:worker_threads',
          'node:stream',
          'node:stream/web',
          'node:zlib',
          'node:net',
          'node:tls',
          'node:inspector',
          'node:readline',
          'node:events',
          'node:crypto',
          'node:buffer',
          'node:async_hooks',
          'node:process',
          'fs',
          'fs/promises',
          'path',
          'os',
          'http',
          'https',
          'util',
          'child_process',
          'diagnostics_channel',
          'worker_threads',
          'stream',
          'zlib',
          'net',
          'tls',
          'inspector',
          'readline',
          'events',
          'crypto',
          'buffer',
          'async_hooks',
          'process',
          '@fastify/otel',
        ]
        return nodeBuiltins.includes(id)
      },
      output: {
        format: 'esm',
        intro: `
          // Polyfill Node.js globals
          if (typeof process === 'undefined') {
            globalThis.process = { env: {} };
          }
          if (typeof Buffer === 'undefined') {
            globalThis.Buffer = { from: () => new Uint8Array() };
          }
        `,
        manualChunks: {
          astroMiddleware: [
            'astro/dist/core/middleware/sequence',
            'astro/dist/core/middleware/index',
            'astro-internal:middleware',
          ],
          react: ['react', 'react-dom', 'react/jsx-runtime'],
          three: [/three/, /OrbitControls/],
          chart: [/chart\.js/, /Line\.js$/, /generateCategoricalChart/],
          fhe: [/fhe/],
          emotionViz: [
            /MultidimensionalEmotionChart/,
            /EmotionTemporalAnalysisChart/,
            /EmotionDimensionalAnalysis/,
            /EmotionProgressDemo/,
            /EmotionVisualization/,
          ],
          uiComponents: [/Particle/, /SwiperCarousel/, /TherapyChatSystem/],
          dashboards: [
            /AnalyticsDashboard/,
            /AuditLogDashboard/,
            /ConversionDashboard/,
            /TreatmentPlanManager/,
          ],
          auth: [/useAuth/, /LoginForm/, /RegisterForm/],
          forms: [
            /Form/,
            /input/,
            /select/,
            /checkbox/,
            /button/,
            /label/,
            /slider/,
            /switch/,
          ],
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      platform: 'node',
      target: 'node22',
      define: {
        'process.env.BUILDING_FOR_AWS': JSON.stringify('1'),
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV || 'development',
        ),
      },
    },
    exclude: ['@fastify/otel'],
  },
  ssr: {
    target: 'node',
    optimizeDeps: {
      disabled: false,
    },
    external: [
      'node:fs',
      'node:fs/promises',
      'node:path',
      'node:os',
      'node:http',
      'node:https',
      'node:util',
      'node:child_process',
      'node:diagnostics_channel',
      'node:worker_threads',
      'node:stream',
      'node:stream/web',
      'node:zlib',
      'node:net',
      'node:tls',
      'node:inspector',
      'node:readline',
      'node:events',
      'node:crypto',
      'node:buffer',
      'node:async_hooks',
      'node:process',
      'fs',
      'fs/promises',
      'path',
      'os',
      'http',
      'https',
      'util',
      'child_process',
      'diagnostics_channel',
      'worker_threads',
      'stream',
      'zlib',
      'net',
      'tls',
      'inspector',
      'readline',
      'events',
      'crypto',
      'buffer',
      'async_hooks',
      'process',
      '@fastify/otel',
    ],
  },
})
