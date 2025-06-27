#!/bin/bash

# Docker Build and Azure Deployment Script for Existing Infrastructure
# This script works with your existing Azure Static Web App: pixelated-static

set -e

echo "🚀 Building Docker images for Pixelated Empathy (existing Azure infrastructure)"

# Configuration for existing container infrastructure
RESOURCE_GROUP="pixelated-rg"
CONTAINER_REGISTRY="pixelatedcr"
APP_SERVICE_PLAN="pixelated-plan"
APP_SERVICE_NAME="pixelated-app"
LOCATION="eastus"

# Build options
BUILD_TYPE="${1:-container}"  # container or quick-deploy
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"

echo "📋 Build Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container Registry: $CONTAINER_REGISTRY"
echo "  App Service: $APP_SERVICE_NAME"
echo "  Build Type: $BUILD_TYPE"
echo "  Image Tag: $IMAGE_TAG"
echo ""

# Load environment variables
if [ -f ".env.azure" ]; then
    echo "📄 Loading Azure environment variables..."
    set -a
    source .env.azure
    set +a
fi

case $BUILD_TYPE in
    "container")
        echo "📦 Building and deploying to your existing Azure Container infrastructure..."
        
        # Check if Docker is available
        if ! command -v docker &> /dev/null; then
            echo "❌ Docker is not installed"
            exit 1
        fi
        
        # Get ACR login server
        echo "� Getting Container Registry details..."
        ACR_LOGIN_SERVER=$(az acr show --name "$CONTAINER_REGISTRY" --resource-group "$RESOURCE_GROUP" --query "loginServer" --output tsv)
        
        if [ -z "$ACR_LOGIN_SERVER" ]; then
            echo "❌ Could not get ACR login server"
            exit 1
        fi
        
        echo "🐳 ACR Login Server: $ACR_LOGIN_SERVER"
        
        # Login to ACR
        echo "🔐 Logging in to Azure Container Registry..."
        az acr login --name "$CONTAINER_REGISTRY"
        
        # Build Docker image with your existing Azure infrastructure
        echo "🔨 Building Docker image for existing infrastructure..."
        docker build \
            -f docker/azure/Dockerfile.azure-web \
            -t "$ACR_LOGIN_SERVER/pixelated-web:$IMAGE_TAG" \
            -t "$ACR_LOGIN_SERVER/pixelated-web:latest" \
            --build-arg AZURE_OPENAI_API_KEY="$AZURE_OPENAI_API_KEY" \
            --build-arg AZURE_OPENAI_ENDPOINT="$AZURE_OPENAI_ENDPOINT" \
            .
        
        # Push to your existing ACR
        echo "⬆️ Pushing to your Container Registry..."
        docker push "$ACR_LOGIN_SERVER/pixelated-web:$IMAGE_TAG"
        docker push "$ACR_LOGIN_SERVER/pixelated-web:latest"
        
        # Deploy to your existing App Service
        echo "� Deploying to your App Service..."
        az webapp config container set \
            --name "$APP_SERVICE_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --docker-custom-image-name "$ACR_LOGIN_SERVER/pixelated-web:$IMAGE_TAG" \
            --docker-registry-server-url "https://$ACR_LOGIN_SERVER"
        
        # Restart the app service to pick up the new image
        echo "🔄 Restarting App Service..."
        az webapp restart --name "$APP_SERVICE_NAME" --resource-group "$RESOURCE_GROUP"
        
        # Get the app URL
        APP_URL=$(az webapp show --name "$APP_SERVICE_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostName" --output tsv)
        
        echo "✅ Container deployment completed!"
        echo "🌐 Your app is available at: https://$APP_URL"
        echo "🐳 Container image: $ACR_LOGIN_SERVER/pixelated-web:$IMAGE_TAG"
        ;;
        
    "quick-deploy")
        echo "⚡ Quick deployment to existing App Service (using latest image)..."
        
        # Get ACR login server
        ACR_LOGIN_SERVER=$(az acr show --name "$CONTAINER_REGISTRY" --resource-group "$RESOURCE_GROUP" --query "loginServer" --output tsv)
        
        # Deploy latest image
        az webapp config container set \
            --name "$APP_SERVICE_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --docker-custom-image-name "$ACR_LOGIN_SERVER/pixelated-web:latest" \
            --docker-registry-server-url "https://$ACR_LOGIN_SERVER"
        
        # Restart app service
        az webapp restart --name "$APP_SERVICE_NAME" --resource-group "$RESOURCE_GROUP"
        
        echo "✅ Quick deployment completed!"
        ;;
        
    *)
        echo "❌ Invalid build type: $BUILD_TYPE"
        echo "Usage: $0 [container|quick-deploy]"
        echo ""
        echo "Build types:"
        echo "  container     - Build new image and deploy to your existing App Service"
        echo "  quick-deploy  - Deploy latest image without rebuilding"
        exit 1
        ;;
esac

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "📋 Your existing container infrastructure:"
echo "  App Service: https://pixelatedempathy.com"
echo "  Container Registry: $CONTAINER_REGISTRY.azurecr.io"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Key Vault: GimmeKeys (in dockpod_group)"
echo "  OpenAI Service: kissmyass (in dockpod_group)"
