import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Selvacore - Installation Management Platform',
  description: 'Professional installation management for water filtration systems',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased">
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  )
}

