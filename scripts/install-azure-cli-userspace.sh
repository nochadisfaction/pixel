#!/bin/bash
# Install Azure CLI in user space without sudo requirements
# This script can be run in the Azure DevOps pipeline

set -e

echo "🔧 Installing Azure CLI in user space..."

# Create local directories
mkdir -p ~/.local/bin
mkdir -p ~/.local/lib

# Method 1: Try pip install (most reliable)
echo "📦 Attempting pip install method..."
if python3 -m pip install --user --upgrade azure-cli; then
    echo "✅ Azure CLI installed via pip"
    # Ensure ~/.local/bin is in PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    # Verify installation
    if command -v az >/dev/null 2>&1; then
        echo "✅ Azure CLI is working"
        az --version
        echo "##vso[task.setvariable variable=azCliInstalled]true"
        echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
        exit 0
    fi
fi

# Method 2: Download static binary (fallback)
echo "🔄 Pip install failed, trying static binary download..."
AZURE_CLI_VERSION="2.55.0"
ARCH=$(uname -m)

case $ARCH in
    x86_64)
        BINARY_URL="https://azcliprod.azureedge.net/cli-extensions/azure-cli-${AZURE_CLI_VERSION}-linux-amd64.tar.gz"
        ;;
    aarch64|arm64)
        BINARY_URL="https://azcliprod.azureedge.net/cli-extensions/azure-cli-${AZURE_CLI_VERSION}-linux-arm64.tar.gz"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

echo "📦 Downloading Azure CLI binary for $ARCH..."
if curl -fsSL "$BINARY_URL" | tar -xz -C ~/.local/lib/; then
    # Create symlink
    ln -sf ~/.local/lib/azure-cli/bin/az ~/.local/bin/az
    chmod +x ~/.local/bin/az
    
    # Update PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    # Verify installation
    if command -v az >/dev/null 2>&1; then
        echo "✅ Azure CLI static binary installed"
        az --version
        echo "##vso[task.setvariable variable=azCliInstalled]true"
        echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
        exit 0
    fi
fi

# Method 3: Use alternative installation script (last resort)
echo "🔄 Binary download failed, trying alternative method..."
curl -sL https://aka.ms/InstallAzureCLIDeb | bash -s -- --install-dir ~/.local/lib/azure-cli --bin-dir ~/.local/bin

# Final verification
export PATH="$HOME/.local/bin:$PATH"
if command -v az >/dev/null 2>&1; then
    echo "✅ Azure CLI installed successfully"
    az --version
    echo "##vso[task.setvariable variable=azCliInstalled]true"
    echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
else
    echo "❌ All Azure CLI installation methods failed"
    echo "Please manually install Azure CLI on the agent machine or contact your DevOps administrator"
    exit 1
fi
