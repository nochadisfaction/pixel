// Azure OpenAI Service
@description('The name of the Azure OpenAI service')
param openaiName string

@description('The location for the Azure OpenAI service')
param location string = 'eastus'

@description('Tags to apply to the Azure OpenAI service')
param tags object = {}

@description('The pricing tier for Azure OpenAI')
@allowed(['S0'])
param sku string = 'S0'

@description('Enable public network access')
param publicNetworkAccess bool = true

// Azure OpenAI Service
resource openaiService 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openaiName
  location: location
  tags: tags
  sku: {
    name: sku
  }
  kind: 'OpenAI'
  properties: {
    apiProperties: {
      statisticsEnabled: false
    }
    customSubDomainName: openaiName
    networkAcls: {
      defaultAction: publicNetworkAccess ? 'Allow' : 'Deny'
      virtualNetworkRules: []
      ipRules: []
    }
    publicNetworkAccess: publicNetworkAccess ? 'Enabled' : 'Disabled'
    disableLocalAuth: false
  }
}

// GPT-4 Deployment
resource gpt4Deployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiService
  name: 'gpt-4'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4'
      version: '0613'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'Standard'
    capacity: 10
  }
}

// GPT-3.5 Turbo Deployment (fallback)
resource gpt35Deployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiService
  name: 'gpt-35-turbo'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-35-turbo'
      version: '0613'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'Standard'
    capacity: 120
  }
  dependsOn: [
    gpt4Deployment
  ]
}

// Text Embedding Deployment
resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openaiService
  name: 'text-embedding-ada-002'
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-ada-002'
      version: '2'
    }
    raiPolicyName: 'Microsoft.Default'
  }
  sku: {
    name: 'Standard'
    capacity: 120
  }
  dependsOn: [
    gpt35Deployment
  ]
}

// Outputs
output openaiServiceId string = openaiService.id
output openaiServiceName string = openaiService.name
output endpoint string = openaiService.properties.endpoint
output gpt4DeploymentName string = gpt4Deployment.name
output gpt35DeploymentName string = gpt35Deployment.name
output embeddingDeploymentName string = embeddingDeployment.name
output apiVersion string = '2024-02-01'
