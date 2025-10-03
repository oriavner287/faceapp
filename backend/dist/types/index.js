// Core data models for the face video search application
// Security-focused interfaces following security-expert.md guidelines
// Validation constraints
export const SIMILARITY_CONSTRAINTS = {
    MIN_THRESHOLD: 0.1,
    MAX_THRESHOLD: 1.0,
    DEFAULT_THRESHOLD: 0.7,
    EMBEDDING_DIMENSIONS: [128, 512], // Common face embedding dimensions
};
// Import configuration for consistent values
import { config } from "../config/index.js";
export const FILE_CONSTRAINTS = {
    MAX_SIZE_MB: Math.round(config.upload.maxFileSize / 1024 / 1024),
    MAX_SIZE_BYTES: config.upload.maxFileSize,
    ALLOWED_TYPES: config.upload.allowedMimeTypes,
    ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
};
export const VIDEO_CONSTRAINTS = {
    MAX_VIDEOS_PER_SITE: 10,
    MAX_TOTAL_VIDEOS: 30,
    THUMBNAIL_TIMEOUT_MS: 5000,
    PROCESSING_TIMEOUT_MS: 30000,
};
// Validation schemas and utility functions
export class ValidationSchemas {
    static validateImageFile(file) {
        const errors = [];
        // Check file size
        if (file.size > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
            errors.push({
                field: "file.size",
                message: `File size must be less than ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB`,
                code: "FILE_TOO_LARGE",
                value: file.size,
            });
        }
        // Check file type
        if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
            errors.push({
                field: "file.type",
                message: `File type must be one of: ${FILE_CONSTRAINTS.ALLOWED_TYPES.join(", ")}`,
                code: "INVALID_FILE_TYPE",
                value: file.type,
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateSimilarityThreshold(threshold) {
        const errors = [];
        if (typeof threshold !== "number" || isNaN(threshold)) {
            errors.push({
                field: "threshold",
                message: "Threshold must be a valid number",
                code: "INVALID_THRESHOLD",
                value: threshold,
            });
        }
        else if (threshold < SIMILARITY_CONSTRAINTS.MIN_THRESHOLD ||
            threshold > SIMILARITY_CONSTRAINTS.MAX_THRESHOLD) {
            errors.push({
                field: "threshold",
                message: `Threshold must be between ${SIMILARITY_CONSTRAINTS.MIN_THRESHOLD} and ${SIMILARITY_CONSTRAINTS.MAX_THRESHOLD}`,
                code: "INVALID_THRESHOLD",
                value: threshold,
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateFaceEmbedding(embedding) {
        const errors = [];
        if (!Array.isArray(embedding)) {
            errors.push({
                field: "embedding",
                message: "Embedding must be an array of numbers",
                code: "VALIDATION_ERROR",
                value: typeof embedding,
            });
        }
        else if (embedding.length === 0) {
            errors.push({
                field: "embedding",
                message: "Embedding cannot be empty",
                code: "VALIDATION_ERROR",
                value: embedding.length,
            });
        }
        else if (!SIMILARITY_CONSTRAINTS.EMBEDDING_DIMENSIONS.includes(embedding.length)) {
            errors.push({
                field: "embedding",
                message: `Embedding dimension must be one of: ${SIMILARITY_CONSTRAINTS.EMBEDDING_DIMENSIONS.join(", ")}`,
                code: "VALIDATION_ERROR",
                value: embedding.length,
            });
        }
        else if (!embedding.every(val => typeof val === "number" && !isNaN(val))) {
            errors.push({
                field: "embedding",
                message: "All embedding values must be valid numbers",
                code: "VALIDATION_ERROR",
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateSearchId(searchId) {
        const errors = [];
        if (typeof searchId !== "string" || searchId.trim().length === 0) {
            errors.push({
                field: "searchId",
                message: "Search ID must be a non-empty string",
                code: "VALIDATION_ERROR",
                value: searchId,
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    // Security validation methods following security-expert.md guidelines
    static validateImageSecurity(buffer) {
        const errors = [];
        // Check for malicious file signatures
        if (buffer.length < 4) {
            errors.push({
                field: "file.content",
                message: "File too small to be a valid image",
                code: "MALICIOUS_FILE_DETECTED",
                value: buffer.length,
            });
            return { isValid: false, errors };
        }
        // Validate magic numbers for security
        const isValidJPEG = buffer[0] === 0xff && buffer[1] === 0xd8;
        const isValidPNG = buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47;
        const isValidWebP = buffer.toString("ascii", 0, 4) === "RIFF" && buffer.length >= 12;
        if (!isValidJPEG && !isValidPNG && !isValidWebP) {
            errors.push({
                field: "file.content",
                message: "Invalid or potentially malicious file format",
                code: "MALICIOUS_FILE_DETECTED",
            });
        }
        // Check for embedded scripts or suspicious content
        const fileContent = buffer.toString("ascii", 0, Math.min(1024, buffer.length));
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /vbscript:/i,
            /onload=/i,
            /onerror=/i,
            /eval\(/i,
        ];
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(fileContent)) {
                errors.push({
                    field: "file.content",
                    message: "File contains potentially malicious content",
                    code: "MALICIOUS_FILE_DETECTED",
                });
                break;
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    static validateEncryptionMetadata(metadata) {
        const errors = [];
        if (!metadata.algorithm || typeof metadata.algorithm !== "string") {
            errors.push({
                field: "encryption.algorithm",
                message: "Encryption algorithm is required",
                code: "ENCRYPTION_FAILED",
            });
        }
        if (!metadata.keyId || typeof metadata.keyId !== "string") {
            errors.push({
                field: "encryption.keyId",
                message: "Encryption key ID is required",
                code: "ENCRYPTION_FAILED",
            });
        }
        if (!metadata.iv || typeof metadata.iv !== "string") {
            errors.push({
                field: "encryption.iv",
                message: "Initialization vector is required",
                code: "ENCRYPTION_FAILED",
            });
        }
        if (metadata.expiresAt <= new Date()) {
            errors.push({
                field: "encryption.expiresAt",
                message: "Encryption has expired",
                code: "ENCRYPTION_FAILED",
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}
// Validation utilities are now handled by Zod schemas in contracts/api.ts
// Export configuration
export * from "../config/index.js";
// Type guards for runtime type checking
export const TypeGuards = {
    isFaceDetection(obj) {
        return (obj &&
            typeof obj === "object" &&
            obj.boundingBox &&
            typeof obj.boundingBox.x === "number" &&
            typeof obj.boundingBox.y === "number" &&
            typeof obj.boundingBox.width === "number" &&
            typeof obj.boundingBox.height === "number" &&
            Array.isArray(obj.embedding) &&
            typeof obj.confidence === "number");
    },
    isVideoMatch(obj) {
        return (obj &&
            typeof obj === "object" &&
            typeof obj.id === "string" &&
            typeof obj.title === "string" &&
            typeof obj.thumbnailUrl === "string" &&
            typeof obj.videoUrl === "string" &&
            typeof obj.sourceWebsite === "string" &&
            typeof obj.similarityScore === "number" &&
            Array.isArray(obj.detectedFaces));
    },
    isSearchSession(obj) {
        return (obj &&
            typeof obj === "object" &&
            typeof obj.id === "string" &&
            typeof obj.userImagePath === "string" &&
            Array.isArray(obj.userFaceEmbedding) &&
            ["processing", "completed", "error"].includes(obj.status) &&
            Array.isArray(obj.results) &&
            typeof obj.threshold === "number" &&
            obj.createdAt instanceof Date &&
            obj.expiresAt instanceof Date);
    },
    isErrorResponse(obj) {
        return (obj &&
            typeof obj === "object" &&
            obj.success === false &&
            obj.error &&
            typeof obj.error.code === "string" &&
            typeof obj.error.message === "string");
    },
    // Security-focused type guards
    isAccessLogEntry(obj) {
        return (obj &&
            typeof obj === "object" &&
            obj.timestamp instanceof Date &&
            ["create", "read", "update", "delete", "encrypt", "decrypt"].includes(obj.operation) &&
            typeof obj.sessionId === "string" &&
            ["face_embedding", "image_data", "search_results"].includes(obj.dataType) &&
            typeof obj.success === "boolean");
    },
    isSecurityEvent(obj) {
        return (obj &&
            typeof obj === "object" &&
            obj.timestamp instanceof Date &&
            [
                "failed_auth",
                "suspicious_request",
                "rate_limit_exceeded",
                "malicious_file",
                "invalid_input",
            ].includes(obj.eventType) &&
            ["low", "medium", "high", "critical"].includes(obj.severity) &&
            typeof obj.details === "object" &&
            typeof obj.resolved === "boolean");
    },
    isEncryptionMetadata(obj) {
        return (obj &&
            typeof obj === "object" &&
            typeof obj.algorithm === "string" &&
            typeof obj.keyId === "string" &&
            typeof obj.iv === "string" &&
            obj.encryptedAt instanceof Date &&
            obj.expiresAt instanceof Date);
    },
};
