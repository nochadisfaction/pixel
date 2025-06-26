// Application Insights and Log Analytics for monitoring
@description('The name of the Application Insights instance')
param appInsightsName string

@description('The name of the Log Analytics workspace')
param logAnalyticsName string

@description('The location for the monitoring resources')
param location string = resourceGroup().location

@description('Tags to apply to the monitoring resources')
param tags object = {}

@description('The retention period in days for Log Analytics')
@minValue(30)
@maxValue(730)
param retentionInDays int = 90

@description('The pricing tier for Log Analytics')
@allowed(['Free', 'Standalone', 'PerNode', 'PerGB2018'])
param logAnalyticsSku string = 'PerGB2018'

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: logAnalyticsSku
    }
    retentionInDays: retentionInDays
    features: {
      searchVersion: 1
      legacy: 0
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    workspaceCapping: {
      dailyQuotaGb: -1
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Redfield'
    Request_Source: 'IbizaWebAppExtensionCreate'
    RetentionInDays: retentionInDays
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Alert Rules for critical metrics
resource highErrorRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${appInsightsName}-high-error-rate'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when error rate is high'
    severity: 2
    enabled: true
    scopes: [
      applicationInsights.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HighErrorRate'
          metricName: 'requests/failed'
          metricNamespace: 'Microsoft.Insights/components'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    targetResourceType: 'Microsoft.Insights/components'
    targetResourceRegion: location
    actions: []
  }
}

resource slowResponseAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${appInsightsName}-slow-response'
  location: 'global'
  tags: tags
  properties: {
    description: 'Alert when response time is slow'
    severity: 3
    enabled: true
    scopes: [
      applicationInsights.id
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'SlowResponse'
          metricName: 'requests/duration'
          metricNamespace: 'Microsoft.Insights/components'
          operator: 'GreaterThan'
          threshold: 5000
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    targetResourceType: 'Microsoft.Insights/components'
    targetResourceRegion: location
    actions: []
  }
}

// Workbook for custom dashboard
resource customWorkbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid('${appInsightsName}-workbook')
  location: location
  tags: tags
  kind: 'shared'
  properties: {
    displayName: '${appInsightsName} Dashboard'
    serializedData: '''
{
  "version": "Notebook/1.0",
  "items": [
    {
      "type": 1,
      "content": {
        "json": "# Pixelated Empathy Application Dashboard\\n\\nThis dashboard provides an overview of your application's performance and health."
      },
      "name": "text - 0"
    },
    {
      "type": 10,
      "content": {
        "chartId": "workbook-chart-1",
        "version": "MetricsItem/2.0",
        "size": 0,
        "chartType": 2,
        "resourceType": "microsoft.insights/components",
        "metricScope": 0,
        "resourceIds": [
          "{applicationInsightsId}"
        ],
        "timeContext": {
          "durationMs": 3600000
        },
        "metrics": [
          {
            "namespace": "microsoft.insights/components",
            "metric": "microsoft.insights/components-Requests-requests/count",
            "aggregation": 7
          }
        ],
        "title": "Request Count",
        "gridSettings": {
          "rowLimit": 10000
        }
      },
      "name": "metrics - 1"
    }
  ],
  "isLocked": false,
  "fallbackResourceIds": [
    "{applicationInsightsId}"
  ]
}
'''
    category: 'workbook'
    sourceId: applicationInsights.id
  }
}

// Outputs
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output logAnalyticsWorkspaceName string = logAnalyticsWorkspace.name
output appInsightsId string = applicationInsights.id
output appInsightsName string = applicationInsights.name
output instrumentationKey string = applicationInsights.properties.InstrumentationKey
output connectionString string = applicationInsights.properties.ConnectionString
output workbookId string = customWorkbook.id
