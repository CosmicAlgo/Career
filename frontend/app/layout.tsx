import type { Metadata } from "next";
import "./globals.css";
import * as Sentry from "@sentry/nextjs";
import { ThemeProvider } from "@/components/ThemeProvider";

// Add or edit your "generateMetadata" to include the Sentry trace data:
export function generateMetadata(): Metadata {
  return {
    title: "CareerRadar | Career Intelligence Dashboard",
    description:
      "Personal career intelligence dashboard with GitHub analysis and job market matching",
    other: {
      ...Sentry.getTraceData(),
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
