import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ConnectionProvider } from "../contexts/ConnectionContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Face Video Search",
  description: "Search for similar faces in videos",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConnectionProvider autoStart={true}>{children}</ConnectionProvider>
      </body>
    </html>
  )
}
