import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sisonkhe In Transit",
  description:
    "National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini corridors with real-time departure boards, Driver Virtual Passes, and Vehicle Owner Operator Master Card fleet management.",
  openGraph: {
    title: "Sisonkhe In Transit",
    description:
      "National Taxi Rank, Route Queuing, and Fleet Dispatch Management System for Eswatini corridors with real-time departure boards and commuter sponsored broadcasts.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
