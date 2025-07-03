#!/usr/bin/env node

// Simple test runner to verify our fixes
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const testFiles = [
  'src/lib/audit/__tests__/analysis.test.ts',
  'src/components/auth/__tests__/RegisterForm.test.tsx',
  'src/components/monitoring/__tests__/RealUserMonitoring.astro.test.ts',
  'src/hooks/__tests__/usePatternDetection.test.ts',
  'src/hooks/__tests__/useEmotionDetection.test.ts',
  'src/lib/mental-health/__tests__/service.test.ts',
  'src/lib/security/__tests__/audit.logging.test.ts'
]

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing ${testFile}...`)
    
    const vitestPath = join(__dirname, 'node_modules', '.bin', 'vitest')
    const child = spawn('node', [vitestPath, 'run', testFile], {
      stdio: 'pipe',
      cwd: __dirname
    })
    
    let output = ''
    let errorOutput = ''
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} - PASSED`)
      } else {
        console.log(`❌ ${testFile} - FAILED`)
        if (errorOutput) {
          console.log('Error output:', errorOutput.slice(0, 500))
        }
        if (output) {
          console.log('Output:', output.slice(0, 500))
        }
      }
      resolve({ testFile, passed: code === 0, output, errorOutput })
    })
    
    child.on('error', (err) => {
      console.log(`❌ ${testFile} - ERROR: ${err.message}`)
      resolve({ testFile, passed: false, error: err.message })
    })
  })
}

async function main() {
  console.log('🚀 Running test fixes verification...\n')
  
  const results = []
  for (const testFile of testFiles) {
    const result = await runTest(testFile)
    results.push(result)
  }
  
  console.log('\n📊 Summary:')
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  console.log(`✅ Passed: ${passed}/${total}`)
  console.log(`❌ Failed: ${total - passed}/${total}`)
  
  if (passed === total) {
    console.log('\n🎉 All tests are now passing!')
  } else {
    console.log('\n⚠️  Some tests still need fixes')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.testFile}`)
    })
  }
}

main().catch(console.error)