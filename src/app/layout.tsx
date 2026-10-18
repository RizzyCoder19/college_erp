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
  title: "RPIHM CampusOS | R. P. Institute of Hospitality & Management, Vasai",
  description: "Academic & Administrative ERP for R. P. Institute of Hospitality & Management, Vasai (Affiliated to University of Mumbai).",
  icons: {
    icon: "/favicon.ico",
  },
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
      <body className="min-h-screen bg-[#F4F6F9] text-slate-900 antialiased selection:bg-blue-100 selection:text-[#1657D9]">
        {children}
      </body>
    </html>
  );
}
