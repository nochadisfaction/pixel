#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

console.log('🔍 Validating build configuration...')

// Check if critical files exist
const criticalFiles = [
  'src/hooks/useMentalHealthAnalysis.ts',
  'src/hooks/useMentalHealthAnalysis.js',
  'src/components/chat/TherapyChatSystem.tsx',
  'src/components/chat/MemoryAwareChatSystem.tsx',
  'src/components/chat/AnalyticsDashboardReact.tsx',
  'src/components/treatment/TreatmentPlanner.tsx',
  'src/components/therapy/TreatmentPlanManager.tsx',
  'src/components/analytics/ChartWidget.tsx',
  'src/components/demo/FHEDemo.tsx',
  'src/components/dashboard/AnalyticsCharts.tsx',
  'src/components/memory/MemoryDashboard.tsx',
  'src/components/profile/ProfileComponent.tsx'
]

let allFilesExist = true

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Missing: ${file}`)
    allFilesExist = false
  } else {
    console.log(`✅ Found: ${file}`)
  }
})

// Check for problematic imports
const srcDir = path.join(__dirname, 'src')

function checkImports(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.')) {
      checkImports(filePath)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(filePath, 'utf8')
      
      // Check for imports without extensions that might cause issues
      const importRegex = /from ['"]@\/hooks\/useMentalHealthAnalysis['"]/g
      if (importRegex.test(content)) {
        const relativePath = path.relative(__dirname, filePath)
        console.log(`⚠️  Found import without extension in: ${relativePath}`)
      }
    }
  })
}

checkImports(srcDir)

// Check configuration files
const configFiles = [
  'tsconfig.json',
  'vite.config.js',
  'astro.config.mjs'
]

configFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ Config found: ${file}`)
  } else {
    console.log(`❌ Missing config: ${file}`)
    allFilesExist = false
  }
})

if (allFilesExist) {
  console.log('🎉 All critical files are present!')
} else {
  console.log('❌ Some files are missing. Build may fail.')
  process.exit(1)
}

console.log('✅ Build validation complete!')