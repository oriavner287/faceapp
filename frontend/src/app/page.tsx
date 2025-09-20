import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
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
      </div>
    </main>
  )
}
