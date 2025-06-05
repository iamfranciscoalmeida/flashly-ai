import { TempoInit } from "@/components/tempo-init";
import SyncSubscription from "@/components/sync-subscription";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyWithAI - AI-Powered Study Platform for Students",
  description:
    "Transform your study materials into interactive flashcards and quizzes with our AI-powered learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <TempoInit />
          <SyncSubscription />
        </ThemeProvider>
      </body>
    </html>
  );
}
