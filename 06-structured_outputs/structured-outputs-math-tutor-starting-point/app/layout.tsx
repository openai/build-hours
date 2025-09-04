import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })
import '@/app/globals.css'

export const metadata = {
  metadataBase: process.env.VERCEL_URL
    ? new URL(`https://${process.env.VERCEL_URL}`)
    : undefined,
  title: {
    default: 'Math tutor'
  },
  description: 'AI-powered math tutor',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <main className="h-screen bg-neutral-100">{children}</main>
      </body>
    </html>
  )
}
