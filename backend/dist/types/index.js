// Core data models for the face video search application
// Validation constraints
export const SIMILARITY_CONSTRAINTS = {
    MIN_THRESHOLD: 0.1,
    MAX_THRESHOLD: 1.0,
    DEFAULT_THRESHOLD: 0.7,
    EMBEDDING_DIMENSIONS: [128, 512], // Common face embedding dimensions
};
export const FILE_CONSTRAINTS = {
    MAX_SIZE_MB: 10,
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
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
}
// Export validation utilities
export * from "../utils/validation.js";
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
};
