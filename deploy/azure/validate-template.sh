#!/bin/bash

echo "🔍 Validating Pixelated Empathy Azure Infrastructure Template..."

# Check if Azure CLI is logged in
if ! az account show &> /dev/null; then
    echo "❌ Please login to Azure CLI first: az login"
    exit 1
fi

# Compile Bicep template
echo "📦 Compiling Bicep template..."
if az bicep build --file main.bicep; then
    echo "✅ Bicep compilation successful"
else
    echo "❌ Bicep compilation failed"
    exit 1
fi

# Validate template syntax
# Azure CLI exit codes: 0=success, 3=resource group not found, other=validation error
echo "🔍 Validating template syntax..."
az deployment group validate \
    --resource-group "pixel-validation-rg" \
    --template-file main.bicep \
    --parameters @main.dev.parameters.json \
    --no-prompt 2>/dev/null

validation_exit_code=$?

if [ $validation_exit_code -eq 0 ]; then
    echo "✅ Template validation successful"
elif [ $validation_exit_code -eq 3 ]; then
    echo "⚠️  Resource group 'pixel-validation-rg' does not exist - template syntax validation skipped"
    echo "💡 Create resource group with: az group create --name pixel-validation-rg --location eastus"
else
    echo "❌ Template validation failed with exit code $validation_exit_code"
    echo "   This indicates a real validation error in the template or parameters"
    exit 1
fi

# Check module files
echo "📁 Checking module files..."
modules=("storage" "monitoring" "key-vault" "openai" "container-registry" "app-service")
for module in "${modules[@]}"; do
    if [[ -f "modules/${module}.bicep" ]]; then
        echo "✅ modules/${module}.bicep exists"
    else
        echo "❌ modules/${module}.bicep missing"
    fi
done

echo "🎉 Validation complete!"
echo ""
echo "💡 If you're still seeing IDE errors:"
echo "   1. Reload your IDE window (Ctrl+Shift+P → 'Developer: Reload Window')"
echo "   2. Restart Bicep language server (Ctrl+Shift+P → 'Bicep: Restart Language Server')"
echo "   3. Update Bicep extension in your IDE"