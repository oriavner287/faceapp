"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import {
  Upload,
  Search,
  Video,
  Lock,
  Timer,
  Shield,
  Scale,
  Filter,
  SortAsc,
  SortDesc,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageUpload } from "@/components/ImageUpload"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
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

    // Check backend connection using /health endpoint
    const checkConnection = async () => {
      try {
        const response = await fetch(`${url}/health`, { method: "GET" })
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
  currentStep,
}: {
  phase: SearchState["phase"]
  currentStep: string
}) {
  // Hide progress section when idle, completed, or error
  if (phase === "idle" || phase === "completed" || phase === "error") {
    return null
  }

  const getPhaseDescription = () => {
    switch (phase) {
      case "uploading":
        return "Uploading and validating your image..."
      case "detecting":
        return "Detecting faces in your image..."
      case "searching":
        return "Searching videos for similar faces..."
    }
  }

  const getPhaseIcon = () => {
    switch (phase) {
      case "uploading":
        return <Upload className="h-5 w-5" />
      case "detecting":
        return <Search className="h-5 w-5" />
      case "searching":
        return <Video className="h-5 w-5" />
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getPhaseIcon()}
            <div>
              <p className="font-medium text-sm">{getPhaseDescription()}</p>
              {currentStep && (
                <p className="text-xs text-muted-foreground mt-1">
                  {currentStep}
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary">Processing</Badge>
        </div>

        <div className="flex justify-center">
          <LoadingSpinner size="sm" />
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
  const { toast } = useToast()

  // Filter and sort state
  const [sortBy, setSortBy] = useState<"similarity" | "title" | "source">(
    "similarity"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterBy, setFilterBy] = useState<"all" | "high" | "medium" | "low">(
    "all"
  )

  // Helper functions for filtering
  const getSimilarityCategory = (score: number): "high" | "medium" | "low" => {
    if (score >= 0.8) return "high"
    if (score >= 0.6) return "medium"
    return "low"
  }

  // Filtered and sorted results
  const processedResults = useMemo(() => {
    let filtered = searchState.searchResults

    // Apply similarity filter
    if (filterBy !== "all") {
      filtered = filtered.filter(
        result => getSimilarityCategory(result.similarityScore) === filterBy
      )
    }

    // Sort results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case "similarity":
          comparison = a.similarityScore - b.similarityScore
          break
        case "title":
          comparison = a.title.localeCompare(b.title)
          break
        case "source":
          comparison = a.sourceWebsite.localeCompare(b.sourceWebsite)
          break
        default:
          comparison = 0
      }

      return sortOrder === "desc" ? -comparison : comparison
    })

    return sorted
  }, [searchState.searchResults, filterBy, sortBy, sortOrder])

  // Result stats for filter counts
  const resultStats = useMemo(() => {
    const total = searchState.searchResults.length
    const high = searchState.searchResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "high"
    ).length
    const medium = searchState.searchResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "medium"
    ).length
    const low = searchState.searchResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "low"
    ).length

    return { total, high, medium, low }
  }, [searchState.searchResults])

  // Event handlers
  const handleUploadSuccess = useCallback(
    async (uploadData: UploadResult["data"]) => {
      if (!uploadData) return

      try {
        // Create new session
        const sessionId = await createSession()

        // Update search state and clear any previous errors
        setSearchState(prev => {
          const { error, ...rest } = prev
          return {
            ...rest,
            phase: "detecting",
            progress: 25,
            currentStep: "Analyzing uploaded image for faces",
            uploadedFileId: uploadData.fileId,
          }
        })

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

        // Show success toast
        toast({
          title: "Search Complete!",
          description: `Found ${results.length} matching video${
            results.length !== 1 ? "s" : ""
          } with similar faces.`,
        })
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

  const handleUploadStart = useCallback(() => {
    // Clear any previous errors when starting a new upload
    setSearchState(prev => {
      const { error, ...rest } = prev
      return {
        ...rest,
        phase: "uploading",
        progress: 10,
        currentStep: "Uploading image...",
      }
    })
  }, [])

  const handleFileSelected = useCallback(() => {
    // Clear any previous errors when a new file is selected
    setSearchState(prev => {
      const { error, ...rest } = prev
      return rest
    })
  }, [])

  const handlePreUploadThresholdChange = useCallback((newThreshold: number) => {
    setSimilarityThreshold(newThreshold)
  }, [])

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as "similarity" | "title" | "source")
  }, [])

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
  }, [])

  const handleFilterChange = useCallback((value: string) => {
    setFilterBy(value as "all" | "high" | "medium" | "low")
  }, [])

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

  // Auto-cleanup on unmount only (not on phase changes)
  useEffect(() => {
    return () => {
      // Only cleanup when component unmounts, not on every phase change
      // This prevents infinite loops while still cleaning up on page navigation
      if (searchState.phase !== "idle" && searchState.phase !== "completed") {
        clearSession()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount/unmount

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

        {/* Upload section - centered with max-w-2xl */}
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Image upload section - hide after completion */}
          {searchState.phase !== "completed" && (
            <ImageUpload
              key={searchState.phase === "idle" ? "reset" : "active"}
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              onUploadStart={handleUploadStart}
              onFileSelected={handleFileSelected}
              onPrivacyClick={() => setIsPrivacyDialogOpen(true)}
              onThresholdChange={handlePreUploadThresholdChange}
              initialThreshold={similarityThreshold}
            />
          )}

          {/* Search progress */}
          <SearchProgress
            phase={searchState.phase}
            currentStep={searchState.currentStep}
          />

          {/* Error display */}
          {searchState.error && (
            <Alert variant="destructive" className="border-none shadow-sm">
              <AlertTitle>Search Error</AlertTitle>
              <AlertDescription>{searchState.error}</AlertDescription>
            </Alert>
          )}

          {/* New search button - only show when completed with results */}
          {searchState.phase === "completed" && (
            <div className="flex justify-center items-center -mb-2">
              <Button
                onClick={handleNewSearch}
                size="lg"
                className="min-w-[240px] h-12 text-base font-semibold px-6"
              >
                <Upload className="h-5 w-5 mr-2" />
                Start New Search
              </Button>
            </div>
          )}
        </div>

        {/* Results section - full width with margins */}
        {searchState.searchResults.length > 0 ? (
          <div className="w-full px-8 pt-1 pb-8">
            <div className="pb-2">
              <Separator />
            </div>

            {/* Filter and sort controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filter:</span>
                <Select value={filterBy} onValueChange={handleFilterChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All ({resultStats.total})
                    </SelectItem>
                    <SelectItem value="high">
                      High ({resultStats.high})
                    </SelectItem>
                    <SelectItem value="medium">
                      Medium ({resultStats.medium})
                    </SelectItem>
                    <SelectItem value="low">Low ({resultStats.low})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="similarity">Similarity</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="source">Source</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSortOrderToggle}
                  className="px-2"
                >
                  {sortOrder === "desc" ? (
                    <SortDesc className="h-4 w-4" />
                  ) : (
                    <SortAsc className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedResults.map(result => (
                <Card key={result.id} className="overflow-hidden">
                  <div className="aspect-video relative bg-muted">
                    {result.thumbnailUrl && (
                      <img
                        src={result.thumbnailUrl}
                        alt={`Thumbnail for ${result.title}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="default">
                        {(result.similarityScore * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                      {result.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {result.sourceWebsite} • {result.faceCount} face
                      {result.faceCount !== 1 ? "s" : ""}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(result.videoUrl, "_blank")}
                    >
                      Watch Video
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : searchState.phase === "completed" ? (
          <div className="max-w-4xl mx-auto px-4 text-center py-12">
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No similar faces found. Try uploading a different image or
              adjusting the similarity threshold.
            </p>
          </div>
        ) : null}
      </main>

      {/* Privacy & Security Dialog */}
      <Dialog open={isPrivacyDialogOpen} onOpenChange={setIsPrivacyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Privacy & Security</span>
            </DialogTitle>
            <DialogDescription>
              Your privacy and data security are our top priorities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="text-green-600 flex-shrink-0 mt-0.5">
                  <Timer className="h-5 w-5" />
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
                <div className="text-green-600 flex-shrink-0 mt-0.5">
                  <Lock className="h-5 w-5" />
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
                <div className="text-green-600 flex-shrink-0 mt-0.5">
                  <Shield className="h-5 w-5" />
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
                <div className="text-green-600 flex-shrink-0 mt-0.5">
                  <Scale className="h-5 w-5" />
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

      {/* Toast notifications */}
      <Toaster />
    </>
  )
}
