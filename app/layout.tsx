// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Nexora — AI Agent Builder',
  description: 'Build, deploy, and automate AI agents for your business.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme-mode="dark" data-theme-family="nexora">
      <body>
        <ThemeProvider>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
