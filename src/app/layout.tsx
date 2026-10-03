import type { Metadata, Viewport } from "next";
import "./globals.css";
import SyncWorker from "@/components/offline/SyncWorker";

export const metadata: Metadata = {
  title: "Sisonkhe In Transit",
  description:
    "National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini corridors.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sisonkhe",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    apple: [{ url: "/logo.jpg", type: "image/jpeg" }],
    shortcut: "/logo.jpg",
  },
  openGraph: {
    title: "Sisonkhe In Transit",
    description:
      "National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini.",
    images: [{ url: "/logo.jpg", alt: "Sisonkhe In Transit" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SyncWorker />
        {children}
      </body>
    </html>
  );
}
