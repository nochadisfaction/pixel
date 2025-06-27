# Azure Container Registry Setup Guide

This guide will help you set up and use Azure Container Registry (ACR) for your Docker images.

## Prerequisites

1. **Azure CLI** - Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. **Docker** - Install from https://docs.docker.com/get-docker/
3. **Azure Account** with permissions to create and manage Azure Container Registry

## Quick Start

### 1. Login to Azure
```bash
az login
```

### 2. Push your image to Azure Container Registry
```bash
./scripts/docker-push-azure.sh
```

### 3. Pull your image from another machine
```bash
./scripts/docker-pull-azure.sh --run
```

## Detailed Setup

### Azure Container Registry Configuration

Your project is configured to use:
- **Registry Name**: `pixelatedcr`
- **Registry URL**: `pixelatedcr.azurecr.io`
- **Image Name**: `pixelated-app`

### Manual Setup (if needed)

If you need to create the Azure Container Registry manually:

```bash
# Create resource group (if it doesn't exist)
az group create --name pixelated-rg --location eastus

# Create Azure Container Registry
az acr create --resource-group pixelated-rg --name pixelatedcr --sku Basic

# Enable admin user (for simple authentication)
az acr update -n pixelatedcr --admin-enabled true
```

## Available Scripts

### docker-push-azure.sh
Builds and pushes your Docker image to Azure Container Registry.

**Usage:**
```bash
./scripts/docker-push-azure.sh
```

**What it does:**
- Builds your Docker image using `Dockerfile.azure`
- Tags it with version, timestamp, and 'latest'
- Pushes all tags to Azure Container Registry

### docker-pull-azure.sh
Pulls your Docker image from Azure Container Registry.

**Usage:**
```bash
# List available tags
./scripts/docker-pull-azure.sh --list

# Pull latest image
./scripts/docker-pull-azure.sh

# Pull and run specific version
./scripts/docker-pull-azure.sh --run v1.0.0

# Pull and run on custom port
./scripts/docker-pull-azure.sh --run --port 3000
```

## CI/CD Integration

Your Azure DevOps pipeline (`azure-pipelines.yml`) is already configured to:

1. **Build Stage**: Compile and test your application
2. **Docker Build Stage**: Build and push Docker images to ACR
3. **Deploy Stage**: Deploy the container to Azure App Service

### Pipeline Triggers
- Pushes to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

### Image Tags
The pipeline creates images with these tags:
- `$(Build.BuildId)` - Unique build number
- `latest` - Always points to the most recent build
- `production` or `staging` - Based on the branch

## Local Development Workflow

### Building and Testing Locally
```bash
# Build the Docker image
docker build -f Dockerfile.azure -t pixelated-app:local .

# Run locally for testing
docker run -p 8080:8080 pixelated-app:local

# Test the application
curl http://localhost:8080/api/health
```

### Pushing to Registry
```bash
# Push to registry (automated script)
./scripts/docker-push-azure.sh

# Or manually
az acr login --name pixelatedcr
docker build -f Dockerfile.azure -t pixelatedcr.azurecr.io/pixelated-app:latest .
docker push pixelatedcr.azurecr.io/pixelated-app:latest
```

### Pulling from Registry
```bash
# Pull and run (automated script)
./scripts/docker-pull-azure.sh --run

# Or manually
az acr login --name pixelatedcr
docker pull pixelatedcr.azurecr.io/pixelated-app:latest
docker run -p 8080:8080 pixelatedcr.azurecr.io/pixelated-app:latest
```

## Working with Different Environments

### Production Deployment
The pipeline automatically deploys to production when you push to the `main` branch.

### Staging Deployment
Push to the `develop` branch for staging deployment.

### Manual Deployment
You can manually deploy any image tag:

```bash
# Deploy specific version to staging
az webapp config container set \
  --name pixelated-app \
  --resource-group pixelated-rg \
  --slot staging \
  --docker-custom-image-name pixelatedcr.azurecr.io/pixelated-app:v1.0.0
```

## Troubleshooting

### Common Issues

**1. Authentication Failed**
```bash
# Re-login to Azure
az login

# Re-login to ACR
az acr login --name pixelatedcr
```

**2. Permission Denied**
```bash
# Check your Azure permissions
az role assignment list --assignee $(az account show --query user.name -o tsv)

# You need at least "AcrPush" role for the registry
```

**3. Image Not Found**
```bash
# List available images
az acr repository list --name pixelatedcr

# List tags for your image
az acr repository show-tags --name pixelatedcr --repository pixelated-app
```

**4. Container Won't Start**
```bash
# Check container logs
docker logs <container-name>

# Check if the port is correct
docker run -p 8080:8080 pixelatedcr.azurecr.io/pixelated-app:latest
```

### Health Check
Your application should respond to health checks at:
- `http://localhost:8080/api/health`

### Environment Variables
The Docker container expects these environment variables:
- `NODE_ENV=production`
- `PORT=8080`
- `HOST=0.0.0.0`

## Security Best Practices

1. **Use Service Principals** for production CI/CD instead of admin credentials
2. **Enable vulnerability scanning** in Azure Container Registry
3. **Use private endpoints** for production registries
4. **Implement image signing** for critical applications
5. **Regularly update base images** to patch security vulnerabilities

## Monitoring and Logging

### Container Insights
Enable Azure Container Insights for monitoring:
```bash
az monitor log-analytics workspace create \
  --resource-group pixelated-rg \
  --workspace-name pixelated-logs
```

### Application Insights
Your application can send telemetry to Azure Application Insights for detailed monitoring.

## Next Steps

1. **Test the setup**: Run `./scripts/docker-push-azure.sh` to push your first image
2. **Verify deployment**: Check your Azure App Service to see the deployed container
3. **Set up monitoring**: Configure Application Insights for your application
4. **Optimize images**: Review your Dockerfile for size and security optimizations
5. **Automate testing**: Add integration tests to your pipeline

## Support

For issues with:
- **Azure Container Registry**: Check Azure documentation or Azure support
- **Docker**: Check Docker documentation
- **Application**: Check your application logs in Azure App Service or container logs
