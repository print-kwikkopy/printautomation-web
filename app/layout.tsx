import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintAutomation",
  description: "Kwik Kopy North Sydney automation command centre",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
