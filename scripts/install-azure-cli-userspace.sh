#!/bin/bash
# Install Azure CLI in user space without sudo requirements
# This script can be run in the Azure DevOps pipeline
# Updated to work with externally managed Python environments

set -e

echo "🔧 Installing Azure CLI in user space..."

# Create local directories
mkdir -p ~/.local/bin
mkdir -p ~/.local/lib

# Method 1: Try UV-based installation (respects externally managed environments)
echo "📦 Attempting UV-based installation method..."
if command -v uv >/dev/null 2>&1; then
    echo "📦 UV found, creating virtual environment for Azure CLI..."
    
    # Create a dedicated virtual environment for Azure CLI
    uv venv ~/.local/lib/azure-cli-venv --python 3.10
    
    # Install Azure CLI in the virtual environment
    if ~/.local/lib/azure-cli-venv/bin/pip install azure-cli; then
        echo "✅ Azure CLI installed via UV/venv"
        
        # Create wrapper script
        cat > ~/.local/bin/az << 'EOF'
#!/bin/bash
exec ~/.local/lib/azure-cli-venv/bin/az "$@"
EOF
        chmod +x ~/.local/bin/az
        
        # Ensure ~/.local/bin is in PATH
        export PATH="$HOME/.local/bin:$PATH"
        
        # Verify installation
        if command -v az >/dev/null 2>&1; then
            echo "✅ Azure CLI is working via UV"
            az --version
            echo "##vso[task.setvariable variable=azCliInstalled]true"
            echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
            exit 0
        fi
    fi
else
    echo "⚠️ UV not found, trying pip with virtual environment..."
    
    # Create virtual environment manually
    python3 -m venv ~/.local/lib/azure-cli-venv
    
    # Install Azure CLI in the virtual environment
    if ~/.local/lib/azure-cli-venv/bin/pip install azure-cli; then
        echo "✅ Azure CLI installed via venv"
        
        # Create wrapper script
        cat > ~/.local/bin/az << 'EOF'
#!/bin/bash
exec ~/.local/lib/azure-cli-venv/bin/az "$@"
EOF
        chmod +x ~/.local/bin/az
        
        # Ensure ~/.local/bin is in PATH
        export PATH="$HOME/.local/bin:$PATH"
        
        # Verify installation
        if command -v az >/dev/null 2>&1; then
            echo "✅ Azure CLI is working via venv"
            az --version
            echo "##vso[task.setvariable variable=azCliInstalled]true"
            echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
            exit 0
        fi
    fi
fi

# Method 2: Try the official Microsoft installation script with user install
echo "🔄 Virtual environment approach failed, trying Microsoft's official script..."
if curl -sL https://aka.ms/InstallAzureCLIDeb | bash -s -- --install-dir ~/.local/lib/azure-cli --exec-dir ~/.local/bin; then
    echo "✅ Azure CLI installed via Microsoft official script"
    
    # Ensure ~/.local/bin is in PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    # Verify installation
    if command -v az >/dev/null 2>&1; then
        echo "✅ Azure CLI is working via official script"
        az --version
        echo "##vso[task.setvariable variable=azCliInstalled]true"
        echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
        exit 0
    fi
fi

# Method 3: Download static binary (fallback)
echo "🔄 Official script failed, trying static binary download..."
AZURE_CLI_VERSION="2.75.0"
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
if curl -fsSL "$BINARY_URL" 2>/dev/null | tar -xz -C ~/.local/lib/ 2>/dev/null; then
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

# Method 4: Final fallback - use system package manager (requires sudo but most reliable)
echo "🔄 All user-space methods failed, trying system installation as final fallback..."
if command -v sudo >/dev/null 2>&1; then
    echo "📦 Using system package manager (requires sudo)..."
    if curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash; then
        echo "✅ Azure CLI installed via system package manager"
        
        # Verify installation
        if command -v az >/dev/null 2>&1; then
            echo "✅ Azure CLI is working via system installation"
            az --version
            echo "##vso[task.setvariable variable=azCliInstalled]true"
            echo "##vso[task.setvariable variable=azCliPath]/usr/bin"
            exit 0
        fi
    fi
fi

# Final verification
export PATH="$HOME/.local/bin:$PATH"
if command -v az >/dev/null 2>&1; then
    echo "✅ Azure CLI installed successfully"
    az --version
    echo "##vso[task.setvariable variable=azCliInstalled]true"
    echo "##vso[task.setvariable variable=azCliPath]$HOME/.local/bin"
else
    echo "❌ All Azure CLI installation methods failed"
    echo "💡 Recommendations:"
    echo "   1. Pre-install Azure CLI on the agent machine using: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo "   2. Or use Microsoft-hosted agents which have Azure CLI pre-installed"
    echo "   3. Or use a Docker container with Azure CLI pre-installed"
    echo "Please manually install Azure CLI on the agent machine or contact your DevOps administrator"
    exit 1
fi
