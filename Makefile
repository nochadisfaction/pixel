# Makefile for Azure Container Registry operations

.PHONY: help docker-build docker-push docker-pull docker-run docker-clean azure-login acr-list

# Default target
help:
	@echo "Azure Container Registry Operations"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo "  make azure-login    - Login to Azure and ACR"
	@echo "  make docker-build   - Build Docker image locally"
	@echo "  make docker-push    - Build and push to Azure Container Registry"
	@echo "  make docker-pull    - Pull latest image from ACR"
	@echo "  make docker-run     - Pull and run the container locally"
	@echo "  make docker-clean   - Clean up local Docker images and containers"
	@echo "  make acr-list       - List available images in ACR"
	@echo ""
	@echo "Environment:"
	@echo "  REGISTRY_URL = pixelatedcr.azurecr.io"
	@echo "  IMAGE_NAME   = pixelated-app"
	@echo ""

# Configuration
REGISTRY_URL := pixelatedcr.azurecr.io
IMAGE_NAME := pixelated-app
CONTAINER_NAME := pixelated-app-local
PORT := 8080

# Azure authentication
azure-login:
	@echo "Logging in to Azure and Container Registry..."
	az login
	az acr login --name pixelatedcr

# Build Docker image locally
docker-build:
	@echo "Building Docker image locally..."
	docker build -f Dockerfile.azure -t $(IMAGE_NAME):local .
	@echo "Image built successfully: $(IMAGE_NAME):local"

# Build and push to Azure Container Registry (using script)
docker-push:
	@echo "Building and pushing to Azure Container Registry..."
	./scripts/docker-push-azure.sh

# Pull latest image from ACR
docker-pull:
	@echo "Pulling latest image from Azure Container Registry..."
	./scripts/docker-pull-azure.sh

# Pull and run container
docker-run:
	@echo "Pulling and running container from Azure Container Registry..."
	./scripts/docker-pull-azure.sh --run --port $(PORT) --name $(CONTAINER_NAME)

# List available images in ACR
acr-list:
	@echo "Available images in Azure Container Registry:"
	az acr repository list --name pixelatedcr --output table
	@echo ""
	@echo "Tags for pixelated-app:"
	az acr repository show-tags --name pixelatedcr --repository pixelated-app --output table

# Clean up local Docker resources
docker-clean:
	@echo "Cleaning up local Docker resources..."
	-docker stop $(CONTAINER_NAME) 2>/dev/null || true
	-docker rm $(CONTAINER_NAME) 2>/dev/null || true
	-docker rmi $(IMAGE_NAME):local 2>/dev/null || true
	docker image prune -f
	@echo "Cleanup completed!"

# Development workflow shortcuts
dev-build-push: docker-build docker-push
dev-pull-run: docker-pull docker-run
dev-rebuild: docker-clean docker-build

# Check if required tools are installed
check-tools:
	@echo "Checking required tools..."
	@command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
	@command -v az >/dev/null 2>&1 || { echo "Azure CLI is required but not installed. Aborting." >&2; exit 1; }
	@echo "All required tools are installed!"

# Test the deployed application
test-local:
	@echo "Testing local application..."
	@sleep 2
	@curl -f http://localhost:$(PORT)/api/health || { echo "Health check failed!"; exit 1; }
	@echo "Local application is healthy!"

test-remote:
	@echo "Testing remote application..."
	@curl -f https://pixelated-app.azurewebsites.net/api/health || { echo "Remote health check failed!"; exit 1; }
	@echo "Remote application is healthy!"

# Full deployment workflow
deploy: check-tools azure-login docker-push
	@echo "Deployment completed! Check your Azure App Service for the updated container."

# Full development workflow
develop: check-tools docker-clean docker-build docker-run test-local
	@echo "Development environment is ready! Access at http://localhost:$(PORT)"
