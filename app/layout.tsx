import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: 'NILE Bet — Flow into Wins',
    template: '%s | NILE Bet',
  },
  description:
    'Premium Ethiopian sports betting. 100+ markets, instant payouts, Weekend Jackpot.',
  keywords: [
    'betting Ethiopia',
    'sports betting',
    'NILE Bet',
    'jackpot',
    'football betting',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta
          name="theme-color"
          content="#C9A84C"
        />
      </head>
      <body className="bg-charcoal
        text-nile-white antialiased">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#16213E',
              border:
                '1px solid rgba(201,168,76,0.3)',
              color: '#F0F0F0',
            },
          }}
        />
      </body>
    </html>
  )
}
export const viewport = {
  themeColor: '#C9A84C',
}
