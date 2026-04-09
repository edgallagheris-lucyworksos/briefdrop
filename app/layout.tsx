import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BriefDrop",
  description: "Turn messy inbound into a decision-ready intake pack.",
  applicationName: "BriefDrop",
  appleWebApp: {
    capable: true,
    title: "BriefDrop",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
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
