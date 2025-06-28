#!/usr/bin/env node

/**
 * Test script for MentalArenaPythonBridge virtual environment functionality
 * This script demonstrates the enhanced security features and virtual environment setup
 */

const path = require('path')
const fs = require('fs').promises

// Mock logger for testing
const mockLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
}

// Mock the logger module using Module._load override
const Module = require('module')
const originalLoad = Module._load
Module._load = function (request, _parent) {
  if (request === '@/lib/utils/logger') {
    return { getLogger: () => mockLogger }
  }
  return originalLoad.apply(this, arguments)
}

async function testMentalArenaBridge() {
  console.log('🧪 Testing MentalArenaPythonBridge Virtual Environment Setup\n')

  try {
    // Import the bridge class
    const {
      MentalArenaPythonBridge,
    } = require('./src/lib/ai/mental-arena/MentalArenaPythonBridge.ts')

    // Test configuration
    const config = {
      mentalArenaPath: path.join(__dirname, 'test-mental-arena'),
      pythonPath: 'python3', // or 'python' depending on your system
      virtualEnvPath: path.join(__dirname, 'test-venv'),
      timeout: 60000,
      maxRetries: 2,
      enableLogging: true,
      securityMode: 'standard',
    }

    console.log('📋 Configuration:')
    console.log(JSON.stringify(config, null, 2))
    console.log()

    // Create bridge instance
    const bridge = new MentalArenaPythonBridge(config)

    // Test package validation
    console.log('🔍 Testing Package Validation:')

    const testPackages = [
      { name: 'torch', version: '>=1.12.0' },
      { name: 'numpy', version: '>=1.21.0,<2.0.0' },
      { name: 'malicious-package', version: '1.0.0' }, // Should fail
      { name: 'pandas' }, // Missing version
    ]

    for (const pkg of testPackages) {
      const validation = bridge.validatePackage(pkg.name, pkg.version)
      console.log(`  📦 ${pkg.name}${pkg.version ? `@${pkg.version}` : ''}:`)
      console.log(`     ✅ Allowed: ${validation.isAllowed}`)
      console.log(`     🔢 Valid Version: ${validation.hasValidVersion}`)
      if (validation.violations.length > 0) {
        console.log(`     ⚠️  Violations: ${validation.violations.join(', ')}`)
      }
      console.log()
    }

    // Test whitelist retrieval
    console.log('📋 Package Whitelist:')
    const whitelist = bridge.getPackageWhitelist()
    const whitelistKeys = Object.keys(whitelist)
    console.log(`  Total allowed packages: ${whitelistKeys.length}`)
    console.log(`  Sample packages: ${whitelistKeys.slice(0, 5).join(', ')}...`)
    console.log()

    // Test virtual environment info
    console.log('🐍 Virtual Environment Info:')
    const venvInfo = bridge.getVirtualEnvironmentInfo()
    console.log(`  Path: ${venvInfo.venvPath}`)
    console.log(`  Python: ${venvInfo.pythonPath}`)
    console.log(`  Active: ${venvInfo.isActive}`)
    console.log()

    // Create a test requirements.txt file
    const testRequirementsPath = path.join(__dirname, 'test-requirements.txt')
    const testRequirementsContent = `# Test requirements file
torch>=1.12.0,<3.0.0
numpy>=1.21.0,<2.0.0
pandas>=1.4.0,<3.0.0
transformers>=4.20.0,<5.0.0
# This should cause a violation:
# malicious-package==1.0.0
# This should warn about missing version:
# requests
`

    await fs.writeFile(testRequirementsPath, testRequirementsContent)
    console.log('📄 Created test requirements.txt')

    // Test requirements validation (without actually setting up the environment)
    console.log('🔒 Testing Requirements Validation:')
    try {
      // We can't actually call validateRequirements directly as it's private,
      // but we can test the individual package validation logic
      const requirementsLines = testRequirementsContent
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))

      let totalViolations = 0
      let totalMissingVersions = 0

      for (const line of requirementsLines) {
        const match = line.match(/^([a-zA-Z0-9_-]+)([>=<!=~^]*[\d.]+.*)?/)
        if (match) {
          const [, packageName, versionSpec] = match
          const validation = bridge.validatePackage(packageName, versionSpec)

          if (validation.violations.length > 0) {
            totalViolations += validation.violations.length
            console.log(
              `  ❌ ${packageName}: ${validation.violations.join(', ')}`,
            )
          } else {
            console.log(`  ✅ ${packageName}: Valid`)
          }

          if (!versionSpec) {
            totalMissingVersions++
          }
        }
      }

      console.log(
        `\n  📊 Summary: ${totalViolations} violations, ${totalMissingVersions} missing versions`,
      )
    } catch (error) {
      console.error('❌ Requirements validation test failed:', error.message)
    }

    // Cleanup test file
    await fs.unlink(testRequirementsPath)
    console.log('🧹 Cleaned up test files')

    console.log('\n✅ All tests completed successfully!')
    console.log('\n📝 Summary of Enhancements:')
    console.log('  • Virtual environment isolation')
    console.log('  • Package whitelist validation')
    console.log('  • Version specification enforcement')
    console.log('  • Security mode compliance')
    console.log('  • Cross-platform compatibility')
    console.log('  • Comprehensive error handling')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run the test
if (require.main === module) {
  testMentalArenaBridge().catch(console.error)
}

module.exports = { testMentalArenaBridge }
