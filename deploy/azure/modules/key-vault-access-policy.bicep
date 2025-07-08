// Key Vault Access Policy module for adding App Service managed identity access
@description('The name of the Key Vault')
param keyVaultName string

@description('App Service managed identity principal ID for Key Vault access')
param appServiceManagedIdentityPrincipalId string

// Reference existing Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Access policy for App Service managed identity
resource appServiceAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  parent: keyVault
  name: 'add'
  properties: {
    accessPolicies: [
      {
        objectId: appServiceManagedIdentityPrincipalId
        tenantId: tenant().tenantId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// Outputs
output accessPolicyAdded bool = true
