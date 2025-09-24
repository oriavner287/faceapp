import { SearchSession, ErrorCode, AccessLogEntry } from "../types/index.js"
import { join } from "path"
import { promises as fs } from "fs"

export interface SessionResult<T = any> {
  success: boolean
  data?: T
  error?: {
    code: ErrorCode
    message: string
  }
}

export class SessionService {
  private static instance: SessionService
  private sessions: Map<string, SearchSession> = new Map()
  private tempDir: string
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.tempDir = join(process.cwd(), "temp")
    this.initializeCleanup()
  }

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  /**
   * Create a new search session
   */
  public async createSession(
    userFaceEmbedding: number[],
    threshold: number = 0.7
  ): Promise<SessionResult<SearchSession>> {
    try {
      const sessionId = this.generateSessionId()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes

      // Ensure temp directory exists
      await this.ensureTempDirectory()

      const session: SearchSession = {
        id: sessionId,
        userImagePath: join(this.tempDir, `${sessionId}_image.jpg`),
        userFaceEmbedding,
        status: "processing",
        results: [],
        threshold,
        createdAt: now,
        expiresAt,
        deleteAfter: new Date(now.getTime() + 24 * 60 * 60 * 1000), // GDPR: Delete after 24 hours
        accessLog: [], // Initialize empty access log for audit trail
      }

      this.sessions.set(sessionId, session)

      // Log session creation for audit trail
      this.logAccess(sessionId, "create", "face_embedding", true)

      console.log(`Created session ${sessionId}, expires at ${expiresAt}`)

      return {
        success: true,
        data: session,
      }
    } catch (error) {
      console.error("Failed to create session:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Get session by ID
   */
  public getSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): SessionResult<SearchSession> {
    try {
      const session = this.sessions.get(sessionId)

      if (!session) {
        // Log failed access attempt for security monitoring
        console.warn(
          `Failed session access attempt: ${sessionId} from ${
            ipAddress || "unknown IP"
          }`
        )
        return {
          success: false,
          error: {
            code: "SESSION_NOT_FOUND",
            message: `Session ${sessionId} not found`,
          },
        }
      }

      // Check if session has expired
      if (new Date() > session.expiresAt) {
        this.sessions.delete(sessionId)
        this.cleanupSessionFiles(sessionId).catch(console.error)

        return {
          success: false,
          error: {
            code: "SESSION_EXPIRED",
            message: `Session ${sessionId} has expired`,
          },
        }
      }

      // Log successful access to session data
      this.logAccess(
        sessionId,
        "read",
        "face_embedding",
        true,
        undefined,
        ipAddress,
        userAgent
      )

      return {
        success: true,
        data: session,
      }
    } catch (error) {
      console.error("Failed to get session:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Update session status
   */
  public updateSessionStatus(
    sessionId: string,
    status: SearchSession["status"]
  ): SessionResult<SearchSession> {
    try {
      const sessionResult = this.getSession(sessionId)

      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult
      }

      const session = sessionResult.data
      session.status = status

      this.sessions.set(sessionId, session)

      return {
        success: true,
        data: session,
      }
    } catch (error) {
      console.error("Failed to update session status:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update session status: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Update session threshold
   */
  public updateSessionThreshold(
    sessionId: string,
    threshold: number
  ): SessionResult<SearchSession> {
    try {
      const sessionResult = this.getSession(sessionId)

      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult
      }

      const session = sessionResult.data
      session.threshold = threshold

      this.sessions.set(sessionId, session)

      return {
        success: true,
        data: session,
      }
    } catch (error) {
      console.error("Failed to update session threshold:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update session threshold: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Update session results
   */
  public updateSessionResults(
    sessionId: string,
    results: SearchSession["results"]
  ): SessionResult<SearchSession> {
    try {
      const sessionResult = this.getSession(sessionId)

      if (!sessionResult.success || !sessionResult.data) {
        return sessionResult
      }

      const session = sessionResult.data
      session.results = results

      // Log access to search results for audit trail
      this.logAccess(sessionId, "update", "search_results", true)

      this.sessions.set(sessionId, session)

      return {
        success: true,
        data: session,
      }
    } catch (error) {
      console.error("Failed to update session results:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update session results: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Log access to biometric data for GDPR compliance and security monitoring
   */
  public logAccess(
    sessionId: string,
    operation: AccessLogEntry["operation"],
    dataType: AccessLogEntry["dataType"],
    success: boolean,
    errorCode?: string,
    ipAddress?: string,
    userAgent?: string
  ): void {
    try {
      const session = this.sessions.get(sessionId)
      if (!session) {
        console.warn(`Cannot log access for non-existent session: ${sessionId}`)
        return
      }

      const logEntry: AccessLogEntry = {
        timestamp: new Date(),
        operation,
        sessionId,
        dataType,
        success,
        ...(errorCode && { errorCode }),
        ...(ipAddress && { ipAddress }),
        ...(userAgent && { userAgent }),
      }

      session.accessLog.push(logEntry)
      this.sessions.set(sessionId, session)

      // Log security events for monitoring
      console.log(
        `Access logged: ${operation} ${dataType} for session ${sessionId} - ${
          success ? "SUCCESS" : "FAILED"
        }`
      )
    } catch (error) {
      console.error("Failed to log access:", error)
    }
  }

  /**
   * Store image data for session
   */
  public async storeSessionImage(
    sessionId: string,
    imageBuffer: Buffer
  ): Promise<SessionResult<string>> {
    try {
      const sessionResult = this.getSession(sessionId)

      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: sessionResult.error || {
            code: "SESSION_NOT_FOUND" as const,
            message: "Session not found",
          },
        }
      }

      const session = sessionResult.data
      await fs.writeFile(session.userImagePath, imageBuffer)

      // Log storage of image data for audit trail
      this.logAccess(sessionId, "create", "image_data", true)

      console.log(
        `Stored image for session ${sessionId} at ${session.userImagePath}`
      )

      return {
        success: true,
        data: session.userImagePath,
      }
    } catch (error) {
      console.error("Failed to store session image:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to store session image: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Delete session and cleanup files
   */
  public async deleteSession(
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionResult<void>> {
    try {
      const session = this.sessions.get(sessionId)

      if (session) {
        // Log deletion of biometric data for GDPR compliance
        this.logAccess(
          sessionId,
          "delete",
          "face_embedding",
          true,
          undefined,
          ipAddress,
          userAgent
        )
        this.logAccess(
          sessionId,
          "delete",
          "image_data",
          true,
          undefined,
          ipAddress,
          userAgent
        )

        this.sessions.delete(sessionId)
        await this.cleanupSessionFiles(sessionId)
        console.log(
          `Deleted session ${sessionId} - GDPR compliance cleanup completed`
        )
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error("Failed to delete session:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Get all active sessions (for debugging/monitoring)
   */
  public getActiveSessions(): SearchSession[] {
    const now = new Date()
    const activeSessions: SearchSession[] = []

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now <= session.expiresAt) {
        activeSessions.push(session)
      } else {
        // Clean up expired session
        this.sessions.delete(sessionId)
        this.cleanupSessionFiles(sessionId).catch(console.error)
      }
    }

    return activeSessions
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    return `session_${timestamp}_${random}`
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.access(this.tempDir)
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true })
      console.log(`Created temp directory: ${this.tempDir}`)
    }
  }

  /**
   * Cleanup files associated with a session
   */
  private async cleanupSessionFiles(sessionId: string): Promise<void> {
    try {
      const imagePath = join(this.tempDir, `${sessionId}_image.jpg`)

      try {
        await fs.unlink(imagePath)
        console.log(`Cleaned up image file: ${imagePath}`)
      } catch (error) {
        // File might not exist, which is fine
        if ((error as any).code !== "ENOENT") {
          console.warn(`Failed to cleanup image file ${imagePath}:`, error)
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup session files for ${sessionId}:`, error)
    }
  }

  /**
   * Initialize automatic cleanup of expired sessions
   */
  private initializeCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)

    console.log("Initialized session cleanup service")
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date()
    let cleanedCount = 0

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId)
        this.cleanupSessionFiles(sessionId).catch(console.error)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`)
    }
  }

  /**
   * Shutdown cleanup service
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log("Session cleanup service shutdown")
    }
  }
}

// Export singleton instance
export const sessionService = SessionService.getInstance()
