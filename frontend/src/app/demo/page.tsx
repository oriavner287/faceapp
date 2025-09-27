import { SearchResults } from "@/components"

// Mock data for demonstration
const mockSearchResults = [
  {
    id: "video-1",
    title: "Sample Video 1 - Person in Park",
    thumbnailUrl:
      "https://via.placeholder.com/320x180/4f46e5/ffffff?text=Video+1",
    videoUrl: "https://example.com/video1",
    sourceWebsite: "Site 1",
    similarityScore: 0.95,
    faceCount: 2,
  },
  {
    id: "video-2",
    title: "Sample Video 2 - Group Discussion",
    thumbnailUrl:
      "https://via.placeholder.com/320x180/059669/ffffff?text=Video+2",
    videoUrl: "https://example.com/video2",
    sourceWebsite: "Site 2",
    similarityScore: 0.87,
    faceCount: 4,
  },
  {
    id: "video-3",
    title: "Sample Video 3 - Interview Session",
    thumbnailUrl:
      "https://via.placeholder.com/320x180/dc2626/ffffff?text=Video+3",
    videoUrl: "https://example.com/video3",
    sourceWebsite: "Site 1",
    similarityScore: 0.73,
    faceCount: 1,
  },
  {
    id: "video-4",
    title: "Sample Video 4 - Conference Talk",
    thumbnailUrl:
      "https://via.placeholder.com/320x180/7c3aed/ffffff?text=Video+4",
    videoUrl: "https://example.com/video4",
    sourceWebsite: "Site 3",
    similarityScore: 0.68,
    faceCount: 3,
  },
  {
    id: "video-5",
    title: "Sample Video 5 - Street Performance",
    thumbnailUrl:
      "https://via.placeholder.com/320x180/ea580c/ffffff?text=Video+5",
    videoUrl: "https://example.com/video5",
    sourceWebsite: "Site 2",
    similarityScore: 0.52,
    faceCount: 2,
  },
]

export default function DemoPage() {
  function handleThresholdChange(threshold: number) {
    console.log("Threshold changed to:", threshold)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          SearchResults Component Demo
        </h1>
        <p className="text-muted-foreground">
          This page demonstrates the SearchResults component with mock data.
        </p>
      </div>

      <div className="space-y-8">
        {/* Normal results */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Normal Results</h2>
          <SearchResults
            results={mockSearchResults}
            onThresholdChange={handleThresholdChange}
            currentThreshold={0.7}
          />
        </section>

        {/* Loading state */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Loading State</h2>
          <SearchResults results={[]} isLoading={true} />
        </section>

        {/* Error state */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Error State</h2>
          <SearchResults
            results={[]}
            error="Failed to connect to video search service. Please try again later."
          />
        </section>

        {/* No results */}
        <section>
          <h2 className="text-xl font-semibold mb-4">No Results State</h2>
          <SearchResults results={[]} />
        </section>
      </div>
    </div>
  )
}
