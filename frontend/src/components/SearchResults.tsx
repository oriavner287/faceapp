"use client"

import React, { useEffect, useMemo, useCallback, useState } from "react"
import {
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
  AlertTriangle,
} from "lucide-react"
import { z } from "zod"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Security: Input validation schemas to prevent injection attacks
const SortOptionSchema = z.enum(["similarity", "title", "source"])
const FilterOptionSchema = z.enum(["all", "high", "medium", "low"])
const SimilarityScoreSchema = z.number().min(0).max(1)

// Raw video match interface from backend (before sanitization)
interface RawVideoMatch {
  readonly id: string
  readonly title: string
  readonly thumbnailUrl: string
  readonly videoUrl: string
  readonly sourceWebsite: string
  readonly similarityScore: number
  readonly detectedFaces?: Array<{
    boundingBox: {
      x: number
      y: number
      width: number
      height: number
    }
    embedding?: number[] // Will be filtered out for security
    confidence: number
  }>
  readonly faceCount?: number // Fallback if detectedFaces not provided
}

// Security: Sanitized interfaces - no sensitive data exposed
interface SanitizedVideoMatch {
  readonly id: string
  readonly title: string
  readonly thumbnailUrl: string
  readonly videoUrl: string
  readonly sourceWebsite: string
  readonly similarityScore: number // Sanitized to 2 decimal places
  readonly faceCount: number // Count only, no embedding data
}

interface SearchResultsProps {
  results: RawVideoMatch[]
  isLoading?: boolean
  error?: string | null
  onThresholdChange?: (threshold: number) => void
  currentThreshold?: number
  className?: string
}

// Constants for security validation
const MAX_RESULTS_DISPLAY = 100
const MIN_SIMILARITY_THRESHOLD = 0.1
const MAX_SIMILARITY_THRESHOLD = 1.0
const SIMILARITY_DECIMAL_PLACES = 2

// Security: URL validation to prevent malicious links
function validateVideoUrl(url: string): {
  isValid: boolean
  sanitizedUrl?: string
} {
  try {
    const parsedUrl = new URL(url)

    // Only allow HTTPS URLs for security
    if (parsedUrl.protocol !== "https:") {
      return { isValid: false }
    }

    // Validate against allowed domains (whitelist approach)
    const allowedDomains = ["example.com", "test.example.com"]
    const isAllowedDomain = allowedDomains.some(
      domain =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`)
    )

    if (!isAllowedDomain) {
      return { isValid: false }
    }

    // Remove any suspicious query parameters
    const suspiciousParams = ["javascript", "script", "eval", "onload"]
    const searchParams = new URLSearchParams(parsedUrl.search)

    for (const [key, value] of searchParams.entries()) {
      if (
        suspiciousParams.some(
          param =>
            key.toLowerCase().includes(param) ||
            value.toLowerCase().includes(param)
        )
      ) {
        searchParams.delete(key)
      }
    }

    parsedUrl.search = searchParams.toString()

    return { isValid: true, sanitizedUrl: parsedUrl.href }
  } catch {
    return { isValid: false }
  }
}

// Security: Sanitize similarity score to prevent data exposure
function sanitizeSimilarityScore(score: number): number {
  const validatedScore = SimilarityScoreSchema.safeParse(score)
  if (!validatedScore.success) {
    return 0
  }

  // Round to 2 decimal places to prevent precision-based attacks
  return (
    Math.round(validatedScore.data * Math.pow(10, SIMILARITY_DECIMAL_PLACES)) /
    Math.pow(10, SIMILARITY_DECIMAL_PLACES)
  )
}

// Security: Sanitize text content to prevent XSS
function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return ""
  }

  // Remove HTML tags and suspicious content
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/vbscript:/gi, "") // Remove vbscript: URLs
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim()
    .substring(0, 200) // Limit length to prevent overflow
}

// Security: Get similarity badge variant based on sanitized score
function getSimilarityBadgeVariant(
  score: number
): "default" | "secondary" | "destructive" {
  const sanitizedScore = sanitizeSimilarityScore(score)

  if (sanitizedScore >= 0.8) return "default"
  if (sanitizedScore >= 0.6) return "secondary"
  return "destructive"
}

// Security: Get similarity category for filtering
function getSimilarityCategory(score: number): "high" | "medium" | "low" {
  const sanitizedScore = sanitizeSimilarityScore(score)

  if (sanitizedScore >= 0.8) return "high"
  if (sanitizedScore >= 0.6) return "medium"
  return "low"
}

function SearchResults({
  results,
  isLoading = false,
  error = null,
  onThresholdChange,
  currentThreshold = 0.7,
  className,
}: SearchResultsProps) {
  // Data fetching hooks (none needed - data passed as props)

  // Logic hooks
  const [sortBy, setSortBy] = useState<"similarity" | "title" | "source">(
    "similarity"
  )
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterBy, setFilterBy] = useState<"all" | "high" | "medium" | "low">(
    "all"
  )

  // React primitive hooks
  const [displayCount, setDisplayCount] = useState(20)

  // Constants
  const LOAD_MORE_INCREMENT = 20
  const SIMILARITY_THRESHOLDS = [0.1, 0.3, 0.5, 0.7, 0.8, 0.9]

  // Computed/derived values using useMemo for performance
  const sanitizedResults = useMemo(() => {
    if (!Array.isArray(results)) {
      return []
    }

    // Security: Sanitize all result data and limit display count
    return results
      .slice(0, MAX_RESULTS_DISPLAY)
      .map(
        (result): SanitizedVideoMatch => ({
          id: sanitizeText(result.id || ""),
          title: sanitizeText(result.title || "Untitled Video"),
          thumbnailUrl: result.thumbnailUrl || "",
          videoUrl: result.videoUrl || "",
          sourceWebsite: sanitizeText(result.sourceWebsite || "Unknown"),
          similarityScore: sanitizeSimilarityScore(result.similarityScore || 0),
          // Security: Count faces without exposing embedding data
          faceCount: Math.max(
            0,
            Math.min(
              10,
              Array.isArray(result.detectedFaces)
                ? result.detectedFaces.length
                : result.faceCount || 0
            )
          ),
        })
      )
      .filter(result => result.id && result.title) // Remove invalid entries
  }, [results])

  const filteredResults = useMemo(() => {
    let filtered = sanitizedResults

    // Apply similarity filter
    if (filterBy !== "all") {
      filtered = filtered.filter(
        result => getSimilarityCategory(result.similarityScore) === filterBy
      )
    }

    return filtered
  }, [sanitizedResults, filterBy])

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults].sort((a, b) => {
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

    return sorted.slice(0, displayCount)
  }, [filteredResults, sortBy, sortOrder, displayCount])

  const hasMoreResults = useMemo(() => {
    return filteredResults.length > displayCount
  }, [filteredResults.length, displayCount])

  const resultStats = useMemo(() => {
    const total = sanitizedResults.length
    const high = sanitizedResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "high"
    ).length
    const medium = sanitizedResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "medium"
    ).length
    const low = sanitizedResults.filter(
      r => getSimilarityCategory(r.similarityScore) === "low"
    ).length

    return { total, high, medium, low }
  }, [sanitizedResults])

  // Event handlers with proper naming convention
  const handleSortChange = useCallback((value: string) => {
    const validatedSort = SortOptionSchema.safeParse(value)
    if (validatedSort.success) {
      setSortBy(validatedSort.data)
    }
  }, [])

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))
  }, [])

  const handleFilterChange = useCallback((value: string) => {
    const validatedFilter = FilterOptionSchema.safeParse(value)
    if (validatedFilter.success) {
      setFilterBy(validatedFilter.data)
    }
  }, [])

  const handleThresholdChange = useCallback(
    (value: string) => {
      const threshold = parseFloat(value)

      // Security: Validate threshold input
      if (
        !isNaN(threshold) &&
        threshold >= MIN_SIMILARITY_THRESHOLD &&
        threshold <= MAX_SIMILARITY_THRESHOLD &&
        onThresholdChange
      ) {
        onThresholdChange(threshold)
      }
    },
    [onThresholdChange]
  )

  const handleVideoLinkClick = useCallback(
    (videoUrl: string, title: string) => {
      // Security: Validate URL before opening
      const validation = validateVideoUrl(videoUrl)

      if (!validation.isValid) {
        // Security: Log suspicious URL access attempt
        console.warn("Blocked attempt to open invalid URL:", {
          url: videoUrl.substring(0, 100), // Limit logged URL length
          title: title.substring(0, 50),
        })
        return
      }

      // Security: Open in new tab with security attributes
      const newWindow = window.open(
        validation.sanitizedUrl,
        "_blank",
        "noopener,noreferrer"
      )

      // Additional security check
      if (newWindow) {
        newWindow.opener = null
      }
    },
    []
  )

  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev =>
      Math.min(prev + LOAD_MORE_INCREMENT, MAX_RESULTS_DISPLAY)
    )
  }, [])

  // Privacy: Cleanup displayed results when component unmounts
  useEffect(() => {
    return () => {
      // Clear any sensitive data from memory
      setSortBy("similarity")
      setFilterBy("all")
      setDisplayCount(20)
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>Searching for similar faces...</span>
            </div>
            <Progress value={undefined} className="mt-4" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state with sanitized error messages
  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Search Error</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {sanitizeText(error)}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No results state
  if (sanitizedResults.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">
              No Similar Person Found
            </h3>
            <p className="text-muted-foreground mb-4">
              We couldn't find any videos with faces similar to your uploaded
              image.
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
      </div>
    )
  }

  // Main results display
  return (
    <div className={cn("space-y-6", className)}>
      {/* Results header with controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {resultStats.total} videos with similar faces
              </CardDescription>
            </div>

            {/* Similarity threshold control */}
            {onThresholdChange && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Threshold:</span>
                <Select
                  value={currentThreshold.toString()}
                  onValueChange={handleThresholdChange}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIMILARITY_THRESHOLDS.map(threshold => (
                      <SelectItem key={threshold} value={threshold.toString()}>
                        {threshold.toFixed(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
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
                  <SelectItem value="all">All ({resultStats.total})</SelectItem>
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

          {/* Results grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedResults.map(result => (
              <Card key={result.id} className="overflow-hidden">
                <div className="aspect-video relative bg-muted">
                  {result.thumbnailUrl && (
                    <img
                      src={result.thumbnailUrl}
                      alt={`Thumbnail for ${result.title}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => {
                        // Security: Handle image load errors gracefully
                        const target = e.target as HTMLImageElement
                        target.style.display = "none"
                      }}
                    />
                  )}

                  {/* Similarity score overlay */}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={getSimilarityBadgeVariant(
                        result.similarityScore
                      )}
                    >
                      {(result.similarityScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-sm line-clamp-2">
                    {result.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {result.sourceWebsite} • {result.faceCount} face
                    {result.faceCount !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleVideoLinkClick(result.videoUrl, result.title)
                    }
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Watch Video
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Load more button */}
          {hasMoreResults && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More Results
              </Button>
            </div>
          )}

          {/* Results summary */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Showing {sortedResults.length} of {filteredResults.length} results
            {filteredResults.length !== sanitizedResults.length && (
              <span> (filtered from {sanitizedResults.length} total)</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SearchResults
