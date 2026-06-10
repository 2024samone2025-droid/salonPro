import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "SalonPro Rwanda - Salon Management System",
  description: "Professional salon management system for Rwanda. Manage appointments, customers, staff, and services.",
  keywords: ["salon", "management", "Rwanda", "appointments", "booking"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} antialiased bg-background text-foreground`}
      >
        <noscript key="noscript">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>SalonPro Rwanda</h1>
              <p style={{ color: '#737373', marginTop: '0.5rem' }}>Please enable JavaScript to use this application.</p>
            </div>
          </div>
        </noscript>
        {/* Wrap in providers, but be careful with context during SSR/prerender */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster key="toaster" />
        </ThemeProvider>
      </body>
    </html>
  );
}
