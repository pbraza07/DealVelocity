import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Velocity | Flip Resale Underwriting",
  description:
    "Analyze sales velocity, months of inventory, ARV liquidity, and expected resale time for residential fix-and-flip investments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
