import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BriefDrop",
  description: "Paste messy messages. Get the brief.",
  applicationName: "BriefDrop",
  appleWebApp: {
    capable: true,
    title: "BriefDrop",
    statusBarStyle: "default",
  },
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
