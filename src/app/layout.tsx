import type { Metadata, Viewport } from "next";
import "./globals.css";
import SyncWorker from "@/components/offline/SyncWorker";

export const metadata: Metadata = {
  title: "Sisonkhe In Transit",
  description:
    "National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini corridors.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sisonkhe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sisonkhe",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.jpg", type: "image/jpeg" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
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
  viewportFit: "cover",
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
