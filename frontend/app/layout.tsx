import type { Metadata } from 'next'
import './globals.css'
import * as Sentry from '@sentry/nextjs';

// Add or edit your "generateMetadata" to include the Sentry trace data:
export function generateMetadata(): Metadata {
  return {
    title: 'CareerRadar | Career Intelligence Dashboard',
    description: 'Personal career intelligence dashboard with GitHub analysis and job market matching',
    other: {
      ...Sentry.getTraceData()
    }
  };
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
