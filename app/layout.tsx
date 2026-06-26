import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invoice & PDF Generator",
  description: "Create professional invoices and quotes in seconds",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
