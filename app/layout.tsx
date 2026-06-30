import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Billa — Invoices, Quotes & Receipts",
  description: "Create professional invoices, quotes, receipts and expenses in seconds — works offline.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Billa", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
