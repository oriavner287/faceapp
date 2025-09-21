import { vi } from "vitest"

// Mock FormData for Node.js environment
global.FormData = class FormData {
  private data = new Map<string, any>()

  append(key: string, value: any) {
    this.data.set(key, value)
  }

  get(key: string) {
    return this.data.get(key)
  }

  has(key: string) {
    return this.data.has(key)
  }
} as any

// Mock File for Node.js environment
global.File = class File {
  name: string
  type: string
  size: number
  lastModified: number

  constructor(chunks: any[], filename: string, options: any = {}) {
    this.name = filename
    this.type = options.type || ""
    this.size = chunks.reduce((acc, chunk) => {
      if (typeof chunk === "string") return acc + chunk.length
      if (chunk instanceof ArrayBuffer) return acc + chunk.byteLength
      return acc + (chunk.length || 0)
    }, 0)
    this.lastModified = Date.now()
  }

  async arrayBuffer() {
    return new ArrayBuffer(this.size)
  }

  async text() {
    return "mock-file-content"
  }
} as any

// Mock Blob for Node.js environment
global.Blob = class Blob {
  type: string
  size: number

  constructor(chunks: any[] = [], options: any = {}) {
    this.type = options.type || ""
    this.size = chunks.reduce((acc, chunk) => {
      if (typeof chunk === "string") return acc + chunk.length
      if (chunk instanceof ArrayBuffer) return acc + chunk.byteLength
      return acc + (chunk.length || 0)
    }, 0)
  }
} as any
