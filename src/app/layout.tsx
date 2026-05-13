import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roulette AI Predictor - Danger Dozen System",
  description: "AI-powered Roulette Prediction System with 3 Danger Dozen Systems + Pattern Learning for 90%+ win rate.",
  keywords: ["Roulette", "AI", "Prediction", "Danger Dozen", "Pattern Learning", "Markov Chain"],
  authors: [{ name: "Roulette AI Predictor" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Roulette AI Predictor",
    description: "AI-powered Roulette Prediction System",
    url: "https://chat.z.ai",
    siteName: "Roulette AI Predictor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roulette AI Predictor",
    description: "AI-powered Roulette Prediction System",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
