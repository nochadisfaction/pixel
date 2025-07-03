#!/bin/bash

# TypeScript Server Crash Monitor
# This script monitors TypeScript server crashes and provides detailed diagnostics

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
LOG_DIR="$HOME/.vscode-typescript-logs"
CRASH_LOG="$LOG_DIR/crash-monitor.log"
MEMORY_LOG="$LOG_DIR/memory-usage.log"
MONITOR_INTERVAL=5  # seconds

# Create log directory
mkdir -p "$LOG_DIR"

echo -e "${PURPLE}🚨 TypeScript Server Crash Monitor${NC}"
echo -e "${BLUE}Monitor Interval: ${MONITOR_INTERVAL}s${NC}"
echo -e "${BLUE}Logs Directory: $LOG_DIR${NC}"
echo ""

# Function to log with timestamp
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S'): $1" | tee -a "$CRASH_LOG"
}

# Function to get VS Code TypeScript extension logs
get_vscode_ts_logs() {
    local latest_session
    if [ -d "$HOME/.vscode/logs" ]; then
        latest_session=$(ls -1t "$HOME/.vscode/logs/" | head -1)
        if [ -n "$latest_session" ]; then
            echo "$HOME/.vscode/logs/$latest_session"
        fi
    fi
}

# Function to monitor memory usage
monitor_memory() {
    local log_file="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Get Node.js processes related to TypeScript
    local ts_processes
    ts_processes=$(ps aux | grep -E "(tsserver|typescript|vscode.*typescript)" | grep -v grep)
    
    if [ -n "$ts_processes" ]; then
        echo "[$timestamp] TypeScript processes:" >> "$log_file"
        echo "$ts_processes" >> "$log_file"
        echo "---" >> "$log_file"
        
        # Get memory usage summary
        local total_memory
        total_memory=$(echo "$ts_processes" | awk '{sum += $6} END {print sum}')
        echo "[$timestamp] Total TS memory usage: ${total_memory}KB" >> "$log_file"
    else
        echo "[$timestamp] No TypeScript processes found" >> "$log_file"
    fi
}

# Function to check for crash indicators
check_for_crashes() {
    local vscode_log_dir
    vscode_log_dir=$(get_vscode_ts_logs)
    
    if [ -n "$vscode_log_dir" ]; then
        # Check for TypeScript extension logs
        local ts_log_dir="$vscode_log_dir/exthost"
        
        if [ -d "$ts_log_dir" ]; then
            # Look for recent TypeScript logs with error patterns
            local recent_logs
            recent_logs=$(find "$ts_log_dir" -name "*typescript*" -mmin -1 2>/dev/null)
            
            for log_file in $recent_logs; do
                if [ -f "$log_file" ]; then
                    # Check for crash indicators
                    local crash_patterns=(
                        "Error: TypeScript Server Error"
                        "TSServer Error"
                        "Request.*failed"
                        "Server process exited"
                        "Unexpected server termination"
                        "Out of memory"
                        "Maximum call stack size exceeded"
                        "FATAL ERROR"
                        "heap out of memory"
                    )
                    
                    for pattern in "${crash_patterns[@]}"; do
                        if tail -50 "$log_file" | grep -i "$pattern" >/dev/null 2>&1; then
                            log_with_timestamp "🚨 CRASH DETECTED: Pattern '$pattern' found in $log_file"
                            
                            # Extract relevant context
                            echo "Context from crash:" >> "$CRASH_LOG"
                            tail -20 "$log_file" | grep -A5 -B5 -i "$pattern" >> "$CRASH_LOG"
                            echo "---" >> "$CRASH_LOG"
                            
                            return 0
                        fi
                    done
                fi
            done
        fi
    fi
    
    return 1
}

# Function to analyze crash patterns
analyze_crash_patterns() {
    if [ -f "$CRASH_LOG" ]; then
        echo -e "${YELLOW}📊 Crash Pattern Analysis${NC}"
        
        # Count different types of crashes
        echo -e "${BLUE}Most common crash patterns:${NC}"
        grep "CRASH DETECTED" "$CRASH_LOG" | cut -d"'" -f2 | sort | uniq -c | sort -nr
        
        echo -e "${BLUE}Crashes by hour:${NC}"
        grep "CRASH DETECTED" "$CRASH_LOG" | cut -d' ' -f2 | cut -d':' -f1 | sort | uniq -c
        
        echo -e "${BLUE}Recent crashes (last 10):${NC}"
        tail -20 "$CRASH_LOG" | grep "CRASH DETECTED"
    else
        echo -e "${GREEN}No crash history found${NC}"
    fi
}

# Function to get system diagnostics
get_system_diagnostics() {
    echo -e "${YELLOW}🖥️ System Diagnostics${NC}"
    
    # System memory
    echo -e "${BLUE}System Memory:${NC}"
    free -h 2>/dev/null || echo "Memory info not available"
    
    # Disk space
    echo -e "${BLUE}Disk Space:${NC}"
    df -h . 2>/dev/null || echo "Disk info not available"
    
    # Node.js version
    echo -e "${BLUE}Node.js Version:${NC}"
    node --version 2>/dev/null || echo "Node.js not found"
    
    # TypeScript version
    echo -e "${BLUE}TypeScript Version:${NC}"
    npx tsc --version 2>/dev/null || echo "TypeScript not found"
    
    # VS Code version (if available)
    echo -e "${BLUE}VS Code Version:${NC}"
    code --version 2>/dev/null | head -1 || echo "VS Code version not available"
}

# Function to check project complexity
check_project_complexity() {
    echo -e "${YELLOW}📈 Project Complexity Analysis${NC}"
    
    # Count files by type
    echo -e "${BLUE}File counts:${NC}"
    echo "TypeScript files: $(find . -name "*.ts" -not -path "./node_modules/*" | wc -l)"
    echo "TypeScript React files: $(find . -name "*.tsx" -not -path "./node_modules/*" | wc -l)"
    echo "JavaScript files: $(find . -name "*.js" -not -path "./node_modules/*" | wc -l)"
    echo "JavaScript React files: $(find . -name "*.jsx" -not -path "./node_modules/*" | wc -l)"
    
    # Find largest files
    echo -e "${BLUE}Largest TypeScript files:${NC}"
    find . -name "*.ts" -o -name "*.tsx" -not -path "./node_modules/*" -print0 | xargs -0 ls -la 2>/dev/null | sort -k5 -nr | head -10 | awk '{print $5, $9}'
    
    # Check for files with many imports
    echo -e "${BLUE}Files with most imports:${NC}"
    find . -name "*.ts" -o -name "*.tsx" -not -path "./node_modules/*" -print0 | xargs -0 grep -c "^import" 2>/dev/null | sort -t: -k2 -nr | head -10
}

# Function to generate crash report
generate_crash_report() {
    local report_file
    report_file="$LOG_DIR/crash-report-$(date '+%Y%m%d-%H%M%S').txt"
    
    echo -e "${YELLOW}📋 Generating Crash Report: $report_file${NC}"
    
    {
        echo "TypeScript Server Crash Report"
        echo "Generated: $(date)"
        echo "================================"
        echo ""
        
        echo "SYSTEM INFORMATION"
        echo "=================="
        get_system_diagnostics
        echo ""
        
        echo "PROJECT COMPLEXITY"
        echo "=================="
        check_project_complexity
        echo ""
        
        echo "CRASH HISTORY"
        echo "============="
        analyze_crash_patterns
        echo ""
        
        echo "RECENT MEMORY USAGE"
        echo "==================="
        if [ -f "$MEMORY_LOG" ]; then
            tail -50 "$MEMORY_LOG"
        else
            echo "No memory usage data available"
        fi
        echo ""
        
        echo "TYPESCRIPT CONFIGURATION"
        echo "========================"
        if [ -f "tsconfig.json" ]; then
            echo "Main tsconfig.json:"
            cat tsconfig.json
        fi
        echo ""
        
        if [ -f "tsconfig.debug.json" ]; then
            echo "Debug tsconfig.json:"
            cat tsconfig.debug.json
        fi
        echo ""
        
        echo "VS CODE SETTINGS"
        echo "================"
        if [ -f ".vscode/settings.json" ]; then
            cat .vscode/settings.json
        fi
        
    } > "$report_file"
    
    echo -e "${GREEN}✅ Crash report saved to: $report_file${NC}"
}

# Function to suggest fixes
suggest_fixes() {
    echo -e "${YELLOW}💡 Suggested Fixes for TypeScript Server Crashes${NC}"
    echo ""
    
    echo -e "${BLUE}1. Memory-related fixes:${NC}"
    echo "   • Increase TypeScript server memory: Add 'typescript.tsserver.maxTsServerMemory': 8192 to VS Code settings"
    echo "   • Use separate syntax server: Add 'typescript.tsserver.useSeparateSyntaxServer': true"
    echo "   • Enable incremental compilation with: tsc --incremental"
    echo ""
    
    echo -e "${BLUE}2. Configuration fixes:${NC}"
    echo "   • Use debug tsconfig: tsc --project tsconfig.debug.json --noEmit"
    echo "   • Exclude problematic files from TypeScript checking"
    echo "   • Disable strict type checking temporarily"
    echo ""
    
    echo -e "${BLUE}3. Performance fixes:${NC}"
    echo "   • Clean TypeScript cache: rm -f .tsbuildinfo && rm -rf node_modules/.cache"
    echo "   • Restart TypeScript server: Ctrl+Shift+P > 'TypeScript: Restart TS Server'"
    echo "   • Use skipLibCheck: true in tsconfig.json"
    echo ""
    
    echo -e "${BLUE}4. Project structure fixes:${NC}"
    echo "   • Split large files into smaller modules"
    echo "   • Reduce circular dependencies"
    echo "   • Use dynamic imports for heavy modules"
    echo ""
    
    echo -e "${BLUE}5. Quick commands:${NC}"
    echo "   • Run with debug config: ./debug-typescript.sh verbose"
    echo "   • Clean and restart: ./debug-typescript.sh clean"
    echo "   • Monitor in real-time: ./crash-monitor.sh monitor"
}

# Main execution based on argument
case "${1:-monitor}" in
    "monitor")
        echo -e "${GREEN}Starting real-time crash monitoring...${NC}"
        echo "Press Ctrl+C to stop monitoring"
        echo ""
        
        log_with_timestamp "Starting crash monitor"
        
        trap 'echo -e "\n${YELLOW}Stopping monitor...${NC}"; log_with_timestamp "Stopping crash monitor"; exit 0' INT
        
        while true; do
            # Monitor memory usage
            monitor_memory "$MEMORY_LOG"
            
            # Check for crashes
            if check_for_crashes; then
                echo -e "${RED}💥 TypeScript server crash detected!${NC}"
                generate_crash_report
                suggest_fixes
                
                # Optional: restart TypeScript server automatically
                # code --command typescript.reloadProjects
            fi
            
            sleep "$MONITOR_INTERVAL"
        done
        ;;
        
    "analyze")
        analyze_crash_patterns
        ;;
        
    "report")
        generate_crash_report
        ;;
        
    "fixes")
        suggest_fixes
        ;;
        
    "diagnostics")
        get_system_diagnostics
        check_project_complexity
        ;;
        
    "clean-logs")
        echo -e "${YELLOW}Cleaning crash monitor logs...${NC}"
        rm -rf "$LOG_DIR"
        echo -e "${GREEN}✅ Logs cleaned${NC}"
        ;;
        
    *)
        echo -e "${RED}Usage: $0 [monitor|analyze|report|fixes|diagnostics|clean-logs]${NC}"
        echo ""
        echo -e "${BLUE}Commands:${NC}"
        echo "  monitor      - Start real-time crash monitoring (default)"
        echo "  analyze      - Analyze existing crash patterns"
        echo "  report       - Generate comprehensive crash report"
        echo "  fixes        - Show suggested fixes for common issues"
        echo "  diagnostics  - Show system and project diagnostics"
        echo "  clean-logs   - Clean all monitoring logs"
        exit 1
        ;;
esac
