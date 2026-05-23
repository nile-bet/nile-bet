import type { Metadata, Viewport }
  from 'next'
import {
  Playfair_Display,
  Inter,
  Roboto_Mono,
} from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { InstallPrompt }
  from '@/components/shared/InstallPrompt'
import { SessionTimeoutWarning }
  from '@/components/shared/SessionTimeoutWarning'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      'https://nile-bet.vercel.app'
  ),
  title: {
    default: 'NILE Bet — Flow into Wins',
    template: '%s | NILE Bet',
  },
  description:
    "Ethiopia's premier sports betting platform. Bet on football, win big with NILE Bet.",
  keywords: [
    'sports betting',
    'Ethiopia',
    'football betting',
    'jackpot',
    'NILE Bet',
  ],
  authors: [{ name: 'NILE Bet' }],
  creator: 'NILE Bet',
  publisher: 'NILE Bet',
  applicationName: 'NILE Bet',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NILE Bet',
    startupImage: [
      {
        url: '/icons/icon-512x512.png',
        media:
          '(device-width: 390px) and (device-height: 844px)',
      },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_ET',
    url: 'https://nile-bet.vercel.app',
    siteName: 'NILE Bet',
    title: 'NILE Bet — Flow into Wins',
    description:
      "Ethiopia's premier sports betting platform",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NILE Bet',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NILE Bet — Flow into Wins',
    description:
      "Ethiopia's premier sports betting platform",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#C9A84C',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`
        ${playfair.variable}
        ${inter.variable}
        ${robotoMono.variable}
      `}
      suppressHydrationWarning
    >
      <head>
        {/* PWA meta tags */}
        <link
          rel="manifest"
          href="/manifest.json"
        />
        <meta
          name="mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="NILE Bet"
        />
        {/* Apple icons */}
        <link
          rel="apple-touch-icon"
          href="/icons/icon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/icon-192x192.png"
        />
        {/* Favicon */}
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/icon-96x96.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/icon-72x72.png"
        />
        {/* Service Worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker
                    .register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[SW] Registered:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[SW] Registration failed:', err);
                    });
                });
              }

              // Clear session on window close (not refresh)
              (function() {
                var key = 'sb-session-active';
                if (!sessionStorage.getItem(key)) {
                  // New tab/window - clear supabase auth
                  var keys = Object.keys(localStorage);
                  keys.forEach(function(k) {
                    if (k.startsWith('sb-') || k.includes('supabase')) {
                      localStorage.removeItem(k);
                    }
                  });
                }
                sessionStorage.setItem(key, '1');
              })();
            `,
          }}
        />
      </head>
      <body className="bg-charcoal min-h-screen antialiased">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            style: {
              background: '#16213E',
              border:
                '1px solid rgba(201,168,76,0.3)',
              color: '#F0F0F0',
            },
          }}
        />
        <InstallPrompt />
        <SessionTimeoutWarning />
      </body>
    </html>
  )
}