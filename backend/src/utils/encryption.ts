import crypto from "crypto"
import { config } from "../config/index.js"

// Encryption configuration
const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32
const IV_LENGTH = 16

export interface EncryptionResult {
  encryptedData: string
  iv: string
  tag: string
  keyId: string
}

export interface DecryptionResult {
  success: boolean
  data?: Buffer
  error?: string
}

/**
 * Generate encryption key from environment variable or create secure random key
 */
function getEncryptionKey(): Buffer {
  const keyString =
    process.env["ENCRYPTION_KEY"] || config.security["encryptionKey"]

  if (keyString && keyString !== "<<ENCRYPTION_KEY>>") {
    // Use provided key (should be base64 encoded)
    return Buffer.from(keyString, "base64")
  }

  // Generate random key for development (not recommended for production)
  console.warn("Using random encryption key - not suitable for production")
  return crypto.randomBytes(KEY_LENGTH)
}

/**
 * Encrypt face embedding data for secure storage
 */
export function encryptFaceEmbedding(embedding: number[]): EncryptionResult {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    cipher.setAAD(Buffer.from("face_embedding"))

    // Convert embedding to buffer
    const embeddingBuffer = Buffer.from(JSON.stringify(embedding))

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(embeddingBuffer),
      cipher.final(),
    ])

    const tag = cipher.getAuthTag()

    return {
      encryptedData: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyId: "default", // In production, use key rotation
    }
  } catch (error) {
    throw new Error(
      `Encryption failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
  }
}

/**
 * Decrypt face embedding data
 */
export function decryptFaceEmbedding(
  encryptionResult: EncryptionResult
): DecryptionResult {
  try {
    const key = getEncryptionKey()
    const iv = Buffer.from(encryptionResult.iv, "base64")
    const tag = Buffer.from(encryptionResult.tag, "base64")
    const encryptedData = Buffer.from(encryptionResult.encryptedData, "base64")

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAAD(Buffer.from("face_embedding"))
    decipher.setAuthTag(tag)

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ])

    return {
      success: true,
      data: decrypted,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Decryption failed",
    }
  }
}

/**
 * Securely wipe sensitive data from memory
 */
export function secureWipe(buffer: Buffer): void {
  if (buffer && buffer.length > 0) {
    crypto.randomFillSync(buffer)
  }
}

/**
 * Generate secure session ID
 */
export function generateSecureSessionId(): string {
  return crypto.randomBytes(32).toString("base64url")
}
