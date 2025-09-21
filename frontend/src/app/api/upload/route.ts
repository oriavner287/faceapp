import { NextRequest, NextResponse } from "next/server"
import { uploadImage } from "@/lib/actions"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const result = await uploadImage(formData)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    )
  }
}
