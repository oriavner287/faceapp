/**
 * Error Types
 *
 * Shared error type definitions for the face search application
 * with security-focused error classification.
 */

// Security: Safe error types that don't expose internal system details
export type SafeErrorType =
  | "upload-failed"
  | "no-face-detected"
  | "processing-failed"
  | "network-error"
  | "no-results"
  | "invalid-file"
  | "file-too-large"
  | "service-unavailable"
  | "timeout"
  | "unknown"
