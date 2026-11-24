import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { AppProvider } from '@/lib/store'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SSUET Smart Campus AI — The Future of Campus Experience',
    template: '%s · SSUET Smart Campus AI',
  },
  description:
    'A student-built academic prototype inspired by Sir Syed University of Engineering & Technology: AI academic advisor, complaint center and QR attendance.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#13294b',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased">
        <AppProvider>{children}</AppProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
