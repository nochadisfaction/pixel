#!/bin/bash

# TypeScript Server Restart Script
# Provides various methods to restart and refresh TypeScript server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 TypeScript Server Restart Utility${NC}"
echo ""

# Function to clean TypeScript caches
clean_ts_caches() {
    echo -e "${YELLOW}🧹 Cleaning TypeScript caches...${NC}"
    
    # Remove tsbuildinfo files
    find . -name ".tsbuildinfo*" -type f -delete 2>/dev/null || true
    echo "✅ Removed .tsbuildinfo files"
    
    # Remove Astro cache
    if [ -d ".astro" ]; then
        rm -rf .astro
        echo "✅ Removed .astro cache"
    fi
    
    # Remove node_modules cache
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "✅ Removed node_modules/.cache"
    fi
    
    # Remove dist directories
    if [ -d "dist" ]; then
        rm -rf dist
        echo "✅ Removed dist directory"
    fi
    
    # Remove VS Code TypeScript cache
    if [ -d "$HOME/.vscode/typescript" ]; then
        rm -rf "$HOME/.vscode/typescript"
        echo "✅ Removed VS Code TypeScript cache"
    fi
}

# Function to restart TypeScript server via VS Code command
restart_vscode_ts_server() {
    echo -e "${YELLOW}🔄 Restarting VS Code TypeScript server...${NC}"
    
    # Try to restart via command line
    if command -v code >/dev/null 2>&1; then
        code --command typescript.reloadProjects
        echo "✅ Sent reload command to VS Code"
        
        sleep 2
        
        code --command typescript.restartTsServer
        echo "✅ Sent restart command to VS Code"
    else
        echo -e "${RED}❌ VS Code CLI not available${NC}"
        echo -e "${BLUE}💡 Manual restart: Ctrl+Shift+P > 'TypeScript: Restart TS Server'${NC}"
    fi
}

# Function to kill TypeScript processes
kill_ts_processes() {
    echo -e "${YELLOW}🔴 Killing TypeScript processes...${NC}"
    
    # Find and kill tsserver processes
    local ts_pids=$(pgrep -f "tsserver" 2>/dev/null || true)
    
    if [ -n "$ts_pids" ]; then
        echo "Found TypeScript server processes: $ts_pids"
        for pid in $ts_pids; do
            kill -TERM "$pid" 2>/dev/null || true
            echo "✅ Terminated process $pid"
        done
        
        # Wait a moment and check if they're really gone
        sleep 2
        local remaining_pids=$(pgrep -f "tsserver" 2>/dev/null || true)
        
        if [ -n "$remaining_pids" ]; then
            echo -e "${YELLOW}⚠️  Some processes still running, force killing...${NC}"
            for pid in $remaining_pids; do
                kill -KILL "$pid" 2>/dev/null || true
                echo "✅ Force killed process $pid"
            done
        fi
    else
        echo "✅ No TypeScript server processes found"
    fi
}

# Function to check TypeScript health
check_ts_health() {
    echo -e "${YELLOW}🏥 Checking TypeScript health...${NC}"
    
    # Check TypeScript version
    if command -v npx >/dev/null 2>&1; then
        echo -e "${BLUE}TypeScript version:${NC}"
        npx tsc --version || echo "❌ TypeScript not working"
    fi
    
    # Check if project compiles
    echo -e "${BLUE}Testing compilation:${NC}"
    if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
        echo "✅ Project compiles successfully"
    else
        echo -e "${RED}❌ Compilation errors detected${NC}"
        echo -e "${BLUE}💡 Try: npx tsc --noEmit --skipLibCheck${NC}"
    fi
    
    # Check for common issues
    echo -e "${BLUE}Checking for common issues:${NC}"
    
    # Large files
    local large_files=$(find . -name "*.ts" -o -name "*.tsx" | xargs ls -la 2>/dev/null | awk '$5 > 100000 {print $9}' | wc -l)
    if [ "$large_files" -gt 0 ]; then
        echo "⚠️  Found $large_files large TypeScript files (>100KB)"
    else
        echo "✅ No excessively large files"
    fi
    
    # Memory usage
    local ts_processes=$(ps aux | grep -E "(tsserver|typescript)" | grep -v grep | wc -l)
    if [ "$ts_processes" -gt 0 ]; then
        echo "ℹ️  Found $ts_processes TypeScript processes running"
    else
        echo "✅ No TypeScript processes currently running"
    fi
}

# Function to apply emergency fixes
apply_emergency_fixes() {
    echo -e "${YELLOW}🚨 Applying emergency fixes...${NC}"
    
    # Create emergency tsconfig
    cat > tsconfig.emergency.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    ".astro",
    "**/*.test.*",
    "**/*.spec.*",
    "**/BiasDetectionEngine.ts",
    "**/bias-detection/**/*"
  ]
}
EOF
    echo "✅ Created emergency tsconfig.json"
    
    # Test with emergency config
    echo -e "${BLUE}Testing with emergency config:${NC}"
    if npx tsc --project tsconfig.emergency.json --noEmit 2>/dev/null; then
        echo "✅ Emergency config works!"
        echo -e "${GREEN}💡 Consider using this config temporarily${NC}"
    else
        echo -e "${RED}❌ Even emergency config fails${NC}"
    fi
}

# Main execution
case "${1:-restart}" in
    "restart"|"r")
        echo -e "${GREEN}🔄 Quick restart sequence${NC}"
        clean_ts_caches
        restart_vscode_ts_server
        ;;
        
    "full"|"f")
        echo -e "${GREEN}🔄 Full restart sequence${NC}"
        kill_ts_processes
        clean_ts_caches
        restart_vscode_ts_server
        check_ts_health
        ;;
        
    "emergency"|"e")
        echo -e "${GREEN}🚨 Emergency restart sequence${NC}"
        kill_ts_processes
        clean_ts_caches
        apply_emergency_fixes
        restart_vscode_ts_server
        ;;
        
    "clean"|"c")
        clean_ts_caches
        ;;
        
    "kill"|"k")
        kill_ts_processes
        ;;
        
    "health"|"h")
        check_ts_health
        ;;
        
    *)
        echo -e "${RED}Usage: $0 [restart|full|emergency|clean|kill|health]${NC}"
        echo ""
        echo -e "${BLUE}Commands:${NC}"
        echo "  restart (r)    - Quick restart (clean cache + restart server)"
        echo "  full (f)       - Full restart (kill processes + clean + restart + health check)"
        echo "  emergency (e)  - Emergency restart (full + apply emergency fixes)"
        echo "  clean (c)      - Clean TypeScript caches only"
        echo "  kill (k)       - Kill TypeScript processes only"
        echo "  health (h)     - Check TypeScript health"
        echo ""
        echo -e "${YELLOW}Quick examples:${NC}"
        echo "  $0 r          # Quick restart"
        echo "  $0 f          # Full restart"
        echo "  $0 e          # Emergency mode"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Restart sequence complete${NC}"
echo -e "${BLUE}💡 If issues persist, try:${NC}"
echo "  • ./restart-typescript.sh emergency"
echo "  • ./crash-monitor.sh monitor"
echo "  • ./debug-typescript.sh verbose"