// Azure Container Registry for storing Docker images
@description('The name of the container registry')
param registryName string

@description('The location for the container registry')
param location string = resourceGroup().location

@description('Tags to apply to the container registry')
param tags object = {}

@description('The SKU for the container registry')
@allowed(['Basic', 'Standard', 'Premium'])
param sku string = 'Basic'

@description('Enable admin user for the registry')
param adminUserEnabled bool = true

@description('Enable public network access')
param publicNetworkAccess bool = true

@description('Enable zone redundancy (Premium SKU only)')
param zoneRedundancy bool = false

@description('Webhook service URI (optional)')
@secure()
param webhookServiceUri string = ''

// Container Registry
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: registryName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  properties: {
    adminUserEnabled: adminUserEnabled
    policies: {
      quarantinePolicy: {
        status: 'disabled'
      }
      trustPolicy: {
        type: 'Notary'
        status: 'disabled'
      }
      retentionPolicy: {
        days: 7
        status: 'disabled'
      }
      exportPolicy: {
        status: 'enabled'
      }
    }
    encryption: {
      status: 'disabled'
    }
    dataEndpointEnabled: false
    publicNetworkAccess: publicNetworkAccess ? 'Enabled' : 'Disabled'
    networkRuleBypassOptions: 'AzureServices'
    zoneRedundancy: (sku == 'Premium') ? (zoneRedundancy ? 'Enabled' : 'Disabled') : 'Disabled'
  }
}

// Webhook for automated deployments (optional)
resource deploymentWebhook 'Microsoft.ContainerRegistry/registries/webhooks@2023-07-01' = if (!empty(webhookServiceUri)) {
  parent: containerRegistry
  name: 'deploymentWebhook'
  location: location
  properties: {
    serviceUri: webhookServiceUri
    customHeaders: {}
    status: 'enabled'
    scope: '${registryName}:*'
    actions: [
      'push'
    ]
  }
}

// Scope map for fine-grained access control (Premium SKU only)
resource scopeMap 'Microsoft.ContainerRegistry/registries/scopeMaps@2023-07-01' = if (sku == 'Premium') {
  parent: containerRegistry
  name: 'pixelated-scope-map'
  properties: {
    description: 'Scope map for Pixelated application repositories'
    actions: [
      'repositories/pixelated-app/content/read'
      'repositories/pixelated-app/content/write'
      'repositories/pixelated-app/metadata/read'
      'repositories/pixelated-app/metadata/write'
    ]
  }
}

// Token for programmatic access (Premium SKU only)
resource accessToken 'Microsoft.ContainerRegistry/registries/tokens@2023-07-01' = if (sku == 'Premium') {
  parent: containerRegistry
  name: 'pixelated-token'
  properties: {
    scopeMapId: sku == 'Premium' ? scopeMap.id : null
    status: 'enabled'
  }
}

// Replication for geo-redundancy (Premium SKU only)
resource replication 'Microsoft.ContainerRegistry/registries/replications@2023-07-01' = if (sku == 'Premium' && location != 'westus2') {
  parent: containerRegistry
  name: 'westus2'
  location: 'westus2'
  properties: {
    zoneRedundancy: zoneRedundancy ? 'Enabled' : 'Disabled'
  }
}

// Private endpoint (Premium SKU only) - commented out until VNet is properly configured
// resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-05-01' = if (sku == 'Premium' && !publicNetworkAccess) {
//   name: '${registryName}-pe'
//   location: location
//   tags: tags
//   properties: {
//     subnet: {
//       id: '/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.Network/virtualNetworks/default-vnet/subnets/default-subnet'
//     }
//     privateLinkServiceConnections: [
//       {
//         name: '${registryName}-pe-connection'
//         properties: {
//           privateLinkServiceId: containerRegistry.id
//           groupIds: [
//             'registry'
//           ]
//         }
//       }
//     ]
//   }
// }

// Outputs
output registryId string = containerRegistry.id
output registryName string = containerRegistry.name
output loginServer string = containerRegistry.properties.loginServer
output scopeMapId string = sku == 'Premium' ? scopeMap.id : ''
output tokenId string = sku == 'Premium' ? accessToken.id : ''
