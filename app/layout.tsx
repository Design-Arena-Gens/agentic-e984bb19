import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mind Map - ADHD Friendly',
  description: 'Smooth canvas-based mind mapping',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
