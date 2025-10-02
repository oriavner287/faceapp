"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import { z } from "zod"

// Security validation schemas
const SessionIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9-_]{8,64}$/)
const ThresholdSchema = z.number().min(0.1).max(1.0)

// Session state interface
interface SearchSession {
  id: string
  status: "idle" | "processing" | "completed" | "error"
  uploadedImageId?: string
  faceEmbedding?: number[]
  results: VideoMatch[]
  threshold: number
  error?: string
  createdAt: Date
  expiresAt: Date
}

// Video match interface (sanitized for security)
interface VideoMatch {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number
  faceCount: number
}

// Session context interface
interface SessionContextType {
  // Session state
  currentSession: SearchSession | null
  isLoading: boolean
  error: string | null

  // Session management
  createSession: () => Promise<string>
  getSession: (sessionId: string) => Promise<SearchSession | null>
  updateSessionResults: (sessionId: string, results: VideoMatch[]) => void
  updateSessionStatus: (
    sessionId: string,
    status: SearchSession["status"],
    error?: string
  ) => void
  updateThreshold: (sessionId: string, threshold: number) => Promise<void>
  clearSession: () => void
  deleteSession: (sessionId: string) => Promise<void>

  // Privacy and cleanup
  scheduleCleanup: (sessionId: string, delayMs?: number) => void
  cleanupExpiredSessions: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}

interface SessionProviderProps {
  children: React.ReactNode
  autoCleanupInterval?: number // Auto cleanup interval in ms (default: 5 minutes)
}

export function SessionProvider({
  children,
  autoCleanupInterval = 5 * 60 * 1000, // 5 minutes
}: SessionProviderProps) {
  // State management
  const [currentSession, setCurrentSession] = useState<SearchSession | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // In-memory session storage (in production, use secure server-side storage)
  const [sessions, setSessions] = useState<Map<string, SearchSession>>(
    new Map()
  )

  // Cleanup timers
  const [cleanupTimers, setCleanupTimers] = useState<
    Map<string, NodeJS.Timeout>
  >(new Map())

  // Generate secure session ID
  const generateSessionId = useCallback((): string => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    let result = ""
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }, [])

  // Security: Sanitize video match data
  const sanitizeVideoMatch = useCallback((match: any): VideoMatch => {
    return {
      id: String(match.id || "").substring(0, 100),
      title: String(match.title || "Untitled Video").substring(0, 200),
      thumbnailUrl: String(match.thumbnailUrl || ""),
      videoUrl: String(match.videoUrl || ""),
      sourceWebsite: String(match.sourceWebsite || "Unknown").substring(0, 100),
      similarityScore:
        Math.round((Number(match.similarityScore) || 0) * 100) / 100,
      faceCount: Math.max(0, Math.min(10, Number(match.faceCount) || 0)),
    }
  }, [])

  // Create new search session
  const createSession = useCallback(async (): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      const sessionId = generateSessionId()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

      const newSession: SearchSession = {
        id: sessionId,
        status: "idle",
        results: [],
        threshold: 0.7,
        createdAt: now,
        expiresAt,
      }

      setSessions(prev => new Map(prev).set(sessionId, newSession))
      setCurrentSession(newSession)

      // Schedule automatic cleanup after 24 hours (GDPR compliance)
      scheduleCleanup(sessionId, 24 * 60 * 60 * 1000)

      console.log(`[SESSION] Created new session: ${sessionId}`)
      return sessionId
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create session"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [generateSessionId])

  // Get session by ID
  const getSession = useCallback(
    async (sessionId: string): Promise<SearchSession | null> => {
      try {
        // Validate session ID format
        const validatedId = SessionIdSchema.parse(sessionId)

        const session = sessions.get(validatedId)
        if (!session) {
          return null
        }

        // Check if session has expired
        if (new Date() > session.expiresAt) {
          console.log(`[SESSION] Session ${sessionId} has expired, removing`)
          await deleteSession(sessionId)
          return null
        }

        return session
      } catch (err) {
        console.error(`[SESSION] Error getting session ${sessionId}:`, err)
        return null
      }
    },
    [sessions]
  )

  // Update session results
  const updateSessionResults = useCallback(
    (sessionId: string, results: VideoMatch[]) => {
      setSessions(prev => {
        const newSessions = new Map(prev)
        const session = newSessions.get(sessionId)

        if (session) {
          const sanitizedResults = results.map(sanitizeVideoMatch)
          const updatedSession = {
            ...session,
            results: sanitizedResults,
            status: "completed" as const,
          }
          newSessions.set(sessionId, updatedSession)

          // Update current session if it matches
          if (currentSession?.id === sessionId) {
            setCurrentSession(updatedSession)
          }
        }

        return newSessions
      })
    },
    [currentSession, sanitizeVideoMatch]
  )

  // Update session status
  const updateSessionStatus = useCallback(
    (sessionId: string, status: SearchSession["status"], error?: string) => {
      setSessions(prev => {
        const newSessions = new Map(prev)
        const session = newSessions.get(sessionId)

        if (session) {
          const updatedSession = {
            ...session,
            status,
            ...(error !== undefined && { error }),
          }
          newSessions.set(sessionId, updatedSession)

          // Update current session if it matches
          if (currentSession?.id === sessionId) {
            setCurrentSession(updatedSession)
          }
        }

        return newSessions
      })
    },
    [currentSession]
  )

  // Update similarity threshold
  const updateThreshold = useCallback(
    async (sessionId: string, threshold: number): Promise<void> => {
      try {
        // Validate threshold
        const validatedThreshold = ThresholdSchema.parse(threshold)

        setSessions(prev => {
          const newSessions = new Map(prev)
          const session = newSessions.get(sessionId)

          if (session) {
            const updatedSession = {
              ...session,
              threshold: validatedThreshold,
            }
            newSessions.set(sessionId, updatedSession)

            // Update current session if it matches
            if (currentSession?.id === sessionId) {
              setCurrentSession(updatedSession)
            }
          }

          return newSessions
        })

        console.log(
          `[SESSION] Updated threshold for ${sessionId}: ${validatedThreshold}`
        )
      } catch (err) {
        console.error(`[SESSION] Error updating threshold:`, err)
        throw new Error("Invalid threshold value")
      }
    },
    [currentSession]
  )

  // Clear current session
  const clearSession = useCallback(() => {
    setCurrentSession(null)
    setError(null)
    console.log("[SESSION] Cleared current session")
  }, [])

  // Delete session (GDPR compliance)
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        // Clear cleanup timer
        const timer = cleanupTimers.get(sessionId)
        if (timer) {
          clearTimeout(timer)
          setCleanupTimers(prev => {
            const newTimers = new Map(prev)
            newTimers.delete(sessionId)
            return newTimers
          })
        }

        // Remove session
        setSessions(prev => {
          const newSessions = new Map(prev)
          newSessions.delete(sessionId)
          return newSessions
        })

        // Clear current session if it matches
        if (currentSession?.id === sessionId) {
          setCurrentSession(null)
        }

        console.log(`[SESSION] Deleted session: ${sessionId}`)
      } catch (err) {
        console.error(`[SESSION] Error deleting session ${sessionId}:`, err)
      }
    },
    [currentSession, cleanupTimers]
  )

  // Schedule session cleanup
  const scheduleCleanup = useCallback(
    (sessionId: string, delayMs: number = 24 * 60 * 60 * 1000) => {
      // Clear existing timer if any
      const existingTimer = cleanupTimers.get(sessionId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Schedule new cleanup
      const timer = setTimeout(async () => {
        console.log(
          `[SESSION] Auto-cleanup triggered for session: ${sessionId}`
        )
        await deleteSession(sessionId)
      }, delayMs)

      setCleanupTimers(prev => new Map(prev).set(sessionId, timer))

      console.log(
        `[SESSION] Scheduled cleanup for ${sessionId} in ${Math.round(
          delayMs / 1000 / 60
        )} minutes`
      )
    },
    [cleanupTimers, deleteSession]
  )

  // Clean up expired sessions
  const cleanupExpiredSessions = useCallback(async (): Promise<void> => {
    const now = new Date()
    const expiredSessions: string[] = []

    sessions.forEach((session, sessionId) => {
      if (now > session.expiresAt) {
        expiredSessions.push(sessionId)
      }
    })

    for (const sessionId of expiredSessions) {
      await deleteSession(sessionId)
    }

    if (expiredSessions.length > 0) {
      console.log(
        `[SESSION] Cleaned up ${expiredSessions.length} expired sessions`
      )
    }
  }, [sessions, deleteSession])

  // Auto cleanup interval
  useEffect(() => {
    if (autoCleanupInterval > 0) {
      const interval = setInterval(cleanupExpiredSessions, autoCleanupInterval)
      return () => clearInterval(interval)
    }
    return undefined
  }, [autoCleanupInterval, cleanupExpiredSessions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all cleanup timers
      cleanupTimers.forEach(timer => clearTimeout(timer))

      // In production, you might want to persist sessions to secure storage
      console.log("[SESSION] SessionProvider unmounting, clearing timers")
    }
  }, [cleanupTimers])

  const contextValue: SessionContextType = {
    // State
    currentSession,
    isLoading,
    error,

    // Session management
    createSession,
    getSession,
    updateSessionResults,
    updateSessionStatus,
    updateThreshold,
    clearSession,
    deleteSession,

    // Privacy and cleanup
    scheduleCleanup,
    cleanupExpiredSessions,
  }

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  )
}
