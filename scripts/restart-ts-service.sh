#!/bin/bash

# Script to restart TypeScript language service and clean cache
echo "🔄 Restarting TypeScript Language Service..."

# Clean TypeScript build cache
echo "🧹 Cleaning TypeScript cache..."
rm -f .tsbuildinfo
rm -rf node_modules/.cache/typescript
rm -rf .astro

# Clear VSCode TypeScript cache (if running in VSCode)
if [ -d ".vscode" ]; then
    echo "🗑️ Clearing VSCode TypeScript cache..."
    # This command needs to be run from VSCode Command Palette:
    # > TypeScript: Restart TS Server
    echo "⚠️ Please run 'TypeScript: Restart TS Server' from VSCode Command Palette"
fi

# Memory cleanup
echo "💾 Triggering garbage collection..."
if command -v node &> /dev/null; then
    node --expose-gc -e "if (global.gc) { global.gc(); console.log('✅ Garbage collection completed'); } else { console.log('❌ GC not available'); }"
fi

echo "✅ TypeScript service restart completed!"
echo ""
echo "📋 Next steps:"
echo "1. Open VSCode Command Palette (Ctrl+Shift+P / Cmd+Shift+P)"
echo "2. Run: 'TypeScript: Restart TS Server'"
echo "3. Run: 'Developer: Reload Window' if issues persist"
echo ""
echo "💡 If crashes continue, consider:"
echo "   - Closing other memory-intensive applications"
echo "   - Restarting your computer to free up system memory"
echo "   - Running 'pnpm run ts:debug:clean' for deeper cleaning" 