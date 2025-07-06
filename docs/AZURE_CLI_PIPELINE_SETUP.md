# Azure CLI Pipeline Setup Guide

This document outlines how Azure CLI is configured for the Azure DevOps pipeline in this project.

## Overview

The project uses a **self-hosted Azure DevOps agent** which requires Azure CLI to be available for deployment tasks. This setup provides multiple fallback methods to ensure Azure CLI is available regardless of the agent configuration.

## Agent Setup Options

### Option 1: Pre-install Azure CLI (Recommended)

**For the agent machine administrator:**

```bash
# Run this ONCE on your self-hosted agent machine
sudo ./scripts/setup-agent-azure-cli.sh
```

This script:
- Installs Azure CLI system-wide using Microsoft's official package repository
- Installs Azure Bicep
- Makes Azure CLI available for all pipeline runs
- Provides the most reliable solution

### Option 2: Pipeline-based Installation (Fallback)

The pipeline automatically handles Azure CLI installation if it's not pre-installed using `./scripts/install-azure-cli-userspace.sh`.

## Installation Methods (Priority Order)

### 1. UV-based Virtual Environment
- Uses UV (if available) to create an isolated Python environment
- Installs Azure CLI via pip in the virtual environment
- Creates a wrapper script at `~/.local/bin/az`
- Respects externally managed Python environments

### 2. Standard Virtual Environment
- Falls back to `python3 -m venv` if UV is not available
- Same isolation benefits as UV method
- Compatible with most Linux distributions

### 3. Microsoft Official Script
- Uses Microsoft's official installation script with user directory install
- Installs to `~/.local/lib/azure-cli` and `~/.local/bin`
- No Python environment conflicts

### 4. Static Binary Download
- Downloads pre-compiled Azure CLI binary
- Extracts to `~/.local/lib` and symlinks to `~/.local/bin`
- Works when package installation fails

### 5. System Installation (Final Fallback)
- Uses sudo to install system-wide via Microsoft's script
- Most reliable but requires admin privileges
- Only runs if other methods fail

## Pipeline Integration

### Infrastructure Stage
```yaml
- script: |
    echo "🔍 Checking if Azure CLI is already available..."
    
    # Check if Azure CLI is already installed system-wide
    if command -v az >/dev/null 2>&1; then
      echo "✅ Azure CLI already available system-wide"
      az --version
    else
      echo "⚠️ Azure CLI not found, attempting installation..."
      chmod +x ./scripts/install-azure-cli-userspace.sh
      ./scripts/install-azure-cli-userspace.sh
    fi
  displayName: Install/Verify Azure CLI
```

### Health Check Stage
- Uses the same verification pattern
- Ensures Azure CLI is available for health checks
- Provides feedback on installation status

## Troubleshooting

### Common Issues

#### 1. Externally Managed Python Environment
**Error:** `error: externally-managed-environment`

**Solution:** The script automatically handles this by using virtual environments instead of user-space pip installs.

#### 2. Permission Denied
**Error:** Permission denied when trying to create directories

**Solution:** The script creates directories in `~/.local/` which should be writable by the pipeline user.

#### 3. Network Connectivity Issues
**Error:** curl timeouts or connection failures

**Solution:** The script includes multiple fallback URLs and methods.

### Manual Verification

To verify Azure CLI installation manually:

```bash
# Check if Azure CLI is available
command -v az

# Check version
az --version

# Check Bicep availability
az bicep version

# Test Azure authentication (requires service principal)
az account show
```

### Environment Variables

The pipeline sets these variables when Azure CLI is successfully installed:

- `azCliInstalled`: Set to "true" when installation succeeds
- `azCliPath`: Path to the directory containing the az command

## Best Practices

1. **Pre-install on Agent**: Install Azure CLI system-wide on the agent machine for best performance
2. **Monitor Logs**: Check pipeline logs for installation method used
3. **Version Consistency**: Use the same Azure CLI version across all environments
4. **Cache Dependencies**: Consider caching the virtual environment for faster subsequent runs

## Files

- `scripts/setup-agent-azure-cli.sh`: One-time agent setup script (requires sudo)
- `scripts/install-azure-cli-userspace.sh`: Pipeline installation script (no sudo required)
- `azure-pipelines.yml`: Contains the pipeline integration

## Security Considerations

- User-space installations don't require admin privileges
- Virtual environments provide isolation from system Python
- Service principal authentication is handled by Azure DevOps service connections
- No Azure CLI credentials are stored in the repository

## Performance Notes

- Pre-installed Azure CLI: ~5 seconds pipeline overhead
- User-space installation: ~30-60 seconds depending on method
- Virtual environment creation: Additional ~10-20 seconds
- Binary download: ~15-30 seconds depending on network

## Support

If Azure CLI installation continues to fail:

1. Check agent machine has internet connectivity
2. Verify Python 3.8+ is available
3. Ensure sufficient disk space in `~/.local/`
4. Consider using Microsoft-hosted agents as an alternative
5. Contact the DevOps team for agent machine access

---

*Last updated: July 5, 2025*
