import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Inter_Tight } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter', weight: ['400', '500', '600', '700'] })
const tight = Inter_Tight({ subsets: ['latin', 'vietnamese'], variable: '--font-inter-tight', weight: ['500', '700'] })

export const metadata: Metadata = {
  title: 'Citizen Consent Quorum — Zero-Trust Data Sharing',
  description: 'Cross-agency citizen data sharing where no admin, agency or insider can open a record alone. The citizen is part of the approval.',
}

export const viewport: Viewport = { themeColor: '#f0f2f8', colorScheme: 'light' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${tight.variable}`}>
      <body className="min-h-screen bg-[#f0f2f8] text-[#111827] selection:bg-[#2727e6] selection:text-white antialiased">
        {children}
      </body>
    </html>
  )
}
