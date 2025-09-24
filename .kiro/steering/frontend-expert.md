---
inclusion: fileMatch
fileMatchPattern:
  [
    "frontend/**/*.ts",
    "frontend/**/*.tsx",
    "frontend/**/*.js",
    "frontend/**/*.jsx",
  ]
---

# Face Video Search Frontend Expert Guidelines

## Profile & Expertise

- **Role**: Senior Frontend Developer specializing in Face Video Search applications
- **Core Technologies**: Next.js 15 App Router, React 19, TypeScript, oRPC, Tailwind CSS
- **Specializations**: Face detection UI, video search interfaces, real-time processing, performance optimization
- **Security Focus**: Client-side input validation, privacy protection, accessibility, no sensitive data exposure

## Architecture & Technology Stack

### Next.js 15 App Router Foundation

- **Directory Structure**: Use `src/app` exclusively with App Router patterns
- **Server Components**: Default to Server Components, use `'use client'` only when necessary
- **Layouts**: Implement nested layouts for consistent UI structure
- **Route Groups**: Organize related routes using `(group)` syntax

### Core Technologies

- **oRPC Integration**: Type-safe API communication with backend and input validation
- **Component Library**: Radix UI primitives with Tailwind CSS styling and accessibility support
- **State Management**: React Context for global state, oRPC for server state with privacy protection
- **File Handling**: React Dropzone for uploads with security validation and image processing integration
- **Security**: Client-side validation, no sensitive data exposure, proper error handling

## Code Style & Component Architecture

### Component Structure & Naming

```typescript
// Use function declarations (not arrow functions)
export default function ComponentName() {
  return <div />
}

// Event handlers use "handle" prefix
function handleFaceUpload(file: File) {}
function handleSearchSubmit(data: SearchData) {}
```

### File Organization & Imports

```typescript
// 1. Imports (module aliases preferred)
import { detectFaces } from "@/lib/actions"
import { Button } from "@/components/ui/button"

// 2. TypeScript types/interfaces
interface FaceDetectionProps {
  onDetection: (faces: Face[]) => void
}

// 3. Global constants (ALL_CAPS)
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png"] as const

// 4. Main component
export default function FaceDetection({ onDetection }: FaceDetectionProps) {
  // Component implementation
}
```

### In-Component Order

```typescript
export default function SearchInterface() {
  // 1. Data fetching hooks (oRPC/TanStack Query)
  const { data: searchResults, isLoading } = useSearchVideos()

  // 2. Other logic/computation hooks
  const { uploadedImage, processImage } = useImageProcessor()

  // 3. React primitive hooks
  const [threshold, setThreshold] = useState(0.7)
  const [selectedFaces, setSelectedFaces] = useState<Face[]>([])

  // 4. Local constants
  const isSearchDisabled = !uploadedImage || selectedFaces.length === 0

  // 5. Computed/derived values
  const filteredResults = useMemo(
    () => searchResults?.filter(result => result.confidence >= threshold) ?? [],
    [searchResults, threshold]
  )

  // 6. Event handlers (function declarations)
  function handleThresholdChange(value: number) {
    setThreshold(value)
  }

  function handleFaceSelection(faces: Face[]) {
    setSelectedFaces(faces)
  }

  // 7. JSX return
  return <div className="space-y-6">{/* Component JSX */}</div>
}
```

## Face Video Search Specific Patterns

### Face Detection & Upload Interface

```typescript
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { detectFaces } from "@/lib/actions"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB - Security: Prevent DoS attacks
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
} // Security: Restrict to safe image formats only

export default function FaceUpload() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([])
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await detectFaces(file)
      if (result.success) {
        setDetectedFaces(result.faces)
      } else {
        // Security: Display sanitized error messages only
        setError(result.error?.message ?? "Face detection failed")
      }
    } catch (err) {
      // Security: Never expose internal error details to user
      setError("Upload failed. Please try again.")
      console.error("Face detection error:", err) // Log for debugging only
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25",
          isProcessing && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        {isProcessing ? (
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p>Processing image...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p>Drop an image here or click to select</p>
            <p className="text-sm text-muted-foreground">
              JPEG or PNG, max 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {detectedFaces.length > 0 && (
        <FaceSelectionGrid
          faces={detectedFaces}
          onSelection={handleFaceSelection}
        />
      )}
    </div>
  )
}
```

### Video Search Interface with Real-time Updates

```typescript
"use client"

import { useState, useEffect } from "react"
import { searchVideos } from "@/lib/actions"
import { useSearchSession } from "@/hooks/useSearchSession"

interface SearchInterfaceProps {
  selectedFaces: Face[]
}

export default function SearchInterface({
  selectedFaces,
}: SearchInterfaceProps) {
  const [threshold, setThreshold] = useState(0.7)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<VideoMatch[]>([])
  const [progress, setProgress] = useState(0)

  const { sessionId, updateSession } = useSearchSession()

  const isSearchDisabled = selectedFaces.length === 0

  async function handleSearch() {
    if (isSearchDisabled) return

    setIsSearching(true)
    setProgress(0)
    setResults([])

    try {
      // Start search with progress tracking
      const searchStream = await searchVideos({
        faces: selectedFaces,
        threshold,
        sessionId,
      })

      // Handle streaming results
      for await (const update of searchStream) {
        if (update.type === "progress") {
          setProgress(update.progress)
        } else if (update.type === "result") {
          setResults(prev => [...prev, ...update.matches])
        }
      }

      // Update session with results
      await updateSession({ results, threshold })
    } catch (error) {
      console.error("Search failed:", error)
      // Handle error state
    } finally {
      setIsSearching(false)
    }
  }

  function handleThresholdChange(value: number[]) {
    setThreshold(value[0])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="threshold">
            Similarity Threshold: {threshold.toFixed(2)}
          </Label>
          <Slider
            id="threshold"
            min={0.1}
            max={1.0}
            step={0.05}
            value={[threshold]}
            onValueChange={handleThresholdChange}
            disabled={isSearching}
            className="mt-2"
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearchDisabled || isSearching}
          className="min-w-[120px]"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </>
          ) : (
            "Search Videos"
          )}
        </Button>
      </div>

      {isSearching && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Searching videos...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      <SearchResults results={results} isLoading={isSearching} />
    </div>
  )
}
```

### Session Management with Context

```typescript
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createSession, updateSession, getSession } from "@/lib/actions"

interface SearchSession {
  id: string
  faces: Face[]
  threshold: number
  results: VideoMatch[]
  createdAt: Date
}

interface SessionContextValue {
  session: SearchSession | null
  isLoading: boolean
  createNewSession: (faces: Face[]) => Promise<void>
  updateCurrentSession: (updates: Partial<SearchSession>) => Promise<void>
  clearSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SearchSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const savedSessionId = localStorage.getItem("face-search-session")
        if (savedSessionId) {
          const restoredSession = await getSession(savedSessionId)
          if (restoredSession) {
            setSession(restoredSession)
          }
        }
      } catch (error) {
        console.error("Failed to restore session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  async function createNewSession(faces: Face[]) {
    setIsLoading(true)
    try {
      const newSession = await createSession({ faces })
      setSession(newSession)
      localStorage.setItem("face-search-session", newSession.id)
    } finally {
      setIsLoading(false)
    }
  }

  async function updateCurrentSession(updates: Partial<SearchSession>) {
    if (!session) return

    const updatedSession = { ...session, ...updates }
    setSession(updatedSession)
    await updateSession(session.id, updates)
  }

  function clearSession() {
    setSession(null)
    localStorage.removeItem("face-search-session")
  }

  const value: SessionContextValue = {
    session,
    isLoading,
    createNewSession,
    updateCurrentSession,
    clearSession,
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSearchSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSearchSession must be used within SessionProvider")
  }
  return context
}
```

## Performance & Optimization

### Image Processing & Caching

```typescript
// Custom hook for image processing with caching
export function useImageProcessor() {
  const [processedImages, setProcessedImages] = useState<
    Map<string, ProcessedImage>
  >(new Map())

  const processImage = useCallback(
    async (file: File): Promise<ProcessedImage> => {
      const cacheKey = `${file.name}-${file.size}-${file.lastModified}`

      // Check cache first
      const cached = processedImages.get(cacheKey)
      if (cached) return cached

      // Process image
      const processed = await compressAndValidateImage(file)

      // Cache result
      setProcessedImages(prev => new Map(prev).set(cacheKey, processed))

      return processed
    },
    [processedImages]
  )

  return { processImage, processedImages }
}

// Image compression utility
async function compressAndValidateImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // Calculate optimal dimensions
      const maxDimension = 1024
      const scale = Math.min(
        maxDimension / img.width,
        maxDimension / img.height,
        1
      )

      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve({
              file: new File([blob], file.name, { type: "image/jpeg" }),
              dimensions: { width: canvas.width, height: canvas.height },
              originalSize: file.size,
              compressedSize: blob.size,
            })
          } else {
            reject(new Error("Image compression failed"))
          }
        },
        "image/jpeg",
        0.85
      )
    }

    img.onerror = () => reject(new Error("Invalid image file"))
    img.src = URL.createObjectURL(file)
  })
}
```

### Virtualized Results Grid

```typescript
import { FixedSizeGrid as Grid } from "react-window"

interface VirtualizedResultsProps {
  results: VideoMatch[]
  onResultClick: (result: VideoMatch) => void
}

const ITEM_WIDTH = 280
const ITEM_HEIGHT = 200
const GAP = 16

export default function VirtualizedResults({
  results,
  onResultClick,
}: VirtualizedResultsProps) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 400 })

  const columnsCount = Math.floor(
    (containerSize.width + GAP) / (ITEM_WIDTH + GAP)
  )
  const rowsCount = Math.ceil(results.length / columnsCount)

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnsCount + columnIndex
    const result = results[index]

    if (!result) return null

    return (
      <div style={style}>
        <div className="p-2">
          <VideoResultCard
            result={result}
            onClick={() => onResultClick(result)}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={el => {
        if (el) {
          const { width } = el.getBoundingClientRect()
          setContainerSize(prev => ({ ...prev, width }))
        }
      }}
      className="w-full"
    >
      <Grid
        columnCount={columnsCount}
        columnWidth={ITEM_WIDTH + GAP}
        height={containerSize.height}
        rowCount={rowsCount}
        rowHeight={ITEM_HEIGHT + GAP}
        width={containerSize.width}
      >
        {Cell}
      </Grid>
    </div>
  )
}
```

## Error Handling & Loading States

### Comprehensive Error Boundary

```typescript
"use client"

import { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class FaceSearchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Face search error:", error, errorInfo)
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              An error occurred while processing your request.
            </p>
            <Button
              onClick={() =>
                this.setState({ hasError: false, error: undefined })
              }
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

## Testing Guidelines

### Component Testing with Vitest

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import FaceUpload from "../FaceUpload"

// Mock the actions
vi.mock("@/lib/actions", () => ({
  detectFaces: vi.fn(),
}))

describe("FaceUpload", () => {
  it("should handle successful face detection", async () => {
    const mockDetectFaces = vi.mocked(detectFaces)
    mockDetectFaces.mockResolvedValue({
      success: true,
      faces: [
        { id: "1", boundingBox: { x: 0, y: 0, width: 100, height: 100 } },
      ],
    })

    render(<FaceUpload />)

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
    const input = screen.getByRole("button", { name: /drop an image/i })

    fireEvent.drop(input, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/1 face detected/i)).toBeInTheDocument()
    })
  })

  it("should handle face detection errors", async () => {
    const mockDetectFaces = vi.mocked(detectFaces)
    mockDetectFaces.mockResolvedValue({
      success: false,
      error: { code: "NO_FACE_DETECTED", message: "No faces found" },
    })

    render(<FaceUpload />)

    const file = new File(["test"], "test.jpg", { type: "image/jpeg" })
    const input = screen.getByRole("button", { name: /drop an image/i })

    fireEvent.drop(input, { dataTransfer: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText(/no faces found/i)).toBeInTheDocument()
    })
  })
})
```

## Key Principles

1. **Security First**: Never expose sensitive data, validate all inputs, sanitize error messages
2. **Type Safety**: Use TypeScript strictly, leverage oRPC contracts for validation
3. **Privacy Protection**: Handle biometric data responsibly, automatic cleanup, no persistent storage
4. **Performance Minded**: Implement virtualization, caching, and optimization
5. **User Experience**: Provide clear loading states, error handling, and feedback
6. **Accessibility**: Include ARIA labels, keyboard navigation, semantic HTML
7. **Maintainable Code**: Follow consistent patterns, use composition over complexity
8. **Modern React**: Prefer Server Components, use hooks effectively, minimize effects
9. **Face Search Specific**: Handle image processing, real-time updates, session management with privacy

## Module Alias Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

This comprehensive guide ensures consistent, performant, and maintainable frontend development for the Face Video Search application using modern Next.js 15 and React 19 patterns.
