import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CareerRadar | Career Intelligence Dashboard',
  description: 'Personal career intelligence dashboard with GitHub analysis and job market matching',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-slate-200">
        {children}
      </body>
    </html>
  )
}
