import "@testing-library/jest-dom"

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return "/"
  },
}))

// Mock FormData for Node.js environment
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }

  append(key, value) {
    this.data.set(key, value)
  }

  get(key) {
    return this.data.get(key)
  }

  has(key) {
    return this.data.has(key)
  }
}

// Mock File for Node.js environment
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename
    this.type = options.type || ""
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    this.lastModified = Date.now()
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size))
  }
}

// Mock Blob for Node.js environment
global.Blob = class Blob {
  constructor(chunks = [], options = {}) {
    this.type = options.type || ""
    this.size = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  }
}
