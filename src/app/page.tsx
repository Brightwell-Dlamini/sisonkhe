"use client";

import dynamic from "next/dynamic";
import ClientBootstrap from "./ClientBootstrap";

const App = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#050505]">
      <div className="text-center">
        <div className="mb-4 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          🇸🇿 Sisonkhe In Transit
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return (
    <ClientBootstrap>
      <App />
    </ClientBootstrap>
  );
}
