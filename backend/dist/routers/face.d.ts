export declare const faceRouter: {
    processImage: import("@orpc/server").Procedure<import("@orpc/server").MergedInitialContext<Record<never, never>, Record<never, never>, Record<never, never>>, Record<never, never>, import("zod").ZodObject<{
        imageData: import("zod").ZodCustom<Buffer<ArrayBufferLike>, Buffer<ArrayBufferLike>>;
    }, import("zod/v4/core").$strip>, import("@orpc/contract").Schema<{
        success: boolean;
        faceDetected: boolean;
        searchId: string;
        embedding?: number[] | undefined;
    }, {
        success: boolean;
        faceDetected: boolean;
        searchId: string;
        embedding?: number[] | undefined;
    }>, import("@orpc/contract").MergedErrorMap<Record<never, never>, Record<never, never>>, Record<never, never>>;
};
//# sourceMappingURL=face.d.ts.map