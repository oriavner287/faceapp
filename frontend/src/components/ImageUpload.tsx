"use client"

import React from "react"
import { useCallback, useState, useRef } from "react"
import { useDropzone } from "react-dropzone"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Camera, CheckCircle, Lock } from "lucide-react"
import { type UploadResult } from "@/lib/actions"
import { frontendConfig } from "@/lib/config"

// Security-focused constants following security-expert.md guidelines
const MAX_FILE_SIZE = frontendConfig.upload.maxFileSize // 10MB
const ALLOWED_MIME_TYPES = frontendConfig.upload.allowedMimeTypes
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

// TypeScript interfaces for component props and state
interface ImageUploadProps {
  onUploadSuccess?: (result: UploadResult["data"]) => void
  onUploadError?: (error: string) => void
  onUploadStart?: () => void
  onFileSelected?: (file: File) => void
  onPrivacyClick?: () => void
  onThresholdChange?: (threshold: number) => void
  initialThreshold?: number
  className?: string
}

interface ValidationState {
  isValidating: boolean
  isValid: boolean
  error?: string
  securityStatus: "pending" | "validating" | "secure" | "rejected"
}

interface PreviewState {
  file: File | null
  previewUrl: string | null
  dimensions?: { width: number; height: number }
}

// Security validation function for client-side checks
function validateFileSecurely(file: File): {
  isValid: boolean
  error?: string
} {
  // MIME type validation
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
    }
  }

  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024)
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${maxSizeMB}MB.`,
    }
  }

  // File size minimum validation
  if (file.size < 1024) {
    return {
      isValid: false,
      error: "File size too small. Please upload a valid image file.",
    }
  }

  // File extension validation
  const extension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf("."))
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error:
        "Invalid file extension. Please upload a JPEG, PNG, or WebP image.",
    }
  }

  // File name validation (security)
  if (file.name.length > 255) {
    return {
      isValid: false,
      error: "File name too long. Please rename your file.",
    }
  }

  // Check for suspicious file names
  if (/[<>:"/\\|?*\x00-\x1f]/.test(file.name)) {
    return {
      isValid: false,
      error: "File name contains invalid characters.",
    }
  }

  return { isValid: true }
}

// Loading component with security status indicator
function UploadingIndicator({
  securityStatus,
}: {
  securityStatus: ValidationState["securityStatus"]
}) {
  const getStatusMessage = () => {
    switch (securityStatus) {
      case "validating":
        return "Validating file security..."
      case "secure":
        return "File validated - uploading..."
      case "rejected":
        return "File rejected by security scan"
      default:
        return "Processing upload..."
    }
  }

  const getStatusColor = () => {
    switch (securityStatus) {
      case "secure":
        return "text-green-600"
      case "rejected":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  return (
    <div className="flex items-center justify-center space-x-2 p-4">
      <Spinner size="sm" />
      <span className={`text-sm ${getStatusColor()}`}>
        {getStatusMessage()}
      </span>
    </div>
  )
}

// Submit button component with form status
function SubmitButton({
  disabled,
  securityStatus,
  isUploading,
}: {
  disabled: boolean
  securityStatus: ValidationState["securityStatus"]
  isUploading: boolean
}) {
  const isDisabled = disabled || isUploading || securityStatus !== "secure"

  return (
    <Button type="submit" disabled={isDisabled} className="w-full">
      {isUploading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          Uploading...
        </>
      ) : (
        "Upload Image"
      )}
    </Button>
  )
}

// Main ImageUpload component using function declaration
export function ImageUpload({
  onUploadSuccess,
  onUploadError,
  onUploadStart,
  onFileSelected,
  onPrivacyClick,
  onThresholdChange,
  initialThreshold,
  className,
}: ImageUploadProps) {
  // React hooks in proper order: data fetching, logic, primitives, constants, computed values
  const formRef = useRef<HTMLFormElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [threshold, setThreshold] = useState(initialThreshold ?? 0.7)
  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    isValid: false,
    securityStatus: "pending",
  })
  const [previewState, setPreviewState] = useState<PreviewState>({
    file: null,
    previewUrl: null,
  })

  // Constants
  const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024)

  // Computed values
  const hasFile = previewState.file !== null
  const canUpload =
    hasFile &&
    validationState.isValid &&
    validationState.securityStatus === "secure"

  // Event handlers with "handle" prefix
  const handleFileValidation = useCallback(async (file: File) => {
    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      securityStatus: "validating",
    }))

    // Client-side security validation
    const validation = validateFileSecurely(file)

    if (!validation.isValid) {
      setValidationState({
        isValidating: false,
        isValid: false,
        error: validation.error || "Validation failed",
        securityStatus: "rejected",
      })
      return false
    }

    // Additional security checks for image preview
    try {
      const previewUrl = URL.createObjectURL(file)

      // Create image element to validate dimensions
      const img = new Image()
      img.onload = () => {
        setPreviewState(prev => ({
          ...prev,
          dimensions: { width: img.width, height: img.height },
        }))
        URL.revokeObjectURL(previewUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(previewUrl)
        setValidationState({
          isValidating: false,
          isValid: false,
          error: "Invalid image file. Please upload a valid image.",
          securityStatus: "rejected",
        })
      }
      img.src = previewUrl

      setPreviewState(prev => ({
        ...prev,
        previewUrl,
      }))

      setValidationState({
        isValidating: false,
        isValid: true,
        securityStatus: "secure",
      })

      return true
    } catch (error) {
      setValidationState({
        isValidating: false,
        isValid: false,
        error: "Failed to process image file.",
        securityStatus: "rejected",
      })
      return false
    }
  }, [])

  const handleFaceUpload = useCallback(
    async (acceptedFiles: File[]) => {
      console.log(
        "[ImageUpload] handleFaceUpload called with",
        acceptedFiles.length,
        "files"
      )

      if (acceptedFiles.length === 0) {
        console.log("[ImageUpload] No files accepted")
        return
      }

      const file = acceptedFiles[0]
      if (!file) {
        console.log("[ImageUpload] First file is undefined")
        return
      }

      console.log(
        "[ImageUpload] Processing file:",
        file.name,
        file.size,
        "bytes"
      )

      // Notify parent that a file has been selected (clears errors)
      onFileSelected?.(file)

      // Clear previous errors when starting a new upload
      setUploadError(null)
      setPreviewState({ file, previewUrl: null })

      const isValid = await handleFileValidation(file)
      if (!isValid) {
        console.log("[ImageUpload] File validation failed")
        setPreviewState({ file: null, previewUrl: null })
      } else {
        console.log("[ImageUpload] File validation passed")
      }
    },
    [handleFileValidation, onFileSelected]
  )

  const handleSecurityCheck = useCallback(
    (rejectedFiles: any[]) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        let errorMessage = "File rejected: "

        if (rejection.errors?.some((e: any) => e.code === "file-too-large")) {
          errorMessage += `File size exceeds ${maxSizeMB}MB limit.`
        } else if (
          rejection.errors?.some((e: any) => e.code === "file-invalid-type")
        ) {
          errorMessage +=
            "Invalid file type. Please upload a JPEG, PNG, or WebP image."
        } else {
          errorMessage += "Please check file type and size requirements."
        }

        setValidationState({
          isValidating: false,
          isValid: false,
          error: errorMessage,
          securityStatus: "rejected",
        })
      }
    },
    [maxSizeMB]
  )

  const handleRemoveFile = useCallback(() => {
    if (previewState.previewUrl) {
      URL.revokeObjectURL(previewState.previewUrl)
    }
    setPreviewState({ file: null, previewUrl: null })
    setValidationState({
      isValidating: false,
      isValid: false,
      securityStatus: "pending",
    })
  }, [previewState.previewUrl])

  const handleThresholdChange = useCallback(
    (value: number[]) => {
      const newThreshold = value[0] ?? 0.7
      setThreshold(newThreshold)
      onThresholdChange?.(newThreshold)
    },
    [onThresholdChange]
  )

  // React Dropzone configuration with security restrictions
  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: handleFaceUpload,
      onDropRejected: handleSecurityCheck,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
      },
      maxSize: MAX_FILE_SIZE,
      maxFiles: 1,
      multiple: false,
    })

  // Handle form submission
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      if (!canUpload) return

      setIsUploading(true)
      setUploadError(null)

      // Notify parent that upload is starting
      onUploadStart?.()

      try {
        // Get FormData from the form element
        const form = e.currentTarget
        const formData = new FormData(form)

        // Use API route instead of server action for better production compatibility
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (result.success && result.data) {
          onUploadSuccess?.(result.data)
          handleRemoveFile()
        } else if (result.error) {
          setUploadError(result.error.message)
          onUploadError?.(result.error.message)
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed"
        setUploadError(errorMessage)
        onUploadError?.(errorMessage)
      } finally {
        setIsUploading(false)
      }
    },
    [canUpload, onUploadSuccess, onUploadError, onUploadStart, handleRemoveFile]
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Upload Face Image</CardTitle>
        <CardDescription>
          Upload a clear photo containing a person's face to search for similar
          individuals in videos. Maximum file size: {maxSizeMB}MB. Supported
          formats: JPEG, PNG, WebP.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag and drop area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive && !isDragReject ? "border-blue-500 bg-blue-50" : ""}
            ${isDragReject ? "border-red-500 bg-red-50" : ""}
            ${!isDragActive ? "border-gray-300 hover:border-gray-400" : ""}
            ${hasFile ? "border-green-500 bg-green-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          {validationState.isValidating ? (
            <UploadingIndicator
              securityStatus={validationState.securityStatus}
            />
          ) : hasFile && previewState.previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewState.previewUrl}
                alt="Preview"
                className="max-w-full max-h-48 mx-auto rounded-lg shadow-sm"
              />
              <div className="text-sm text-gray-600">
                <p className="font-medium">{previewState.file?.name}</p>
                <p>
                  {previewState.file &&
                    (previewState.file.size / 1024 / 1024).toFixed(2)}
                  MB
                  {previewState.dimensions &&
                    ` • ${previewState.dimensions.width}×${previewState.dimensions.height}px`}
                </p>
                <div className="flex items-center justify-center mt-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Security validated
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleRemoveFile()
                }}
              >
                Remove File
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Camera className="h-12 w-12 mx-auto text-gray-400" />
              <div>
                {isDragActive ? (
                  isDragReject ? (
                    <p className="text-red-600">File type not supported</p>
                  ) : (
                    <p className="text-blue-600">Drop the image here...</p>
                  )
                ) : (
                  <>
                    <p className="text-gray-600">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      JPEG, PNG, or WebP • Max {maxSizeMB}MB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Validation error display */}
        {validationState.error && (
          <Alert variant="destructive">
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{validationState.error}</AlertDescription>
          </Alert>
        )}

        {/* Upload error display */}
        {uploadError && (
          <Alert variant="destructive">
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        {/* Threshold slider */}
        {hasFile && validationState.isValid && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="threshold" className="text-sm font-medium">
                  Similarity Threshold
                </Label>
                <span className="text-sm font-semibold text-blue-600">
                  {threshold.toFixed(2)}
                </span>
              </div>
              <Slider
                id="threshold"
                min={0.3}
                max={0.95}
                step={0.05}
                value={[threshold]}
                onValueChange={handleThresholdChange}
                disabled={isUploading}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values require closer matches. Lower values return more
                results but may be less accurate.
              </p>
            </div>
          </div>
        )}

        {/* Upload form */}
        {hasFile && validationState.isValid && (
          <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
            <input
              type="file"
              name="image"
              className="hidden"
              ref={input => {
                if (input && previewState.file) {
                  const dataTransfer = new DataTransfer()
                  dataTransfer.items.add(previewState.file)
                  input.files = dataTransfer.files
                }
              }}
            />
            <SubmitButton
              disabled={!canUpload}
              securityStatus={validationState.securityStatus}
              isUploading={isUploading}
            />
          </form>
        )}

        {/* Privacy button */}
        {onPrivacyClick && (
          <div className="text-left">
            <button
              type="button"
              onClick={onPrivacyClick}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center space-x-1 underline decoration-dotted underline-offset-2"
            >
              <Lock className="h-3 w-3" />
              <span>Privacy & Security</span>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
