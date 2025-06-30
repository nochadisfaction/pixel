GITHUB_REF_PROTECTED: 'false',
  GITHUB_WORKSPACE: '/home/runner/work/pixel/pixel',
  ACCEPT_EULA: 'Y',
  GITHUB_JOB: 'test',
  npm_config_user_agent: 'pnpm/10.12.4 npm/? node/v22.16.0 linux x64',
  GITHUB_ACTOR: 'nochadisfaction',
  ANDROID_SDK_ROOT: '/usr/local/lib/android/sdk',
  GITHUB_EVENT_PATH: '/home/runner/work/_temp/_github_workflow/event.json',
  GOROOT_1_23_X64: '/opt/hostedtoolcache/go/1.23.10/x64',
  SKIP_REDIS_TESTS: 'true',
  PWD: '/home/runner/work/pixel/pixel',
  npm_execpath: '/home/runner/setup-pnpm/node_modules/.pnpm/pnpm@10.12.4/node_modules/pnpm/bin/pnpm.cjs',
  HOMEBREW_CLEANUP_PERIODIC_FULL_DAYS: '3650',
  HOMEBREW_NO_AUTO_UPDATE: '1',
  npm_package_version: '0.0.1',
  ANDROID_HOME: '/usr/local/lib/android/sdk',
  PNPM_HOME: '/home/runner/setup-pnpm/node_modules/.bin',
  GITHUB_SERVER_URL: 'https://github.com',
  GITHUB_ACTOR_ID: '150661001',
  SKIP_CRYPTO_ROTATION_TEST: 'true',
  EDGEWEBDRIVER: '/usr/local/share/edge_driver',
  npm_config__jsr_registry: 'https://npm.jsr.io/'
}
stderr | src/lib/security/__tests__/breach-notification.integration.test.ts
Using mock Supabase client for development. This should not be used in production.
Using mock Supabase client for development. This should not be used in production.
stderr | src/lib/security/__tests__/breach-notification.integration.test.ts
Using mock Redis client for development. This should not be used in production.
 ❯ src/lib/security/__tests__/breach-notification.integration.test.ts (10 tests | 10 failed) 14ms
   × breachNotificationSystem Integration Tests > breach Reporting and Notification > should successfully report a breach and initiate notifications 7ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > breach Reporting and Notification > should notify affected users with encrypted details 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > breach Reporting and Notification > should notify authorities for large breaches 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > breach Status and Retrieval > should retrieve breach status 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > breach Status and Retrieval > should list recent breaches 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > test Scenarios and Documentation > should run test scenarios successfully 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > test Scenarios and Documentation > should retrieve training materials 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > metrics and Analysis > should update breach metrics 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > error Handling > should handle redis errors gracefully 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
   × breachNotificationSystem Integration Tests > error Handling > should handle email sending failures 1ms
     → Cannot read properties of undefined (reading 'mockResolvedValue')
stdout | src/components/notification/__tests__/NotificationPreferences.test.tsx
          >
            <div
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              TTL
            </div>
            <div
              class="text-xl font-semibold"
            >
              N/A
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex justify-between items-center mb-4"
      >
        <div
          class="text-sm"
        >
          <span
            class="text-gray-500 dark:text-gray-400"
          >
            Status:
          </span>
           
          <span
            class="font-medium text-red-600 dark:text-red-400"
          >
            Disabled
          </span>
        </div>
        <button
          class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
        >
          Clear Cache
        </button>
      </div>
      <div
        class="text-xs text-gray-500 dark:text-gray-400 mt-6 text-right"
      >
        Last updated: 
        8:38:03 AM
      </div>
    </div>
  </div>
</body>
 ✓ src/simulator/components/__tests__/EmotionDisplay.test.tsx (3 tests) 95ms
 ✓ src/simulator/components/__tests__/TechniqueDisplay.test.tsx (3 tests) 72ms
 ✓ src/lib/ai/mental-llama/test/types.test.ts (3 tests) 7ms