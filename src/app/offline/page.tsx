/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline fallback page. Precached by the service worker and served
 * when a navigation request fails with no cache match.
 *
 * Must remain a Server Component (no onClick) so static prerender works.
 */

export const metadata = {
  title: "Offline — Sisonkhe In Transit",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 text-center bg-[#0A0A0A]">
      <div className="max-w-md">
        <div
          aria-hidden
          className="mx-auto mb-6 h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-emerald-500"
          >
            <line x1="2" y1="2" x2="22" y2="22" />
            <path d="M8.5 16.5a5 5 0 0 1 7 0" />
            <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
            <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
            <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
            <path d="M5 12.55a10 10 0 0 1 5.17-2.39" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2 text-white">
          You're offline
        </h1>
        <p className="text-zinc-400 mb-6">
          Sisonkhe will sync your changes automatically when you reconnect.
          Any work you do now is safely stored on this device.
        </p>
        {/* Anchor — not onClick — so this page can prerender as a Server Component */}
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
