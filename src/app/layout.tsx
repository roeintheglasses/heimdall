import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Heimdall - Real-time Personal Dashboard',
  description: 'A real-time personal dashboard with over-engineered edge pipeline architecture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}