#!/usr/bin/env bash
# Render build script for backend with Chromium installation

set -e  # Exit on error

echo "========================================="
echo "Starting Render build process"
echo "========================================="

# Install Chromium for Puppeteer
echo "Installing Chromium..."
apt-get update
apt-get install -y chromium-browser

# Verify Chromium installation
if command -v chromium-browser &> /dev/null; then
    echo "✓ Chromium installed successfully at: $(which chromium-browser)"
    chromium-browser --version
else
    echo "⚠ Warning: Chromium installation may have failed"
fi

# Install Node dependencies
echo "Installing Node dependencies..."
npm install

# Download face detection models
echo "Downloading face detection models..."
npm run download-models || echo "⚠ Model download failed, will retry at runtime"

# Build the application
echo "Building application..."
npm run build

echo "========================================="
echo "Build completed successfully!"
echo "========================================="
