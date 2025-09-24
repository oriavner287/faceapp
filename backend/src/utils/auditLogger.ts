import type { AccessLogEntry, SecurityEvent } from "../contracts/api.js"

export interface AuditLogOptions {
  operation: "create" | "read" | "update" | "delete" | "encrypt" | "decrypt"
  sessionId: string
  dataType: "face_embedding" | "image_data" | "search_results"
  success: boolean
  errorCode?: string
  userId?: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

export interface SecurityEventOptions {
  eventType:
    | "failed_auth"
    | "suspicious_request"
    | "rate_limit_exceeded"
    | "malicious_file"
    | "invalid_input"
  severity: "low" | "medium" | "high" | "critical"
  sessionId?: string | undefined
  ipAddress?: string | undefined
  userAgent?: string | undefined
  details: Record<string, unknown>
}

/**
 * GDPR-compliant audit logger for biometric data operations
 */
export class AuditLogger {
  private static instance: AuditLogger
  private logs: AccessLogEntry[] = []
  private securityEvents: SecurityEvent[] = []

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Log biometric data access for GDPR compliance
   */
  public logAccess(options: AuditLogOptions): void {
    const logEntry: AccessLogEntry = {
      timestamp: new Date(),
      operation: options.operation,
      userId: options.userId,
      sessionId: options.sessionId,
      dataType: options.dataType,
      success: options.success,
      errorCode: options.errorCode,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    }

    this.logs.push(logEntry)

    // Log to console for development (in production, use proper logging service)
    console.log(
      JSON.stringify({
        type: "biometric_access_log",
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString(),
      })
    )

    // Keep only recent logs in memory (for production, use persistent storage)
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500)
    }
  }

  /**
   * Log security events for monitoring
   */
  public logSecurityEvent(options: SecurityEventOptions): void {
    const securityEvent: SecurityEvent = {
      timestamp: new Date(),
      eventType: options.eventType,
      severity: options.severity,
      sessionId: options.sessionId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      details: options.details,
      resolved: false,
    }

    this.securityEvents.push(securityEvent)

    // Log to console with appropriate level
    const logLevel =
      options.severity === "critical" || options.severity === "high"
        ? "error"
        : "warn"
    console[logLevel](
      JSON.stringify({
        type: "security_event",
        ...securityEvent,
        timestamp: securityEvent.timestamp.toISOString(),
      })
    )

    // Keep only recent events in memory
    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-250)
    }
  }

  /**
   * Get access logs for a specific session (for GDPR data requests)
   */
  public getSessionLogs(sessionId: string): AccessLogEntry[] {
    return this.logs.filter(log => log.sessionId === sessionId)
  }

  /**
   * Get security events within a time range
   */
  public getSecurityEvents(since?: Date): SecurityEvent[] {
    if (!since) {
      return [...this.securityEvents]
    }
    return this.securityEvents.filter(event => event.timestamp >= since)
  }

  /**
   * Clear logs for a specific session (for GDPR deletion)
   */
  public clearSessionLogs(sessionId: string): void {
    this.logs = this.logs.filter(log => log.sessionId !== sessionId)
    this.securityEvents = this.securityEvents.filter(
      event => event.sessionId !== sessionId
    )
  }

  /**
   * Mark security event as resolved
   */
  public resolveSecurityEvent(eventIndex: number): void {
    if (this.securityEvents[eventIndex]) {
      this.securityEvents[eventIndex]!.resolved = true
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()
