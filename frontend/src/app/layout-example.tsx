/**
 * Example layout integration with connection status
 * This shows how to integrate the connection status into your Next.js app
 */

import React from "react"
import { ConnectionProvider } from "../contexts/ConnectionContext"
import {
  ProductionConnectionIndicator,
  ConnectionBanner,
  ProductionConnectionDot,
} from "../components"

interface LayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>
        <ConnectionProvider checkInterval={30000} autoStart={true}>
          {/* Connection status banner for critical issues */}
          <ConnectionBanner />

          {/* Main content */}
          <main>{children}</main>

          {/* Production connection indicator (floating) */}
          <ProductionConnectionIndicator
            position="top-right"
            showInDevelopment={false}
          />
        </ConnectionProvider>
      </body>
    </html>
  )
}

/**
 * Example header component with connection status
 */
export function AppHeader() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Face Video Search
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Other header items */}

            {/* Connection status in header */}
            <ProductionConnectionDot />
          </div>
        </div>
      </div>
    </header>
  )
}

/**
 * Example usage in a page component
 */
export function ExamplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <p className="text-gray-500">Your app content here</p>
          </div>
        </div>
      </div>
    </div>
  )
}
