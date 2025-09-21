// Test setup for face detection service tests
import { jest, expect } from "@jest/globals"

// Increase timeout for face detection tests
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidEmbedding(): R
      toBeValidFaceDetection(): R
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidEmbedding(received: any) {
    const pass =
      Array.isArray(received) &&
      received.length > 0 &&
      received.every((val: any) => typeof val === "number" && !isNaN(val))

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid embedding`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid embedding (array of numbers)`,
        pass: false,
      }
    }
  },

  toBeValidFaceDetection(received: any) {
    const pass =
      received &&
      typeof received === "object" &&
      received.boundingBox &&
      typeof received.boundingBox.x === "number" &&
      typeof received.boundingBox.y === "number" &&
      typeof received.boundingBox.width === "number" &&
      typeof received.boundingBox.height === "number" &&
      Array.isArray(received.embedding) &&
      typeof received.confidence === "number"

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid face detection`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be a valid face detection object`,
        pass: false,
      }
    }
  },
})
