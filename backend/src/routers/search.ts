import { os } from "@orpc/server"
import {
  GetResultsInputSchema,
  ConfigureSearchInputSchema,
  type GetResultsOutput,
  type ConfigureSearchOutput,
} from "../contracts/api.js"
import { sessionService } from "../services/sessionService.js"
import { similarityMatchingService } from "../services/similarityMatchingService.js"

// Search results router
export const searchRouter = os.router({
  getResults: os
    .input(GetResultsInputSchema)
    .handler(async ({ input }): Promise<GetResultsOutput> => {
      try {
        console.log("Getting results for search ID:", input.searchId)

        // Get session from session service
        const sessionResult = sessionService.getSession(input.searchId)

        if (!sessionResult.success || !sessionResult.data) {
          return {
            results: [],
            status: "error",
            progress: 0,
          }
        }

        const session = sessionResult.data

        return {
          results: session.results,
          status: session.status,
          progress:
            session.status === "completed"
              ? 100
              : session.status === "processing"
              ? 50
              : 0,
        }
      } catch (error) {
        console.error("Get results error:", error)
        return {
          results: [],
          status: "error",
          progress: 0,
        }
      }
    }),

  configure: os
    .input(ConfigureSearchInputSchema)
    .handler(async ({ input }): Promise<ConfigureSearchOutput> => {
      try {
        console.log(
          "Configuring search:",
          input.searchId,
          "with threshold:",
          input.threshold
        )

        // Get session from session service
        const sessionResult = sessionService.getSession(input.searchId)

        if (!sessionResult.success || !sessionResult.data) {
          return {
            success: false,
            updatedResults: [],
          }
        }

        const session = sessionResult.data

        // Use similarity matching service to update results with new threshold
        const updateResult =
          similarityMatchingService.updateMatchesWithThreshold(
            session.results,
            input.threshold
          )

        if (!updateResult.success) {
          console.error(
            "Failed to update matches with threshold:",
            updateResult.error?.message
          )
          return {
            success: false,
            updatedResults: [],
          }
        }

        // Update session with new threshold and filtered results
        sessionService.updateSessionThreshold(input.searchId, input.threshold)
        sessionService.updateSessionResults(
          input.searchId,
          updateResult.matches
        )

        return {
          success: true,
          updatedResults: updateResult.matches,
        }
      } catch (error) {
        console.error("Configure search error:", error)
        return {
          success: false,
          updatedResults: [],
        }
      }
    }),
})
