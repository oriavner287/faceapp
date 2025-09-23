// API contracts and shared types for oRPC integration
// This file defines the type-safe contracts between frontend and backend
import { z } from "zod";
// Input validation schemas for API endpoints
export const ProcessImageInputSchema = z.object({
    imageData: z.instanceof(Buffer),
});
export const GetResultsInputSchema = z.object({
    searchId: z.string().min(1),
});
export const ConfigureSearchInputSchema = z.object({
    searchId: z.string().min(1),
    threshold: z.number().min(0.1).max(1.0),
});
export const FetchVideosInputSchema = z.object({
    embedding: z.array(z.number()),
    threshold: z.number().min(0.1).max(1.0).optional().default(0.7),
});
// Additional schemas for face router endpoints
export const GetSessionInputSchema = z.object({
    sessionId: z.string().min(1),
});
export const UpdateThresholdInputSchema = z.object({
    sessionId: z.string().min(1),
    threshold: z.number().min(0.1).max(1.0),
});
export const DeleteSessionInputSchema = z.object({
    sessionId: z.string().min(1),
});
// Output type schemas (for runtime validation if needed)
export const ProcessImageOutputSchema = z.object({
    success: z.boolean(),
    faceDetected: z.boolean(),
    searchId: z.string(),
    embedding: z.array(z.number()).optional(),
});
export const GetResultsOutputSchema = z.object({
    results: z.array(z.object({
        id: z.string(),
        title: z.string(),
        thumbnailUrl: z.string(),
        videoUrl: z.string(),
        sourceWebsite: z.string(),
        similarityScore: z.number(),
        detectedFaces: z.array(z.object({
            boundingBox: z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number(),
            }),
            embedding: z.array(z.number()),
            confidence: z.number(),
        })),
    })),
    status: z.string(),
    progress: z.number(),
});
export const ConfigureSearchOutputSchema = z.object({
    success: z.boolean(),
    updatedResults: z.array(z.object({
        id: z.string(),
        title: z.string(),
        thumbnailUrl: z.string(),
        videoUrl: z.string(),
        sourceWebsite: z.string(),
        similarityScore: z.number(),
        detectedFaces: z.array(z.object({
            boundingBox: z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number(),
            }),
            embedding: z.array(z.number()),
            confidence: z.number(),
        })),
    })),
});
export const FetchVideosOutputSchema = z.object({
    results: z.array(z.object({
        id: z.string(),
        title: z.string(),
        thumbnailUrl: z.string(),
        videoUrl: z.string(),
        sourceWebsite: z.string(),
        similarityScore: z.number(),
        detectedFaces: z.array(z.object({
            boundingBox: z.object({
                x: z.number(),
                y: z.number(),
                width: z.number(),
                height: z.number(),
            }),
            embedding: z.array(z.number()),
            confidence: z.number(),
        })),
    })),
    processedSites: z.array(z.string()),
    errors: z.array(z.string()),
});
// Output schemas for face router endpoints
export const GetSessionOutputSchema = z.object({
    success: z.boolean(),
    session: z
        .object({
        id: z.string(),
        status: z.enum(["processing", "completed", "error"]),
        results: z.array(z.any()),
        threshold: z.number(),
        createdAt: z.string(),
        expiresAt: z.string(),
    })
        .optional(),
    error: z
        .object({
        code: z.string(),
        message: z.string(),
    })
        .optional(),
});
export const UpdateThresholdOutputSchema = z.object({
    success: z.boolean(),
    updatedResults: z.array(z.any()).optional(),
    error: z
        .object({
        code: z.string(),
        message: z.string(),
    })
        .optional(),
});
export const DeleteSessionOutputSchema = z.object({
    success: z.boolean(),
    error: z
        .object({
        code: z.string(),
        message: z.string(),
    })
        .optional(),
});
export const HealthCheckOutputSchema = z.object({
    success: z.boolean(),
    status: z.string(),
    error: z.string().optional(),
    details: z
        .object({
        modelsAvailable: z.boolean().optional(),
        initializationStatus: z.string().optional(),
        activeSessionsCount: z.number().optional(),
        responseTimeMs: z.number().optional(),
    })
        .optional(),
    timestamp: z.string(),
});
export const SessionStatsOutputSchema = z.object({
    success: z.boolean(),
    stats: z
        .object({
        totalActiveSessions: z.number(),
        sessionsByStatus: z.object({
            processing: z.number(),
            completed: z.number(),
            error: z.number(),
        }),
        oldestSession: z.number().nullable(),
        newestSession: z.number().nullable(),
    })
        .optional(),
    error: z
        .object({
        code: z.string(),
        message: z.string(),
    })
        .optional(),
    timestamp: z.string(),
});
export const CleanupSessionsOutputSchema = z.object({
    success: z.boolean(),
    cleaned: z.number().optional(),
    before: z.number().optional(),
    after: z.number().optional(),
    error: z
        .object({
        code: z.string(),
        message: z.string(),
    })
        .optional(),
    timestamp: z.string(),
});
