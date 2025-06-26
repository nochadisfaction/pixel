// Azure Monitor Alert Rules for Pixelated Application
@description('The name of the Application Insights instance')
param appInsightsName string

@description('The resource ID of the Application Insights instance')
param appInsightsResourceId string

@description('The location for the alert rules')
param location string = 'global'

@description('Tags to apply to the alert rules')
param tags object = {}

@description('Action group resource ID for notifications')
param actionGroupResourceId string = ''

@description('Enable alerts')
param enableAlerts bool = true

// High Error Rate Alert
resource highErrorRateAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlerts) {
  name: '${appInsightsName}-high-error-rate'
  location: location
  tags: tags
  properties: {
    description: 'Alert when error rate exceeds 5% over 15 minutes'
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId
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
          threshold: 5
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    autoMitigate: true
    targetResourceType: 'Microsoft.Insights/components'
    targetResourceRegion: location
    actions: !empty(actionGroupResourceId) ? [
      {
        actionGroupId: actionGroupResourceId
      }
    ] : []
  }
}

// Slow Response Time Alert
resource slowResponseAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (enableAlerts) {
  name: '${appInsightsName}-slow-response'
  location: location
  tags: tags
  properties: {
    description: 'Alert when average response time exceeds 5 seconds'
    severity: 3
    enabled: true
    scopes: [
      appInsightsResourceId
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
    actions: !empty(actionGroupResourceId) ? [
      {
        actionGroupId: actionGroupResourceId
      }
    ] : []
  }
}

// Exception Rate Alert
resource exceptionRateAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-exception-rate'
  location: location
  tags: tags
  properties: {
    description: 'Alert when exception rate is high'
    severity: 1
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'exceptions | where timestamp > ago(15m) | summarize count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 10
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// AI Service Failure Alert
resource aiServiceFailureAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-ai-service-failure'
  location: location
  tags: tags
  properties: {
    description: 'Alert when AI service requests are failing'
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'customEvents | where timestamp > ago(15m) | where name == "ai_service_usage" | where customDimensions.success == "false" | summarize count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// High Token Usage Alert
resource highTokenUsageAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-high-token-usage'
  location: location
  tags: tags
  properties: {
    description: 'Alert when AI token usage is unusually high'
    severity: 3
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT1H'
    criteria: {
      allOf: [
        {
          query: 'customEvents | where timestamp > ago(1h) | where name == "ai_service_usage" | summarize TotalTokens = sum(toint(customMeasurements.tokens)) | where TotalTokens > 100000'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 0
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// Authentication Failure Alert
resource authFailureAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-auth-failure'
  location: location
  tags: tags
  properties: {
    description: 'Alert when authentication failures are high'
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'requests | where timestamp > ago(15m) | where url contains "/api/auth/" | where resultCode startswith "4" | summarize count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'GreaterThan'
          threshold: 10
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// Dependency Failure Alert
resource dependencyFailureAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-dependency-failure'
  location: location
  tags: tags
  properties: {
    description: 'Alert when external dependencies are failing'
    severity: 2
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'dependencies | where timestamp > ago(15m) | where success == false | summarize count() by type'
          timeAggregation: 'Count'
          dimensions: [
            {
              name: 'type'
              operator: 'Include'
              values: ['*']
            }
          ]
          operator: 'GreaterThan'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// Low Request Volume Alert (potential downtime)
resource lowRequestVolumeAlert 'Microsoft.Insights/scheduledQueryRules@2021-08-01' = if (enableAlerts) {
  name: '${appInsightsName}-low-request-volume'
  location: location
  tags: tags
  properties: {
    description: 'Alert when request volume is unusually low (potential downtime)'
    severity: 1
    enabled: true
    scopes: [
      appInsightsResourceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      allOf: [
        {
          query: 'requests | where timestamp > ago(15m) | summarize count()'
          timeAggregation: 'Count'
          dimensions: []
          operator: 'LessThan'
          threshold: 5
          failingPeriods: {
            numberOfEvaluationPeriods: 3
            minFailingPeriodsToAlert: 3
          }
        }
      ]
    }
    autoMitigate: true
    actions: !empty(actionGroupResourceId) ? {
      actionGroups: [
        actionGroupResourceId
      ]
    } : {}
  }
}

// Outputs
output alertRuleIds array = enableAlerts ? [
  highErrorRateAlert.id
  slowResponseAlert.id
  exceptionRateAlert.id
  aiServiceFailureAlert.id
  highTokenUsageAlert.id
  authFailureAlert.id
  dependencyFailureAlert.id
  lowRequestVolumeAlert.id
] : []
