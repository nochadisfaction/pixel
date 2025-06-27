import { supabase } from '../../supabase'
import { getLogger } from '../../logging'
import { createAuditLog, AuditEventType, AuditEventStatus } from '../../audit'

const logger = getLogger({ prefix: 'crisis-session-flagging' })

export interface FlagSessionRequest {
  userId: string
  sessionId: string
  crisisId: string
  timestamp: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedRisks: string[]
  confidence: number
  textSample?: string
  routingDecision?: any
  metadata?: Record<string, unknown>
}

export interface CrisisSessionFlag {
  id: string
  userId: string
  sessionId: string
  crisisId: string
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  detectedRisks: string[]
  textSample?: string
  status: 'pending' | 'under_review' | 'reviewed' | 'resolved' | 'escalated' | 'dismissed'
  flaggedAt: string
  reviewedAt?: string
  resolvedAt?: string
  assignedTo?: string
  reviewerNotes?: string
  resolutionNotes?: string
  routingDecision?: any
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UserSessionStatus {
  id: string
  userId: string
  isFlaggedForReview: boolean
  currentRiskLevel: 'low' | 'medium' | 'high' | 'critical'
  lastCrisisEventAt?: string
  totalCrisisFlags: number
  activeCrisisFlags: number
  resolvedCrisisFlags: number
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UpdateFlagStatusRequest {
  flagId: string
  status: 'under_review' | 'reviewed' | 'resolved' | 'escalated' | 'dismissed'
  assignedTo?: string
  reviewerNotes?: string
  resolutionNotes?: string
  metadata?: Record<string, unknown>
}

export class CrisisSessionFlaggingService {
  /**
   * Flag a user session for immediate review due to crisis detection
   */
  async flagSessionForReview(request: FlagSessionRequest): Promise<CrisisSessionFlag> {
    try {
      logger.info('Flagging session for review', {
        userId: request.userId,
        sessionId: request.sessionId,
        crisisId: request.crisisId,
        severity: request.severity
      })

      // Validate input
      if (!request.userId || !request.sessionId || !request.crisisId) {
        throw new Error('Missing required fields: userId, sessionId, or crisisId')
      }

      if (request.confidence < 0 || request.confidence > 1) {
        throw new Error('Confidence must be between 0 and 1')
      }

      // Insert crisis session flag
      const { data: flagData, error: flagError } = await supabase
        .from('crisis_session_flags')
        .insert({
          user_id: request.userId,
          session_id: request.sessionId,
          crisis_id: request.crisisId,
          reason: request.reason,
          severity: request.severity,
          confidence: request.confidence,
          detected_risks: request.detectedRisks,
          text_sample: request.textSample,
          routing_decision: request.routingDecision,
          metadata: request.metadata || {},
          status: 'pending'
        })
        .select()
        .single()

      if (flagError) {
        logger.error('Failed to insert crisis session flag', {
          error: flagError,
          userId: request.userId,
          sessionId: request.sessionId
        })
        throw new Error(`Failed to flag session: ${flagError.message}`)
      }

      // Create audit log
      await createAuditLog(
        request.userId,
        'crisis_session_flagged' as AuditEventType,
        request.sessionId,
        {
          crisisId: request.crisisId,
          severity: request.severity,
          reason: request.reason,
          confidence: request.confidence,
          detectedRisks: request.detectedRisks
        }
      )

      logger.info('Session flagged successfully', {
        flagId: flagData.id,
        userId: request.userId,
        sessionId: request.sessionId,
        crisisId: request.crisisId
      })

      return this.mapFlagFromDb(flagData)
    } catch (error) {
      logger.error('Error flagging session for review', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        sessionId: request.sessionId
      })
      throw error
    }
  }

  /**
   * Update the status of a crisis session flag
   */
  async updateFlagStatus(request: UpdateFlagStatusRequest): Promise<CrisisSessionFlag> {
    try {
      logger.info('Updating crisis flag status', {
        flagId: request.flagId,
        status: request.status
      })

      const updateData: any = {
        status: request.status,
        updated_at: new Date().toISOString()
      }

      // Set timestamps based on status
      if (request.status === 'under_review' && request.assignedTo) {
        updateData.assigned_to = request.assignedTo
      }

      if (request.status === 'reviewed' || request.status === 'resolved') {
        updateData.reviewed_at = new Date().toISOString()
      }

      if (request.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      }

      if (request.reviewerNotes) {
        updateData.reviewer_notes = request.reviewerNotes
      }

      if (request.resolutionNotes) {
        updateData.resolution_notes = request.resolutionNotes
      }

      if (request.metadata) {
        updateData.metadata = request.metadata
      }

      const { data, error } = await supabase
        .from('crisis_session_flags')
        .update(updateData)
        .eq('id', request.flagId)
        .select()
        .single()

      if (error) {
        logger.error('Failed to update crisis flag status', {
          error,
          flagId: request.flagId
        })
        throw new Error(`Failed to update flag status: ${error.message}`)
      }

      logger.info('Crisis flag status updated successfully', {
        flagId: request.flagId,
        status: request.status
      })

      return this.mapFlagFromDb(data)
    } catch (error) {
      logger.error('Error updating flag status', {
        error: error instanceof Error ? error.message : String(error),
        flagId: request.flagId
      })
      throw error
    }
  }

  /**
   * Get crisis flags for a specific user
   */
  async getUserCrisisFlags(userId: string, includeResolved: boolean = false): Promise<CrisisSessionFlag[]> {
    try {
      let query = supabase
        .from('crisis_session_flags')
        .select('*')
        .eq('user_id', userId)
        .order('flagged_at', { ascending: false })

      if (!includeResolved) {
        query = query.not('status', 'in', '(resolved,dismissed)')
      }

      const { data, error } = await query

      if (error) {
        logger.error('Failed to get user crisis flags', {
          error,
          userId
        })
        throw new Error(`Failed to get crisis flags: ${error.message}`)
      }

      return data.map(flag => this.mapFlagFromDb(flag))
    } catch (error) {
      logger.error('Error getting user crisis flags', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })
      throw error
    }
  }

  /**
   * Get user session status
   */
  async getUserSessionStatus(userId: string): Promise<UserSessionStatus | null> {
    try {
      const { data, error } = await supabase
        .from('user_session_status')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return null
        }
        logger.error('Failed to get user session status', {
          error,
          userId
        })
        throw new Error(`Failed to get session status: ${error.message}`)
      }

      return this.mapStatusFromDb(data)
    } catch (error) {
      logger.error('Error getting user session status', {
        error: error instanceof Error ? error.message : String(error),
        userId
      })
      throw error
    }
  }

  /**
   * Get all pending crisis flags for review
   */
  async getPendingCrisisFlags(limit: number = 50): Promise<CrisisSessionFlag[]> {
    try {
      const { data, error } = await supabase
        .from('crisis_session_flags')
        .select('*')
        .in('status', ['pending', 'under_review'])
        .order('flagged_at', { ascending: true })
        .limit(limit)

      if (error) {
        logger.error('Failed to get pending crisis flags', { error })
        throw new Error(`Failed to get pending flags: ${error.message}`)
      }

      return data.map(flag => this.mapFlagFromDb(flag))
    } catch (error) {
      logger.error('Error getting pending crisis flags', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Map database record to CrisisSessionFlag interface
   */
  private mapFlagFromDb(data: any): CrisisSessionFlag {
    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      crisisId: data.crisis_id,
      reason: data.reason,
      severity: data.severity,
      confidence: data.confidence,
      detectedRisks: data.detected_risks || [],
      textSample: data.text_sample,
      status: data.status,
      flaggedAt: data.flagged_at,
      reviewedAt: data.reviewed_at,
      resolvedAt: data.resolved_at,
      assignedTo: data.assigned_to,
      reviewerNotes: data.reviewer_notes,
      resolutionNotes: data.resolution_notes,
      routingDecision: data.routing_decision,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  /**
   * Map database record to UserSessionStatus interface
   */
  private mapStatusFromDb(data: any): UserSessionStatus {
    return {
      id: data.id,
      userId: data.user_id,
      isFlaggedForReview: data.is_flagged_for_review,
      currentRiskLevel: data.current_risk_level,
      lastCrisisEventAt: data.last_crisis_event_at,
      totalCrisisFlags: data.total_crisis_flags,
      activeCrisisFlags: data.active_crisis_flags,
      resolvedCrisisFlags: data.resolved_crisis_flags,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}
