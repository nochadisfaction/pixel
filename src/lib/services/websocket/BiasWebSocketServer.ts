/**
 * Real-time Bias Detection WebSocket Server
 * 
 * Provides real-time communication for bias alerts, dashboard updates,
 * and system monitoring for the Pixelated Empathy platform.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getLogger } from '../../utils/logger';
import type { 
  BiasAlert, 
  BiasAnalysisResult, 
  BiasDashboardData,
  WebSocketMessage,
  BiasAlertWebSocketEvent,
  DashboardUpdateWebSocketEvent,
  SystemStatusWebSocketEvent,
  AnalysisCompleteWebSocketEvent
} from '../../ai/bias-detection/types';

const logger = getLogger('BiasWebSocketServer');

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  filters: {
    timeRange?: string;
    biasScoreFilter?: string;
    alertLevelFilter?: string;
    demographicFilter?: string;
  };
  lastPing: Date;
  isAuthenticated: boolean;
  userId?: string;
  ipAddress: string;
  userAgent: string;
}

export interface WebSocketServerConfig {
  port: number;
  heartbeatInterval: number; // milliseconds
  maxConnections: number;
  authRequired: boolean;
  corsOrigins: string[];
  rateLimitConfig: {
    maxMessagesPerMinute: number;
    banDurationMs: number;
  };
}

export class BiasWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private isRunning = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private bannedIPs: Map<string, Date> = new Map();
  private messageRateLimits: Map<string, Array<Date>> = new Map();
  
  constructor(private config: WebSocketServerConfig) {}

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('WebSocket server is already running');
      return;
    }

    try {
      this.wss = new WebSocketServer({
        port: this.config.port,
        verifyClient: (info) => this.verifyClient(info)
      });

      this.wss.on('connection', (ws, request) => {
        this.handleConnection(ws, request);
      });

      this.wss.on('error', (error) => {
        logger.error('WebSocket server error', { error });
      });

      this.startHeartbeat();
      this.startMetricsCollection();
      
      this.isRunning = true;
      logger.info('Bias WebSocket server started', { 
        port: this.config.port,
        maxConnections: this.config.maxConnections
      });

    } catch (error) {
      logger.error('Failed to start WebSocket server', { error });
      throw error;
    }
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('WebSocket server is not running');
      return;
    }

    try {
      // Clean up intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = undefined;
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = undefined;
      }

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        try {
          client.ws.close(1001, 'Server shutting down');
        } catch (error) {
          logger.warn('Error closing client connection', { clientId, error });
        }
      }

      this.clients.clear();

      // Close the server
      if (this.wss) {
        await new Promise<void>((resolve, reject) => {
          this.wss!.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        this.wss = null;
      }

      this.isRunning = false;
      logger.info('Bias WebSocket server stopped successfully');

    } catch (error) {
      logger.error('Error stopping WebSocket server', { error });
      throw error;
    }
  }

  /**
   * Verify client connection
   */
  private verifyClient(info: any): boolean {
    const origin = info.origin;
    const ipAddress = info.req.socket.remoteAddress || 'unknown';

    // Check if IP is banned
    if (this.bannedIPs.has(ipAddress)) {
      const banExpiry = this.bannedIPs.get(ipAddress)!;
      if (banExpiry > new Date()) {
        logger.warn('Rejected connection from banned IP', { ipAddress });
        return false;
      } else {
        this.bannedIPs.delete(ipAddress);
      }
    }

    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      logger.warn('Rejected connection due to max connections limit', {
        currentConnections: this.clients.size,
        maxConnections: this.config.maxConnections,
        ipAddress
      });
      return false;
    }

    // Check CORS origins
    if (this.config.corsOrigins.length > 0) {
      if (!origin || !this.config.corsOrigins.includes(origin)) {
        logger.warn('Rejected connection due to CORS policy', { origin, ipAddress });
        return false;
      }
    }

    return true;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    const ipAddress = request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      filters: {},
      lastPing: new Date(),
      isAuthenticated: !this.config.authRequired,
      ipAddress,
      userAgent
    };

    this.clients.set(clientId, client);

    logger.info('New WebSocket connection', {
      clientId,
      ipAddress,
      userAgent,
      totalConnections: this.clients.size
    });

    // Set up message handler
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    // Set up close handler
    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    // Set up error handler
    ws.on('error', (error) => {
      logger.error('WebSocket client error', { clientId, error });
      this.handleDisconnection(clientId, 1011, 'Internal error');
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_status',
      timestamp: new Date(),
      data: {
        status: 'connected',
        clientId,
        authRequired: this.config.authRequired,
        heartbeatInterval: this.config.heartbeatInterval
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(clientId)) {
      this.banClient(clientId, 'Rate limit exceeded');
      return;
    }

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;

        case 'update_subscription':
          this.handleSubscriptionUpdate(clientId, message);
          break;

        case 'heartbeat':
          this.handleHeartbeat(clientId);
          break;

        case 'heartbeat_response':
          client.lastPing = new Date();
          break;

        case 'authenticate':
          this.handleAuthentication(clientId, message);
          break;

        case 'get_dashboard_data':
          this.handleDashboardDataRequest(clientId, message);
          break;

        default:
          logger.warn('Unknown message type', { clientId, type: message.type });
      }

    } catch (error) {
      logger.error('Error parsing WebSocket message', { clientId, error });
      this.sendErrorToClient(clientId, 'Invalid message format');
    }
  }

  /**
   * Handle client subscription
   */
  private handleSubscription(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!client.isAuthenticated && this.config.authRequired) {
      this.sendErrorToClient(clientId, 'Authentication required');
      return;
    }

    const channels = message.channels || [];
    const filters = message.filters || {};

    for (const channel of channels) {
      client.subscriptions.add(channel);
    }

    client.filters = { ...client.filters, ...filters };

    logger.info('Client subscribed to channels', {
      clientId,
      channels,
      filters,
      totalSubscriptions: client.subscriptions.size
    });

    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      timestamp: new Date(),
      data: {
        channels: Array.from(client.subscriptions),
        filters: client.filters
      }
    });
  }

  /**
   * Handle client unsubscription
   */
  private handleUnsubscription(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const channels = message.channels || [];

    for (const channel of channels) {
      client.subscriptions.delete(channel);
    }

    logger.info('Client unsubscribed from channels', {
      clientId,
      channels,
      remainingSubscriptions: client.subscriptions.size
    });

    this.sendToClient(clientId, {
      type: 'unsubscription_confirmed',
      timestamp: new Date(),
      data: {
        channels,
        remainingChannels: Array.from(client.subscriptions)
      }
    });
  }

  /**
   * Handle subscription update
   */
  private handleSubscriptionUpdate(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const filters = message.filters || {};
    client.filters = { ...client.filters, ...filters };

    logger.debug('Client updated subscription filters', {
      clientId,
      filters: client.filters
    });

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      timestamp: new Date(),
      data: {
        filters: client.filters
      }
    });
  }

  /**
   * Handle heartbeat
   */
  private handleHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = new Date();

    this.sendToClient(clientId, {
      type: 'heartbeat_response',
      timestamp: new Date(),
      data: {}
    });
  }

  /**
   * Handle authentication
   */
  private handleAuthentication(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In a real implementation, this would validate the token/credentials
    const token = message.token;
    const userId = message.userId;

    if (this.validateAuthToken(token, userId)) {
      client.isAuthenticated = true;
      client.userId = userId;

      logger.info('Client authenticated successfully', { clientId, userId });

      this.sendToClient(clientId, {
        type: 'authentication_success',
        timestamp: new Date(),
        data: {
          userId,
          permissions: this.getUserPermissions(userId)
        }
      });
    } else {
      logger.warn('Client authentication failed', { clientId, userId });

      this.sendToClient(clientId, {
        type: 'authentication_failed',
        timestamp: new Date(),
        data: {
          error: 'Invalid credentials'
        }
      });
    }
  }

  /**
   * Handle dashboard data request
   */
  private async handleDashboardDataRequest(clientId: string, message: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendErrorToClient(clientId, 'Authentication required');
      return;
    }

    try {
      // This would typically fetch data from the BiasDetectionEngine
      const dashboardData = await this.getDashboardData(message.filters);

      this.sendToClient(clientId, {
        type: 'dashboard_data',
        timestamp: new Date(),
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error fetching dashboard data', { clientId, error });
      this.sendErrorToClient(clientId, 'Failed to fetch dashboard data');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string, code: number, reason: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      logger.info('WebSocket client disconnected', {
        clientId,
        code,
        reason: reason.toString(),
        connectionDuration: Date.now() - client.lastPing.getTime(),
        subscriptions: Array.from(client.subscriptions)
      });

      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast bias alert to subscribed clients
   */
  async broadcastBiasAlert(alert: BiasAlert, analysisResult: BiasAnalysisResult): Promise<void> {
    const alertEvent: BiasAlertWebSocketEvent = {
      type: 'bias-alert',
      timestamp: new Date(),
      sessionId: analysisResult.sessionId,
      data: {
        alert,
        analysisResult,
        requiresImmediateAction: alert.level === 'critical' || alert.level === 'high'
      }
    };

    await this.broadcastToSubscribers('bias_alerts', alertEvent, (client) => {
      return this.shouldReceiveAlert(client, alert);
    });

    logger.info('Broadcast bias alert to clients', {
      alertId: alert.alertId,
      level: alert.level,
      recipientCount: this.getSubscriberCount('bias_alerts')
    });
  }

  /**
   * Broadcast dashboard update to subscribed clients
   */
  async broadcastDashboardUpdate(dashboardData: BiasDashboardData): Promise<void> {
    const updateEvent: DashboardUpdateWebSocketEvent = {
      type: 'dashboard-update',
      timestamp: new Date(),
      data: {
        summary: dashboardData.summary,
        newAlerts: dashboardData.alerts?.slice(0, 5) || [],
        updatedTrends: dashboardData.trends?.slice(-10) || []
      }
    };

    await this.broadcastToSubscribers('dashboard_updates', updateEvent);

    logger.debug('Broadcast dashboard update to clients', {
      recipientCount: this.getSubscriberCount('dashboard_updates')
    });
  }

  /**
   * Broadcast system status to subscribed clients
   */
  async broadcastSystemStatus(status: any): Promise<void> {
    const statusEvent: SystemStatusWebSocketEvent = {
      type: 'system-status',
      timestamp: new Date(),
      data: {
        status,
        changedServices: this.getChangedServices(status)
      }
    };

    await this.broadcastToSubscribers('system_status', statusEvent);

    logger.debug('Broadcast system status to clients', {
      status: status.status,
      recipientCount: this.getSubscriberCount('system_status')
    });
  }

  /**
   * Broadcast analysis completion to subscribed clients
   */
  async broadcastAnalysisComplete(analysisResult: BiasAnalysisResult, processingTime: number): Promise<void> {
    const completeEvent: AnalysisCompleteWebSocketEvent = {
      type: 'analysis-complete',
      timestamp: new Date(),
      sessionId: analysisResult.sessionId,
      data: {
        sessionId: analysisResult.sessionId,
        result: analysisResult,
        processingTime
      }
    };

    await this.broadcastToSubscribers('analysis_complete', completeEvent);

    logger.debug('Broadcast analysis completion to clients', {
      sessionId: analysisResult.sessionId,
      processingTime,
      recipientCount: this.getSubscriberCount('analysis_complete')
    });
  }

  /**
   * Broadcast message to subscribers of a specific channel
   */
  private async broadcastToSubscribers(
    channel: string, 
    message: WebSocketMessage,
    filter?: (client: WebSocketClient) => boolean
  ): Promise<void> {
    const recipients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.has(channel) && client.isAuthenticated) {
        if (!filter || filter(client)) {
          try {
            this.sendToClient(clientId, message);
            recipients.push(clientId);
          } catch (error) {
            logger.error('Failed to send message to client', { clientId, error });
          }
        }
      }
    }

    logger.debug('Broadcast completed', {
      channel,
      messageType: message.type,
      recipientCount: recipients.length,
      totalClients: this.clients.size
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message to client', { clientId, error });
      this.handleDisconnection(clientId, 1011, Buffer.from('Send error'));
    }
  }

  /**
   * Send error message to client
   */
  private sendErrorToClient(clientId: string, errorMessage: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      timestamp: new Date(),
      data: {
        error: errorMessage
      }
    });
  }

  // Utility methods

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkRateLimit(clientId: string): boolean {
    const now = new Date();
    const windowMs = 60000; // 1 minute
    const maxMessages = this.config.rateLimitConfig.maxMessagesPerMinute;

    if (!this.messageRateLimits.has(clientId)) {
      this.messageRateLimits.set(clientId, []);
    }

    const timestamps = this.messageRateLimits.get(clientId)!;
    
    // Remove old timestamps
    const cutoff = new Date(now.getTime() - windowMs);
    const validTimestamps = timestamps.filter(ts => ts > cutoff);
    
    if (validTimestamps.length >= maxMessages) {
      return false;
    }

    validTimestamps.push(now);
    this.messageRateLimits.set(clientId, validTimestamps);
    return true;
  }

  private banClient(clientId: string, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const banExpiry = new Date(Date.now() + this.config.rateLimitConfig.banDurationMs);
    this.bannedIPs.set(client.ipAddress, banExpiry);

    logger.warn('Client banned', {
      clientId,
      ipAddress: client.ipAddress,
      reason,
      banExpiry
    });

    client.ws.close(1008, reason);
    this.clients.delete(clientId);
  }

  private shouldReceiveAlert(client: WebSocketClient, alert: BiasAlert): boolean {
    if (client.filters.alertLevelFilter && client.filters.alertLevelFilter !== 'all') {
      if (alert.level !== client.filters.alertLevelFilter) {
        return false;
      }
    }

    // Add more filtering logic as needed
    return true;
  }

  private getSubscriberCount(channel: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(channel) && client.isAuthenticated) {
        count++;
      }
    }
    return count;
  }

  private getChangedServices(status: any): string[] {
    // Logic to determine which services have changed status
    return [];
  }

  private validateAuthToken(token: string, userId: string): boolean {
    // In a real implementation, this would validate the JWT token
    return true; // Simplified for now
  }

  private getUserPermissions(userId: string): string[] {
    // Return user permissions based on their role
    return ['bias_analysis_read', 'dashboard_read', 'alerts_read'];
  }

  private async getDashboardData(filters: any): Promise<BiasDashboardData> {
    // This would integrate with the BiasDetectionEngine
    // For now, return mock data
    return {
      summary: {
        totalSessions: 100,
        averageBiasScore: 0.3,
        alertsLast24h: 5,
        criticalIssues: 1,
        improvementRate: 0.05,
        complianceScore: 0.85
      },
      recentAnalyses: [],
      alerts: [],
      trends: [],
      demographics: {
        age: {},
        gender: {},
        ethnicity: {},
        language: {},
        intersectional: []
      },
      recommendations: []
    };
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = this.config.heartbeatInterval * 3; // 3x heartbeat interval

      for (const [clientId, client] of this.clients) {
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

        if (timeSinceLastPing > staleThreshold) {
          logger.info('Removing stale client', {
            clientId,
            timeSinceLastPing,
            threshold: staleThreshold
          });

          client.ws.close(1001, 'Stale connection');
          this.clients.delete(clientId);
        } else {
          // Send heartbeat
          this.sendToClient(clientId, {
            type: 'heartbeat',
            timestamp: now,
            data: {}
          });
        }
      }
    }, this.config.heartbeatInterval);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = {
        totalConnections: this.clients.size,
        authenticatedConnections: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
        subscriptionCounts: this.getSubscriptionCounts(),
        bannedIPs: this.bannedIPs.size
      };

      logger.debug('WebSocket server metrics', metrics);
    }, 60000); // Every minute
  }

  private getSubscriptionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      for (const subscription of client.subscriptions) {
        counts[subscription] = (counts[subscription] || 0) + 1;
      }
    }

    return counts;
  }

  /**
   * Get server status and metrics
   */
  getStatus(): {
    isRunning: boolean;
    port: number;
    totalConnections: number;
    authenticatedConnections: number;
    subscriptionCounts: Record<string, number>;
    bannedIPs: number;
  } {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      totalConnections: this.clients.size,
      authenticatedConnections: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      subscriptionCounts: this.getSubscriptionCounts(),
      bannedIPs: this.bannedIPs.size
    };
  }

  /**
   * Get connected clients information
   */
  getClients(): Array<{
    id: string;
    isAuthenticated: boolean;
    userId?: string;
    subscriptions: string[];
    ipAddress: string;
    connectedSince: Date;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      isAuthenticated: client.isAuthenticated,
      userId: client.userId,
      subscriptions: Array.from(client.subscriptions),
      ipAddress: client.ipAddress,
      connectedSince: client.lastPing
    }));
  }
} 