// Azure Key Vault for secrets management
@description('The name of the Key Vault')
param keyVaultName string

@description('The location for the Key Vault')
param location string = resourceGroup().location

@description('Tags to apply to the Key Vault')
param tags object = {}

@description('The SKU for the Key Vault')
@allowed(['standard', 'premium'])
param sku string = 'standard'

@description('Enable soft delete')
param enableSoftDelete bool = true

@description('Soft delete retention days')
@minValue(7)
@maxValue(90)
param softDeleteRetentionInDays int = 90

@description('Enable purge protection')
param enablePurgeProtection bool = true

@description('Enable RBAC authorization')
param enableRbacAuthorization bool = true

@description('Enable public network access')
param publicNetworkAccess bool = true

@description('Object ID of the principal that should have access to Key Vault (optional)')
param principalObjectId string = ''

@description('Clerk publishable key (optional - only set during deployment if provided)')
@secure()
param clerkPublishableKey string = ''

@description('Clerk secret key (optional - only set during deployment if provided)')
@secure()
param clerkSecretKey string = ''

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: sku
    }
    tenantId: tenant().tenantId
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: enableSoftDelete
    softDeleteRetentionInDays: softDeleteRetentionInDays
    enablePurgeProtection: enablePurgeProtection
    enableRbacAuthorization: enableRbacAuthorization
    publicNetworkAccess: publicNetworkAccess ? 'Enabled' : 'Disabled'
    accessPolicies: (enableRbacAuthorization || empty(principalObjectId)) ? [] : [
      {
        tenantId: tenant().tenantId
        objectId: principalObjectId
        permissions: {
          keys: [
            'get'
            'list'
            'update'
            'create'
            'import'
            'delete'
            'recover'
            'backup'
            'restore'
          ]
          secrets: [
            'get'
            'list'
            'set'
            'delete'
            'recover'
            'backup'
            'restore'
          ]
          certificates: [
            'get'
            'list'
            'update'
            'create'
            'import'
            'delete'
            'recover'
            'backup'
            'restore'
            'managecontacts'
            'manageissuers'
            'getissuers'
            'listissuers'
            'setissuers'
            'deleteissuers'
          ]
        }
      }
    ]
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: publicNetworkAccess ? 'Allow' : 'Deny'
      ipRules: []
      virtualNetworkRules: []
    }
  }
}

// Diagnostic settings for Key Vault (commented out until Log Analytics workspace is properly configured)
// resource diagnosticSettings 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
//   name: '${keyVaultName}-diagnostics'
//   scope: keyVault
//   properties: {
//     logs: [
//       {
//         categoryGroup: 'allLogs'
//         enabled: true
//         retentionPolicy: {
//           enabled: true
//           days: 30
//         }
//       }
//     ]
//     metrics: [
//       {
//         category: 'AllMetrics'
//         enabled: true
//         retentionPolicy: {
//           enabled: true
//           days: 30
//         }
//       }
//     ]
//     // Remove specific workspace reference - let Azure handle this automatically
//   }
// }

// Sample secrets (these would typically be set via deployment scripts or manually)
resource azureOpenAIKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-openai-api-key'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource azureOpenAIEndpointSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-openai-endpoint'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource supabaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'supabase-url'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource supabaseAnonKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'supabase-anon-key'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource azureAdClientSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'azure-ad-client-secret'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Sentry configuration secrets
resource sentryDsnSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sentry-dsn'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource sentryAuthTokenSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'sentry-auth-token'
  properties: {
    value: 'PLACEHOLDER_VALUE' // This should be set via deployment script
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Clerk authentication configuration secrets (only created if values are provided)
resource clerkPublishableKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(clerkPublishableKey)) {
  parent: keyVault
  name: 'clerk-publishable-key'
  properties: {
    value: clerkPublishableKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

resource clerkSecretKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(clerkSecretKey)) {
  parent: keyVault
  name: 'clerk-secret-key'
  properties: {
    value: clerkSecretKey
    contentType: 'text/plain'
    attributes: {
      enabled: true
    }
  }
}

// Private endpoint for Key Vault (commented out - requires VNet setup)
// resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = if (!publicNetworkAccess) {
//   name: '${keyVaultName}-pe'
//   location: location
//   tags: tags
//   properties: {
//     subnet: {
//       id: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.Network/virtualNetworks/default-vnet/subnets/default-subnet'
//     }
//     privateLinkServiceConnections: [
//       {
//         name: '${keyVaultName}-pe-connection'
//         properties: {
//           privateLinkServiceId: keyVault.id
//           groupIds: [
//             'vault'
//           ]
//         }
//       }
//     ]
//   }
// }

// Outputs
output keyVaultId string = keyVault.id
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output keyVaultResourceId string = keyVault.id
