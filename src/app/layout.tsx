import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Heimdall Dashboard',
    template: '%s | Heimdall Dashboard'
  },
  description: 'Real-time personal development dashboard monitoring GitHub, Vercel, Railway and other integrations with intelligent categorization and edge pipeline architecture',
  keywords: ['dashboard', 'monitoring', 'github', 'vercel', 'railway', 'webhooks', 'real-time', 'development'],
  authors: [{ name: 'Heimdall Team' }],
  creator: 'Heimdall Dashboard',
  publisher: 'Heimdall Dashboard',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Heimdall Dashboard',
    description: 'Real-time personal development dashboard monitoring GitHub, Vercel, Railway and other integrations',
    siteName: 'Heimdall Dashboard',
    images: [
      {
        url: '/icon.svg',
        width: 100,
        height: 100,
        alt: 'Heimdall Dashboard Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Heimdall Dashboard',
    description: 'Real-time personal development dashboard monitoring GitHub, Vercel, Railway and other integrations',
    images: ['/icon.svg'],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#4f46e5' }
  ],
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