import { defineConfig } from "@orpc/server"

export default defineConfig({
  // Server configuration for oRPC
  server: {
    port: 3001,
    cors: {
      origin: ["http://localhost:3000"],
      credentials: true,
    },
  },

  // Type generation configuration
  generate: {
    output: "./src/generated",
    client: true,
    server: true,
  },

  // Development configuration
  dev: {
    watch: ["src/**/*.ts"],
    ignore: ["src/generated/**/*"],
  },
})
