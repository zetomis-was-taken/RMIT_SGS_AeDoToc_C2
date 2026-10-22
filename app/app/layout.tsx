import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import {
  TideCloakProvider
} from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'


export const metadata: Metadata = {
  title: 'Citizen Consent Quorum',
  description: 'Cross-agency citizen data sharing where no single admin can open a record',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
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
