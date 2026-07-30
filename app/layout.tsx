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
import { ScrollRestorer }
  from '@/components/shared/ScrollRestorer'

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
      'https://nilebetting.vercel.app'
  ),
  alternates: {
    canonical: '/',
  },
  title: {
    default: 'NILE Betting - Sports Betting in Ethiopia',
    template: '%s | NILE Betting',
  },
  description:
    "Ethiopia's premier sports betting platform. Bet on football, win big with NILE Betting.",
  keywords: [
    'sports betting',
    'Ethiopia',
    'football betting',
    'jackpot',
    'NILE Betting',
  ],
  authors: [{ name: 'NILE Betting' }],
  creator: 'NILE Betting',
  publisher: 'NILE Betting',
  applicationName: 'NILE Betting',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-96x96.png', type: 'image/png', sizes: '96x96' },
      { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/icons/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NILE Betting',
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
    url: 'https://nilebetting.vercel.app',
    siteName: 'NILE Betting',
    title: 'NILE Betting - Sports Betting in Ethiopia',
    description:
      "Ethiopia's premier sports betting platform",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NILE Betting',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NILE Betting - Sports Betting in Ethiopia',
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
          content="NILE Betting"
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

              // Scroll position restore on reload
              (function() {
                var scrollKey = 'nilebet_scroll_' + window.location.pathname;
                // Restore scroll position
                var saved = sessionStorage.getItem(scrollKey);
                if (saved) {
                  window.addEventListener('load', function() {
                    setTimeout(function() {
                      var pos = parseInt(saved, 10);
                      // Try main scrollable containers first, then window
                      var containers = [
                        document.querySelector('main.flex-1.overflow-y-auto'),
                        document.querySelector('.flex-1.overflow-y-auto'),
                        window
                      ];
                      for (var i = 0; i < containers.length; i++) {
                        if (containers[i]) {
                          if (containers[i] === window) {
                            window.scrollTo(0, pos);
                          } else {
                            containers[i].scrollTop = pos;
                          }
                          break;
                        }
                      }
                    }, 300);
                  });
                }
                // Save scroll position before unload
                window.addEventListener('beforeunload', function() {
                  var containers = [
                    document.querySelector('main.flex-1.overflow-y-auto'),
                    document.querySelector('.flex-1.overflow-y-auto'),
                  ];
                  var pos = 0;
                  for (var i = 0; i < containers.length; i++) {
                    if (containers[i] && containers[i].scrollTop > 0) {
                      pos = containers[i].scrollTop;
                      break;
                    }
                  }
                  if (pos === 0) pos = window.scrollY;
                  if (pos > 0) {
                    sessionStorage.setItem(scrollKey, pos.toString());
                  } else {
                    sessionStorage.removeItem(scrollKey);
                  }
                });
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
        <ScrollRestorer />
        <InstallPrompt />
        <SessionTimeoutWarning />
      </body>
    </html>
  )
}