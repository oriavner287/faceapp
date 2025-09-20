export declare const searchRouter: {
    getResults: import("@orpc/server").Procedure<import("@orpc/server").MergedInitialContext<Record<never, never>, Record<never, never>, Record<never, never>>, Record<never, never>, import("zod").ZodObject<{
        searchId: import("zod").ZodString;
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
        status: string;
        progress: number;
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
        status: string;
        progress: number;
    }>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
    configure: import("@orpc/server").Procedure<import("@orpc/server").MergedInitialContext<Record<never, never>, Record<never, never>, Record<never, never>>, Record<never, never>, import("zod").ZodObject<{
        searchId: import("zod").ZodString;
        threshold: import("zod").ZodNumber;
    }, import("zod/v4/core").$strip>, import("@orpc/contract").Schema<{
        success: boolean;
        updatedResults: {
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
    }, {
        success: boolean;
        updatedResults: {
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
    }>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
//# sourceMappingURL=search.d.ts.map