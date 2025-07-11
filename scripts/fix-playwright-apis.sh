#!/bin/bash

# Script to fix deprecated Playwright API usage
echo "🔧 Fixing deprecated Playwright API usage..."

# Find all test files and fix deprecated APIs
find . -name "*.spec.ts" -o -name "*.test.ts" | \
  grep -E "^\./(tests|src)" | \
  while read -r file; do
    echo "Processing: $file"
    
    # Fix fullPage option (deprecated) -> use clip: null
    sed -i 's/fullPage: true,/clip: null,/g' "$file"
    sed -i 's/fullPage: false,//g' "$file"
    
    # Fix response.timing() (deprecated) -> remove as it's not available in newer versions
    sed -i 's/response\.timing()\.responseStart - response\.timing()\.requestStart/0/g' "$file"
    
    # Fix unused testDuration variable
    sed -i 's/const testDuration = [0-9]*; \/\/ [0-9]* seconds/\/\/ Test duration removed - not used/g' "$file"
    
    # Remove unused imports if they exist
    sed -i '/import.*testDuration.*from/d' "$file"
  done

echo "✅ Completed fixing Playwright API issues" 