"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

// Connection status indicator component with dialog
function ConnectionIndicator({
  sessionId,
  searchPhase,
}: {
  sessionId: string | undefined
  searchPhase: string
}) {
  const [isConnected, setIsConnected] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [backendUrl, setBackendUrl] = useState("")

  useEffect(() => {
    // Use NEXT_PUBLIC_BACKEND_URL from environment for all environments
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    setBackendUrl(url)

    // Check backend connection
    const checkConnection = async () => {
      try {
        const response = await fetch(url, { method: "HEAD" })
        setIsConnected(response.ok)
      } catch {
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 30000) // Check every 30s

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
        title="Click for connection details"
      >
        <div
          className={`
          w-3 h-3 rounded-full transition-all duration-300
          ${isConnected ? "bg-green-500" : "bg-red-500"}
          shadow-lg
          group-hover:scale-125
        `}
        >
          <div
            className={`
            absolute inset-0 rounded-full animate-ping
            ${isConnected ? "bg-green-400" : "bg-red-400"}
            opacity-75
          `}
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connection Status</DialogTitle>
            <DialogDescription>
              Backend connection and development information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <span className="text-sm font-medium">Backend Status</span>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isConnected ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Backend URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Backend API
              </label>
              <code className="block p-2 text-xs bg-gray-100 rounded border break-all">
                {backendUrl}
              </code>
            </div>

            {/* Session ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Session ID
              </label>
              <code className="block p-2 text-xs bg-gray-100 rounded border break-all">
                {sessionId || "None"}
              </code>
            </div>

            {/* Search Phase */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Search Phase
              </label>
              <div className="p-2 text-xs bg-gray-100 rounded border">
                <Badge variant="secondary">{searchPhase}</Badge>
              </div>
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Environment
              </label>
              <div className="p-2 text-xs bg-gray-100 rounded border">
                <Badge
                  variant={
                    process.env.NODE_ENV === "development"
                      ? "default"
                      : "secondary"
                  }
                >
                  {process.env.NODE_ENV || "production"}
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
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

  const getPhaseIcon = () => {
    switch (phase) {
      case "uploading":
        return "📤"
      case "detecting":
        return "🔍"
      case "searching":
        return "🎬"
      case "completed":
        return "✅"
      case "error":
        return "❌"
      default:
        return "⏳"
    }
  }

  if (phase === "idle") {
    return null
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPhaseIcon()}</span>
            <div>
              <p className="font-medium text-sm">{getPhaseDescription()}</p>
              {currentStep && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentStep}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={
              phase === "completed"
                ? "default"
                : phase === "error"
                ? "destructive"
                : "secondary"
            }
          >
            {phase === "error"
              ? "Failed"
              : phase === "completed"
              ? "Complete"
              : "Processing"}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {phase !== "completed" && phase !== "error" && (
          <div className="flex justify-center">
            <LoadingSpinner size="sm" />
          </div>
        )}
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
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false)

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
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Face Video Search
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Upload a photo to find similar faces in videos using advanced
                face recognition technology
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Image upload section */}
          <ImageUpload
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            onPrivacyClick={() => setIsPrivacyDialogOpen(true)}
          />

          {/* Search progress */}
          <SearchProgress
            phase={searchState.phase}
            progress={searchState.progress}
            currentStep={searchState.currentStep}
          />

          {/* Error display */}
          {searchState.error && (
            <Alert variant="destructive" className="border-none shadow-sm">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{searchState.error}</AlertDescription>
            </Alert>
          )}

          {/* New search button */}
          {(searchState.phase === "completed" ||
            searchState.phase === "error") && (
            <div className="flex justify-center">
              <Button
                onClick={handleNewSearch}
                variant="outline"
                size="lg"
                className="min-w-[200px]"
              >
                Start New Search
              </Button>
            </div>
          )}

          {/* Search results section */}
          {searchState.searchResults.length > 0 ? (
            <>
              <div className="py-4">
                <Separator />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Search Results ({searchState.searchResults.length})
                  </h2>
                </div>
                <SearchResults
                  results={searchState.searchResults}
                  isLoading={false}
                  error={null}
                  onThresholdChange={handleThresholdChange}
                  currentThreshold={similarityThreshold}
                />
              </div>
            </>
          ) : searchState.phase === "completed" ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-muted-foreground text-sm">
                No similar faces found. Try uploading a different image or
                adjusting the similarity threshold.
              </p>
            </div>
          ) : searchState.phase === "idle" ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📸</div>
              <p className="text-muted-foreground text-sm">
                Upload an image to start searching for similar faces
              </p>
            </div>
          ) : null}
        </div>
      </main>

      {/* Privacy & Security Dialog */}
      <Dialog open={isPrivacyDialogOpen} onOpenChange={setIsPrivacyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span className="text-2xl">🔒</span>
              <span>Privacy & Security</span>
            </DialogTitle>
            <DialogDescription>
              Your privacy and data security are our top priorities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-lg flex-shrink-0 mt-0.5">
                  ⏱️
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Automatic Deletion
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Your images are processed securely and automatically deleted
                    after 1 hour. We don't keep your photos longer than
                    necessary.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-lg flex-shrink-0 mt-0.5">
                  🔐
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Encrypted Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Face recognition data is encrypted and never stored
                    permanently. All biometric information is protected with
                    industry-standard encryption.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-lg flex-shrink-0 mt-0.5">
                  🛡️
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    Security Scanning
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    All uploads are scanned for security threats and validated
                    before processing. We protect against malicious files and
                    ensure safe operations.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-lg flex-shrink-0 mt-0.5">
                  ⚖️
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">
                    GDPR Compliance
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We comply with GDPR and international privacy regulations.
                    Your biometric data is treated as sensitive personal
                    information with appropriate safeguards.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> This application processes facial
                recognition data temporarily for search purposes only. No data
                is shared with third parties or used for any other purpose.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fixed connection status indicator with dialog */}
      <ConnectionIndicator
        sessionId={currentSession?.id}
        searchPhase={searchState.phase}
      />
    </>
  )
}
