/**
 * MSW Request Handlers for API Mocking
 * These handlers mock the API endpoints used by the BiasDashboard component
 */

import { http, HttpResponse } from 'msw'

// Mock data for bias detection dashboard
const mockDashboardData = {
  summary: {
    totalSessions: 100,
    averageBiasScore: 0.3,
    alertsLast24h: 10,
    criticalIssues: 5,
    improvementRate: 0.15,
    complianceScore: 0.85,
  },
  recentAnalyses: [
    {
      sessionId: 'session-1',
      timestamp: new Date().toISOString(),
      overallBiasScore: 0.3,
      alertLevel: 'medium',
    },
  ],
  alerts: [
    {
      alertId: 'alert-1',
      type: 'high_bias',
      message: 'High bias detected',
      timestamp: new Date().toISOString(),
      level: 'high',
      sessionId: 'session-1',
      acknowledged: false,
    },
  ],
  trends: [
    {
      date: new Date().toISOString(),
      biasScore: 0.3,
      sessionCount: 10,
      alertCount: 2,
    },
  ],
  demographics: {
    age: {
      '18-24': 20,
      '25-34': 30,
      '35-44': 25,
      '45+': 25,
    },
    gender: {
      male: 45,
      female: 50,
      other: 5,
    },
    ethnicity: {
      asian: 20,
      black: 15,
      hispanic: 25,
      white: 35,
      other: 5,
    },
    intersectional: [],
  },
  recommendations: [
    {
      id: 'rec-1',
      priority: 'high',
      title: 'Improve data diversity',
      description: 'Consider expanding training data to include more diverse demographics',
      action: 'Review and expand training datasets',
      estimatedImpact: 'High - could reduce bias by 20%',
    },
  ],
}

export const handlers = [
  // Get dashboard data
  http.get('/api/bias-detection/dashboard', () => {
    return HttpResponse.json(mockDashboardData)
  }),

  // Export data
  http.get('/api/bias-detection/export', ({ request }) => {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    
    if (format === 'json') {
      return HttpResponse.json(mockDashboardData)
    } else if (format === 'csv') {
      return new HttpResponse('test,data\n1,2', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="bias-detection-data.csv"',
        },
      })
    } else if (format === 'pdf') {
      return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="bias-detection-report.pdf"',
        },
      })
    }

    return new HttpResponse('Invalid format', { status: 400 })
  }),

  // Export data with POST request and filters
  http.post('/api/bias-detection/export', async ({ request }) => {
    const body = await request.json() as { format?: string; filters?: { timeRange?: string } }
    const { format = 'json', filters } = body

    // Simulate filtering logic
    const filteredData = { ...mockDashboardData }
    if (filters?.timeRange && filters.timeRange !== '24h') {
      // Simulate different data for different time ranges
      filteredData.summary.totalSessions = 200
    }

    if (format === 'json') {
      return HttpResponse.json(filteredData)
    } else if (format === 'csv') {
      return new HttpResponse('test,data\n1,2', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="bias-detection-data.csv"',
        },
      })
    } else if (format === 'pdf') {
      return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="bias-detection-report.pdf"',
        },
      })
    }

    return new HttpResponse('Invalid format', { status: 400 })
  }),

  // Update alert acknowledgment
  http.patch('/api/bias-detection/alerts/:alertId', async ({ params, request }) => {
    const alertId = params['alertId'] as string
    const body = await request.json() as { acknowledged: boolean }
    
    return HttpResponse.json({
      alertId,
      acknowledged: body.acknowledged,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Bulk alert operations
  http.post('/api/bias-detection/alerts/bulk', async ({ request }) => {
    const body = await request.json() as { action: string; alertIds: string[] }
    const { action, alertIds } = body
    
    return HttpResponse.json({
      action,
      alertIds,
      processedCount: alertIds.length,
      timestamp: new Date().toISOString(),
    })
  }),

  // Add alert notes
  http.post('/api/bias-detection/alerts/:alertId/notes', async ({ params, request }) => {
    const alertId = params['alertId'] as string
    const body = await request.json() as { note: string }
    
    return HttpResponse.json({
      alertId,
      note: body.note,
      timestamp: new Date().toISOString(),
    })
  }),

  // Get alert history
  http.get('/api/bias-detection/alerts/:alertId/history', ({ params }) => {
    const alertId = params['alertId'] as string
    
    return HttpResponse.json([
      {
        id: 'history-1',
        alertId,
        action: 'acknowledged',
        timestamp: new Date().toISOString(),
        userId: 'user-1',
      },
    ])
  }),

  // Notification settings
  http.get('/api/bias-detection/notifications/settings', () => {
    return HttpResponse.json({
      emailNotifications: true,
      smsNotifications: false,
      criticalAlerts: true,
      highAlerts: true,
      mediumAlerts: false,
      lowAlerts: false,
    })
  }),

  http.patch('/api/bias-detection/notifications/settings', async ({ request }) => {
    const body = await request.json() as Record<string, boolean>
    
    return HttpResponse.json({
      ...body,
      updatedAt: new Date().toISOString(),
    })
  }),

  // Send test notification
  http.post('/api/bias-detection/notifications/test', () => {
    return HttpResponse.json({
      success: true,
      message: 'Test notification sent successfully!',
    })
  }),

  // WebSocket connection endpoint (for testing purposes)
  http.get('/api/bias-detection/ws', () => {
    return new HttpResponse('WebSocket endpoint', { status: 200 })
  }),

  // Error simulation handlers
  http.get('/api/bias-detection/dashboard-error', () => {
    return new HttpResponse('Internal Server Error', { status: 500 })
  }),

  // Delay simulation handler
  http.get('/api/bias-detection/dashboard-slow', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return HttpResponse.json(mockDashboardData)
  }),
]

// Export mock data for direct use in tests
export { mockDashboardData }
