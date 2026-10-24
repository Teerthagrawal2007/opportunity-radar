import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Opportunity Radar | Live Opportunities for Indian College Students",
  description:
    "Find currently open internships, hackathons, competitions, scholarships, fellowships, and open-source programs matching your profile using live web data.",
  keywords: [
    "internships India",
    "hackathons",
    "college scholarships",
    "fellowships",
    "open source programs",
    "engineering students",
    "opportunity radar",
  ],
  authors: [{ name: "Opportunity Radar" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
