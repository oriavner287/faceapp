#!/usr/bin/env node

/**
 * Download face-api.js models for face detection
 * This script downloads the required pre-trained models from the face-api.js repository
 */

import { createWriteStream, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import https from "https"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MODELS_DIR = join(__dirname, "..", "models")
const BASE_URL =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

const REQUIRED_MODELS = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
]

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`)

    const file = createWriteStream(destination)

    https
      .get(url, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
          return
        }

        response.pipe(file)

        file.on("finish", () => {
          file.close()
          console.log(`✓ Downloaded ${destination}`)
          resolve()
        })

        file.on("error", err => {
          reject(err)
        })
      })
      .on("error", err => {
        reject(err)
      })
  })
}

async function downloadModels() {
  try {
    // Create models directory if it doesn't exist
    if (!existsSync(MODELS_DIR)) {
      mkdirSync(MODELS_DIR, { recursive: true })
      console.log(`Created models directory: ${MODELS_DIR}`)
    }

    console.log("Downloading face-api.js models...")

    // Download all required models
    for (const model of REQUIRED_MODELS) {
      const url = `${BASE_URL}/${model}`
      const destination = join(MODELS_DIR, model)

      // Skip if file already exists
      if (existsSync(destination)) {
        console.log(`✓ ${model} already exists, skipping`)
        continue
      }

      await downloadFile(url, destination)
    }

    console.log("\n✅ All models downloaded successfully!")
    console.log(`Models are available in: ${MODELS_DIR}`)
  } catch (error) {
    console.error("❌ Error downloading models:", error.message)
    process.exit(1)
  }
}

// Run the download
downloadModels()
