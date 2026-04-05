import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Expense by GENLORD - Your Expenses, Your Rules",
    template: "%s | Expense by GENLORD",
  },
  description: "A minimalist, secure expense manager that uses your private Google Sheets as a database. Take full control of your personal finance data with dynamic columns and visual analytics.",
  keywords: ["expense tracker", "personal finance", "google sheets database", "money manager", "genlord", "expense my id", "financial tracker", "indonesia expense app"],
  authors: [{ name: "GENLORD" }],
  creator: "GENLORD",
  metadataBase: new URL("https://expense.my.id"),
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://expense.my.id",
    title: "Expense by GENLORD - Private Expense Tracker",
    description: "Your Expenses, Your Rules. Minimalist money management integrated with Google Sheets.",
    siteName: "Expense by GENLORD",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Expense by GENLORD Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Expense by GENLORD",
    description: "Minimalist money management integrated with Google Sheets.",
    creator: "@genlord", // Ganti dengan handle twitter Anda jika ada
    images: ["/icons/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
