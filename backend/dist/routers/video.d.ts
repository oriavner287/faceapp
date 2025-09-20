export declare const videoRouter: {
    fetchFromSites: import("@orpc/server").Procedure<import("@orpc/server").MergedInitialContext<Record<never, never>, Record<never, never>, Record<never, never>>, Record<never, never>, import("zod").ZodObject<{
        embedding: import("zod").ZodArray<import("zod").ZodNumber>;
        threshold: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodNumber>>;
    }, import("zod/v4/core").$strip>, import("@orpc/contract").Schema<{
        results: {
            id: string;
            title: string;
            thumbnailUrl: string;
            videoUrl: string;
            sourceWebsite: string;
            similarityScore: number;
            detectedFaces: {
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                embedding: number[];
                confidence: number;
            }[];
        }[];
        processedSites: string[];
        errors: string[];
    }, {
        results: {
            id: string;
            title: string;
            thumbnailUrl: string;
            videoUrl: string;
            sourceWebsite: string;
            similarityScore: number;
            detectedFaces: {
                boundingBox: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                };
                embedding: number[];
                confidence: number;
            }[];
        }[];
        processedSites: string[];
        errors: string[];
    }>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
//# sourceMappingURL=video.d.ts.map