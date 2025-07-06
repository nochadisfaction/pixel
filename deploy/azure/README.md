# Azure Infrastructure Deployment for Pixelated Empathy

This directory contains the Azure infrastructure-as-code templates for deploying the Pixelated Empathy application to Azure.

## 📁 Structure

```text
deploy/azure/
├── main.bicep                  # Main Bicep template
├── main.parameters.json        # Production parameters
├── main.dev.parameters.json    # Development parameters
├── modules/                    # Modular Bicep templates
│   ├── app-service.bicep      # Azure App Service
│   ├── container-registry.bicep # Azure Container Registry
│   ├── key-vault.bicep        # Azure Key Vault
│   ├── monitoring.bicep       # Application Insights & Log Analytics
│   ├── openai.bicep          # Azure OpenAI Service
│   ├── static-web-app.bicep  # Azure Static Web Apps
│   └── storage.bicep         # Azure Storage Account
├── validate.sh               # Template validation script
├── deploy.sh                 # Deployment script
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Azure CLI**: Install from [https://docs.microsoft.com/en-us/cli/azure/install-azure-cli](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
2. **Azure Subscription**: Active Azure subscription with appropriate permissions
3. **Bicep CLI**: Usually included with Azure CLI

### Login to Azure

```bash
az login
az account set --subscription "your-subscription-id"
```

### Validate Templates

Before deploying, validate all templates:

```bash
./validate.sh
```

### Deploy Infrastructure

#### Development Environment

```bash
./deploy.sh dev pixelated-dev-rg eastus
```

#### Production Environment

```bash
./deploy.sh prod pixelated-prod-rg eastus
```

#### Custom Deployment

```bash
# Create resource group
az group create --name my-resource-group --location eastus

# Deploy with custom parameters
az deployment group create \
  --resource-group my-resource-group \
  --template-file main.bicep \
  --parameters appName=myapp environment=prod enableAzureOpenAI=true
```

## 🏗️ Architecture

The template deploys the following Azure resources:

### Core Services

- **Azure App Service**: Containerized web application hosting
- **Azure Static Web Apps**: Alternative hosting for static sites
- **Azure Container Registry**: Docker image storage
- **Azure Key Vault**: Secrets and configuration management

### AI & Analytics

- **Azure OpenAI Service**: GPT-4, GPT-3.5, and embedding models
- **Application Insights**: Application performance monitoring
- **Log Analytics**: Centralized logging and analytics

### Storage & Backup

- **Azure Storage Account**: File storage, backups, and static assets
  - Blob containers for backups, assets, and logs
  - Secure access with SAS tokens

### Security Features

- **Managed Identity**: Secure service-to-service authentication
- **Key Vault Integration**: Secrets referenced via Key Vault
- **HTTPS Only**: All services configured for HTTPS
- **Network Security**: Configurable public/private access

## ⚙️ Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `appName` | string | `pixelated` | Name of the application |
| `environment` | string | `prod` | Environment (dev, staging, prod) |
| `location` | string | Resource Group location | Azure region |
| `appServicePlanSku` | string | `B1` | App Service plan pricing tier |
| `staticWebAppSku` | string | `Free` | Static Web App pricing tier |
| `enableAzureOpenAI` | bool | `true` | Deploy Azure OpenAI service |
| `enableStorage` | bool | `true` | Deploy storage account |
| `enableMonitoring` | bool | `true` | Deploy monitoring services |
| `customDomain` | string | `""` | Custom domain name (optional) |
| `githubRepoUrl` | string | `""` | GitHub repository for Static Web Apps |
| `githubBranch` | string | `main` | GitHub branch for deployment |

## 🔧 Configuration

### Environment-Specific Parameters

- **Development** (`main.dev.parameters.json`):
  - Uses F1 (Free) App Service plan
  - Disables Azure OpenAI to reduce costs
  - Uses development GitHub branch

- **Production** (`main.parameters.json`):
  - Uses B1 (Basic) App Service plan
  - Enables all services including Azure OpenAI
  - Uses main GitHub branch

### Key Vault Secrets

The following secrets need to be configured in Key Vault after deployment:

| Secret Name | Description |
|-------------|-------------|
| `azure-openai-api-key` | Azure OpenAI API key |
| `azure-openai-endpoint` | Azure OpenAI endpoint URL |
| `supabase-url` | Supabase project URL |
| `supabase-anon-key` | Supabase anonymous key |
| `azure-ad-client-secret` | Azure AD client secret |

### Post-Deployment Configuration

1. **Set Key Vault Secrets**:
   ```bash
   az keyvault secret set --vault-name "pixelated-prod-kv" --name "azure-openai-api-key" --value "your-key"
   ```

2. **Configure Container Registry**:
   ```bash
   # Get ACR credentials
   az acr credential show --name pixelatedprodcr
   
   # Build and push Docker image
   docker build -t pixelatedprodcr.azurecr.io/pixelated-app:latest .
   docker push pixelatedprodcr.azurecr.io/pixelated-app:latest
   ```

3. **Set up CI/CD**:
   - Configure GitHub Actions or Azure DevOps
   - Use the deployment token from Static Web Apps
   - Set up container registry webhooks

## 🔍 Monitoring

### Application Insights

- **Application Performance**: Response times, dependency calls
- **Error Tracking**: Exceptions and failed requests
- **Custom Metrics**: Business-specific metrics
- **Live Metrics**: Real-time performance data

### Log Analytics

- **Centralized Logging**: All services log to one workspace
- **Custom Queries**: KQL queries for analysis
- **Alerts**: Proactive monitoring and notifications
- **Workbooks**: Custom dashboards and reports

### Built-in Alerts

- High error rate (>10 errors in 15 minutes)
- Slow response times (>5 seconds average)
- Resource utilization thresholds

## 🛡️ Security

### Identity & Access

- **Managed Identity**: App Service uses system-assigned identity
- **RBAC**: Role-based access control for all resources
- **Key Vault**: Secure secret storage with access policies

### Network Security

- **HTTPS Only**: All web services require HTTPS
- **Storage Security**: Private blob access, CORS configured
- **Container Registry**: Admin user optional, token-based access

### Compliance

- **Data Encryption**: At rest and in transit
- **Audit Logging**: All access logged to Log Analytics
- **Retention Policies**: Configurable data retention
- **Backup Strategy**: Automated backups for critical data

## 🔄 Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep Docker images and dependencies updated
2. **Monitor Costs**: Review Azure Cost Management regularly
3. **Security Updates**: Apply security patches promptly
4. **Backup Verification**: Test backup and restore procedures

### Scaling

- **App Service**: Auto-scaling rules configured for higher SKUs
- **Storage**: Automatically scales with usage
- **OpenAI**: Monitor token usage and adjust quotas

### Disaster Recovery

- **Multi-Region**: Consider deploying to multiple regions
- **Backup Strategy**: Regular backups to geo-redundant storage
- **Recovery Procedures**: Document and test recovery procedures

## 🐛 Troubleshooting

### Common Issues

1. **Deployment Failures**:
   - Check resource group permissions
   - Verify parameter values
   - Review activity log in Azure portal

2. **Application Not Starting**:
   - Check container logs in App Service
   - Verify environment variables
   - Check Key Vault access permissions

3. **Performance Issues**:
   - Review Application Insights metrics
   - Check App Service plan sizing
   - Monitor database connections

### Debug Commands

```bash
# Check deployment status
az deployment group show --resource-group <rg-name> --name <deployment-name>

# View App Service logs
az webapp log tail --resource-group <rg-name> --name <app-name>

# Test Key Vault access
az keyvault secret show --vault-name <kv-name> --name <secret-name>
```

## 📞 Support

For issues related to:
- **Azure Resources**: Check Azure Status page and support
- **Template Issues**: Review GitHub repository issues
- **Application Issues**: Check application logs and monitoring data

## 🔗 Additional Resources

- [Azure Bicep Documentation](https://docs.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
