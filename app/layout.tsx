import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const manrope = localFont({
  src: '../public/param/assets/manrope.woff2',
  variable: '--font-manrope',
  display: 'swap',
})
const dmSans = localFont({
  src: '../public/param/assets/dm-sans.woff2',
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Param Institute | Big Dreams. Stronger Foundations. | Lucknow',
  description: 'Personal, concept-first IIT-JEE, NEET and foundation coaching for Classes 6–12 at Param Institute in Gomti Nagar Extension, Lucknow. Enquire about a free demo class.',
  icons: { icon: '/param/assets/logo.webp' },
  openGraph: {
    title: 'Param Institute — Big dreams. Stronger foundations.',
    description: 'IIT-JEE, NEET and foundation coaching with personal mentorship in Lucknow.',
    images: ['/param/assets/learning-sculpture.webp'],
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#264e42',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`light bg-background ${manrope.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
