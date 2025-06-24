/**
 * WebSocket API endpoint for real-time bias alerts
 * 
 * This endpoint establishes WebSocket connections for real-time
 * bias detection alerts and dashboard updates.
 */

import type { APIRoute } from 'astro';
import { BiasWebSocketServer } from '../../../lib/services/websocket/BiasWebSocketServer';
import { getLogger } from '../../../lib/utils/logger';

const logger = getLogger('BiasAlertsWebSocketAPI');

// Singleton WebSocket server instance
let wsServer: BiasWebSocketServer | null = null;

const wsConfig = {
  port: parseInt(process.env.WS_PORT || '8080'),
  heartbeatInterval: 30000, // 30 seconds
  maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '1000'),
  authRequired: process.env.WS_AUTH_REQUIRED === 'true',
  corsOrigins: process.env.WS_CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4321'],
  rateLimitConfig: {
    maxMessagesPerMinute: parseInt(process.env.WS_RATE_LIMIT || '60'),
    banDurationMs: parseInt(process.env.WS_BAN_DURATION || '300000') // 5 minutes
  }
};

/**
 * Initialize WebSocket server if not already running
 */
async function initializeWebSocketServer(): Promise<BiasWebSocketServer> {
  if (!wsServer) {
    wsServer = new BiasWebSocketServer(wsConfig);
    
    try {
      await wsServer.start();
      logger.info('WebSocket server initialized successfully', {
        port: wsConfig.port,
        maxConnections: wsConfig.maxConnections
      });
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { error });
      throw error;
    }
  }
  
  return wsServer;
}

/**
 * Get WebSocket server status
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const server = await initializeWebSocketServer();
    const status = server.getStatus();
    const clients = server.getClients();

    return new Response(JSON.stringify({
      success: true,
      data: {
        status,
        clients: clients.map(client => ({
          id: client.id,
          isAuthenticated: client.isAuthenticated,
          subscriptions: client.subscriptions,
          connectedSince: client.connectedSince
        })),
        config: {
          port: wsConfig.port,
          heartbeatInterval: wsConfig.heartbeatInterval,
          maxConnections: wsConfig.maxConnections,
          authRequired: wsConfig.authRequired
        }
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    logger.error('Failed to get WebSocket server status', { error });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get WebSocket server status',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * Send test bias alert (for development/testing)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { type = 'test', level = 'medium', message, sessionId } = body;

    const server = await initializeWebSocketServer();

    // Create test alert
    const testAlert = {
      alertId: `test_${Date.now()}`,
      type,
      level,
      message: message || `Test bias alert - ${level} level`,
      timestamp: new Date(),
      sessionId: sessionId || `test_session_${Date.now()}`,
      details: {
        test: true,
        generatedBy: 'API',
        requestId: crypto.randomUUID()
      }
    };

    // Create test analysis result
    const testAnalysisResult = {
      sessionId: testAlert.sessionId,
      timestamp: new Date(),
      overallBiasScore: Math.random() * 0.5 + (level === 'critical' ? 0.8 : level === 'high' ? 0.6 : 0.3),
      alertLevel: level,
      confidenceScore: Math.random() * 0.3 + 0.7,
      layerResults: [
        {
          layer: 'preprocessing',
          biasScore: Math.random() * 0.4 + 0.2,
          details: { test: true }
        }
      ],
      recommendations: [`Test recommendation for ${level} bias alert`]
    };

    // Broadcast the test alert
    await server.broadcastBiasAlert(testAlert, testAnalysisResult);

    logger.info('Test bias alert sent', {
      alertId: testAlert.alertId,
      level: testAlert.level,
      sessionId: testAlert.sessionId
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        alert: testAlert,
        analysisResult: testAnalysisResult,
        broadcastStatus: 'sent'
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Failed to send test bias alert', { error });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to send test bias alert',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * Update WebSocket server configuration
 */
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action } = body;

    const server = await initializeWebSocketServer();

    switch (action) {
      case 'restart':
        await server.stop();
        await server.start();
        logger.info('WebSocket server restarted');
        break;
        
      case 'status':
        // Just return current status
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const status = server.getStatus();

    return new Response(JSON.stringify({
      success: true,
      data: {
        action,
        status,
        message: `Action '${action}' completed successfully`
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Failed to update WebSocket server', { error });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update WebSocket server',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * Gracefully shutdown WebSocket server
 */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    if (wsServer) {
      await wsServer.stop();
      wsServer = null;
      logger.info('WebSocket server stopped');
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        message: 'WebSocket server stopped successfully'
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Failed to stop WebSocket server', { error });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to stop WebSocket server',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// Export the WebSocket server instance for use by other modules
export function getWebSocketServer(): BiasWebSocketServer | null {
  return wsServer;
}

// Initialize server on module load in production
if (process.env.NODE_ENV === 'production' && process.env.WS_AUTO_START === 'true') {
  initializeWebSocketServer().catch((error) => {
    logger.error('Failed to auto-start WebSocket server', { error });
  });
} 