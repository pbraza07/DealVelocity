import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Velocity | Live Market Screening",
  description:
    "Free regional housing market screening with published inventory, sales nowcasts and days-to-pending history. No demonstration comparable properties.",
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
