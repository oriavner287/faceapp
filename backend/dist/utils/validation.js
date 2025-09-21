import { FILE_CONSTRAINTS, SIMILARITY_CONSTRAINTS, } from "../types/index.js";
/**
 * Comprehensive validation utilities for the face video search application
 */
export class RequestValidator {
    /**
     * Validate ProcessImageRequest
     */
    static validateProcessImageRequest(request) {
        const errors = [];
        if (!request) {
            errors.push({
                field: "request",
                message: "Request body is required",
                code: "VALIDATION_ERROR",
            });
            return { isValid: false, errors };
        }
        if (!request.imageData) {
            errors.push({
                field: "imageData",
                message: "Image data is required",
                code: "VALIDATION_ERROR",
            });
        }
        else if (!Buffer.isBuffer(request.imageData)) {
            errors.push({
                field: "imageData",
                message: "Image data must be a Buffer",
                code: "VALIDATION_ERROR",
                value: typeof request.imageData,
            });
        }
        else if (request.imageData.length > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
            errors.push({
                field: "imageData",
                message: `Image size must be less than ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB`,
                code: "FILE_TOO_LARGE",
                value: request.imageData.length,
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate GetResultsRequest
     */
    static validateGetResultsRequest(request) {
        const errors = [];
        if (!request) {
            errors.push({
                field: "request",
                message: "Request body is required",
                code: "VALIDATION_ERROR",
            });
            return { isValid: false, errors };
        }
        if (!request.searchId || typeof request.searchId !== "string") {
            errors.push({
                field: "searchId",
                message: "Search ID must be a non-empty string",
                code: "VALIDATION_ERROR",
                value: request.searchId,
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate ConfigureSearchRequest
     */
    static validateConfigureSearchRequest(request) {
        const errors = [];
        if (!request) {
            errors.push({
                field: "request",
                message: "Request body is required",
                code: "VALIDATION_ERROR",
            });
            return { isValid: false, errors };
        }
        // Validate searchId
        if (!request.searchId || typeof request.searchId !== "string") {
            errors.push({
                field: "searchId",
                message: "Search ID must be a non-empty string",
                code: "VALIDATION_ERROR",
                value: request.searchId,
            });
        }
        // Validate threshold
        const thresholdValidation = this.validateThreshold(request.threshold);
        if (!thresholdValidation.isValid) {
            errors.push(...thresholdValidation.errors);
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate FetchVideosRequest
     */
    static validateFetchVideosRequest(request) {
        const errors = [];
        if (!request) {
            errors.push({
                field: "request",
                message: "Request body is required",
                code: "VALIDATION_ERROR",
            });
            return { isValid: false, errors };
        }
        // Validate embedding
        if (!request.embedding) {
            errors.push({
                field: "embedding",
                message: "Face embedding is required",
                code: "VALIDATION_ERROR",
            });
        }
        else {
            const embeddingValidation = this.validateEmbedding(request.embedding);
            if (!embeddingValidation.isValid) {
                errors.push(...embeddingValidation.errors);
            }
        }
        // Validate optional threshold
        if (request.threshold !== undefined) {
            const thresholdValidation = this.validateThreshold(request.threshold);
            if (!thresholdValidation.isValid) {
                errors.push(...thresholdValidation.errors);
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
        };
    }
    /**
     * Validate similarity threshold
     */
    static validateThreshold(threshold) {
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
    /**
     * Validate face embedding
     */
    static validateEmbedding(embedding) {
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
}
/**
 * Utility functions for creating standardized error responses
 */
export class ErrorResponseBuilder {
    static createValidationError(errors) {
        const primaryError = errors[0];
        return {
            success: false,
            error: {
                code: primaryError.code,
                message: primaryError.message,
                details: {
                    field: primaryError.field,
                    value: primaryError.value,
                    constraint: `${errors.length} validation error(s)`,
                    timestamp: new Date().toISOString(),
                },
            },
        };
    }
    static createError(code, message, details) {
        return {
            success: false,
            error: {
                code,
                message,
                details: details
                    ? {
                        ...details,
                        timestamp: new Date().toISOString(),
                    }
                    : {
                        timestamp: new Date().toISOString(),
                    },
            },
        };
    }
}
/**
 * Utility functions for similarity calculations
 */
export class SimilarityUtils {
    /**
     * Calculate cosine similarity between two face embeddings
     */
    static cosineSimilarity(embedding1, embedding2) {
        if (embedding1.length !== embedding2.length) {
            throw new Error("Embeddings must have the same dimension");
        }
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
    /**
     * Check if similarity score meets threshold
     */
    static meetsThreshold(similarity, threshold) {
        return similarity >= threshold;
    }
    /**
     * Normalize similarity score to 0-1 range
     */
    static normalizeSimilarity(similarity) {
        return Math.max(0, Math.min(1, similarity));
    }
}
