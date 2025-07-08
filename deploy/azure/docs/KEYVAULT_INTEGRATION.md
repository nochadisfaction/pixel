# Azure Key Vault Integration for App Service

This document explains how the Azure App Service is configured to securely load secrets from Azure Key Vault, including the `PUBLIC_CLERK_PUBLISHABLE_KEY` and other sensitive configuration values.

## Overview

The infrastructure implements two approaches for Key Vault integration:

1. **Embedded Configuration**: App settings defined within the App Service resource
2. **Separate Configuration Resource**: Dedicated `appSettings` resource for cleaner management

## Implementation Approaches

### Approach 1: Embedded App Settings (Current)

In the `app-service.bicep` module, secrets are referenced directly in the `appSettings` array:

```bicep
appSettings: [
  // ... other settings
  {
    name: 'PUBLIC_CLERK_PUBLISHABLE_KEY'
    value: !empty(keyVaultUri) ? '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '.')[0]};SecretName=clerk-publishable-key)' : ''
  }
  {
    name: 'CLERK_SECRET_KEY'
    value: !empty(keyVaultUri) ? '@Microsoft.KeyVault(VaultName=${split(keyVaultUri, '.')[0]};SecretName=clerk-secret-key)' : ''
  }
]
```

### Approach 2: Separate App Settings Resource (Alternative)

The `app-service-keyvault-config.bicep` module demonstrates the cleaner approach:

```bicep
resource appSettings 'Microsoft.Web/sites/config@2023-01-01' = {
  parent: appService
  name: 'appsettings'
  properties: {
    'PUBLIC_CLERK_PUBLISHABLE_KEY': '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-publishable-key/)'
    // ... other settings
  }
}
```

## Key Vault Reference Formats

Azure supports multiple formats for Key Vault references:

### Format 1: VaultName + SecretName
```bicep
'@Microsoft.KeyVault(VaultName=my-vault;SecretName=my-secret)'
```

### Format 2: SecretUri (Recommended)
```bicep
'@Microsoft.KeyVault(SecretUri=https://my-vault.vault.azure.net/secrets/my-secret/)'
```

### Format 3: SecretUri with Version
```bicep
'@Microsoft.KeyVault(SecretUri=https://my-vault.vault.azure.net/secrets/my-secret/version)'
```

## Security Configuration

### Managed Identity Setup

The App Service uses a system-assigned managed identity:

```bicep
identity: {
  type: 'SystemAssigned'
}
```

### Key Vault Access Policy

The managed identity is granted minimal permissions:

```bicep
permissions: {
  secrets: [
    'get'
    'list'
  ]
}
```

## Environment Variables

The following environment variables are configured via Key Vault:

| Environment Variable | Key Vault Secret | Purpose |
|---------------------|------------------|---------|
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | `clerk-publishable-key` | Clerk authentication (public) |
| `CLERK_SECRET_KEY` | `clerk-secret-key` | Clerk authentication (private) |
| `AZURE_OPENAI_API_KEY` | `azure-openai-api-key` | Azure OpenAI service |
| `AZURE_OPENAI_ENDPOINT` | `azure-openai-endpoint` | Azure OpenAI endpoint |
| `SUPABASE_URL` | `supabase-url` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `supabase-anon-key` | Supabase anonymous key |
| `SENTRY_DSN` | `sentry-dsn` | Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | `sentry-auth-token` | Sentry API token |
| `AZURE_AD_CLIENT_SECRET` | `azure-ad-client-secret` | Azure AD integration |

## Deployment Process

### 1. Deploy Infrastructure

```bash
az deployment group create \
  --resource-group "pixelated-prod-rg" \
  --template-file main.bicep \
  --parameters appName=pixelated environment=prod
```

### 2. Set Key Vault Secrets

Using the bash script:
```bash
./scripts/set-keyvault-secrets.sh \
  --vault-name "pixelated-prod-kv" \
  --clerk-publishable-key "pk_live_xxxxx" \
  --clerk-secret-key "sk_live_xxxxx"
```

Using the PowerShell script:
```powershell
./scripts/set-keyvault-secrets.ps1 \
  -KeyVaultName "pixelated-prod-kv" \
  -ClerkPublishableKey "pk_live_xxxxx" \
  -ClerkSecretKey "sk_live_xxxxx"
```

### 3. Verify Configuration

Check that the App Service can access the secrets:

```bash
# Check app settings
az webapp config appsettings list \
  --name "pixelated-prod-app" \
  --resource-group "pixelated-prod-rg"

# Test Key Vault access from App Service
az webapp ssh \
  --name "pixelated-prod-app" \
  --resource-group "pixelated-prod-rg"

# Inside the container:
echo $PUBLIC_CLERK_PUBLISHABLE_KEY
```

## Troubleshooting

### Common Issues

1. **Key Vault Access Denied**
   - Verify managed identity has access policy
   - Check if access policy deployment completed
   - Confirm secret names match exactly

2. **Environment Variable Not Set**
   - Verify Key Vault reference syntax
   - Check secret exists in Key Vault
   - Restart App Service to reload configuration

3. **Authentication Errors**
   - Ensure managed identity is enabled
   - Verify tenant ID matches
   - Check access policy permissions

### Debug Commands

```bash
# Check managed identity details
az webapp identity show \
  --name "pixelated-prod-app" \
  --resource-group "pixelated-prod-rg"

# List Key Vault access policies
az keyvault show \
  --name "pixelated-prod-kv" \
  --query "properties.accessPolicies"

# Test secret access
az keyvault secret show \
  --vault-name "pixelated-prod-kv" \
  --name "clerk-publishable-key"
```

## Best Practices

### Security
- Use system-assigned managed identity
- Grant minimal Key Vault permissions
- Separate public and private secrets
- Enable audit logging

### Configuration Management
- Use consistent secret naming conventions
- Version secrets when needed
- Document all environment variables
- Test configuration in staging first

### Monitoring
- Set up alerts for Key Vault access failures
- Monitor App Service logs for authentication errors
- Track secret usage and rotation

## Integration with Application Code

Your application can access the secrets as regular environment variables:

```typescript
// Next.js/React (client-side)
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Node.js (server-side)
const clerkSecretKey = process.env.CLERK_SECRET_KEY
```

Note: For client-side access in Next.js, you may need to prefix with `NEXT_PUBLIC_`:

```bicep
{
  name: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/clerk-publishable-key/)'
}
```

## Advantages of Key Vault Integration

1. **Security**: Secrets never stored in plain text
2. **Rotation**: Easy secret rotation without code changes
3. **Audit**: Full audit trail of secret access
4. **Compliance**: Meets enterprise security requirements
5. **Separation**: Clear separation between configuration and code

This configuration ensures that your `PUBLIC_CLERK_PUBLISHABLE_KEY` and other secrets are securely managed and automatically available to your application at runtime.
