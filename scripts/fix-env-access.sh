#!/bin/bash

# Script to fix process.env property access for TypeScript strict mode
# Converts process.env.PROPERTY to process.env['PROPERTY']

echo "🔧 Fixing process.env property access issues..."

# Find all TypeScript files and fix env access
find . -name "*.ts" -o -name "*.tsx" -o -name "*.spec.ts" | \
  grep -E "^\./(src|tests|api|examples|scripts)/" | \
  while read -r file; do
    echo "Processing: $file"
    
    # Fix common environment variable patterns
    sed -i 's/process\.env\.BASE_URL/process.env["BASE_URL"]/g' "$file"
    sed -i 's/process\.env\.MCP_ENABLED/process.env["MCP_ENABLED"]/g' "$file"
    sed -i 's/process\.env\.NODE_ENV/process.env["NODE_ENV"]/g' "$file"
    sed -i 's/process\.env\.LOG_LEVEL/process.env["LOG_LEVEL"]/g' "$file"
    
    # Generic pattern for any remaining process.env.VARIABLE
    sed -i 's/process\.env\.\([A-Z_][A-Z0-9_]*\)/process.env["\1"]/g' "$file"
  done

echo "✅ Completed fixing process.env property access" 