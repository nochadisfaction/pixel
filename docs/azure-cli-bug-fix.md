# Azure CLI "Content Already Consumed" Bug Fix

## Problem Description

The Azure DevOps pipeline was failing with the error:
```text
ERROR: The content for this response was already consumed
```

This is a known bug in Azure CLI version 2.75.0 that affects Bicep deployments when using certain output formats.

## Root Cause

- Azure CLI 2.75.0 has a bug in response handling during Bicep deployments
- The issue occurs when the CLI attempts to read response content multiple times
- Output formats like `--output table` and verbose logging can trigger the bug
- Retry logic without proper isolation can compound the issue

## Solution Implemented

### 1. Updated Azure CLI Installation
```bash
# Force update to latest Azure CLI version
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Configure CLI settings to prevent output issues
az config set core.output=json
az config set core.only_show_errors=true
```

### 2. Improved Deployment Script
- **Unique deployment names**: Each attempt uses a timestamp-based unique name
- **Minimal output**: Use `--output json` instead of `--output none` or `--output table`
- **Separate verification**: Check deployment status in a separate command
- **Environment variables**: Set Azure CLI environment variables to prevent interactive prompts
- **Better error handling**: More robust retry logic with proper isolation

### 3. Key Changes in azure-pipelines.yml

#### Before:
```bash
az deployment group create \
  --resource-group $(resourceGroupName) \
  --template-file deploy/azure/main.bicep \
  --output none \
  --only-show-errors
```

#### After:
```bash
# Configure environment to prevent output consumption issues
export AZURE_CORE_OUTPUT=json
export AZURE_CORE_ONLY_SHOW_ERRORS=true
export AZURE_CORE_DISABLE_CONFIRM_PROMPT=1

# Use unique deployment name
deployment_name="main-$(date +%Y%m%d-%H%M%S)-$attempt"

# Deploy with json output (more stable than none)
az deployment group create \
  --resource-group $(resourceGroupName) \
  --name "$deployment_name" \
  --template-file deploy/azure/main.bicep \
  --parameters [...] \
  --output json \
  --only-show-errors 2>/dev/null

# Verify separately
status=$(az deployment group show \
  --resource-group $(resourceGroupName) \
  --name "$deployment_name" \
  --query "properties.provisioningState" \
  --output tsv 2>/dev/null)
```

## Testing

A comprehensive test script has been created at `scripts/test-bicep-deployment.sh` that allows you to:

1. **Validate locally before pipeline runs**:
   ```bash
   ./scripts/test-bicep-deployment.sh validate
   ```

2. **Perform what-if analysis**:
   ```bash
   ./scripts/test-bicep-deployment.sh whatif
   ```

3. **Test full deployment**:
   ```bash
   ./scripts/test-bicep-deployment.sh deploy
   ```

4. **Run comprehensive tests**:
   ```bash
   ./scripts/test-bicep-deployment.sh full
   ```

## Environment Variables for Testing

```bash
export RESOURCE_GROUP_NAME="pixelated-test-rg"
export LOCATION="eastus"
export ENVIRONMENT="dev"
export APP_NAME="pixelated"
```

## Prevention Strategies

1. **Keep Azure CLI updated**: The bug was fixed in versions newer than 2.75.0
2. **Use test scripts**: Always validate Bicep templates locally before CI/CD
3. **Monitor deployment logs**: Watch for response consumption patterns
4. **Use unique deployment names**: Prevents conflicts in retry scenarios
5. **Configure CLI properly**: Set environment variables to prevent interactive prompts

## Related Azure CLI Configuration

Add these to your Azure CLI configuration to prevent similar issues:
```bash
az config set core.output=json
az config set core.only_show_errors=true
az config set core.disable_confirm_prompt=true
az config set bicep.use_binary_from_path=false
```

## Pipeline Health Checks

The updated pipeline includes better health checks:
- Tool version verification after updates
- Deployment history tracking
- Better error reporting with context
- Graceful failure handling with meaningful error messages

## References

- [Azure CLI Known Issues](https://github.com/Azure/azure-cli/issues)
- [Bicep Deployment Best Practices](https://docs.microsoft.com/azure/azure-resource-manager/bicep/best-practices)
- [Azure DevOps Pipeline Troubleshooting](https://docs.microsoft.com/azure/devops/pipelines/troubleshooting)
