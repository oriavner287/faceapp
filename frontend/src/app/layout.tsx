import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConnectionProvider, SessionProvider } from "../contexts"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Face Video Search",
  description:
    "Search for similar faces in videos using advanced face recognition technology",
  keywords: ["face recognition", "video search", "AI", "machine learning"],
  authors: [{ name: "Face Video Search Team" }],
  robots: {
    index: false, // Don't index in search engines for privacy
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConnectionProvider autoStart={true}>
          <SessionProvider autoCleanupInterval={5 * 60 * 1000}>
            {children}
          </SessionProvider>
        </ConnectionProvider>
      </body>
    </html>
  )
}
