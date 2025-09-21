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
