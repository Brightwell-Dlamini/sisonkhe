"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
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

function Redirector({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    if (tab === "kiosk") {
      const region = searchParams.get("region") ?? "Hhohho";
      window.location.replace(`/kiosk?region=${encodeURIComponent(region)}`);
    }
  }, [tab, searchParams]);

  if (tab === "kiosk") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#050505]">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Redirecting to kiosk…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function HomePage() {
  return (
    <ClientBootstrap>
      <Redirector>
        <App />
      </Redirector>
    </ClientBootstrap>
  );
}
