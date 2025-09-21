import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ProductionConnectionIndicator,
  ConnectionBanner,
  ProductionConnectionDot,
  ConnectionDebug,
  EnvironmentBadge,
} from "../components"

export default function Home() {
  return (
    <>
      {/* Connection status banner for critical issues */}
      <ConnectionBanner />

      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        {/* Header with connection status */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <EnvironmentBadge />
          <ProductionConnectionDot />
        </div>

        <div className="max-w-2xl w-full space-y-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold">
                Face Video Search
              </CardTitle>
              <CardDescription>
                Upload a photo to find similar faces in videos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button variant="outline" disabled>
                Upload Image (Coming Soon)
              </Button>
            </CardContent>
          </Card>

          {/* Debug component to show connection status */}
          <div className="space-y-4">
            <ConnectionDebug />

            {/* Railway service info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-blue-800 mb-2">
                Railway Service Info
              </h4>
              <p className="text-blue-700">
                Production API:{" "}
                <code className="bg-blue-100 px-1 rounded">
                  https://faceapp-lhtz.onrender.com
                </code>
              </p>
              <p className="text-blue-700 mt-1">
                The connection indicator will show green when successfully
                connected to the Railway backend.
              </p>
            </div>
          </div>
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
