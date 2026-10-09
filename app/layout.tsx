import type { Metadata, Viewport } from 'next'
import './globals.css'
import './water-resources.css'

export const metadata: Metadata = {
  title: 'AgriRisk Intelligence | Climate-Aware Lending',
  description: 'A transparent agricultural lending decision-support platform for climate-aware credit review.',
  icons: {
    icon: '/agri-risk-icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#123d30',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
