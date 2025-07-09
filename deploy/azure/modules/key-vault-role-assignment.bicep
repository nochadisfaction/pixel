@description('The name of the Key Vault')
param keyVaultName string

@description('The resource ID of the Key Vault')
param keyVaultResourceId string

@description('The principal ID of the managed identity to assign the role to')
param principalId string

// Role assignment for Key Vault Secrets User role
var keyVaultSecretsUserRoleDefinitionId = resourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')

resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource keyVaultSecretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, principalId, keyVaultSecretsUserRoleDefinitionId)
  scope: existingKeyVault
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
} 
