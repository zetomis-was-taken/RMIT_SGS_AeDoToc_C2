import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Instrument_Serif } from 'next/font/google'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'
import './globals.css'

// Basis Grotesque / DDC substitutes named in DESIGN.md: Inter + a humanist display serif.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '700'] })
const display = Instrument_Serif({ subsets: ['latin'], variable: '--font-display', weight: '400' })

export const metadata: Metadata = {
  title: 'Citizen Consent Quorum',
  description: 'Cross-agency citizen data sharing where no single admin can open a record',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        {(tcConfig as { realm?: string }).realm ? (
          <TideCloakProvider config={tcConfig}>{children}</TideCloakProvider>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
