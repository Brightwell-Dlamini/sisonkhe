import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/common/ThemeProvider";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sisonkhe_theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased bg-zinc-50 text-zinc-900 dark:bg-[#050505] dark:text-zinc-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
