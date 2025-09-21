/**
 * Environment badge component to show current environment
 */

import React from "react"

export function EnvironmentBadge() {
  const isProduction = process.env.NODE_ENV === "production"
  const environment = isProduction ? "production" : "development"

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isProduction
          ? "bg-red-100 text-red-800 border border-red-200"
          : "bg-green-100 text-green-800 border border-green-200"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full mr-1 ${
          isProduction ? "bg-red-500" : "bg-green-500"
        }`}
      />
      {environment.toUpperCase()}
    </div>
  )
}
