"use client"

import React, { useState, useCallback, useEffect } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

import {
  ProductionConnectionIndicator,
  ConnectionBanner,
  ProductionConnectionDot,
  ConnectionDebug,
  EnvironmentBadge,
} from "../components"
import { ImageUpload } from "@/components/ImageUpload"
import SearchResults from "@/components/SearchResults"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { useSession } from "@/contexts/SessionProvider"
import {
  detectFaces,
  searchVideos,
  type UploadResult,
  type VideoSearchResult,
} from "@/lib/actions"

// Types for component state
interface SearchState {
  phase:
    | "idle"
    | "uploading"
    | "detecting"
    | "searching"
    | "completed"
    | "error"
  progress: number
  currentStep: string
  uploadedFileId?: string
  faceEmbedding?: number[]
  searchResults: VideoMatch[]
  error?: string
}

// Extend VideoMatch from actions to include faceCount for UI
type VideoMatch = NonNullable<VideoSearchResult["data"]>["results"][0] & {
  faceCount: number
}

// Search progress component
function SearchProgress({
  phase,
  progress,
  currentStep,
}: {
  phase: SearchState["phase"]
  progress: number
  currentStep: string
}) {
  const getPhaseDescription = () => {
    switch (phase) {
      case "uploading":
        return "Uploading and validating your image..."
      case "detecting":
        return "Detecting faces in your image..."
      case "searching":
        return "Searching videos for similar faces..."
      case "completed":
        return "Search completed successfully!"
      case "error":
        return "An error occurred during processing"
      default:
        return "Ready to start search"
    }
  }

  if (phase === "idle") {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Search Progress</CardTitle>
        <CardDescription>{getPhaseDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {currentStep && (
          <div className="text-sm text-muted-foreground">
            Current step: {currentStep}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Badge variant={phase === "completed" ? "default" : "secondary"}>
            {phase === "error"
              ? "Failed"
              : phase === "completed"
              ? "Complete"
              : "Processing"}
          </Badge>
          {phase !== "completed" && phase !== "error" && (
            <LoadingSpinner size="sm" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Main page component
export default function Home() {
  // Session management
  const {
    currentSession,
    createSession,
    updateSessionResults,
    updateSessionStatus,
    updateThreshold,
    clearSession,
  } = useSession()

  // Component state
  const [searchState, setSearchState] = useState<SearchState>({
    phase: "idle",
    progress: 0,
    currentStep: "",
    searchResults: [],
  })

  const [similarityThreshold, setSimilarityThreshold] = useState(0.7)

  // Event handlers
  const handleUploadSuccess = useCallback(
    async (uploadData: UploadResult["data"]) => {
      if (!uploadData) return

      try {
        // Create new session
        const sessionId = await createSession()

        // Update search state
        setSearchState(prev => ({
          ...prev,
          phase: "detecting",
          progress: 25,
          currentStep: "Analyzing uploaded image for faces",
          uploadedFileId: uploadData.fileId,
        }))

        // Detect faces in uploaded image
        const formData = new FormData()
        formData.append("fileId", uploadData.fileId)

        const faceResult = await detectFaces(formData)

        if (!faceResult.success || !faceResult.data?.faceDetected) {
          setSearchState(prev => ({
            ...prev,
            phase: "error",
            error:
              faceResult.error?.message ||
              "No face detected in the uploaded image",
          }))
          updateSessionStatus(sessionId, "error", "No face detected")
          return
        }

        // Update progress
        setSearchState(prev => {
          const newState: SearchState = {
            ...prev,
            phase: "searching",
            progress: 50,
            currentStep: "Searching videos for similar faces",
          }
          if (faceResult.data?.embedding) {
            newState.faceEmbedding = faceResult.data.embedding
          }
          return newState
        })

        // Search videos with face embedding
        const searchFormData = new FormData()
        searchFormData.append(
          "embedding",
          JSON.stringify(faceResult.data?.embedding || [])
        )
        searchFormData.append("threshold", similarityThreshold.toString())

        const searchResult = await searchVideos(searchFormData)

        if (!searchResult.success) {
          setSearchState(prev => ({
            ...prev,
            phase: "error",
            error: searchResult.error?.message || "Video search failed",
          }))
          updateSessionStatus(sessionId, "error", "Video search failed")
          return
        }

        // Update results and add faceCount from detectedFaces
        const results = (searchResult.data?.results || []).map(result => ({
          ...result,
          faceCount: result.detectedFaces?.length || 0,
        }))
        setSearchState(prev => ({
          ...prev,
          phase: "completed",
          progress: 100,
          currentStep: "Search completed",
          searchResults: results,
        }))

        // Update session with results
        updateSessionResults(sessionId, results)
        updateSessionStatus(sessionId, "completed")
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Search failed"
        setSearchState(prev => ({
          ...prev,
          phase: "error",
          error: errorMessage,
        }))
      }
    },
    [
      createSession,
      updateSessionResults,
      updateSessionStatus,
      similarityThreshold,
    ]
  )

  const handleUploadError = useCallback((error: string) => {
    setSearchState(prev => ({
      ...prev,
      phase: "error",
      error,
    }))
  }, [])

  const handleThresholdChange = useCallback(
    async (newThreshold: number) => {
      setSimilarityThreshold(newThreshold)

      if (currentSession?.id && searchState.faceEmbedding) {
        try {
          await updateThreshold(currentSession.id, newThreshold)

          // Re-run search with new threshold
          const searchFormData = new FormData()
          searchFormData.append(
            "embedding",
            JSON.stringify(searchState.faceEmbedding)
          )
          searchFormData.append("threshold", newThreshold.toString())

          const searchResult = await searchVideos(searchFormData)

          if (searchResult.success && searchResult.data) {
            const results = searchResult.data.results.map(result => ({
              ...result,
              faceCount: result.detectedFaces?.length || 0,
            }))
            setSearchState(prev => ({
              ...prev,
              searchResults: results,
            }))
            updateSessionResults(currentSession.id, results)
          }
        } catch (error) {
          console.error("Failed to update threshold:", error)
        }
      }
    },
    [
      currentSession,
      searchState.faceEmbedding,
      updateThreshold,
      updateSessionResults,
    ]
  )

  const handleNewSearch = useCallback(() => {
    setSearchState({
      phase: "idle",
      progress: 0,
      currentStep: "",
      searchResults: [],
    })
    setSimilarityThreshold(0.7)
    clearSession()
  }, [clearSession])

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchState.phase !== "idle" && searchState.phase !== "completed") {
        // Cleanup any ongoing operations
        clearSession()
      }
    }
  }, [searchState.phase, clearSession])

  return (
    <>
      {/* Connection status banner for critical issues */}
      <ConnectionBanner />

      <main className="min-h-screen bg-gray-50 py-8">
        {/* Header with connection status */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <EnvironmentBadge />
          <ProductionConnectionDot />
        </div>

        <div className="max-w-6xl mx-auto px-4 space-y-8">
          {/* Page header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">
              Face Video Search
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Upload a photo to find similar faces in videos using advanced face
              recognition technology
            </p>
          </div>

          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Upload and controls */}
            <div className="space-y-6">
              {/* Image upload component */}
              <ImageUpload
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />

              {/* Search progress */}
              <SearchProgress
                phase={searchState.phase}
                progress={searchState.progress}
                currentStep={searchState.currentStep}
              />

              {/* Error display */}
              {searchState.error && (
                <Alert variant="destructive">
                  <AlertTitle>Search Error</AlertTitle>
                  <AlertDescription>{searchState.error}</AlertDescription>
                </Alert>
              )}

              {/* New search button */}
              {(searchState.phase === "completed" ||
                searchState.phase === "error") && (
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      onClick={handleNewSearch}
                      className="w-full"
                      variant="outline"
                    >
                      Start New Search
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Debug info in development */}
              {process.env.NODE_ENV === "development" && (
                <div className="space-y-4">
                  <div className="border-t border-gray-200" />
                  <ConnectionDebug />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <h4 className="font-semibold text-blue-800 mb-2">
                      Development Info
                    </h4>
                    <p className="text-blue-700">
                      Backend API:{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        https://faceapp-lhtz.onrender.com
                      </code>
                    </p>
                    <p className="text-blue-700 mt-1">
                      Session ID: {currentSession?.id || "None"}
                    </p>
                    <p className="text-blue-700">
                      Search Phase: {searchState.phase}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Search results */}
            <div className="space-y-6">
              {searchState.phase === "completed" &&
              searchState.searchResults.length > 0 ? (
                <SearchResults
                  results={searchState.searchResults}
                  isLoading={false}
                  error={null}
                  onThresholdChange={handleThresholdChange}
                  currentThreshold={similarityThreshold}
                />
              ) : searchState.phase === "completed" &&
                searchState.searchResults.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      No Similar Faces Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      We couldn't find any videos with faces similar to your
                      uploaded image.
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Try:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Uploading a clearer image with better lighting</li>
                        <li>Using a photo where the face is more visible</li>
                        <li>Lowering the similarity threshold</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold mb-2">
                      Ready to Search
                    </h3>
                    <p className="text-muted-foreground">
                      Upload an image to start searching for similar faces in
                      videos
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Privacy notice */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-xl">🔒</div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-green-800">
                    Privacy & Security
                  </h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      • Your images are processed securely and automatically
                      deleted after 1 hour
                    </p>
                    <p>
                      • Face recognition data is encrypted and never stored
                      permanently
                    </p>
                    <p>
                      • All uploads are scanned for security and validated
                      before processing
                    </p>
                    <p>• We comply with GDPR and privacy regulations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Floating connection status indicator */}
      <ProductionConnectionIndicator
        position="top-left"
        showInDevelopment={true}
      />
    </>
  )
}
