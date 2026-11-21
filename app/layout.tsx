import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School ERP — Multi-Tenant SaaS",
  description: "Production-grade Multi-Tenant School ERP SaaS platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
