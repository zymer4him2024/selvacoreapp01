import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from 'react-hot-toast'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0071E3',
}

export const metadata: Metadata = {
  title: 'Selvacore - Installation Management Platform',
  description: 'Professional installation management for water filtration systems',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Selvacore',
  },
  icons: {
    apple: '/icons/icon-192x192.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-background text-text-primary antialiased">
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1c1c1e',
                color: '#fff',
                border: '1px solid #38383a',
              },
              success: {
                iconTheme: {
                  primary: '#30d158',
                  secondary: '#1c1c1e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ff453a',
                  secondary: '#1c1c1e',
                },
              },
            }}
          />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

