import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

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

// No-flash inline script: resolves the user's theme choice (or system preference)
// and sets data-theme on <html> BEFORE first paint, preventing FOUC.
const noFlashScript = `(function(){try{var s=localStorage.getItem('selvacore-theme');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(s==='system'?(sys?'dark':'light'):(sys?'dark':'light'));document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <Script id="theme-no-flash" strategy="beforeInteractive">{noFlashScript}</Script>
      </head>
      <body className="bg-background text-text-primary antialiased">
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
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
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
