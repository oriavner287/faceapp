import { os } from "@orpc/server"
import {
  FetchVideosInputSchema,
  type FetchVideosOutput,
} from "../contracts/api"

// Video fetching router
export const videoRouter = os.router({
  fetchFromSites: os
    .input(FetchVideosInputSchema)
    .handler(async ({ input }): Promise<FetchVideosOutput> => {
      // TODO: Implement video fetching from predefined sites
      // This is a placeholder implementation
      try {
        console.log(
          "Fetching videos with embedding length:",
          input.embedding.length
        )
        console.log("Using threshold:", input.threshold)

        // Predefined websites (as per requirements)
        const websites = [
          "https://example.com/site1",
          "https://example.com/site2",
          "https://example.com/site3",
        ]

        return {
          results: [], // This will be populated with actual video matches
          processedSites: websites,
          errors: [],
        }
      } catch (error) {
        console.error("Fetch videos error:", error)
        return {
          results: [],
          processedSites: [],
          errors: [error instanceof Error ? error.message : "Unknown error"],
        }
      }
    }),
})
