#!/bin/bash

# Deployment script for Pixelated Empathy Azure infrastructure
# Usage: ./deploy.sh [environment] [resource-group]
# Environment: dev, staging, or prod (default: dev)
# Resource Group: name of the resource group (default: pixelated-{environment}-rg)

set -e  # Exit on any error

# Default values
ENVIRONMENT="${1:-dev}"
RESOURCE_GROUP="${2:-pixelated-${ENVIRONMENT}-rg}"
LOCATION="${3:-eastus}"

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "   Valid options: dev, staging, prod"
    exit 1
fi

echo "🚀 Starting deployment for Pixelated Empathy"
echo "   Environment: $ENVIRONMENT"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to Azure
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

# Set the directory to the script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"

# Select parameter file based on environment
PARAM_FILE="main.parameters.json"
if [ "$ENVIRONMENT" = "dev" ]; then
    PARAM_FILE="main.dev.parameters.json"
elif [ "$ENVIRONMENT" = "staging" ]; then
    PARAM_FILE="main.staging.parameters.json"
fi

if [ ! -f "$PARAM_FILE" ]; then
    echo "❌ Parameter file not found: $PARAM_FILE"
    echo "   Available files:"
    ls -1 *.parameters.json 2>/dev/null || echo "   No parameter files found"
    exit 1
fi

echo "📋 Using parameter file: $PARAM_FILE"

# Create resource group if it doesn't exist
echo "🏗️  Checking resource group..."
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo "   Creating resource group: $RESOURCE_GROUP"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
else
    echo "   Resource group already exists: $RESOURCE_GROUP"
fi

# Validate the deployment first
echo "🔍 Validating deployment..."
if az deployment group validate \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "@$PARAM_FILE" \
    --no-prompt; then
    echo "✅ Deployment validation successful"
else
    echo "❌ Deployment validation failed"
    exit 1
fi

# Ask for confirmation before deploying
echo ""
read -p "🤔 Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 Deployment cancelled"
    exit 0
fi

# Deploy the infrastructure
echo "🚀 Starting deployment..."
DEPLOYMENT_NAME="pixelated-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

if az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file main.bicep \
    --parameters "@$PARAM_FILE" \
    --name "$DEPLOYMENT_NAME" \
    --no-prompt; then
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo ""
    
    # Get deployment outputs
    echo "📊 Deployment Summary:"
    az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DEPLOYMENT_NAME" \
        --query "properties.outputs.deploymentSummary.value" \
        --output table
    
    echo ""
    echo "🔗 Useful URLs:"
    
    # Get App Service URL if available
    APP_SERVICE_URL=$(az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DEPLOYMENT_NAME" \
        --query "properties.outputs.appServiceUrl.value" \
        --output tsv 2>/dev/null || echo "")
    
    if [ -n "$APP_SERVICE_URL" ] && [ "$APP_SERVICE_URL" != "null" ]; then
        echo "   App Service: $APP_SERVICE_URL"
    fi
    
    # Get Static Web App URL if available
    SWA_URL=$(az deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "$DEPLOYMENT_NAME" \
        --query "properties.outputs.staticWebAppUrl.value" \
        --output tsv 2>/dev/null || echo "")
    
    if [ -n "$SWA_URL" ] && [ "$SWA_URL" != "null" ]; then
        echo "   Static Web App: https://$SWA_URL"
    fi
    
    echo ""
    echo "💡 Next steps:"
    echo "   1. Configure secrets in Key Vault"
    echo "   2. Set up CI/CD pipelines"
    echo "   3. Configure custom domains if needed"
    echo "   4. Test the deployed application"
    
else
    echo "❌ Deployment failed"
    exit 1
fi
