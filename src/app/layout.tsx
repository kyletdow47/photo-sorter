import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import '@/styles/globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'View1 Studio — Photo Sorter',
  description: 'AI-powered photo sorting and client delivery for professional photographers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans bg-background text-white`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1f',
              border: '1px solid #2a2a35',
              color: '#ffffff',
            },
          }}
        />
      </body>
    </html>
  )
}
