#!/usr/bin/env node

// Build issue fixer script
const fs = require('fs')
const path = require('path')

console.log('🔧 Fixing build issues...')

// 1. Create missing hook files
const hooksDir = path.join(__dirname, 'src', 'hooks')
const missingHooks = [
  'useMentalHealthAnalysis.js'
]

missingHooks.forEach(hookFile => {
  const hookPath = path.join(hooksDir, hookFile)
  if (!fs.existsSync(hookPath)) {
    const tsFile = hookFile.replace('.js', '.ts')
    const content = `// Auto-generated wrapper for ${tsFile}
export * from './${tsFile}'
export { default } from './${tsFile}'`
    
    fs.writeFileSync(hookPath, content)
    console.log(`✅ Created ${hookFile}`)
  }
})

// 2. Fix import statements that might be missing extensions
const srcDir = path.join(__dirname, 'src')

function fixImports(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      fixImports(filePath)
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8')
      let modified = false
      
      // Fix common import issues
      const fixes = [
        {
          pattern: /from ['"]@\/hooks\/useMentalHealthAnalysis['"]/g,
          replacement: "from '@/hooks/useMentalHealthAnalysis.ts'"
        }
      ]
      
      fixes.forEach(fix => {
        if (fix.pattern.test(content)) {
          content = content.replace(fix.pattern, fix.replacement)
          modified = true
        }
      })
      
      if (modified) {
        fs.writeFileSync(filePath, content)
        console.log(`✅ Fixed imports in ${path.relative(__dirname, filePath)}`)
      }
    }
  })
}

try {
  fixImports(srcDir)
  console.log('🎉 Build issues fixed!')
} catch (error) {
  console.error('❌ Error fixing build issues:', error.message)
  process.exit(1)
}