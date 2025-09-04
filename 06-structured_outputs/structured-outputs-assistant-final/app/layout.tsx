import type { Metadata } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Shopping Assistant',
  description: 'Structured Outputs demo'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-y-scroll w-full flex-col from-neutral-50 to-neutral-200 bg-gradient-to-b text-stone-900">
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
