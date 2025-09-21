# Connection Status Monitoring

This feature provides real-time monitoring of the connection between the frontend and the Railway backend service in production environments.

## Features

- ✅ **Real-time monitoring** - Continuous health checks every 30 seconds
- ✅ **Production-focused** - Automatically shows status in production environments
- ✅ **Visual indicators** - Multiple UI components for different use cases
- ✅ **Error handling** - Detailed error messages and retry functionality
- ✅ **Context-based** - Global state management with React Context
- ✅ **TypeScript support** - Fully typed components and hooks

## Quick Start

### 1. Wrap your app with ConnectionProvider

```tsx
import { ConnectionProvider } from "./contexts/ConnectionContext"

export default function App() {
  return (
    <ConnectionProvider checkInterval={30000} autoStart={true}>
      <YourAppContent />
    </ConnectionProvider>
  )
}
```

### 2. Add connection indicators

```tsx
import {
  ProductionConnectionIndicator,
  ConnectionBanner,
  ProductionConnectionDot,
} from "./components"

export default function Layout() {
  return (
    <div>
      {/* Critical connection issues banner */}
      <ConnectionBanner />

      {/* Your app content */}
      <main>...</main>

      {/* Floating connection status (production only) */}
      <ProductionConnectionIndicator position="top-right" />
    </div>
  )
}
```

### 3. Use connection status in components

```tsx
import { useConnection } from "./contexts/ConnectionContext"

export function MyComponent() {
  const { isConnected, isProduction, backendInfo, refresh } = useConnection()

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      <p>Environment: {isProduction ? "Production" : "Development"}</p>
      <button onClick={refresh}>Refresh Status</button>
    </div>
  )
}
```

## Components

### ProductionConnectionIndicator

Floating connection status indicator that appears in production or when there are connection issues.

**Props:**

- `position`: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
- `showInDevelopment`: boolean (default: false)
- `className`: string

**Features:**

- Shows connection status with colored indicators
- Displays environment (Production/Development)
- Shows last checked time
- Includes refresh button
- Auto-hides when connection is good in development

### ConnectionBanner

Critical connection issue banner that appears at the top of the page when the backend is unreachable.

**Features:**

- Only shows when disconnected and not currently checking
- Displays error message
- Includes retry button
- Dismissible design

### ProductionConnectionDot

Minimal connection indicator for headers or navigation bars.

**Features:**

- Small colored dot indicator
- "PROD" text label
- Only shows in production
- Minimal footprint

## Hooks

### useConnection

Main hook for accessing connection status throughout your app.

**Returns:**

```typescript
{
  isConnected: boolean
  isChecking: boolean
  lastChecked: Date | null
  error: string | null
  environment: 'development' | 'production'
  apiUrl: string
  backendInfo: {
    environment?: string
    timestamp?: string
    apiBaseUrl?: string
  } | null
  refresh: () => Promise<void>
  startMonitoring: () => void
  stopMonitoring: () => void
}
```

### useProductionConnection

Production-specific connection hook with additional utilities.

**Returns:**

```typescript
{
  // All properties from useConnection, plus:
  isProduction: boolean
  showStatus: boolean // true in production or when disconnected
}
```

## Configuration

### ConnectionProvider Props

- `checkInterval`: number (default: 30000ms) - How often to check connection
- `autoStart`: boolean (default: true) - Start monitoring automatically
- `children`: ReactNode

### Environment Detection

The system automatically detects the environment based on:

- `process.env.NODE_ENV === 'production'`
- API configuration from `apiConfig.isProduction`

## API Integration

The connection monitoring integrates with your API service:

```typescript
// Health check endpoint
GET /health

// Response
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "apiBaseUrl": "https://faceapp-lhtz.onrender.com"
}
```

## Styling

Components use Tailwind CSS classes. You can customize the appearance by:

1. **Override with className prop:**

```tsx
<ProductionConnectionIndicator className="custom-styles" />
```

2. **Modify the component styles directly** in the component files

3. **Use CSS-in-JS** or styled-components if preferred

## Best Practices

1. **Always wrap your app** with ConnectionProvider at the root level
2. **Use ProductionConnectionIndicator** for general status monitoring
3. **Use ConnectionBanner** for critical connection failures
4. **Use ProductionConnectionDot** in headers/navigation for subtle indication
5. **Set appropriate check intervals** (30s recommended for production)
6. **Handle connection states** in your components gracefully

## Troubleshooting

### Connection always shows as disconnected

- Check that your backend is running and accessible
- Verify the API URL configuration in `apiConfig`
- Check browser network tab for CORS or network errors

### Components not showing in production

- Verify `NODE_ENV=production` is set
- Check that `apiConfig.isProduction` returns true
- Ensure ConnectionProvider is wrapping your app

### TypeScript errors

- Make sure all components are properly imported
- Check that React types are installed
- Verify hook usage is within ConnectionProvider

## Railway Service Integration

This system is specifically designed to work with the Railway service at:
`https://faceapp-lhtz.onrender.com`

The connection monitoring:

- Automatically uses the Railway URL in production
- Provides Railway-specific status information
- Handles Railway service-specific error scenarios
- Shows "Railway Service" branding in production mode
