#!/bin/bash

# Memory Sync Tool Runner
# Usage: ./run-memory-sync.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv"

echo -e "${BLUE}🔄 Memory Synchronization Tool${NC}"
echo "================================"

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv "$VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Install/upgrade dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r "$SCRIPT_DIR/requirements.txt"

# Check environment variables
if [ -z "$MEM0_API_KEY" ]; then
    echo -e "${RED}❌ MEM0_API_KEY environment variable not set${NC}"
    echo "Please set your Mem0 API key:"
    echo "export MEM0_API_KEY='your-api-key-here'"
    exit 1
fi

# Run the Python script with all arguments
echo -e "${GREEN}🚀 Starting memory sync...${NC}"
python3 "$SCRIPT_DIR/memory-sync.py" "$@"

echo -e "${GREEN}✅ Memory sync completed${NC}"