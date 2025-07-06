/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { getViteConfig } from 'astro/config'

export default defineConfig(
  getViteConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts', './vitest.setup.ts'],
      include: [
        'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ],
      exclude: [
        'src/tests/simple-browser-compatibility.test.ts',
        'src/tests/browser-compatibility.test.ts',
        'src/tests/mobile-compatibility.test.ts',
        'src/tests/cross-browser-compatibility.test.ts',
        'src/e2e/breach-notification.spec.ts',
        'tests/e2e/**/*',
        'tests/browser/**/*',
        'tests/accessibility/**/*',
        'tests/performance/**/*',
        'tests/security/**/*',
        // Exclude problematic integration tests when Redis is not available
        ...(process.env.CI ? [
          'src/lib/services/redis/__tests__/RedisService.integration.test.ts',
          'src/lib/services/redis/__tests__/Analytics.integration.test.ts',
          'src/lib/services/redis/__tests__/CacheInvalidation.integration.test.ts',
        ] : []),
      ],
      testTimeout: process.env.CI ? 15_000 : 30_000,
      hookTimeout: process.env.CI ? 10_000 : 30_000,
      poolOptions: {
        threads: {
          minThreads: process.env.CI ? 1 : undefined,
          maxThreads: process.env.CI ? 2 : undefined,
        },
      },
      environmentOptions: {
        jsdom: {
          resources: 'usable',
          // Reduce memory usage in CI
          pretendToBeVisual: false,
          runScripts: 'dangerously',
        },
      },
      coverage: {
        provider: 'v8',
        enabled: !process.env.CI || process.env.VITEST_COVERAGE_ENABLED === 'true',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/**',
          'dist/**',
          '.next/**',
          'coverage/**',
          '**/*.d.ts',
          'test/**',
          'tests/**',
          'vitest.config.ts',
        ],
      },
      // Reduce memory usage in CI
      isolate: !process.env.CI,
      // Force run mode in CI (no watch)
      watch: process.env.CI ? false : undefined,
      // Faster bailout on CI
      bail: process.env.CI ? 10 : undefined,
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      sourcemap: true,
    },
  })
)
