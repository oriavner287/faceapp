import { z } from "zod";
export declare const ProcessImageInputSchema: z.ZodObject<{
    imageData: z.ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>;
}, z.core.$strip>;
export declare const GetResultsInputSchema: z.ZodObject<{
    searchId: z.ZodString;
}, z.core.$strip>;
export declare const ConfigureSearchInputSchema: z.ZodObject<{
    searchId: z.ZodString;
    threshold: z.ZodNumber;
}, z.core.$strip>;
export declare const FetchVideosInputSchema: z.ZodObject<{
    embedding: z.ZodArray<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const ProcessImageOutputSchema: z.ZodObject<{
    success: z.ZodBoolean;
    faceDetected: z.ZodBoolean;
    searchId: z.ZodString;
    embedding: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
}, z.core.$strip>;
export declare const GetResultsOutputSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        thumbnailUrl: z.ZodString;
        videoUrl: z.ZodString;
        sourceWebsite: z.ZodString;
        similarityScore: z.ZodNumber;
        detectedFaces: z.ZodArray<z.ZodObject<{
            boundingBox: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, z.core.$strip>;
            embedding: z.ZodArray<z.ZodNumber>;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    status: z.ZodString;
    progress: z.ZodNumber;
}, z.core.$strip>;
export declare const ConfigureSearchOutputSchema: z.ZodObject<{
    success: z.ZodBoolean;
    updatedResults: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        thumbnailUrl: z.ZodString;
        videoUrl: z.ZodString;
        sourceWebsite: z.ZodString;
        similarityScore: z.ZodNumber;
        detectedFaces: z.ZodArray<z.ZodObject<{
            boundingBox: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, z.core.$strip>;
            embedding: z.ZodArray<z.ZodNumber>;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const FetchVideosOutputSchema: z.ZodObject<{
    results: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        thumbnailUrl: z.ZodString;
        videoUrl: z.ZodString;
        sourceWebsite: z.ZodString;
        similarityScore: z.ZodNumber;
        detectedFaces: z.ZodArray<z.ZodObject<{
            boundingBox: z.ZodObject<{
                x: z.ZodNumber;
                y: z.ZodNumber;
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, z.core.$strip>;
            embedding: z.ZodArray<z.ZodNumber>;
            confidence: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    processedSites: z.ZodArray<z.ZodString>;
    errors: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type ProcessImageInput = z.infer<typeof ProcessImageInputSchema>;
export type GetResultsInput = z.infer<typeof GetResultsInputSchema>;
export type ConfigureSearchInput = z.infer<typeof ConfigureSearchInputSchema>;
export type FetchVideosInput = z.infer<typeof FetchVideosInputSchema>;
export type ProcessImageOutput = z.infer<typeof ProcessImageOutputSchema>;
export type GetResultsOutput = z.infer<typeof GetResultsOutputSchema>;
export type ConfigureSearchOutput = z.infer<typeof ConfigureSearchOutputSchema>;
export type FetchVideosOutput = z.infer<typeof FetchVideosOutputSchema>;
//# sourceMappingURL=api.d.ts.map