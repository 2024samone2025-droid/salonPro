import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const sans = Poppins({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalonPro Rwanda - Salon Management System",
  description: "Professional salon management system for Rwanda. Manage appointments, customers, staff, and services.",
  keywords: ["salon", "management", "Rwanda", "appointments", "booking"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
      </head>
      <body
        className={`${sans.variable} ${mono.variable} antialiased bg-background text-foreground`}
      >
        <noscript key="noscript">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>SalonPro Rwanda</h1>
              <p style={{ color: '#a1a1aa', marginTop: '0.5rem' }}>Please enable JavaScript to use this application.</p>
            </div>
          </div>
        </noscript>
        {children}
        <Toaster key="toaster" />
      </body>
    </html>
  );
}
