/**
 * Simple test script to verify API connection
 * Run with: node test-connection.js
 */

const https = require("https")
const http = require("http")

// Test URLs
const PRODUCTION_URL = "https://faceapp-lhtz.onrender.com/health"
const DEVELOPMENT_URL = "http://localhost:3001/health"

function testConnection(url, name) {
  return new Promise(resolve => {
    const client = url.startsWith("https") ? https : http

    console.log(`\n🔍 Testing ${name} connection...`)
    console.log(`URL: ${url}`)

    const req = client.get(url, res => {
      let data = ""

      res.on("data", chunk => {
        data += chunk
      })

      res.on("end", () => {
        try {
          const response = JSON.parse(data)
          console.log(`✅ ${name} - Status: ${res.statusCode}`)
          console.log(`   Response:`, response)
          resolve({ success: true, status: res.statusCode, data: response })
        } catch (error) {
          console.log(`❌ ${name} - Invalid JSON response`)
          console.log(`   Raw response:`, data)
          resolve({ success: false, error: "Invalid JSON" })
        }
      })
    })

    req.on("error", error => {
      console.log(`❌ ${name} - Connection failed`)
      console.log(`   Error:`, error.message)
      resolve({ success: false, error: error.message })
    })

    req.setTimeout(10000, () => {
      console.log(`⏰ ${name} - Request timeout`)
      req.destroy()
      resolve({ success: false, error: "Timeout" })
    })
  })
}

async function runTests() {
  console.log("🚀 Testing API connections...\n")

  // Test production Railway service
  const prodResult = await testConnection(
    PRODUCTION_URL,
    "Production (Railway)"
  )

  // Test local development
  const devResult = await testConnection(DEVELOPMENT_URL, "Development (Local)")

  console.log("\n📊 Summary:")
  console.log(
    `Production: ${prodResult.success ? "✅ Connected" : "❌ Failed"}`
  )
  console.log(
    `Development: ${devResult.success ? "✅ Connected" : "❌ Failed"}`
  )

  if (prodResult.success) {
    console.log("\n🎉 Railway service is accessible!")
    console.log(
      "The frontend connection indicator should show as connected in production."
    )
  } else {
    console.log("\n⚠️  Railway service is not accessible.")
    console.log("The frontend connection indicator will show as disconnected.")
  }
}

runTests().catch(console.error)
