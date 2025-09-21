import { os } from "@orpc/server";
import { ProcessImageInputSchema, } from "../contracts/api.js";
import { faceDetectionService } from "../services/faceDetectionService.js";
// Face processing router
export const faceRouter = os.router({
    processImage: os
        .input(ProcessImageInputSchema)
        .handler(async ({ input }) => {
        try {
            console.log("Processing image of size:", input.imageData.length);
            // Initialize face detection service if needed
            await faceDetectionService.initialize();
            // Generate embedding from the uploaded image
            const embeddingResult = await faceDetectionService.generateEmbedding(input.imageData);
            if (!embeddingResult.success) {
                console.error("Face detection failed:", embeddingResult.error);
                return {
                    success: false,
                    faceDetected: false,
                    searchId: "",
                };
            }
            // Generate unique search ID
            const searchId = `search_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 11)}`;
            console.log(`Face detected successfully. Search ID: ${searchId}`);
            return {
                success: true,
                faceDetected: true,
                searchId,
                embedding: embeddingResult.embedding,
            };
        }
        catch (error) {
            console.error("Face processing error:", error);
            return {
                success: false,
                faceDetected: false,
                searchId: "",
            };
        }
    }),
});
