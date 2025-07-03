#!/bin/bash

# TypeScript Debug Helper Script
# This script provides various debugging options for TypeScript server issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Debug levels
DEBUG_LEVEL=${1:-"normal"}

echo -e "${BLUE}🔍 TypeScript Debug Helper${NC}"
echo -e "${BLUE}Debug Level: ${DEBUG_LEVEL}${NC}"
echo ""

# Function to check TypeScript server logs
check_ts_logs() {
    echo -e "${YELLOW}📋 Checking TypeScript Server Logs...${NC}"
    
    # Check if TypeScript logs directory exists
    TS_LOG_DIR="$HOME/.vscode/logs/$(ls -1t ~/.vscode/logs/ | head -1)/exthost"
    
    if [ -d "$TS_LOG_DIR" ]; then
        echo -e "${GREEN}Found TypeScript logs in: $TS_LOG_DIR${NC}"
        
        # Find the most recent TypeScript log
        LATEST_TS_LOG=$(find "$TS_LOG_DIR" -name "*typescript*" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        
        if [ -n "$LATEST_TS_LOG" ]; then
            echo -e "${GREEN}Latest TypeScript log: $LATEST_TS_LOG${NC}"
            echo -e "${YELLOW}Last 50 lines:${NC}"
            tail -50 "$LATEST_TS_LOG"
        else
            echo -e "${RED}No TypeScript logs found${NC}"
        fi
    else
        echo -e "${RED}TypeScript logs directory not found${NC}"
    fi
}

# Function to analyze project structure for potential issues
analyze_project_structure() {
    echo -e "${YELLOW}🏗️ Analyzing Project Structure...${NC}"
    
    # Check for large files that might cause issues
    echo -e "${BLUE}Large TypeScript files (>100KB):${NC}"
    find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs ls -la | awk '$5 > 100000 {print $9, $5}' | sort -k2 -nr
    
    # Check for circular dependencies potential
    echo -e "${BLUE}Files with many imports (potential circular deps):${NC}"
    find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "^import" | xargs -I {} sh -c 'echo "$(grep -c "^import" "{}" || echo 0) {}"' | sort -nr | head -20
    
    # Check tsconfig.json issues
    echo -e "${BLUE}Checking tsconfig.json configuration:${NC}"
    if [ -f "tsconfig.json" ]; then
        echo "✅ tsconfig.json exists"
        
        # Check for common problematic settings
        if grep -q '"strict": true' tsconfig.json; then
            echo "⚠️  Strict mode enabled - potential for many type errors"
        fi
        
        if grep -q '"exactOptionalPropertyTypes": true' tsconfig.json; then
            echo "⚠️  exactOptionalPropertyTypes enabled - can cause many type errors"
        fi
        
        if grep -q '"noImplicitAny": true' tsconfig.json; then
            echo "⚠️  noImplicitAny enabled - potential for many implicit any errors"
        fi
        
        # Count included files
        echo "📊 TypeScript files in project:"
        find . -name "*.ts" -o -name "*.tsx" | wc -l
        
        echo "📊 JavaScript files in project:"
        find . -name "*.js" -o -name "*.jsx" | wc -l
        
    else
        echo "❌ tsconfig.json not found"
    fi
}

# Function to check memory usage
check_memory_usage() {
    echo -e "${YELLOW}💾 Checking Memory Usage...${NC}"
    
    # Check Node.js processes
    echo -e "${BLUE}Node.js processes:${NC}"
    ps aux | grep -E "(node|tsserver)" | grep -v grep || echo "No Node.js processes found"
    
    # Check system memory
    echo -e "${BLUE}System memory:${NC}"
    free -h 2>/dev/null || echo "Memory info not available"
    
    # Check if we're hitting memory limits
    echo -e "${BLUE}Checking for potential memory issues:${NC}"
    if [ -f ".tsbuildinfo" ]; then
        BUILDINFO_SIZE=$(stat -f%z .tsbuildinfo 2>/dev/null || stat -c%s .tsbuildinfo 2>/dev/null || echo "0")
        echo "tsbuildinfo size: $BUILDINFO_SIZE bytes"
        if [ "$BUILDINFO_SIZE" -gt 10000000 ]; then
            echo "⚠️  tsbuildinfo is large (>10MB) - consider cleaning"
        fi
    fi
}

# Function to run comprehensive TypeScript diagnostics
run_ts_diagnostics() {
    echo -e "${YELLOW}🔧 Running TypeScript Diagnostics...${NC}"
    
    # Check if TypeScript is installed
    if command -v tsc >/dev/null 2>&1; then
        echo -e "${GREEN}TypeScript compiler found${NC}"
        tsc --version
        
        # Run type checking with detailed output
        echo -e "${BLUE}Running type check with detailed output:${NC}"
        if [ "$DEBUG_LEVEL" = "verbose" ]; then
            tsc --noEmit --listFiles --extendedDiagnostics 2>&1 | tee typescript-debug-output.log
        else
            tsc --noEmit --extendedDiagnostics 2>&1 | head -100
        fi
    else
        echo -e "${RED}TypeScript compiler not found${NC}"
        echo "Try running: npm install -g typescript"
    fi
    
    # Check for dependency issues
    echo -e "${BLUE}Checking for dependency issues:${NC}"
    if [ -f "package.json" ]; then
        echo "Checking for missing @types packages..."
        
        # Common packages that need @types
        PACKAGES_NEEDING_TYPES=("react" "node" "jest" "express" "lodash")
        
        for pkg in "${PACKAGES_NEEDING_TYPES[@]}"; do
            if grep -q "\"$pkg\"" package.json && ! grep -q "\"@types/$pkg\"" package.json; then
                echo "⚠️  Consider installing @types/$pkg"
            fi
        done
    fi
}

# Function to clean TypeScript cache and temporary files
clean_ts_cache() {
    echo -e "${YELLOW}🧹 Cleaning TypeScript Cache...${NC}"
    
    # Remove tsbuildinfo
    if [ -f ".tsbuildinfo" ]; then
        echo "Removing .tsbuildinfo"
        rm -f .tsbuildinfo
    fi
    
    # Remove node_modules/.cache if it exists
    if [ -d "node_modules/.cache" ]; then
        echo "Removing node_modules/.cache"
        rm -rf node_modules/.cache
    fi
    
    # Remove .astro directory (if using Astro)
    if [ -d ".astro" ]; then
        echo "Removing .astro cache"
        rm -rf .astro
    fi
    
    # Remove dist directories
    if [ -d "dist" ]; then
        echo "Removing dist directory"
        rm -rf dist
    fi
    
    echo -e "${GREEN}Cache cleaned successfully${NC}"
}

# Function to create a minimal reproduction case
create_minimal_repro() {
    echo -e "${YELLOW}📝 Creating Minimal Reproduction Case...${NC}"
    
    # Create a minimal tsconfig.json
    cat > tsconfig.minimal.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": false,
    "skipLibCheck": true,
    "noEmit": true,
    "allowJs": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".astro"]
}
EOF
    
    echo -e "${GREEN}Created tsconfig.minimal.json${NC}"
    echo "Try running: tsc --project tsconfig.minimal.json --noEmit"
}

# Function to monitor TypeScript server in real-time
monitor_ts_server() {
    echo -e "${YELLOW}📊 Monitoring TypeScript Server...${NC}"
    echo "This will monitor TypeScript server activity in real-time."
    echo "Press Ctrl+C to stop monitoring."
    echo ""
    
    # Monitor process activity
    while true; do
        echo "$(date): Checking TypeScript processes..."
        ps aux | grep -E "(tsserver|typescript)" | grep -v grep | head -5
        echo ""
        sleep 5
    done
}

# Main execution
case "$DEBUG_LEVEL" in
    "minimal")
        echo -e "${BLUE}Running minimal diagnostics...${NC}"
        analyze_project_structure
        ;;
    "normal")
        echo -e "${BLUE}Running normal diagnostics...${NC}"
        check_ts_logs
        analyze_project_structure
        check_memory_usage
        ;;
    "verbose")
        echo -e "${BLUE}Running verbose diagnostics...${NC}"
        check_ts_logs
        analyze_project_structure
        check_memory_usage
        run_ts_diagnostics
        ;;
    "clean")
        echo -e "${BLUE}Cleaning TypeScript cache...${NC}"
        clean_ts_cache
        ;;
    "repro")
        echo -e "${BLUE}Creating minimal reproduction case...${NC}"
        create_minimal_repro
        ;;
    "monitor")
        echo -e "${BLUE}Monitoring TypeScript server...${NC}"
        monitor_ts_server
        ;;
    *)
        echo -e "${RED}Invalid debug level. Options: minimal, normal, verbose, clean, repro, monitor${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ TypeScript debug analysis complete${NC}"
echo -e "${BLUE}💡 Tips:${NC}"
echo "  • Check VS Code TypeScript logs: ${YELLOW}Ctrl+Shift+P > 'TypeScript: Open TS Server log'${NC}"
echo "  • Restart TypeScript server: ${YELLOW}Ctrl+Shift+P > 'TypeScript: Restart TS Server'${NC}"
echo "  • Check memory usage: ${YELLOW}./debug-typescript.sh normal${NC}"
echo "  • Clean cache if issues persist: ${YELLOW}./debug-typescript.sh clean${NC}"
echo "  • Monitor real-time: ${YELLOW}./debug-typescript.sh monitor${NC}"
