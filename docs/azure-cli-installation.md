# Azure CLI Installation for Self-Hosted Agents

## Problem
The Azure DevOps pipeline was failing because it tried to install Azure CLI with `sudo` permissions, which are not available in pipeline agents.

## Solution
We've implemented a user-space installation approach that doesn't require administrative privileges.

## Changes Made

### 1. Created User-Space Installation Script
- **File**: `scripts/install-azure-cli-userspace.sh`
- **Purpose**: Installs Azure CLI in `~/.local/bin` without sudo
- **Methods**: 
  1. Python pip install (primary)
  2. Static binary download (fallback)
  3. Alternative installation script (last resort)

### 2. Updated Azure Pipeline
- **File**: `azure-pipelines.yml`
- **Changes**:
  - Replaced complex Azure CLI detection logic with simple script call
  - Updated both Infrastructure and Health Check stages
  - Added proper PATH environment variable handling
  - Simplified error handling and logging

### 3. Created Troubleshooting Script
- **File**: `scripts/troubleshoot-azure-cli.sh`
- **Purpose**: Helps diagnose Azure CLI installation issues
- **Features**: Checks paths, permissions, network connectivity, and provides recommendations

## How It Works

1. **Installation Process**:
   ```bash
   # The pipeline now simply calls:
   chmod +x ./scripts/install-azure-cli-userspace.sh
   ./scripts/install-azure-cli-userspace.sh
   ```

2. **User-Space Installation**:
   - Creates `~/.local/bin` directory
   - Installs Azure CLI using `pip install --user azure-cli`
   - Adds `~/.local/bin` to PATH
   - Sets pipeline variables for subsequent steps

3. **Verification**:
   - Checks if `az` command is available
   - Verifies Azure CLI version
   - Installs Bicep extension

## Benefits

- ✅ **No sudo required**: Installs in user space
- ✅ **Self-contained**: Each agent gets its own installation
- ✅ **Robust fallbacks**: Multiple installation methods
- ✅ **Pipeline variables**: Sets variables for downstream tasks
- ✅ **Debugging support**: Troubleshooting script included

## Usage in Pipeline

The pipeline now uses these simplified steps:

```yaml
- script: |
    chmod +x ./scripts/install-azure-cli-userspace.sh
    ./scripts/install-azure-cli-userspace.sh
  displayName: Install Azure CLI
  env:
    PATH: $(PATH):$(HOME)/.local/bin
```

## Troubleshooting

If Azure CLI installation fails:

1. **Run troubleshooting script**:
   ```bash
   ./scripts/troubleshoot-azure-cli.sh
   ```

2. **Manual installation**:
   ```bash
   mkdir -p ~/.local/bin
   export PATH="$HOME/.local/bin:$PATH"
   python3 -m pip install --user azure-cli
   ```

3. **Check PATH**:
   ```bash
   echo $PATH
   which az
   az --version
   ```

## Alternative Solutions

If the user-space installation still fails, consider:

1. **Pre-install on agent machine** (requires one-time setup):
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Use Docker containers** with Azure CLI pre-installed

3. **Use Microsoft-hosted agents** instead of self-hosted agents

## Pipeline Variables Set

The installation script sets these pipeline variables:
- `azCliInstalled`: `true` if installation succeeded
- `azCliPath`: Path to Azure CLI binary directory

These can be used in subsequent pipeline steps for conditional logic.
