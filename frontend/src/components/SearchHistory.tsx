/**
 * SearchHistory Component
 *
 * Displays previous search results in a compact, accessible format.
 * - Chronological list (most recent first)
 * - Thumbnail previews with metadata
 * - Click to view previous results
 * - Privacy notice and automatic cleanup
 */

"use client"

import React, { useState } from "react"
import { Clock, Trash2, History, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { SearchHistoryItem } from "@/lib/searchHistory"

interface SearchHistoryProps {
  history: SearchHistoryItem[]
  onHistoryItemClick: (item: SearchHistoryItem) => void
  onClearHistory: () => void
  isLoading?: boolean
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`

  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

/**
 * Get similarity category badge variant
 */
function getSimilarityBadgeVariant(
  threshold: number
): "default" | "secondary" | "outline" {
  if (threshold >= 0.8) return "default"
  if (threshold >= 0.6) return "secondary"
  return "outline"
}

export function SearchHistory({
  history,
  onHistoryItemClick,
  onClearHistory,
  isLoading = false,
}: SearchHistoryProps) {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)

  const handleClearConfirm = () => {
    onClearHistory()
    setIsClearDialogOpen(false)
  }

  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    onHistoryItemClick(item)
  }

  // Empty state
  if (!isLoading && history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          No search history yet. Your recent searches will appear here.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          History is stored locally and automatically deleted after 24 hours.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recent Searches</h2>
          <Badge variant="secondary">{history.length}</Badge>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsClearDialogOpen(true)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Privacy notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          Search history is stored locally on your device and automatically
          deleted after 24 hours. No data is sent to our servers.
        </AlertDescription>
      </Alert>

      <Separator />

      {/* History grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map(item => (
          <Card
            key={item.id}
            className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleHistoryItemClick(item)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleHistoryItemClick(item)
              }
            }}
            aria-label={`View search from ${formatRelativeTime(
              item.timestamp
            )} with ${item.resultCount} results`}
          >
            <div className="aspect-video relative bg-muted">
              {item.thumbnailDataUrl ? (
                <img
                  src={item.thumbnailDataUrl}
                  alt="Search thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <History className="h-8 w-8 text-muted-foreground opacity-30" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge
                  variant={
                    item.status === "completed" ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {item.status === "completed"
                    ? `${item.resultCount} results`
                    : "Error"}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(item.timestamp)}</span>
                </div>
                <Badge
                  variant={getSimilarityBadgeVariant(item.threshold)}
                  className="text-xs"
                >
                  {(item.threshold * 100).toFixed(0)}% threshold
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.status === "completed"
                  ? `Found ${item.resultCount} matching video${
                      item.resultCount !== 1 ? "s" : ""
                    }`
                  : "Search encountered an error"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clear confirmation dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Search History?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your search history from this
              device. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsClearDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearConfirm}>
              Clear History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
