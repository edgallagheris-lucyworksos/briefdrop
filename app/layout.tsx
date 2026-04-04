import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BriefDrop",
  description: "Turn messy messages into a usable brief.",
  applicationName: "BriefDrop",
  appleWebApp: {
    capable: true,
    title: "BriefDrop",
    statusBarStyle: "black-translucent",
  },
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
