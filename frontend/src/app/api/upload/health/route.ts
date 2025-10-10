import { NextResponse } from "next/server"
import sharp from "sharp"

export async function GET() {
  try {
    const isServerless =
      process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME

    // Test Sharp
    let sharpWorking = false
    try {
      const testBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01,
      ])
      await sharp(testBuffer).metadata()
      sharpWorking = true
    } catch (error) {
      console.error("Sharp test failed:", error)
    }

    return NextResponse.json({
      status: "healthy",
      environment: {
        isServerless,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
        nodeVersion: process.version,
        vercel: process.env.VERCEL,
      },
      capabilities: {
        sharp: sharpWorking,
        filesystem: !isServerless,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
