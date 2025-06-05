import { TempoInit } from "@/components/tempo-init";
import SyncSubscription from "@/components/sync-subscription";
import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyWithAI - AI-Powered Study Platform for Everyone",
  description:
    "Transform your study materials into interactive flashcards and quizzes with our AI-powered learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Script src="https://api.tempolabs.ai/proxy-asset?url=https://storage.googleapis.com/tempo-public-assets/error-handling.js" />
      <body className={inter.className}>
        {children}
        <TempoInit />
        <SyncSubscription />
        <Analytics />
      </body>
    </html>
  );
}
