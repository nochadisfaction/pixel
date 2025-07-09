@description('The name of the Key Vault')
param keyVaultName string

@description('The resource ID of the Key Vault')
param keyVaultResourceId string

@description('The principal ID of the managed identity to assign the role to')
param principalId string

// Role assignment for Key Vault Secrets User role
resource keyVaultSecretsUserRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  scope: subscription()
  name: '02000000-0000-0000-0000-000000000003' // Role Definition ID for "Key Vault Secrets User"
}

resource keyVaultSecretsUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVaultName, principalId, keyVaultSecretsUserRoleDefinition.id)
  scope: keyVaultResourceId
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinition.id
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
} 