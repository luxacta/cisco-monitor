import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cisco Catalyst 9000 Monitor",
  description:
    "Real-time interface monitoring and management for Cisco IOS-XE (DevNet Sandbox)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
